import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BitacoraService } from '../../../../../core/services/bitacora.service';
import { BitacoraStatus, ProjectLog } from '../../../../../shared/models/bitacora.model';

@Component({
  selector: 'app-bitacora-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './bitacora-dashboard.component.html',
})
export class BitacoraDashboardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bitacora = inject(BitacoraService);
  private router = inject(Router);

  cargandoLista = signal(false);
  cargandoForm = signal(false);
  error = signal<string | null>(null);
  logs = signal<ProjectLog[]>([]);

  readonly estados: BitacoraStatus[] = ['En progreso', 'Completado', 'Bloqueado'];

  filtroEstado = signal<BitacoraStatus | ''>('');
  mostrarConfirmacionLogout = signal(false);

  form = this.fb.group({
    id: [null as number | null],
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.required]],
    status_tags: ['En progreso' as BitacoraStatus, [Validators.required]],
    author: ['', [Validators.required, Validators.maxLength(255)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  get editando(): boolean {
    return !!this.form.get('id')?.value;
  }

  cargar(): void {
    this.cargandoLista.set(true);
    this.bitacora
      .list(100, this.filtroEstado() || undefined)
      .subscribe({
        next: (datos) => {
          this.logs.set(datos);
          this.cargandoLista.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.mensaje || err?.message || 'Error al cargar la bitácora.');
          this.cargandoLista.set(false);
        },
      });
  }

  seleccionar(log: ProjectLog): void {
    this.form.setValue({
      id: log.id,
      title: log.title,
      description: log.description,
      status_tags: log.status_tags,
      author: log.author,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  limpiarFormulario(): void {
    this.form.reset({
      id: null,
      title: '',
      description: '',
      status_tags: 'En progreso',
      author: '',
    });
  }

  enviar(): void {
    if (this.form.invalid || this.cargandoForm()) return;
    this.error.set(null);
    this.cargandoForm.set(true);

    const value = this.form.value;
    const payload = {
      title: String(value.title ?? '').trim(),
      description: String(value.description ?? '').trim(),
      status_tags: value.status_tags as BitacoraStatus,
      author: String(value.author ?? '').trim(),
    };

    const id = value.id;
    const obs = id
      ? this.bitacora.update(id, payload)
      : this.bitacora.create(payload);

    obs.subscribe({
      next: () => {
        this.cargandoForm.set(false);
        this.limpiarFormulario();
        this.cargar();
      },
      error: (err) => {
        this.cargandoForm.set(false);
        this.error.set(
          err?.error?.mensaje || err?.message || 'Error al guardar el avance. Intenta de nuevo.'
        );
      },
    });
  }

  eliminar(log: ProjectLog): void {
    if (!confirm(`¿Eliminar el avance "${log.title}"?`)) {
      return;
    }
    this.cargandoForm.set(true);
    this.bitacora.delete(log.id).subscribe({
      next: () => {
        this.cargandoForm.set(false);
        this.limpiarFormulario();
        this.cargar();
      },
      error: (err) => {
        this.cargandoForm.set(false);
        this.error.set(
          err?.error?.mensaje || err?.message || 'Error al eliminar el avance. Intenta de nuevo.'
        );
      },
    });
  }

  onFiltroChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as BitacoraStatus | '';
    this.cambiarFiltro(value);
  }

  cambiarFiltro(estado: BitacoraStatus | ''): void {
    this.filtroEstado.set(estado);
    this.cargar();
  }

  abrirConfirmacionLogout(): void {
    this.mostrarConfirmacionLogout.set(true);
  }

  cancelarCerrarSesion(): void {
    this.mostrarConfirmacionLogout.set(false);
  }

  confirmarCerrarSesion(): void {
    this.mostrarConfirmacionLogout.set(false);
    this.bitacora.logout();
    this.router.navigateByUrl('/admin/login');
  }
}

