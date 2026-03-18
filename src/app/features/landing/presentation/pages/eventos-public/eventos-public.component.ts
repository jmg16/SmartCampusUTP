import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventosService } from '../../../../../core/services/eventos.service';
import { EventoPost } from '../../../../../shared/models/evento.model';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-eventos-public',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent],
  templateUrl: './eventos-public.component.html',
  styleUrl: './eventos-public.component.css',
})
export class EventosPublicComponent implements OnInit {
  private eventos = inject(EventosService);

  datos = signal<EventoPost[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  busqueda = signal('');

  filtrados = computed(() => {
    const q = this.normalize(this.busqueda());
    if (!q) return this.datos();
    return this.datos().filter((e) => {
      const haystack = [
        this.normalize(e.title),
        this.normalize(e.description),
        this.normalize(e.location),
        this.normalize(e.author),
      ].join(' ');
      return haystack.includes(q);
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.eventos.list(100).subscribe({
      next: (resp) => {
        this.datos.set(resp);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los eventos. Intenta más tarde.');
        this.cargando.set(false);
      },
    });
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}

