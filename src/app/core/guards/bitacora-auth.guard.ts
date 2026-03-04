import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BitacoraService } from '../services/bitacora.service';

export const bitacoraAuthGuard: CanActivateFn = () => {
  const auth = inject(BitacoraService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/admin/login']);
};

