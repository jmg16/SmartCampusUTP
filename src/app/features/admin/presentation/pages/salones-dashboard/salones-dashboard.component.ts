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
  salonActivo = signal<Salon | null>(null);
  cargandoLista = signal(false);
  guardando = signal(false);
  guardandoMobiliario = signal(false);
  guardandoFoto = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  mensajeInventario = signal<string | null>(null);
  cantidadPieza = 1;
  seriePieza = '';

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
  pieza = this.catalogoMobiliario[0];
  readonly tipos = ['Aula', 'Laboratorio', 'Auditorio', 'Taller', 'Sala de reuniones'];
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
        const activo = this.salonActivo();
        if (activo) {
          this.salonActivo.set(salones.find((salon) => salon.id === activo.id) ?? null);
        }
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
      capacidad: salon.capacidad,
      descripcion: salon.descripcion,
      caracteristicas: salon.caracteristicas.join('\n'),
    });
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
      capacidad: null,
      descripcion: '',
      caracteristicas: '',
    });
  }

  enviar(): void {
    if (this.form.invalid || this.guardando()) return;
    const value = this.form.getRawValue();
    const payload: SalonPayload = {
      nombre: String(value.nombre).trim(),
      tipo: String(value.tipo).trim(),
      edificio: String(value.edificio).trim(),
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

  elegirSalon(id: string): void {
    const salon = this.datos().find((item) => item.id === Number(id)) ?? null;
    this.abrirInventario(salon);
  }

  abrirInventario(salon: Salon | null): void {
    this.mensajeInventario.set(null);
    this.salonActivo.set(
      salon
        ? { ...salon, mobiliario: salon.mobiliario ?? [], fotos: salon.fotos ?? [] }
        : null,
    );
    document.getElementById('inventario')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  agregarMobiliario(): void {
    const espacio = this.salonActivo();
    const nombre = this.pieza.trim();
    const serie = this.seriePieza.trim();
    const cantidad = Number(this.cantidadPieza);
    if (!espacio || !nombre || !serie || !Number.isInteger(cantidad) || cantidad < 1) {
      this.mensajeInventario.set('Indica el objeto, la cantidad y el número de serie.');
      return;
    }
    if (espacio.mobiliario.some((item) => item.serie.toLowerCase() === serie.toLowerCase())) {
      this.mensajeInventario.set('Ese número de serie ya está registrado en este salón.');
      return;
    }
    this.guardarMobiliario([...espacio.mobiliario, { nombre, cantidad, serie }]);
  }

  quitarMobiliario(indice: number): void {
    const espacio = this.salonActivo();
    if (!espacio) return;
    this.guardarMobiliario(espacio.mobiliario.filter((_, posicion) => posicion !== indice));
  }

  agregarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    const espacio = this.salonActivo();
    if (!archivo || !espacio) return;
    this.guardandoFoto.set(true);
    this.mensajeInventario.set(null);
    this.salonesService.subirFoto(espacio.id, archivo).subscribe({
      next: (salon) => {
        this.asignarInventario(salon);
        this.guardandoFoto.set(false);
        this.mensajeInventario.set('Fotografía guardada.');
      },
      error: (err) => {
        this.guardandoFoto.set(false);
        this.mensajeInventario.set(err?.error?.mensaje || 'No se pudo guardar la fotografía.');
      },
    });
  }

  eliminarFoto(url: string): void {
    const espacio = this.salonActivo();
    if (!espacio) return;
    this.salonesService.eliminarFoto(espacio.id, url).subscribe({
      next: (salon) => this.asignarInventario(salon),
      error: (err) => this.mensajeInventario.set(err?.error?.mensaje || 'No se pudo eliminar la fotografía.'),
    });
  }

  private guardarMobiliario(mobiliario: Mobiliario[]): void {
    const espacio = this.salonActivo();
    if (!espacio || this.guardandoMobiliario()) return;
    this.guardandoMobiliario.set(true);
    this.mensajeInventario.set(null);
    this.salonesService.guardarMobiliario(espacio.id, mobiliario).subscribe({
      next: (salon) => {
        this.asignarInventario(salon);
        this.cantidadPieza = 1;
        this.seriePieza = '';
        this.guardandoMobiliario.set(false);
        this.mensajeInventario.set('Mobiliario guardado.');
      },
      error: (err) => {
        this.guardandoMobiliario.set(false);
        this.mensajeInventario.set(err?.error?.mensaje || 'No se pudo guardar el mobiliario.');
      },
    });
  }

  private asignarInventario(salon: Salon): void {
    const normalizado = { ...salon, mobiliario: salon.mobiliario ?? [], fotos: salon.fotos ?? [] };
    this.salonActivo.set(normalizado);
    this.datos.update((lista) => lista.map((item) => (item.id === salon.id ? normalizado : item)));
  }

  cerrarSesion(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}
