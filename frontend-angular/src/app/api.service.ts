import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) {}

  health(): Observable<any> { return this.http.get(`${this.base}/health`); }
  envs(configPath?: string) { return this.http.get(`${this.base}/envs`, { params: configPath ? { configPath } : {} }); }
  search(payload: any) { return this.http.post(`${this.base}/archive/search`, payload); }
  downloadFiles(files: string[]) { return this.http.post(`${this.base}/files/download`, files, { responseType: 'blob' }); }
  reload(payload: any) { return this.http.post(`${this.base}/reload`, payload); }
  monitor(payload: any) { return this.http.post(`${this.base}/monitor`, payload); }
}
