import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EventosService } from '../../../../../core/services/eventos.service';
import { BitacoraService } from '../../../../../core/services/bitacora.service';
import { EventoPost } from '../../../../../shared/models/evento.model';

@Component({
  selector: 'app-eventos-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './eventos-dashboard.component.html',
})
export class EventosDashboardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private eventos = inject(EventosService);
  private auth = inject(BitacoraService);
  private router = inject(Router);

  cargandoLista = signal(false);
  cargandoForm = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  datos = signal<EventoPost[]>([]);
  mostrarConfirmacionLogout = signal(false);

  /** Imágenes actuales del evento seleccionado (vienen del backend). */
  imagenesActuales = signal<string[]>([]);
  /** Imágenes nuevas elegidas por el admin (File + previews). */
  imagenesNuevas = signal<File[]>([]);
  previewImagenes = signal<string[]>([]);

  readonly MAX_IMAGENES = 10;

  /** Si se quiere borrar las imágenes actuales (sin subir nuevas). */
  borrarImagenesActuales = signal(false);

  form = this.fb.group({
    id: [null as number | null],
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.required]],
    event_date: ['', [Validators.required]],
    location: ['', [Validators.required, Validators.maxLength(255)]],
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
    this.eventos.list(100).subscribe({
      next: (resp) => {
        this.datos.set(resp);
        this.cargandoLista.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.mensaje || err?.message || 'Error al cargar eventos.');
        this.cargandoLista.set(false);
      },
    });
  }

  seleccionar(evento: EventoPost): void {
    this.form.setValue({
      id: evento.id,
      title: evento.title,
      description: evento.description,
      event_date: this.toDateTimeLocal(evento.event_date),
      location: evento.location,
      author: evento.author,
    });
    this.imagenesActuales.set(evento.images ?? []);
    this.borrarImagenesActuales.set(false);
    this.imagenesNuevas.set([]);
    // Revoke de previews previas (si existían)
    const prev = this.previewImagenes();
    for (const u of prev) URL.revokeObjectURL(u);
    this.previewImagenes.set([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  limpiarFormulario(): void {
    this.form.reset({
      id: null,
      title: '',
      description: '',
      event_date: '',
      location: '',
      author: '',
    });
    const prev = this.previewImagenes();
    for (const u of prev) URL.revokeObjectURL(u);
    this.previewImagenes.set([]);
    this.imagenesNuevas.set([]);
    this.imagenesActuales.set([]);
    this.borrarImagenesActuales.set(false);
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newFiles = Array.from(input.files ?? []);

    if (!newFiles.length) return;
    this.error.set(null);
    this.success.set(null);

    const actuales = this.imagenesNuevas();
    const restantes = this.MAX_IMAGENES - actuales.length;
    if (restantes <= 0) {
      this.error.set(`Ya alcanzaste el máximo de ${this.MAX_IMAGENES} imágenes.`);
      input.value = '';
      return;
    }

    const toAdd = newFiles.slice(0, restantes);
    const combined = [...actuales, ...toAdd];

    // Limpiar previews previas y recrearlas (se acumulan)
    const prev = this.previewImagenes();
    for (const u of prev) URL.revokeObjectURL(u);
    this.previewImagenes.set(combined.map((f) => URL.createObjectURL(f)));
    this.imagenesNuevas.set(combined);

    input.value = '';
  }

  limpiarSeleccionImgenes(): void {
    const prev = this.previewImagenes();
    for (const u of prev) URL.revokeObjectURL(u);
    this.previewImagenes.set([]);
    this.imagenesNuevas.set([]);
  }

  quitarImagenSeleccionada(index: number): void {
    const prevUrls = this.previewImagenes();
    const files = this.imagenesNuevas();
    if (index < 0 || index >= prevUrls.length || index >= files.length) return;

    // Liberar memoria del preview removido
    try {
      URL.revokeObjectURL(prevUrls[index]);
    } catch {
      // noop
    }

    const nextUrls = prevUrls.filter((_u, i) => i !== index);
    const nextFiles = files.filter((_f, i) => i !== index);

    this.previewImagenes.set(nextUrls);
    this.imagenesNuevas.set(nextFiles);
    this.error.set(null);
    this.success.set(null);
  }

  borrarImagenesActualesFn(): void {
    if (!confirm('¿Quitar todas las imágenes actuales de este evento?')) return;
    this.borrarImagenesActuales.set(true);
    this.imagenesActuales.set([]);
    this.error.set(null);
    this.success.set(null);
  }

  enviar(): void {
    if (this.form.invalid || this.cargandoForm()) return;
    this.cargandoForm.set(true);
    this.error.set(null);
    this.success.set(null);

    const value = this.form.value;
    const eventDateRaw = String(value.event_date ?? '').trim();
    const parsed = new Date(eventDateRaw);
    if (!eventDateRaw || Number.isNaN(parsed.getTime())) {
      this.cargandoForm.set(false);
      this.error.set('Fecha y hora del evento inválida.');
      return;
    }

    const payload = {
      title: String(value.title ?? '').trim(),
      description: String(value.description ?? '').trim(),
      event_date: parsed.toISOString(),
      location: String(value.location ?? '').trim(),
      author: String(value.author ?? '').trim(),
    };

    const id = value.id;
    const obs = id ? this.eventos.update(id, payload) : this.eventos.create(payload);

    obs.subscribe({
      next: (dato) => {
        const eventId = dato.id;
        const files = this.imagenesNuevas();
        if (files.length) {
          this.eventos.replaceImages(eventId, files).subscribe({
            next: () => {
              this.cargandoForm.set(false);
              this.success.set(id ? 'Evento actualizado con imágenes.' : 'Evento creado con imágenes.');
              this.error.set(null);
              this.limpiarFormulario();
              this.cargar();
              setTimeout(() => this.success.set(null), 4000);
            },
            error: (err) => {
              this.cargandoForm.set(false);
              this.error.set(err?.error?.mensaje || err?.message || 'Error al subir imágenes del evento.');
            },
          });
          return;
        }

        if (this.borrarImagenesActuales()) {
          this.eventos.deleteImages(eventId).subscribe({
            next: () => {
              this.cargandoForm.set(false);
              this.success.set(id ? 'Evento actualizado (sin imágenes).' : 'Evento creado (sin imágenes).');
              this.error.set(null);
              this.limpiarFormulario();
              this.cargar();
              setTimeout(() => this.success.set(null), 4000);
            },
            error: (err) => {
              this.cargandoForm.set(false);
              this.error.set(err?.error?.mensaje || err?.message || 'Error al eliminar imágenes del evento.');
            },
          });
          return;
        }

        this.cargandoForm.set(false);
        this.success.set(id ? 'Evento actualizado correctamente.' : 'Evento creado correctamente.');
        this.error.set(null);
        this.limpiarFormulario();
        this.cargar();
        setTimeout(() => this.success.set(null), 4000);
      },
      error: (err) => {
        this.cargandoForm.set(false);
        this.error.set(err?.error?.mensaje || err?.message || 'Error al guardar el evento.');
      },
    });
  }

  eliminar(evento: EventoPost): void {
    if (!confirm(`¿Eliminar el evento "${evento.title}"?`)) return;
    this.cargandoForm.set(true);
    this.error.set(null);
    this.success.set(null);

    this.eventos.delete(evento.id).subscribe({
      next: () => {
        this.cargandoForm.set(false);
        this.success.set('Evento eliminado correctamente.');
        this.limpiarFormulario();
        this.cargar();
        setTimeout(() => this.success.set(null), 4000);
      },
      error: (err) => {
        this.cargandoForm.set(false);
        this.error.set(err?.error?.mensaje || err?.message || 'Error al eliminar el evento.');
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
    this.auth.logout();
    this.router.navigateByUrl('/admin/login');
  }

  private toDateTimeLocal(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }
}

