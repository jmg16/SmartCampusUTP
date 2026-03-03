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
      imagenUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader',
    },
    {
      nombre: 'Javier Martínez',
      cargo: 'Desarrollador de Software',
      descripcion: 'Desarrollo de aplicaciones y sistemas que integran IoT y la plataforma del campus inteligente.',
      imagenUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=javier',
    },
  ];
}
