import { Component, OnInit, inject, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Modelos3dService } from '../../../../../core/services/modelos3d.service';
import { BitacoraService } from '../../../../../core/services/bitacora.service';
import { Modelo3D } from '../../../../../shared/models/modelo3d.model';
import '@google/model-viewer';

@Component({
  selector: 'app-libreria3d-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './libreria3d-dashboard.component.html',
})
export class Libreria3dDashboardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private modelos = inject(Modelos3dService);
  private auth = inject(BitacoraService);
  private router = inject(Router);

  cargandoLista = signal(false);
  cargandoForm = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  datos = signal<Modelo3D[]>([]);
  mostrarConfirmacionLogout = signal(false);

  archivoGlb = signal<File | null>(null);
  archivoGlbNombre = signal('');
  reemplazarArchivo = signal(false);
  archivoReemplazo = signal<File | null>(null);

  categoriasDb = signal<string[]>([]);
  mostrarInputCustomCategoria = signal(false);

  readonly CATEGORIAS_PREDEFINIDAS = [
    'Mobiliario',
    'Equipos Eléctricos',
    'Infraestructura',
    'Climatización',
    'Tecnología',
    'Otro',
  ];

  todasCategorias = computed(() => {
    const dbCats = this.categoriasDb();
    const merged = new Set([...this.CATEGORIAS_PREDEFINIDAS, ...dbCats]);
    return [...merged].sort();
  });

  form = this.fb.group({
    id: [null as number | null],
    name: ['', [Validators.required, Validators.maxLength(255)]],
    category: ['', [Validators.required, Validators.maxLength(100)]],
    customCategory: [''],
    description: [''],
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
    this.modelos.list(500).subscribe({
      next: (resp) => {
        this.datos.set(resp);
        this.cargandoLista.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.mensaje || err?.message || 'Error al cargar los modelos.');
        this.cargandoLista.set(false);
      },
    });
    this.modelos.categorias().subscribe({
      next: (cats) => this.categoriasDb.set(cats),
    });
  }

  onCategoriaChange(): void {
    const val = this.form.get('category')?.value;
    this.mostrarInputCustomCategoria.set(val === '__nueva__');
    if (val !== '__nueva__') {
      this.form.get('customCategory')?.setValue('');
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.glb')) {
      this.error.set('Solo se aceptan archivos .glb');
      input.value = '';
      return;
    }
    if (this.editando) {
      this.reemplazarArchivo.set(true);
      this.archivoReemplazo.set(file);
    } else {
      this.archivoGlb.set(file);
      this.archivoGlbNombre.set(file.name);
    }
    input.value = '';
  }

  seleccionar(modelo: Modelo3D): void {
    const catInList = this.todasCategorias().includes(modelo.category);
    this.form.setValue({
      id: modelo.id,
      name: modelo.name,
      category: catInList ? modelo.category : '__nueva__',
      customCategory: catInList ? '' : modelo.category,
      description: modelo.description ?? '',
      author: modelo.author,
    });
    this.mostrarInputCustomCategoria.set(!catInList);
    this.archivoGlb.set(null);
    this.archivoGlbNombre.set('');
    this.reemplazarArchivo.set(false);
    this.archivoReemplazo.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  limpiarFormulario(): void {
    this.form.reset({
      id: null,
      name: '',
      category: '',
      customCategory: '',
      description: '',
      author: '',
    });
    this.archivoGlb.set(null);
    this.archivoGlbNombre.set('');
    this.reemplazarArchivo.set(false);
    this.archivoReemplazo.set(null);
    this.mostrarInputCustomCategoria.set(false);
  }

  enviar(): void {
    if (this.form.invalid || this.cargandoForm()) return;

    const value = this.form.value;
    let category = String(value.category ?? '').trim();
    if (category === '__nueva__') {
      category = String(value.customCategory ?? '').trim();
      if (!category) {
        this.error.set('Escribe el nombre de la nueva categoría.');
        return;
      }
    }

    const payload = {
      name: String(value.name ?? '').trim(),
      category,
      description: value.description ? String(value.description).trim() : undefined,
      author: String(value.author ?? '').trim(),
    };

    this.cargandoForm.set(true);
    this.error.set(null);
    this.success.set(null);

    const id = value.id;
    if (id) {
      this.modelos.update(id, payload).subscribe({
        next: () => {
          const replacement = this.archivoReemplazo();
          if (this.reemplazarArchivo() && replacement) {
            this.modelos.replaceFile(id, replacement).subscribe({
              next: () => this.finalizarExito('Modelo actualizado con nuevo archivo.'),
              error: (err) => this.finalizarError(err, 'Error al reemplazar archivo.'),
            });
          } else {
            this.finalizarExito('Modelo actualizado correctamente.');
          }
        },
        error: (err) => this.finalizarError(err, 'Error al actualizar el modelo.'),
      });
    } else {
      const file = this.archivoGlb();
      if (!file) {
        this.cargandoForm.set(false);
        this.error.set('Debes seleccionar un archivo .glb para crear un modelo.');
        return;
      }
      this.modelos.create(payload, file).subscribe({
        next: () => this.finalizarExito('Modelo creado correctamente.'),
        error: (err) => this.finalizarError(err, 'Error al crear el modelo.'),
      });
    }
  }

  eliminar(modelo: Modelo3D): void {
    if (!confirm(`¿Eliminar el modelo "${modelo.name}"?`)) return;
    this.cargandoForm.set(true);
    this.error.set(null);
    this.success.set(null);
    this.modelos.delete(modelo.id).subscribe({
      next: () => {
        this.cargandoForm.set(false);
        this.success.set('Modelo eliminado correctamente.');
        this.limpiarFormulario();
        this.cargar();
        setTimeout(() => this.success.set(null), 4000);
      },
      error: (err) => this.finalizarError(err, 'Error al eliminar el modelo.'),
    });
  }

  formatSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  private finalizarExito(mensaje: string): void {
    this.cargandoForm.set(false);
    this.success.set(mensaje);
    this.error.set(null);
    this.limpiarFormulario();
    this.cargar();
    setTimeout(() => this.success.set(null), 4000);
  }

  private finalizarError(err: any, fallback: string): void {
    this.cargandoForm.set(false);
    this.error.set(err?.error?.mensaje || err?.message || fallback);
  }
}
