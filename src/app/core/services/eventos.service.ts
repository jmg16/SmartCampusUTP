import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { EventoListResponse, EventoPost } from '../../shared/models/evento.model';

const STORAGE_KEY = 'smartcampus.bitacora.token';

@Injectable({
  providedIn: 'root',
})
export class EventosService {
  private http = inject(HttpClient);

  private get token(): string | null {
    return typeof window === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
  }

  private authHeaders(): HttpHeaders {
    const t = this.token;
    return t ? new HttpHeaders({ Authorization: `Bearer ${t}` }) : new HttpHeaders();
  }

  list(limit = 50): Observable<EventoPost[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http
      .get<EventoListResponse>('/api/eventos', { params })
      .pipe(map((resp) => resp.datos ?? []));
  }

  getById(id: number): Observable<EventoPost> {
    return this.http
      .get<{ ok: boolean; dato: EventoPost }>(`/api/eventos/${id}`)
      .pipe(map((resp) => resp.dato));
  }

  create(payload: Omit<EventoPost, 'id' | 'created_at'>): Observable<EventoPost> {
    return this.http
      .post<{ ok: boolean; dato: EventoPost }>('/api/eventos', payload, {
        headers: this.authHeaders(),
      })
      .pipe(map((resp) => resp.dato));
  }

  update(id: number, payload: Omit<EventoPost, 'id' | 'created_at'>): Observable<EventoPost> {
    return this.http
      .put<{ ok: boolean; dato: EventoPost }>(`/api/eventos/${id}`, payload, {
        headers: this.authHeaders(),
      })
      .pipe(map((resp) => resp.dato));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<{ ok: boolean }>(`/api/eventos/${id}`, {
        headers: this.authHeaders(),
      })
      .pipe(map(() => void 0));
  }

  /** Reemplaza las imágenes del evento (campo 'images', 1 a 5). */
  replaceImages(eventId: number, files: File[]): Observable<void> {
    const form = new FormData();
    for (const f of files) form.append('images', f);
    return this.http
      .put<{ ok: boolean; mensaje?: string }>(`/api/eventos/${eventId}/images`, form, {
        headers: this.authHeaders(),
      })
      .pipe(map(() => void 0));
  }
}

