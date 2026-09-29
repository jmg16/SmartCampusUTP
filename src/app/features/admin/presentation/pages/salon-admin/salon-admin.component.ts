import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BitacoraService } from '../../../../../core/services/bitacora.service';
import { SalonesService } from '../../../../../core/services/salones.service';
import { Mobiliario, Salon } from '../../../../../shared/models/salon.model';

@Component({
  selector: 'app-salon-admin',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './salon-admin.component.html',
})
export class SalonAdminComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salonesService = inject(SalonesService);
  private auth = inject(BitacoraService);

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

  salon = signal<Salon | null>(null);
  cargando = signal(true);
  guardandoMobiliario = signal(false);
  guardandoFoto = signal(false);
  mensaje = signal<string | null>(null);
  pieza = this.catalogoMobiliario[0];
  cantidadPieza = 1;
  seriePieza = '';

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
  }

  agregarMobiliario(): void {
    const espacio = this.salon();
    const nombre = this.pieza.trim();
    const serie = this.seriePieza.trim();
    const cantidad = Number(this.cantidadPieza);
    if (!espacio || !nombre || !serie || !Number.isInteger(cantidad) || cantidad < 1) {
      this.mensaje.set('Indica el objeto, la cantidad y el número de serie.');
      return;
    }
    if (espacio.mobiliario.some((item) => item.serie.toLowerCase() === serie.toLowerCase())) {
      this.mensaje.set('Ese número de serie ya está registrado en este salón.');
      return;
    }
    this.guardarMobiliario([...espacio.mobiliario, { nombre, cantidad, serie }]);
  }

  quitarMobiliario(indice: number): void {
    const espacio = this.salon();
    if (!espacio) return;
    this.guardarMobiliario(espacio.mobiliario.filter((_, posicion) => posicion !== indice));
  }

  agregarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    const espacio = this.salon();
    if (!archivo || !espacio) return;
    this.guardandoFoto.set(true);
    this.mensaje.set(null);
    this.salonesService.subirFoto(espacio.id, archivo).subscribe({
      next: (salon) => {
        this.asignar(salon);
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

  cerrarSesion(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/admin/login');
  }

  private guardarMobiliario(mobiliario: Mobiliario[]): void {
    const espacio = this.salon();
    if (!espacio || this.guardandoMobiliario()) return;
    this.guardandoMobiliario.set(true);
    this.mensaje.set(null);
    this.salonesService.guardarMobiliario(espacio.id, mobiliario).subscribe({
      next: (salon) => {
        this.asignar(salon);
        this.cantidadPieza = 1;
        this.seriePieza = '';
        this.guardandoMobiliario.set(false);
        this.mensaje.set('Mobiliario guardado.');
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
