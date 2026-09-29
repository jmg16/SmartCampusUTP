import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BitacoraService } from '../../../../../core/services/bitacora.service';
import { EdificiosService } from '../../../../../core/services/edificios.service';
import { Modelos3dService } from '../../../../../core/services/modelos3d.service';
import { Edificio } from '../../../../../shared/models/edificio.model';
import { Modelo3D } from '../../../../../shared/models/modelo3d.model';
import '@google/model-viewer';

@Component({
  selector: 'app-edificios-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './edificios-dashboard.component.html',
})
export class EdificiosDashboardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private edificiosService = inject(EdificiosService);
  private modelos3d = inject(Modelos3dService);
  private auth = inject(BitacoraService);
  private router = inject(Router);

  datos = signal<Edificio[]>([]);
  modelos = signal<Modelo3D[]>([]);
  cargandoLista = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  form = this.fb.group({
    id: [null as number | null],
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    niveles: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
    modelo_id: [null as number | null],
  });

  ngOnInit(): void {
    this.cargar();
    this.modelos3d.list(200).subscribe({
      next: (modelos) => this.modelos.set(modelos),
      error: () => this.modelos.set([]),
    });
  }

  get editando(): boolean {
    return this.form.controls.id.value !== null;
  }

  cargar(): void {
    this.cargandoLista.set(true);
    this.edificiosService.list().subscribe({
      next: (edificios) => {
        this.datos.set(edificios);
        this.cargandoLista.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.mensaje || 'No se pudieron cargar los edificios.');
        this.cargandoLista.set(false);
      },
    });
  }

  seleccionar(edificio: Edificio): void {
    this.form.setValue({
      id: edificio.id,
      nombre: edificio.nombre,
      niveles: edificio.niveles,
      modelo_id: edificio.modelo_id,
    });
    this.error.set(null);
    this.success.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  limpiarFormulario(): void {
    this.form.reset({ id: null, nombre: '', niveles: 1, modelo_id: null });
  }

  enviar(): void {
    if (this.form.invalid || this.guardando()) return;
    const value = this.form.getRawValue();
    const payload = {
      nombre: String(value.nombre).trim(),
      niveles: Number(value.niveles),
      modelo_id: value.modelo_id ? Number(value.modelo_id) : null,
    };

    this.guardando.set(true);
    this.error.set(null);
    this.success.set(null);
    const request = value.id
      ? this.edificiosService.update(value.id, payload)
      : this.edificiosService.create(payload);

    request.subscribe({
      next: () => {
        this.guardando.set(false);
        this.success.set(value.id ? 'Edificio actualizado.' : 'Edificio creado.');
        this.limpiarFormulario();
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.mensaje || 'No se pudo guardar el edificio.');
      },
    });
  }

  eliminar(edificio: Edificio): void {
    if (!confirm(`¿Eliminar el edificio "${edificio.nombre}"?`)) return;
    this.edificiosService.delete(edificio.id).subscribe({
      next: () => {
        this.success.set('Edificio eliminado.');
        this.limpiarFormulario();
        this.cargar();
      },
      error: (err) => this.error.set(err?.error?.mensaje || 'No se pudo eliminar el edificio.'),
    });
  }

  cerrarSesion(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}
