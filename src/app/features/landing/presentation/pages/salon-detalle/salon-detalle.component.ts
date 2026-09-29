import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { obtenerSalon } from '../../../data/salones.data';
import { SalonesService } from '../../../../../core/services/salones.service';
import { Salon } from '../../../../../shared/models/salon.model';
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
  private slug = this.route.snapshot.paramMap.get('id');

  salon = signal<Salon | undefined>(obtenerSalon(this.slug));
  cargando = signal(true);
  fotosCapturadas: string[] = [];

  ngOnInit(): void {
    if (!this.slug) {
      this.cargando.set(false);
      return;
    }
    this.salonesService.getBySlug(this.slug).subscribe({
      next: (salon) => {
        this.salon.set(salon);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
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
