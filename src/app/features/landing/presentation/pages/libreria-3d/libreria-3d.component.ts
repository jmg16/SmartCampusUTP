import { Component, OnInit, computed, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Modelos3dService } from '../../../../../core/services/modelos3d.service';
import { Modelo3D } from '../../../../../shared/models/modelo3d.model';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';
import '@google/model-viewer';

@Component({
  selector: 'app-libreria-3d',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './libreria-3d.component.html',
})
export class Libreria3dComponent implements OnInit {
  private modelos3d = inject(Modelos3dService);

  datos = signal<Modelo3D[]>([]);
  categorias = signal<string[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  busqueda = signal('');
  categoriaSeleccionada = signal('');

  readonly CATEGORIAS_PREDEFINIDAS = [
    'Mobiliario',
    'Equipos Eléctricos',
    'Infraestructura',
    'Climatización',
    'Tecnología',
    'Otro',
  ];

  todasCategorias = computed(() => {
    const dbCats = this.categorias();
    const merged = new Set([...this.CATEGORIAS_PREDEFINIDAS, ...dbCats]);
    return [...merged].sort();
  });

  filtrados = computed(() => {
    const q = this.normalize(this.busqueda());
    const cat = this.categoriaSeleccionada();
    let result = this.datos();
    if (cat) {
      result = result.filter((m) => m.category === cat);
    }
    if (q) {
      result = result.filter((m) => {
        const haystack = [
          this.normalize(m.name),
          this.normalize(m.category),
          this.normalize(m.reference_code ?? ''),
          this.normalize(m.description ?? ''),
          this.normalize(m.author),
        ].join(' ');
        return haystack.includes(q);
      });
    }
    return result;
  });

  /** Modelos filtrados agrupados por categoría, con orden de secciones estable. */
  agrupadosPorCategoria = computed(() => {
    const items = this.filtrados();
    const map = new Map<string, Modelo3D[]>();
    for (const m of items) {
      const cat = (m.category || 'Sin categoría').trim() || 'Sin categoría';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(m);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    }
    const predefined = this.CATEGORIAS_PREDEFINIDAS;
    const keys = [...map.keys()];
    keys.sort((a, b) => {
      const ia = predefined.indexOf(a);
      const ib = predefined.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, 'es', { sensitivity: 'base' });
    });
    return keys.map((category) => ({ category, models: map.get(category)! }));
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.modelos3d.list(500).subscribe({
      next: (resp) => {
        this.datos.set(resp);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los modelos 3D. Intenta más tarde.');
        this.cargando.set(false);
      },
    });
    this.modelos3d.categorias().subscribe({
      next: (cats) => this.categorias.set(cats),
    });
  }

  modeloSeleccionado = signal<Modelo3D | null>(null);

  abrirDetalle(modelo: Modelo3D): void {
    this.modeloSeleccionado.set(modelo);
    this.modelos3d.getById(modelo.id).subscribe({
      next: (fresh) => this.modeloSeleccionado.set(fresh),
      error: () => {},
    });
  }

  cerrarDetalle(): void {
    this.modeloSeleccionado.set(null);
  }

  formatSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
