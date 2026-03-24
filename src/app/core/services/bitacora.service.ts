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

  private decodeToken(token: string): any | null {
    try {
      const [, payload] = token.split('.');
      if (!payload) return null;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      if (typeof atob === 'undefined') {
        return null;
      }
      const json = atob(normalized);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    const t = this.token;
    if (!t) return false;

    const payload = this.decodeToken(t);
    const exp = payload?.exp;
    if (typeof exp !== 'number') {
      return true;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (exp <= nowInSeconds) {
      this.logout();
      return false;
    }

    return true;
  }

  /** Nombre del usuario admin actualmente logueado (extraído del JWT). */
  getUsuarioActual(): string | null {
    const t = this.token;
    if (!t) return null;
    const payload = this.decodeToken(t);
    return payload?.sub ?? null;
  }

  /** Lista los nombres de todos los administradores registrados. */
  listAdmins(): Observable<string[]> {
    return this.http
      .get<{ ok: boolean; datos: string[] }>('/api/bitacora/admins', {
        headers: this.authHeaders(),
      })
      .pipe(map((resp) => resp.datos ?? []));
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

  /** Subir imagen de portada para un avance (JPEG, PNG, GIF, WebP; máx. 5 MB). */
  uploadCover(logId: number, file: File): Observable<ProjectLog> {
    const formData = new FormData();
    formData.append('cover', file);
    return this.http
      .put<{ ok: boolean; dato: ProjectLog }>(`/api/bitacora/logs/${logId}/cover`, formData, {
        headers: this.authHeaders(),
      })
      .pipe(map((resp) => resp.dato));
  }

  /** Quitar la imagen de portada de un avance. */
  removeCover(logId: number): Observable<ProjectLog> {
    return this.http
      .delete<{ ok: boolean; dato: ProjectLog }>(`/api/bitacora/logs/${logId}/cover`, {
        headers: this.authHeaders(),
      })
      .pipe(map((resp) => resp.dato));
  }
}

