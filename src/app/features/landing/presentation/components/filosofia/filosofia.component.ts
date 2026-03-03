import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-filosofia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filosofia.component.html',
  styleUrl: './filosofia.component.css',
})
export class FilosofiaComponent {
  pilares = [
    {
      titulo: 'Innovación continua',
      descripcion: 'Aplicamos y adoptamos las últimas tecnologías para mejorar día a día la experiencia del campus.',
      icono: 'lightbulb',
    },
    {
      titulo: 'Sostenibilidad',
      descripcion: 'Uso eficiente de recursos y prácticas responsables con el medio ambiente.',
      icono: 'leaf',
    },
    {
      titulo: 'Seguridad inteligente',
      descripcion: 'Monitoreo y control que garantizan un entorno seguro para toda la comunidad.',
      icono: 'shield',
    },
  ];
}
