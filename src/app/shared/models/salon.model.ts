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
  created_at?: string;
  updated_at?: string;
}

export type SalonPayload = Omit<Salon, 'id' | 'slug' | 'created_at' | 'updated_at'>;
