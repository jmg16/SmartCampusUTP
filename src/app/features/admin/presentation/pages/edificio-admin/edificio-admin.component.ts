import { CUSTOM_ELEMENTS_SCHEMA, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BitacoraService } from '../../../../../core/services/bitacora.service';
import { EdificiosService } from '../../../../../core/services/edificios.service';
import { SalonesService } from '../../../../../core/services/salones.service';
import { Edificio } from '../../../../../shared/models/edificio.model';
import { Salon, SalonPayload } from '../../../../../shared/models/salon.model';
import '@google/model-viewer';

@Component({
  selector: 'app-edificio-admin',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './edificio-admin.component.html',
})
export class EdificioAdminComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private edificiosService = inject(EdificiosService);
  private salonesService = inject(SalonesService);
  private auth = inject(BitacoraService);
  private sanitizer = inject(DomSanitizer);

  readonly tipos = ['Aula', 'Laboratorio', 'Auditorio', 'Taller', 'Sala de reuniones'];

  edificio = signal<Edificio | null>(null);
  edificios = signal<Edificio[]>([]);
  visorBim = signal<SafeResourceUrl | null>(null);
  salones = signal<Salon[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  guardandoFoto = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  vistaPrevia = signal<string | null>(null);
  private fotoPendiente: File | null = null;

  form = this.fb.group({
    id: [null as number | null],
    edificio_id: [null as number | null],
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    tipo: ['', [Validators.required, Validators.maxLength(100)]],
    capacidad: [null as number | null, [Validators.required, Validators.min(1)]],
    descripcion: ['', [Validators.required]],
    caracteristicas: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.cargando.set(false);
      return;
    }
    this.edificiosService.getBySlug(slug).subscribe({
      next: (edificio) => {
        this.edificio.set(edificio);
        this.visorBim.set(this.urlVisorBim(edificio.bim_url));
        this.form.controls.edificio_id.setValue(edificio.id);
        this.cargando.set(false);
        this.cargarSalones();
      },
      error: () => this.cargando.set(false),
    });
    this.edificiosService.list().subscribe({
      next: (edificios) => this.edificios.set(edificios),
      error: () => this.edificios.set([]),
    });
  }

  private urlVisorBim(url: string | null): SafeResourceUrl | null {
    if (!url || !url.startsWith('https://bimch.utp.ac.pa/')) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  get editando(): boolean {
    return this.form.controls.id.value !== null;
  }

  cargarSalones(): void {
    const edificio = this.edificio();
    if (!edificio) return;
    this.salonesService.list(edificio.id).subscribe({
      next: (salones) => this.salones.set(salones),
      error: (err) => this.error.set(err?.error?.mensaje || 'No se pudieron cargar los salones.'),
    });
  }

  seleccionar(salon: Salon): void {
    this.form.setValue({
      id: salon.id,
      edificio_id: salon.edificio_id ?? this.edificio()?.id ?? null,
      nombre: salon.nombre,
      tipo: salon.tipo,
      capacidad: salon.capacidad,
      descripcion: salon.descripcion,
      caracteristicas: salon.caracteristicas.join('\n'),
    });
    this.error.set(null);
    this.success.set(null);
  }

  limpiarFormulario(): void {
    this.form.reset({
      id: null,
      edificio_id: this.edificio()?.id ?? null,
      nombre: '',
      tipo: '',
      capacidad: null,
      descripcion: '',
      caracteristicas: '',
    });
  }

  enviar(): void {
    const edificio = this.edificio();
    if (this.form.invalid || this.guardando() || !edificio) return;
    const value = this.form.getRawValue();
    const payload: SalonPayload = {
      nombre: String(value.nombre).trim(),
      tipo: String(value.tipo).trim(),
      edificio_id: value.edificio_id ?? edificio.id,
      ubicacion: '',
      capacidad: Number(value.capacidad),
      descripcion: String(value.descripcion).trim(),
      caracteristicas: String(value.caracteristicas)
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    };

    this.guardando.set(true);
    this.error.set(null);
    this.success.set(null);
    const request = value.id
      ? this.salonesService.update(value.id, payload)
      : this.salonesService.create(payload);

    request.subscribe({
      next: () => {
        this.guardando.set(false);
        const movido = value.edificio_id && value.edificio_id !== edificio.id;
        this.success.set(
          movido ? 'Salón movido a otro edificio.' : value.id ? 'Salón actualizado.' : 'Salón creado.'
        );
        this.limpiarFormulario();
        this.cargarSalones();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.mensaje || 'No se pudo guardar el salón.');
      },
    });
  }

  eliminar(salon: Salon): void {
    if (!confirm(`¿Eliminar el salón "${salon.nombre}"?`)) return;
    this.salonesService.delete(salon.id).subscribe({
      next: () => {
        this.success.set('Salón eliminado.');
        this.limpiarFormulario();
        this.cargarSalones();
      },
      error: (err) => this.error.set(err?.error?.mensaje || 'No se pudo eliminar el salón.'),
    });
  }

  elegirFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    this.limpiarVistaPrevia();
    this.fotoPendiente = archivo;
    this.vistaPrevia.set(URL.createObjectURL(archivo));
    this.error.set(null);
  }

  guardarFoto(): void {
    const edificio = this.edificio();
    const archivo = this.fotoPendiente;
    if (!edificio || !archivo || this.guardandoFoto()) return;
    this.guardandoFoto.set(true);
    this.error.set(null);
    this.edificiosService.subirFoto(edificio.id, archivo).subscribe({
      next: (actualizado) => {
        this.edificio.set(actualizado);
        this.limpiarVistaPrevia();
        this.guardandoFoto.set(false);
        this.success.set('Fotografía guardada.');
      },
      error: (err) => {
        this.guardandoFoto.set(false);
        this.error.set(err?.error?.mensaje || 'No se pudo guardar la fotografía.');
      },
    });
  }

  eliminarFoto(): void {
    const edificio = this.edificio();
    if (!edificio || !edificio.foto) return;
    this.edificiosService.eliminarFoto(edificio.id, edificio.foto).subscribe({
      next: (actualizado) => this.edificio.set(actualizado),
      error: (err) => this.error.set(err?.error?.mensaje || 'No se pudo eliminar la fotografía.'),
    });
  }

  cerrarSesion(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/admin/login');
  }

  ngOnDestroy(): void {
    this.limpiarVistaPrevia();
  }

  private limpiarVistaPrevia(): void {
    const previa = this.vistaPrevia();
    if (previa) URL.revokeObjectURL(previa);
    this.vistaPrevia.set(null);
    this.fotoPendiente = null;
  }
}
