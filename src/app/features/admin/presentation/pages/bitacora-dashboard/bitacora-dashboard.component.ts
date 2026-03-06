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
  success = signal<string | null>(null);
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

  /** Archivo de portada seleccionado (aún no enviado). */
  coverFile = signal<File | null>(null);
  /** URL de la portada actual del avance (al editar). */
  coverImageUrl = signal<string | null>(null);
  /** Subiendo portada (para deshabilitar botones). */
  subiendoPortada = signal(false);
  /** URL de vista previa del archivo recién elegido (blob). */
  previewBlobUrl = signal<string | null>(null);

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
    this.coverFile.set(null);
    this.coverImageUrl.set(log.cover_image ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  limpiarFormulario(): void {
    const old = this.previewBlobUrl();
    if (old) URL.revokeObjectURL(old);
    this.previewBlobUrl.set(null);
    this.form.reset({
      id: null,
      title: '',
      description: '',
      status_tags: 'En progreso',
      author: '',
    });
    this.coverFile.set(null);
    this.coverImageUrl.set(null);
  }

  private mostrarExito(mensaje: string): void {
    this.success.set(mensaje);
    this.error.set(null);
    setTimeout(() => this.success.set(null), 4000);
  }

  enviar(): void {
    if (this.form.invalid || this.cargandoForm()) return;
    this.error.set(null);
    this.success.set(null);
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
      next: (dato) => {
        const id = dato.id;
        const file = this.coverFile();
        if (file) {
          this.subiendoPortada.set(true);
          this.bitacora.uploadCover(id, file).subscribe({
            next: () => {
              this.subiendoPortada.set(false);
              this.cargandoForm.set(false);
              this.coverFile.set(null);
              this.mostrarExito('Avance guardado correctamente con imagen de portada.');
              this.limpiarFormulario();
              this.cargar();
            },
            error: (err) => {
              this.subiendoPortada.set(false);
              this.cargandoForm.set(false);
              this.error.set(
                err?.error?.mensaje || err?.message || 'Error al subir la imagen de portada.'
              );
            },
          });
        } else {
          this.cargandoForm.set(false);
          this.mostrarExito(this.editando ? 'Avance actualizado correctamente.' : 'Avance guardado correctamente.');
          this.limpiarFormulario();
          this.cargar();
        }
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
    this.error.set(null);
    this.success.set(null);
    this.cargandoForm.set(true);
    this.bitacora.delete(log.id).subscribe({
      next: () => {
        this.cargandoForm.set(false);
        this.mostrarExito('Avance eliminado correctamente.');
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

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const old = this.previewBlobUrl();
    if (old) URL.revokeObjectURL(old);
    this.previewBlobUrl.set(file ? URL.createObjectURL(file) : null);
    this.coverFile.set(file ?? null);
    input.value = '';
  }

  quitarPortada(): void {
    if (this.subiendoPortada()) return;
    const id = this.form.get('id')?.value as number | null;
    if (this.coverFile()) {
      const old = this.previewBlobUrl();
      if (old) URL.revokeObjectURL(old);
      this.previewBlobUrl.set(null);
      this.coverFile.set(null);
      return;
    }
    if (!id || !this.coverImageUrl()) return;
    this.subiendoPortada.set(true);
    this.bitacora.removeCover(id).subscribe({
      next: () => {
        this.subiendoPortada.set(false);
        this.coverImageUrl.set(null);
        this.cargar();
      },
      error: (err) => {
        this.subiendoPortada.set(false);
        this.error.set(
          err?.error?.mensaje || err?.message || 'Error al quitar la imagen de portada.'
        );
      },
    });
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

