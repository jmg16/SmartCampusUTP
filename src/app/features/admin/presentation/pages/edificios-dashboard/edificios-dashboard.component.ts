import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { BitacoraService } from '../../../../../core/services/bitacora.service';
import { SesionActivaComponent } from '../../../../../shared/components/sesion-activa/sesion-activa.component';
import { EdificiosService } from '../../../../../core/services/edificios.service';
import { comprimirImagen } from '../../../../../core/utils/comprimir-imagen';
import { ocultarAvisos } from '../../../../../core/utils/ocultar-avisos';
import { Edificio } from '../../../../../shared/models/edificio.model';
import '@google/model-viewer';

@Component({
  selector: 'app-edificios-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SesionActivaComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './edificios-dashboard.component.html',
})
export class EdificiosDashboardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private edificiosService = inject(EdificiosService);
  private auth = inject(BitacoraService);
  private router = inject(Router);
  private imagenPendiente: File | null = null;
  private vistaPreviaLocal: string | null = null;

  datos = signal<Edificio[]>([]);
  cargandoLista = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  private readonly avisosTemporales = ocultarAvisos([this.success, this.error]);
  vistaPrevia = signal<string | null>(null);

  form = this.fb.group({
    id: [null as number | null],
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    niveles: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  get editando(): boolean {
    return this.form.controls.id.value !== null;
  }

  cargar(edificioId?: number): void {
    this.cargandoLista.set(true);
    this.edificiosService.list().subscribe({
      next: (edificios) => {
        this.datos.set(edificios);
        this.cargandoLista.set(false);
        if (edificioId) {
          setTimeout(() => {
            document
              .getElementById(`edificio-${edificioId}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 80);
        }
      },
      error: (err) => {
        this.error.set(err?.error?.mensaje || 'No se pudieron cargar los edificios.');
        this.cargandoLista.set(false);
      },
    });
  }

  seleccionar(edificio: Edificio): void {
    this.form.setValue({
      id: edificio.id,
      nombre: edificio.nombre,
      niveles: edificio.niveles,
    });
    this.limpiarVistaPrevia();
    this.vistaPrevia.set(edificio.foto);
    this.error.set(null);
    this.success.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  limpiarFormulario(): void {
    this.form.reset({ id: null, nombre: '', niveles: 1 });
    this.imagenPendiente = null;
    this.limpiarVistaPrevia();
    const input = document.getElementById('imagen-edificio') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  async elegirImagen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.imagenPendiente = null;
    this.limpiarVistaPrevia();
    if (!archivo) return;
    try {
      const lista = await comprimirImagen(archivo);
      this.imagenPendiente = lista;
      this.vistaPreviaLocal = URL.createObjectURL(lista);
      this.vistaPrevia.set(this.vistaPreviaLocal);
    } catch {
      this.error.set('Esa foto es demasiado pesada. Prueba con otra imagen.');
    }
  }

  enviar(): void {
    if (this.form.invalid || this.guardando()) return;
    const value = this.form.getRawValue();
    const payload = {
      nombre: String(value.nombre).trim(),
      niveles: Number(value.niveles),
      modelo_id: null,
    };
    const imagen = this.imagenPendiente;
    const estabaEditando = Boolean(value.id);

    this.guardando.set(true);
    this.error.set(null);
    this.success.set(null);
    const request = value.id
      ? this.edificiosService.update(value.id, payload)
      : this.edificiosService.create(payload);

    request
      .pipe(
        switchMap((edificio) =>
          imagen ? this.edificiosService.subirFoto(edificio.id, imagen) : of(edificio)
        )
      )
      .subscribe({
      next: (edificio) => {
        this.guardando.set(false);
        this.success.set(estabaEditando ? 'Edificio actualizado.' : 'Edificio creado.');
        this.limpiarFormulario();
        this.cargar(edificio.id);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.mensaje || 'No se pudo guardar el edificio.');
      },
    });
  }

  private limpiarVistaPrevia(): void {
    if (this.vistaPreviaLocal) URL.revokeObjectURL(this.vistaPreviaLocal);
    this.vistaPreviaLocal = null;
    this.vistaPrevia.set(null);
  }

  eliminar(edificio: Edificio): void {
    if (!confirm(`¿Eliminar el edificio "${edificio.nombre}"?`)) return;
    this.edificiosService.delete(edificio.id).subscribe({
      next: () => {
        this.success.set('Edificio eliminado.');
        this.limpiarFormulario();
        this.cargar();
      },
      error: (err) => this.error.set(err?.error?.mensaje || 'No se pudo eliminar el edificio.'),
    });
  }

  cerrarSesion(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}
