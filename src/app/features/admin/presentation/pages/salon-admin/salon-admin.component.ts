import { CUSTOM_ELEMENTS_SCHEMA, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BitacoraService } from '../../../../../core/services/bitacora.service';
import { Modelos3dService } from '../../../../../core/services/modelos3d.service';
import { SalonesService } from '../../../../../core/services/salones.service';
import { Modelo3D } from '../../../../../shared/models/modelo3d.model';
import { Mobiliario, Salon } from '../../../../../shared/models/salon.model';
import '@google/model-viewer';

@Component({
  selector: 'app-salon-admin',
  standalone: true,
  imports: [RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './salon-admin.component.html',
})
export class SalonAdminComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salonesService = inject(SalonesService);
  private modelos3d = inject(Modelos3dService);
  private auth = inject(BitacoraService);

  salon = signal<Salon | null>(null);
  modelos = signal<Modelo3D[]>([]);
  modeloVista = signal<Modelo3D | null>(null);
  cargando = signal(true);
  guardandoMobiliario = signal(false);
  guardandoFoto = signal(false);
  mensaje = signal<string | null>(null);
  vistaPrevia = signal<string | null>(null);
  private fotoPendiente: File | null = null;

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.cargando.set(false);
      return;
    }
    this.salonesService.getBySlug(slug).subscribe({
      next: (salon) => {
        this.asignar(salon);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
    this.modelos3d.list(200).subscribe({
      next: (modelos) => this.modelos.set(modelos),
      error: () => this.modelos.set([]),
    });
  }

  serieDe(modelo: Modelo3D): string {
    return (modelo.reference_code || `modelo-${modelo.id}`).trim();
  }

  estaEnSalon(modelo: Modelo3D): boolean {
    const serie = this.serieDe(modelo).toLowerCase();
    return (this.salon()?.mobiliario ?? []).some((item) => item.serie.toLowerCase() === serie);
  }

  modeloDe(item: Mobiliario): Modelo3D | undefined {
    return this.modelos().find((modelo) => this.serieDe(modelo).toLowerCase() === item.serie.toLowerCase());
  }

  cantidadDe(modelo: Modelo3D): number {
    const serie = this.serieDe(modelo).toLowerCase();
    return this.salon()?.mobiliario.find((item) => item.serie.toLowerCase() === serie)?.cantidad ?? 0;
  }

  abrirVista(item: Mobiliario): void {
    const modelo = this.modeloDe(item);
    if (modelo) this.modeloVista.set(modelo);
  }

  cerrarVista(): void {
    this.modeloVista.set(null);
  }

  agregarModelo(modelo: Modelo3D): void {
    const espacio = this.salon();
    const serie = this.serieDe(modelo);
    if (!espacio || !serie) return;
    const actual = espacio.mobiliario.find((item) => item.serie.toLowerCase() === serie.toLowerCase());
    const mobiliario = actual
      ? espacio.mobiliario.map((item) =>
          item.serie.toLowerCase() === serie.toLowerCase()
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      : [...espacio.mobiliario, { nombre: modelo.name, cantidad: 1, serie }];
    this.guardarMobiliario(mobiliario, actual ? 'Se sumó una unidad al inventario.' : 'Mobiliario agregado al inventario.');
  }

  quitarMobiliario(indice: number): void {
    const espacio = this.salon();
    if (!espacio) return;
    this.guardarMobiliario(espacio.mobiliario.filter((_, posicion) => posicion !== indice));
  }

  elegirFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    this.limpiarVistaPrevia();
    this.fotoPendiente = archivo;
    this.vistaPrevia.set(URL.createObjectURL(archivo));
    this.mensaje.set(null);
  }

  guardarFoto(): void {
    const espacio = this.salon();
    const archivo = this.fotoPendiente;
    if (!espacio || !archivo || this.guardandoFoto()) {
      this.mensaje.set('Toma o sube una imagen antes de guardar.');
      return;
    }
    this.guardandoFoto.set(true);
    this.mensaje.set(null);
    this.salonesService.subirFoto(espacio.id, archivo).subscribe({
      next: (salon) => {
        this.asignar(salon);
        this.limpiarVistaPrevia();
        this.guardandoFoto.set(false);
        this.mensaje.set('Fotografía guardada.');
      },
      error: (err) => {
        this.guardandoFoto.set(false);
        this.mensaje.set(err?.error?.mensaje || 'No se pudo guardar la fotografía.');
      },
    });
  }

  eliminarFoto(url: string): void {
    const espacio = this.salon();
    if (!espacio) return;
    this.salonesService.eliminarFoto(espacio.id, url).subscribe({
      next: (salon) => this.asignar(salon),
      error: (err) => this.mensaje.set(err?.error?.mensaje || 'No se pudo eliminar la fotografía.'),
    });
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

  cerrarSesion(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/admin/login');
  }

  private guardarMobiliario(mobiliario: Mobiliario[], aviso = 'Mobiliario guardado.'): void {
    const espacio = this.salon();
    if (!espacio || this.guardandoMobiliario()) return;
    this.guardandoMobiliario.set(true);
    this.mensaje.set(null);
    this.salonesService.guardarMobiliario(espacio.id, mobiliario).subscribe({
      next: (salon) => {
        this.asignar(salon);
        this.guardandoMobiliario.set(false);
        this.mensaje.set(aviso);
      },
      error: (err) => {
        this.guardandoMobiliario.set(false);
        this.mensaje.set(err?.error?.mensaje || 'No se pudo guardar el mobiliario.');
      },
    });
  }

  private asignar(salon: Salon): void {
    this.salon.set({
      ...salon,
      mobiliario: salon.mobiliario ?? [],
      fotos: salon.fotos ?? [],
    });
  }
}
