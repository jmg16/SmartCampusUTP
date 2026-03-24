export interface Modelo3D {
  id: number;
  name: string;
  category: string;
  description?: string;
  file_url: string;
  file_size?: number;
  author: string;
  created_at: string;
}

export interface Modelo3DListResponse {
  ok: boolean;
  datos: Modelo3D[];
}

export interface CategoriasResponse {
  ok: boolean;
  datos: string[];
}
