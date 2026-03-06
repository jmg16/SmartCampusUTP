import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BitacoraService } from '../../../../../core/services/bitacora.service';
import { ProjectLog, BitacoraStatus } from '../../../../../shared/models/bitacora.model';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-bitacora-post-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './bitacora-post-detail.component.html',
  styleUrl: './bitacora-post-detail.component.css',
})
export class BitacoraPostDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private bitacora = inject(BitacoraService);

  post = signal<ProjectLog | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const idNum = id ? parseInt(id, 10) : NaN;
    if (!id || isNaN(idNum) || idNum <= 0) {
      this.error.set('Avance no encontrado.');
      this.cargando.set(false);
      return;
    }
    this.bitacora.getById(idNum).subscribe({
      next: (dato) => {
        this.post.set(dato);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el avance.');
        this.cargando.set(false);
      },
    });
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
