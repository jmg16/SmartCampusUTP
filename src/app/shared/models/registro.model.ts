export interface RegistroRequest {
  nombre: string;
  correo: string;
  rol: string;
}

export interface RegistroResponse {
  ok: boolean;
  mensaje: string;
}
