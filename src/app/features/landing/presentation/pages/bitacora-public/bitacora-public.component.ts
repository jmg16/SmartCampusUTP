import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BitacoraService } from '../../../../../core/services/bitacora.service';
import { ProjectLog, BitacoraStatus } from '../../../../../shared/models/bitacora.model';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-bitacora-public',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './bitacora-public.component.html',
  styleUrl: './bitacora-public.component.css',
})
export class BitacoraPublicComponent implements OnInit {
  private bitacora = inject(BitacoraService);
  private router = inject(Router);

  logs = signal<ProjectLog[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  filtroEstado = signal<BitacoraStatus | ''>('');
  busqueda = signal('');

  /** Lista filtrada por texto de búsqueda (título, autor o descripción). */
  logsFiltrados = computed(() => {
    const lista = this.logs();
    const q = this.busqueda().trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(
      (log) =>
        log.title.toLowerCase().includes(q) ||
        log.author.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q)
    );
  });

  readonly estados: BitacoraStatus[] = ['En progreso', 'Completado', 'Bloqueado'];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    const status = this.filtroEstado() || undefined;
    this.bitacora.list(100, status).subscribe({
      next: (datos) => {
        this.logs.set(datos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el historial. Intenta de nuevo más tarde.');
        this.cargando.set(false);
      },
    });
  }

  onFiltroChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value as BitacoraStatus | '';
    this.filtroEstado.set(value);
    this.cargar();
  }

  irADetalle(id: number): void {
    this.router.navigate(['/bitacora/avance', id]);
  }

  statusClass(status: BitacoraStatus): string {
    switch (status) {
      case 'En progreso':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Completado':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Bloqueado':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  }
}
