import { Component } from '@angular/core';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { HeroComponent } from '../../components/hero/hero.component';
import { FilosofiaComponent } from '../../components/filosofia/filosofia.component';
import { TeamComponent } from '../../components/team/team.component';
import { FormularioComponent } from '../../components/formulario/formulario.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    NavbarComponent,
    HeroComponent,
    FilosofiaComponent,
    TeamComponent,
    FormularioComponent,
    FooterComponent,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
})
export class LandingPageComponent {}
