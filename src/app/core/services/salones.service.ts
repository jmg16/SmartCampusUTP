import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Mobiliario, Salon, SalonPayload } from '../../shared/models/salon.model';

const STORAGE_KEY = 'smartcampus.bitacora.token';

@Injectable({ providedIn: 'root' })
export class SalonesService {
  private http = inject(HttpClient);

  private authHeaders(): HttpHeaders {
    const token = typeof window === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  list(): Observable<Salon[]> {
    return this.http
      .get<{ ok: boolean; datos: Salon[] }>('/api/salones')
      .pipe(map((response) => response.datos ?? []));
  }

  getBySlug(slug: string): Observable<Salon> {
    return this.http
      .get<{ ok: boolean; dato: Salon }>(`/api/salones/${encodeURIComponent(slug)}`)
      .pipe(map((response) => response.dato));
  }

  create(payload: SalonPayload): Observable<Salon> {
    return this.http
      .post<{ ok: boolean; dato: Salon }>('/api/salones', payload, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.dato));
  }

  update(id: number, payload: SalonPayload): Observable<Salon> {
    return this.http
      .put<{ ok: boolean; dato: Salon }>(`/api/salones/${id}`, payload, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.dato));
  }

  guardarMobiliario(id: number, mobiliario: Mobiliario[]): Observable<Salon> {
    return this.http
      .put<{ ok: boolean; dato: Salon }>(`/api/salones/${id}/mobiliario`, { mobiliario }, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.dato));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<{ ok: boolean }>(`/api/salones/${id}`, {
        headers: this.authHeaders(),
      })
      .pipe(map(() => void 0));
  }
}
