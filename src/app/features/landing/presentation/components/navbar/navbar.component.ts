import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  menuOpen = false;
  publicacionesOpen = false;

  navLinks: { label: string; fragment?: string; route?: string; children?: { label: string; route: string }[] }[] =
    [
    { label: 'Inicio', fragment: 'inicio' },
    { label: 'Filosofía', fragment: 'filosofia' },
    { label: 'Equipo', fragment: 'equipo' },
    {
      label: 'Publicaciones',
      children: [
        { label: 'Bitácora', route: '/bitacora' },
        { label: 'Eventos', route: '/eventos' },
      ],
    },
    { label: 'Gemelo 3D', route: '/gemelo-3d' },
    { label: 'Librería 3D', route: '/libreria-3d' },
    { label: 'Únete', fragment: 'unete' },
  ];

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    if (!this.menuOpen) this.publicacionesOpen = false;
  }

  togglePublicaciones(): void {
    this.publicacionesOpen = !this.publicacionesOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.publicacionesOpen = false;
  }
}
