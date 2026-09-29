import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Edificio, EdificioPayload } from '../../shared/models/edificio.model';

const STORAGE_KEY = 'smartcampus.bitacora.token';

@Injectable({ providedIn: 'root' })
export class EdificiosService {
  private http = inject(HttpClient);

  private authHeaders(): HttpHeaders {
    const token = typeof window === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  list(): Observable<Edificio[]> {
    return this.http
      .get<{ ok: boolean; datos: Edificio[] }>('/api/edificios')
      .pipe(map((response) => response.datos ?? []));
  }

  getBySlug(slug: string): Observable<Edificio> {
    return this.http
      .get<{ ok: boolean; dato: Edificio }>(`/api/edificios/${encodeURIComponent(slug)}`)
      .pipe(map((response) => response.dato));
  }

  create(payload: EdificioPayload): Observable<Edificio> {
    return this.http
      .post<{ ok: boolean; dato: Edificio }>('/api/edificios', payload, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.dato));
  }

  update(id: number, payload: EdificioPayload): Observable<Edificio> {
    return this.http
      .put<{ ok: boolean; dato: Edificio }>(`/api/edificios/${id}`, payload, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.dato));
  }

  subirFoto(id: number, archivo: File): Observable<Edificio> {
    const form = new FormData();
    form.append('foto', archivo);
    return this.http
      .post<{ ok: boolean; dato: Edificio }>(`/api/edificios/${id}/foto`, form, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.dato));
  }

  eliminarFoto(id: number, url: string): Observable<Edificio> {
    return this.http
      .delete<{ ok: boolean; dato: Edificio }>(`/api/edificios/${id}/foto`, {
        headers: this.authHeaders(),
        body: { url },
      })
      .pipe(map((response) => response.dato));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<{ ok: boolean }>(`/api/edificios/${id}`, { headers: this.authHeaders() })
      .pipe(map(() => void 0));
  }
}
