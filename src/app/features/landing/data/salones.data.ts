import { Salon } from '../../../shared/models/salon.model';

export const SALONES: Salon[] = [
  {
    id: 1,
    slug: 'lab-sistemas-1',
    nombre: 'Laboratorio de Sistemas 1',
    edificio: 'Facultad de Sistemas',
    ubicacion: 'Planta baja',
    capacidad: 25,
    tipo: 'Laboratorio',
    descripcion:
      'Espacio para clases prácticas de programación, redes y desarrollo de software.',
    caracteristicas: ['Computadoras', 'Proyector', 'Aire acondicionado', 'Acceso a internet'],
    mobiliario: [],
    fotos: [],
  },
  {
    id: 2,
    slug: 'aula-201',
    nombre: 'Aula 201',
    edificio: 'Edificio Académico',
    ubicacion: 'Segundo piso',
    capacidad: 35,
    tipo: 'Aula',
    descripcion:
      'Salón de clases para actividades académicas, presentaciones y trabajo colaborativo.',
    caracteristicas: ['Proyector', 'Pizarra', 'Aire acondicionado', 'Tomas eléctricas'],
    mobiliario: [],
    fotos: [],
  },
  {
    id: 3,
    slug: 'lab-electrica',
    nombre: 'Laboratorio de Eléctrica',
    edificio: 'Facultad de Ingeniería Eléctrica',
    ubicacion: 'Planta baja',
    capacidad: 20,
    tipo: 'Laboratorio',
    descripcion:
      'Laboratorio equipado para prácticas de circuitos, electrónica y mediciones eléctricas.',
    caracteristicas: ['Mesas de trabajo', 'Equipos de medición', 'Proyector', 'Área de seguridad'],
    mobiliario: [],
    fotos: [],
  },
];

export function obtenerSalon(slug: string | null): Salon | undefined {
  return SALONES.find((salon) => salon.slug === slug);
}
