import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';

interface TwinModel {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  url: string;
}

@Component({
  selector: 'app-gemelo-3d',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent],
  templateUrl: './gemelo-3d.component.html',
  styleUrl: './gemelo-3d.component.css',
})
export class Gemelo3dComponent {
  models: TwinModel[] = [
    {
      id: 'civil',
      title: 'Facultad de Civil',
      subtitle: 'Edificio académico',
      description:
        'Recorrido digital del edificio de la Facultad de Ingeniería Civil del campus UTP Chiriquí.',
      url: 'https://bimch.utp.ac.pa/projects/18fae223d7/models/04fb93c3e1#embed=%7B%22isEnabled%22%3Atrue%7D',
    },
    {
      id: 'cafetin',
      title: 'Cafetín',
      subtitle: 'Servicios estudiantiles',
      description:
        'Vista 3D del cafetín del campus, pensada para explorar flujos de personas y puntos de servicio.',
      url: 'https://bimch.utp.ac.pa/projects/18fae223d7/models/085e61af29#embed=%7B%22isEnabled%22%3Atrue%7D',
    },
    {
      id: 'sistemas',
      title: 'Facultad de Sistemas',
      subtitle: 'Laboratorios y aulas tecnológicas',
      description:
        'Modelo 3D de la zona de Sistemas, ideal para analizar infraestructura tecnológica y flujos de estudiantes.',
      url: 'https://bimch.utp.ac.pa/projects/18fae223d7/models/ec603815fc#embed=%7B%22isEnabled%22%3Atrue%7D',
    },
    {
      id: 'ciencia-tecnologia',
      title: 'Facultad de Ciencia y Tecnología',
      subtitle: 'Edificio de innovación',
      description:
        'Gemelo digital del edificio de Ciencia y Tecnología, pensado para mostrar laboratorios y espacios de investigación.',
      url: 'https://bimch.utp.ac.pa/projects/18fae223d7/models/4c1ad7027c#embed=%7B%22isEnabled%22%3Atrue%7D',
    },
    {
      id: 'talleres',
      title: 'Talleres',
      subtitle: 'Áreas prácticas',
      description:
        'Modelo 3D de los talleres del campus, útil para planificación de seguridad, logística y prácticas de laboratorio.',
      url: 'https://bimch.utp.ac.pa/projects/18fae223d7/models/133fa6e1d8#embed=%7B%22isEnabled%22%3Atrue%7D',
    },
    {
      id: 'electrica',
      title: 'Facultad de Eléctrica',
      subtitle: 'Laboratorios eléctricos y electrónicos',
      description:
        'Gemelo digital de la Facultad de Ingeniería Eléctrica, con énfasis en laboratorios y zonas de práctica.',
      url: 'https://bimch.utp.ac.pa/projects/18fae223d7/models/1c557af3de#embed=%7B%22isEnabled%22%3Atrue%7D',
    },
    {
      id: 'cafeteria',
      title: 'Cafetería',
      subtitle: 'Zona de comidas',
      description:
        'Modelo 3D de la cafetería del campus, pensado para analizar aforos, circulación y áreas de servicio.',
      url: 'https://bimch.utp.ac.pa/projects/18fae223d7/models/71a33172b0#embed=%7B%22isEnabled%22%3Atrue%7D',
    },
  ];

  selected: TwinModel | null = null;
  selectedUrl: SafeResourceUrl | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  selectModel(model: TwinModel): void {
    this.selected = model;
    this.selectedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(model.url);
    // Scroll al visor cuando se renderice (tras el *ngIf)
    setTimeout(() => {
      document.getElementById('visor-gemelo-3d')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  clearSelection(): void {
    this.selected = null;
    this.selectedUrl = null;
  }
}
