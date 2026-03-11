import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';

const FACULTAD_CIVIL_EMBED =
  'https://bimch.utp.ac.pa/projects/18fae223d7/models/04fb93c3e1#embed=%7B%22isEnabled%22%3Atrue%7D';
const CAFETIN_EMBED =
  'https://bimch.utp.ac.pa/projects/18fae223d7/models/085e61af29#embed=%7B%22isEnabled%22%3Atrue%7D';

@Component({
  selector: 'app-gemelo-3d',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent],
  templateUrl: './gemelo-3d.component.html',
  styleUrl: './gemelo-3d.component.css',
})
export class Gemelo3dComponent {
  facultadCivilUrl: SafeResourceUrl;
  cafetinUrl: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {
    this.facultadCivilUrl = this.sanitizer.bypassSecurityTrustResourceUrl(FACULTAD_CIVIL_EMBED);
    this.cafetinUrl = this.sanitizer.bypassSecurityTrustResourceUrl(CAFETIN_EMBED);
  }
}
