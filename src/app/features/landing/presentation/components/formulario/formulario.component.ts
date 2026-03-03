import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../../../core/services/api.service';

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './formulario.component.html',
  styleUrl: './formulario.component.css',
})
export class FormularioComponent {
  form: FormGroup;
  enviado = false;
  error: string | null = null;
  cargando = false;

  roles = [
    { value: 'estudiante', label: 'Estudiante' },
    { value: 'docente', label: 'Docente' },
    { value: 'administrativo', label: 'Personal administrativo' },
    { value: 'investigador', label: 'Investigador' },
    { value: 'otro', label: 'Otro' },
  ];

  constructor(
    private fb: FormBuilder,
    private api: ApiService
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      correo: ['', [Validators.required, Validators.email, Validators.pattern(/@utp\.ac\.pa$/i)]],
      rol: ['', Validators.required],
    });
  }

  get nombre() {
    return this.form.get('nombre');
  }
  get correo() {
    return this.form.get('correo');
  }
  get rol() {
    return this.form.get('rol');
  }

  enviar(): void {
    if (this.form.invalid || this.cargando) return;
    this.error = null;
    this.cargando = true;
    this.api.registrarInteresado(this.form.value).subscribe({
      next: () => {
        this.enviado = true;
        this.form.reset();
        this.cargando = false;
      },
      error: (err) => {
        this.error = err?.error?.mensaje || err?.message || 'Error al enviar. Intenta de nuevo.';
        this.cargando = false;
      },
    });
  }
}
