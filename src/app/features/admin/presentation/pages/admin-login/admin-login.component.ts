import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BitacoraService } from '../../../../../core/services/bitacora.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-login.component.html',
})
export class AdminLoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bitacora = inject(BitacoraService);
  private router = inject(Router);

  cargando = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    usuario: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  get usuario() {
    return this.form.get('usuario');
  }

  get password() {
    return this.form.get('password');
  }

  ngOnInit(): void {
    if (this.bitacora.isAuthenticated()) {
      this.router.navigateByUrl('/admin/bitacora');
    }
  }

  async enviar(): Promise<void> {
    if (this.form.invalid || this.cargando()) return;
    this.error.set(null);
    this.cargando.set(true);

    this.bitacora
      .login({
        usuario: String(this.usuario?.value ?? '').trim(),
        password: String(this.password?.value ?? ''),
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.router.navigateByUrl('/admin/bitacora');
        },
        error: (err) => {
          this.cargando.set(false);
          this.error.set(
            err?.error?.mensaje || err?.message || 'No se pudo iniciar sesión. Intenta de nuevo.'
          );
        },
      });
  }
}

