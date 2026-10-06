import { Component, Input, inject } from '@angular/core';
import { BitacoraService } from '../../../core/services/bitacora.service';

@Component({
  selector: 'app-sesion-activa',
  standalone: true,
  template: `
    @if (usuario) {
      <span [class]="clases">
        <span class="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.35)]"></span>
        <span>Sesión activa</span>
        <span class="font-semibold">{{ usuario }}</span>
      </span>
    }
  `,
})
export class SesionActivaComponent {
  private auth = inject(BitacoraService);

  /** `oscuro` para las barras azules del panel; `claro` para el menú público. */
  @Input() tono: 'claro' | 'oscuro' = 'oscuro';

  get usuario(): string | null {
    return this.auth.getUsuarioActual();
  }

  get clases(): string {
    const base =
      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap';
    return this.tono === 'claro'
      ? `${base} border-emerald-200 bg-emerald-50 text-emerald-950`
      : `${base} border-white/20 bg-white/10 text-white`;
  }
}
