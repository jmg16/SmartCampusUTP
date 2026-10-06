import { WritableSignal, effect } from '@angular/core';

export function ocultarAvisos(avisos: WritableSignal<string | null>[], ms = 4000): void {
  effect((onCleanup) => {
    if (!avisos.some((aviso) => aviso())) return;
    const id = setTimeout(() => {
      for (const aviso of avisos) aviso.set(null);
    }, ms);
    onCleanup(() => clearTimeout(id));
  });
}
