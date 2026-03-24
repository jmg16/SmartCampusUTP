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
  openDropdown = '';

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
    {
      label: 'Plataforma 3D',
      children: [
        { label: 'Gemelo Digital', route: '/gemelo-3d' },
        { label: 'Librería de Modelos', route: '/libreria-3d' },
      ],
    },
    { label: 'Únete', fragment: 'unete' },
  ];

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    if (!this.menuOpen) this.openDropdown = '';
  }

  toggleDropdown(label: string): void {
    this.openDropdown = this.openDropdown === label ? '' : label;
  }

  isDropdownOpen(label: string): boolean {
    return this.openDropdown === label;
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.openDropdown = '';
  }
}
