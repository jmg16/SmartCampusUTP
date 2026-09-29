import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BitacoraService } from '../../../../../core/services/bitacora.service';
import { SalonesService } from '../../../../../core/services/salones.service';
import { Mobiliario, Salon, SalonPayload } from '../../../../../shared/models/salon.model';

@Component({
  selector: 'app-salones-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './salones-dashboard.component.html',
})
export class SalonesDashboardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private salonesService = inject(SalonesService);
  private auth = inject(BitacoraService);
  private router = inject(Router);

  datos = signal<Salon[]>([]);
  cargandoLista = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  readonly tipos = ['Aula', 'Laboratorio', 'Auditorio', 'Taller', 'Sala de reuniones'];
  readonly catalogoMobiliario = [
    'Silla',
    'Mesa',
    'Escritorio',
    'Pupitre',
    'Computadora',
    'Proyector',
    'Pizarra',
    'Pantalla',
    'Aire acondicionado',
    'Impresora',
  ];
  mobiliario = signal<Mobiliario[]>([]);
  pieza = this.catalogoMobiliario[0];
  cantidadPieza = 1;
  seriePieza = '';
  readonly facultades = [
    'Facultad de Ingeniería Civil',
    'Facultad de Ingeniería Eléctrica',
    'Facultad de Sistemas',
    'Facultad de Ciencia y Tecnología',
    'Edificio Académico',
  ];

  form = this.fb.group({
    id: [null as number | null],
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    tipo: ['', [Validators.required, Validators.maxLength(100)]],
    edificio: ['', [Validators.required, Validators.maxLength(255)]],
    ubicacion: ['', [Validators.required, Validators.maxLength(255)]],
    capacidad: [null as number | null, [Validators.required, Validators.min(1)]],
    descripcion: ['', [Validators.required]],
    caracteristicas: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  get editando(): boolean {
    return this.form.controls.id.value !== null;
  }

  cargar(): void {
    this.cargandoLista.set(true);
    this.salonesService.list().subscribe({
      next: (salones) => {
        this.datos.set(salones);
        this.cargandoLista.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.mensaje || 'No se pudieron cargar los salones.');
        this.cargandoLista.set(false);
      },
    });
  }

  seleccionar(salon: Salon): void {
    this.form.setValue({
      id: salon.id,
      nombre: salon.nombre,
      tipo: salon.tipo,
      edificio: salon.edificio,
      ubicacion: salon.ubicacion,
      capacidad: salon.capacidad,
      descripcion: salon.descripcion,
      caracteristicas: salon.caracteristicas.join('\n'),
    });
    this.mobiliario.set([...(salon.mobiliario ?? [])]);
    this.error.set(null);
    this.success.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  limpiarFormulario(): void {
    this.form.reset({
      id: null,
      nombre: '',
      tipo: '',
      edificio: '',
      ubicacion: '',
      capacidad: null,
      descripcion: '',
      caracteristicas: '',
    });
    this.mobiliario.set([]);
    this.pieza = this.catalogoMobiliario[0];
    this.cantidadPieza = 1;
    this.seriePieza = '';
  }

  agregarMobiliario(): void {
    const nombre = this.pieza.trim();
    const serie = this.seriePieza.trim();
    const cantidad = Number(this.cantidadPieza);
    if (!nombre || !serie || !Number.isInteger(cantidad) || cantidad < 1) {
      this.error.set('Indica el objeto, la cantidad y el número de serie.');
      return;
    }
    if (this.mobiliario().some((item) => item.serie.toLowerCase() === serie.toLowerCase())) {
      this.error.set('Ese número de serie ya está registrado en este salón.');
      return;
    }

    this.mobiliario.set([...this.mobiliario(), { nombre, cantidad, serie }]);
    this.cantidadPieza = 1;
    this.seriePieza = '';
    this.error.set(null);
  }

  quitarMobiliario(indice: number): void {
    this.mobiliario.set(this.mobiliario().filter((_, posicion) => posicion !== indice));
  }

  enviar(): void {
    if (this.form.invalid || this.guardando()) return;
    const value = this.form.getRawValue();
    const payload: SalonPayload = {
      nombre: String(value.nombre).trim(),
      tipo: String(value.tipo).trim(),
      edificio: String(value.edificio).trim(),
      ubicacion: String(value.ubicacion).trim(),
      capacidad: Number(value.capacidad),
      descripcion: String(value.descripcion).trim(),
      caracteristicas: String(value.caracteristicas)
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
      mobiliario: this.mobiliario(),
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
        this.success.set(value.id ? 'Salón actualizado correctamente.' : 'Salón creado correctamente.');
        this.limpiarFormulario();
        this.cargar();
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
        this.success.set('Salón eliminado correctamente.');
        this.limpiarFormulario();
        this.cargar();
      },
      error: (err) => this.error.set(err?.error?.mensaje || 'No se pudo eliminar el salón.'),
    });
  }

  cerrarSesion(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}
