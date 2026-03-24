import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  Modelo3D,
  Modelo3DListResponse,
  CategoriasResponse,
} from '../../shared/models/modelo3d.model';

const STORAGE_KEY = 'smartcampus.bitacora.token';

@Injectable({
  providedIn: 'root',
})
export class Modelos3dService {
  private http = inject(HttpClient);

  private get token(): string | null {
    return typeof window === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
  }

  private authHeaders(): HttpHeaders {
    const t = this.token;
    return t ? new HttpHeaders({ Authorization: `Bearer ${t}` }) : new HttpHeaders();
  }

  list(limit = 100, category?: string): Observable<Modelo3D[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (category) params = params.set('category', category);
    return this.http
      .get<Modelo3DListResponse>('/api/modelos3d', { params })
      .pipe(map((resp) => resp.datos ?? []));
  }

  categorias(): Observable<string[]> {
    return this.http
      .get<CategoriasResponse>('/api/modelos3d/categorias')
      .pipe(map((resp) => resp.datos ?? []));
  }

  getById(id: number): Observable<Modelo3D> {
    return this.http
      .get<{ ok: boolean; dato: Modelo3D }>(`/api/modelos3d/${id}`)
      .pipe(map((resp) => resp.dato));
  }

  create(data: { name: string; category: string; description?: string; author: string }, file: File): Observable<Modelo3D> {
    const form = new FormData();
    form.append('name', data.name);
    form.append('category', data.category);
    if (data.description) form.append('description', data.description);
    form.append('author', data.author);
    form.append('file', file);
    return this.http
      .post<{ ok: boolean; dato: Modelo3D }>('/api/modelos3d', form, {
        headers: this.authHeaders(),
      })
      .pipe(map((resp) => resp.dato));
  }

  update(id: number, data: { name: string; category: string; description?: string; author: string }): Observable<Modelo3D> {
    return this.http
      .put<{ ok: boolean; dato: Modelo3D }>(`/api/modelos3d/${id}`, data, {
        headers: this.authHeaders(),
      })
      .pipe(map((resp) => resp.dato));
  }

  replaceFile(id: number, file: File): Observable<Modelo3D> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .put<{ ok: boolean; dato: Modelo3D }>(`/api/modelos3d/${id}/file`, form, {
        headers: this.authHeaders(),
      })
      .pipe(map((resp) => resp.dato));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<{ ok: boolean }>(`/api/modelos3d/${id}`, {
        headers: this.authHeaders(),
      })
      .pipe(map(() => void 0));
  }
}
