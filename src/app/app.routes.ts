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
    path: 'bitacora/avance/:id',
    loadComponent: () =>
      import('./features/landing/presentation/pages/bitacora-post-detail/bitacora-post-detail.component').then(
        (m) => m.BitacoraPostDetailComponent
      ),
  },
  {
    path: 'eventos',
    loadComponent: () =>
      import('./features/landing/presentation/pages/eventos-public/eventos-public.component').then(
        (m) => m.EventosPublicComponent
      ),
  },
  {
    path: 'gemelo-3d',
    loadComponent: () =>
      import('./features/landing/presentation/pages/gemelo-3d/gemelo-3d.component').then(
        (m) => m.Gemelo3dComponent
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
  {
    path: 'admin/eventos',
    canActivate: [bitacoraAuthGuard],
    loadComponent: () =>
      import('./features/admin/presentation/pages/eventos-dashboard/eventos-dashboard.component').then(
        (m) => m.EventosDashboardComponent
      ),
  },
  { path: '**', redirectTo: '' },
];
