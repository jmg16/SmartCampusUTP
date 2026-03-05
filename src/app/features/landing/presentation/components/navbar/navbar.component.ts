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

  navLinks: { label: string; fragment?: string; route?: string }[] = [
    { label: 'Inicio', fragment: 'inicio' },
    { label: 'Filosofía', fragment: 'filosofia' },
    { label: 'Equipo', fragment: 'equipo' },
    { label: 'Bitácora', route: '/bitacora' },
    { label: 'Únete', fragment: 'unete' },
  ];

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}
