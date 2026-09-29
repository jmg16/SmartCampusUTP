export interface Edificio {
  id: number;
  slug: string;
  nombre: string;
  niveles: number;
  foto: string | null;
  modelo_id: number | null;
  modelo_nombre: string | null;
  modelo_url: string | null;
  salones: number;
  created_at?: string;
  updated_at?: string;
}

export type EdificioPayload = Pick<Edificio, 'nombre' | 'niveles' | 'modelo_id'>;
