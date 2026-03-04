export type BitacoraStatus = 'En progreso' | 'Completado' | 'Bloqueado';

export interface ProjectLog {
  id: number;
  title: string;
  description: string;
  status_tags: BitacoraStatus;
  author: string;
  created_at: string;
}

export interface BitacoraLoginRequest {
  usuario: string;
  password: string;
}

export interface BitacoraLoginResponse {
  ok: boolean;
  token: string;
}

export interface BitacoraListResponse {
  ok: boolean;
  datos: ProjectLog[];
}

