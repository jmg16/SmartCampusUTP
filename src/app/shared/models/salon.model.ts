export interface FotoSalon {
  url: string;
  resumen: string;
}

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
  edificio_id: number | null;
  ubicacion: string;
  capacidad: number;
  tipo: string;
  descripcion: string;
  caracteristicas: string[];
  mobiliario: Mobiliario[];
  foto: string | null;
  fotos: FotoSalon[];
  created_at?: string;
  updated_at?: string;
}

export type SalonPayload = Omit<
  Salon,
  'id' | 'slug' | 'edificio' | 'mobiliario' | 'foto' | 'fotos' | 'created_at' | 'updated_at'
>;
