export interface Mobiliario {
  nombre: string;
  cantidad: number;
  serie: string;
}

export interface Salon {
  id: number;
  slug: string;
  nombre: string;
  edificio: string;
  ubicacion: string;
  capacidad: number;
  tipo: string;
  descripcion: string;
  caracteristicas: string[];
  mobiliario: Mobiliario[];
  fotos: string[];
  created_at?: string;
  updated_at?: string;
}

export type SalonPayload = Omit<Salon, 'id' | 'slug' | 'mobiliario' | 'fotos' | 'created_at' | 'updated_at'>;
