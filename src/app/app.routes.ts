import { Routes } from '@angular/router';
import { bitacoraAuthGuard } from './core/guards/bitacora-auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/presentation/pages/landing-page/landing-page.component').then(
        (m) => m.LandingPageComponent
      ),
  },
  {
    path: 'bitacora',
    loadComponent: () =>
      import('./features/landing/presentation/pages/bitacora-public/bitacora-public.component').then(
        (m) => m.BitacoraPublicComponent
      ),
  },
  {
    path: 'admin',
    redirectTo: 'admin/login',
    pathMatch: 'full',
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/presentation/pages/admin-login/admin-login.component').then(
        (m) => m.AdminLoginComponent
      ),
  },
  {
    path: 'admin/bitacora',
    canActivate: [bitacoraAuthGuard],
    loadComponent: () =>
      import(
        './features/admin/presentation/pages/bitacora-dashboard/bitacora-dashboard.component'
      ).then((m) => m.BitacoraDashboardComponent),
  },
  { path: '**', redirectTo: '' },
];
