import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MiembroEquipo {
  nombre: string;
  cargo: string;
  descripcion: string;
  imagenUrl: string;
}

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team.component.html',
  styleUrl: './team.component.css',
})
export class TeamComponent {
  miembros: MiembroEquipo[] = [
    {
      nombre: 'Investigador a Tiempo Completo',
      cargo: 'Líder e infraestructura',
      descripcion: 'Responsable de la dirección del proyecto y del diseño de la infraestructura tecnológica del Smart Campus.',
      imagenUrl: 'assets/WhatsApp Image 2026-03-13 at 09.48.39.jpeg',
    },
    {
      nombre: 'Javier Martínez',
      cargo: 'Desarrollador de Software',
      descripcion: 'Desarrollo de aplicaciones y sistemas que integran IoT y la plataforma del campus inteligente.',
      imagenUrl: 'assets/Big.PNG',
    },
  ];
}
