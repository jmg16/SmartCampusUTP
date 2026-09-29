import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SALONES } from '../../../data/salones.data';
import { SalonesService } from '../../../../../core/services/salones.service';
import { FooterComponent } from '../../components/footer/footer.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-salones',
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './salones.component.html',
})
export class SalonesComponent implements OnInit {
  private salonesService = inject(SalonesService);
  private router = inject(Router);

  salones = signal(SALONES);
  cargando = signal(true);
  nombreSalon = '';
  mensajeBusqueda = '';

  ngOnInit(): void {
    this.salonesService.list().subscribe({
      next: (salones) => {
        this.salones.set(salones);
        this.cargando.set(false);
      },
      error: () => {
        // Los datos iniciales permiten consultar la vista durante el desarrollo sin API.
        this.cargando.set(false);
      },
    });
  }

  buscarSalon(): void {
    const busqueda = this.normalizar(this.nombreSalon);
    const salon = this.salones().find((item) => this.normalizar(item.nombre) === busqueda);

    if (salon) {
      this.mensajeBusqueda = '';
      void this.router.navigate(['/salones', salon.slug]);
      return;
    }

    this.mensajeBusqueda = this.nombreSalon.trim()
      ? 'No encontramos un salón con ese nombre. Selecciona una opción de la lista.'
      : 'Escribe o selecciona el nombre de un salón.';
  }

  private normalizar(valor: string): string {
    return valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
