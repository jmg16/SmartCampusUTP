import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { obtenerSalon } from '../../../data/salones.data';
import { BitacoraService } from '../../../../../core/services/bitacora.service';
import { SalonesService } from '../../../../../core/services/salones.service';
import { Mobiliario, Salon } from '../../../../../shared/models/salon.model';
import { FooterComponent } from '../../components/footer/footer.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-salon-detalle',
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './salon-detalle.component.html',
})
export class SalonDetalleComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private salonesService = inject(SalonesService);
  private auth = inject(BitacoraService);
  private slug = this.route.snapshot.paramMap.get('id');

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

  salon = signal<Salon | undefined>(obtenerSalon(this.slug));
  cargando = signal(true);
  guardandoMobiliario = signal(false);
  mensajeMobiliario = signal<string | null>(null);
  pieza = this.catalogoMobiliario[0];
  cantidadPieza = 1;
  seriePieza = '';
  fotosCapturadas: string[] = [];

  get puedeRegistrar(): boolean {
    return this.auth.isAuthenticated();
  }

  ngOnInit(): void {
    if (!this.slug) {
      this.cargando.set(false);
      return;
    }
    this.salonesService.getBySlug(this.slug).subscribe({
      next: (salon) => {
        this.salon.set({ ...salon, mobiliario: salon.mobiliario ?? [] });
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  agregarMobiliario(): void {
    const espacio = this.salon();
    const nombre = this.pieza.trim();
    const serie = this.seriePieza.trim();
    const cantidad = Number(this.cantidadPieza);
    if (!espacio || !nombre || !serie || !Number.isInteger(cantidad) || cantidad < 1) {
      this.mensajeMobiliario.set('Indica el objeto, la cantidad y el número de serie.');
      return;
    }

    const actual = espacio.mobiliario ?? [];
    if (actual.some((item) => item.serie.toLowerCase() === serie.toLowerCase())) {
      this.mensajeMobiliario.set('Ese número de serie ya está registrado en este salón.');
      return;
    }

    this.guardarMobiliario([...actual, { nombre, cantidad, serie }]);
  }

  quitarMobiliario(indice: number): void {
    const espacio = this.salon();
    if (!espacio) return;
    this.guardarMobiliario(espacio.mobiliario.filter((_, posicion) => posicion !== indice));
  }

  private guardarMobiliario(mobiliario: Mobiliario[]): void {
    const espacio = this.salon();
    if (!espacio || this.guardandoMobiliario()) return;
    this.guardandoMobiliario.set(true);
    this.mensajeMobiliario.set(null);
    this.salonesService.guardarMobiliario(espacio.id, mobiliario).subscribe({
      next: (salon) => {
        this.salon.set({ ...salon, mobiliario: salon.mobiliario ?? [] });
        this.cantidadPieza = 1;
        this.seriePieza = '';
        this.guardandoMobiliario.set(false);
        this.mensajeMobiliario.set('Mobiliario guardado en este salón.');
      },
      error: (err) => {
        this.guardandoMobiliario.set(false);
        this.mensajeMobiliario.set(err?.error?.mensaje || 'No se pudo guardar el mobiliario.');
      },
    });
  }

  agregarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) return;

    this.fotosCapturadas = [...this.fotosCapturadas, URL.createObjectURL(archivo)];
    input.value = '';
  }

  eliminarFoto(indice: number): void {
    URL.revokeObjectURL(this.fotosCapturadas[indice]);
    this.fotosCapturadas = this.fotosCapturadas.filter((_, posicion) => posicion !== indice);
  }

  ngOnDestroy(): void {
    this.fotosCapturadas.forEach((foto) => URL.revokeObjectURL(foto));
  }
}
