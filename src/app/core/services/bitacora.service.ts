import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  BitacoraLoginRequest,
  BitacoraLoginResponse,
  BitacoraListResponse,
  BitacoraStatus,
  ProjectLog,
} from '../../shared/models/bitacora.model';
import { Observable, map, tap } from 'rxjs';

const STORAGE_KEY = 'smartcampus.bitacora.token';

@Injectable({
  providedIn: 'root',
})
export class BitacoraService {
  private http = inject(HttpClient);

  private get token(): string | null {
    return typeof window === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
  }

  private set token(value: string | null) {
    if (typeof window === 'undefined') return;
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  logout(): void {
    this.token = null;
  }

  login(payload: BitacoraLoginRequest): Observable<void> {
    return this.http.post<BitacoraLoginResponse>('/api/bitacora/login', payload).pipe(
      tap((resp) => {
        if (resp.ok && resp.token) {
          this.token = resp.token;
        }
      }),
      map(() => void 0)
    );
  }

  private authHeaders(): HttpHeaders {
    const t = this.token;
    return t ? new HttpHeaders({ Authorization: `Bearer ${t}` }) : new HttpHeaders();
  }

  list(limit = 50, status?: BitacoraStatus): Observable<ProjectLog[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (status) {
      params = params.set('status', status);
    }
    return this.http
      .get<BitacoraListResponse>('/api/bitacora/logs', { params })
      .pipe(map((resp) => resp.datos ?? []));
  }

  getById(id: number): Observable<ProjectLog> {
    return this.http
      .get<{ ok: boolean; dato: ProjectLog }>(`/api/bitacora/logs/${id}`)
      .pipe(map((resp) => resp.dato));
  }

  create(payload: Omit<ProjectLog, 'id' | 'created_at'>): Observable<ProjectLog> {
    return this.http
      .post<{ ok: boolean; dato: ProjectLog }>('/api/bitacora/logs', payload, {
        headers: this.authHeaders(),
      })
      .pipe(map((resp) => resp.dato));
  }

  update(id: number, payload: Omit<ProjectLog, 'id' | 'created_at'>): Observable<ProjectLog> {
    return this.http
      .put<{ ok: boolean; dato: ProjectLog }>(`/api/bitacora/logs/${id}`, payload, {
        headers: this.authHeaders(),
      })
      .pipe(map((resp) => resp.dato));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<{ ok: boolean }>(`/api/bitacora/logs/${id}`, {
        headers: this.authHeaders(),
      })
      .pipe(map(() => void 0));
  }
}

