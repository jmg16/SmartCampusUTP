export interface EventoPost {
  id: number;
  title: string;
  description: string;
  event_date: string;
  location: string;
  author: string;
  created_at: string;
  images?: string[];
}

export interface EventoListResponse {
  ok: boolean;
  datos: EventoPost[];
}

