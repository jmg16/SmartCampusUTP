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
  ];

  selected: TwinModel | null = null;
  selectedUrl: SafeResourceUrl | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  selectModel(model: TwinModel): void {
    this.selected = model;
    this.selectedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(model.url);
  }

  clearSelection(): void {
    this.selected = null;
    this.selectedUrl = null;
  }
}
