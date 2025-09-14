import { Component, Input, OnChanges, SimpleChanges, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../api.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-monitor-restore',
  template: `
    <h2>Restore/Monitor</h2>
    <div *ngIf="!reloadInfo">No reload in progress. Complete previous steps first.</div>
    <div *ngIf="reloadInfo">
      <h3>Files</h3>
      <div *ngIf="items.length===0">Waiting for files to appear...</div>
      <div *ngFor="let s of items" class="monitor-item">
        <div class="row">
          <div class="col name">{{s.fileName}}</div>
          <div class="col size">{{s.fileSize}}</div>
          <div class="col status">{{s.status}}</div>
          <div class="col dot"><span [style.color]="colorFor(s.status)">●</span></div>
        </div>
        <mat-progress-bar *ngIf="s.refresh" mode="indeterminate"></mat-progress-bar>
        <div class="timestamp" *ngIf="s.refreshedAt">Updated: {{s.refreshedAt | date:'short'}}</div>
      </div>
      <div class="done" *ngIf="!pollingActive && items.length">
        <p>Monitoring completed at {{completedAt | date:'short'}}</p>
        <button mat-raised-button color="primary" (click)="reset()">Done — return to start</button>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, MatProgressBarModule, MatButtonModule]
})
export class MonitorRestoreComponent implements OnChanges, OnDestroy {
  @Input() reloadInfo: any;
  @Output() done = new EventEmitter<void>();
  items: any[] = [];
  sub: Subscription | null = null;
  pollingActive = false;
  completedAt: number | null = null;
  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['reloadInfo'] && this.reloadInfo) {
      this.startPolling();
    }
  }

  startPolling() {
    if (this.sub) this.sub.unsubscribe();
    this.sub = interval(10000).pipe(
      switchMap(() => this.api.monitor({ reloadTime: this.reloadInfo?.reloadTime || 0, envs: this.reloadInfo?.selectedEnvs || [], lotids: this.reloadInfo?.monitorLotids || [] }))
    ).subscribe((r:any) => { this.updateItems(r); });
    // immediate fetch
    this.api.monitor({ reloadTime: this.reloadInfo?.reloadTime || 0, envs: this.reloadInfo?.selectedEnvs || [], lotids: this.reloadInfo?.monitorLotids || [] }).subscribe((r:any) => this.updateItems(r));
  }

  private updateItems(r:any) {
    this.items = r?.items || [];
    // augment items with refreshedAt timestamp if refresh changed
    const now = Date.now();
    this.items = this.items.map((it:any) => ({ ...it, refreshedAt: it.refresh ? now : (it.refreshedAt || null) }));
    const anyRefresh = this.items.some((it:any) => it.refresh === true);
    if (!anyRefresh && this.sub) { this.sub.unsubscribe(); this.sub = null; this.pollingActive = false; this.completedAt = Date.now(); }
    else { this.pollingActive = true; this.completedAt = null; }
  }

  reset() {
    if (this.sub) { this.sub.unsubscribe(); this.sub = null; }
    this.items = [];
    this.pollingActive = false;
    this.completedAt = null;
    this.done.emit();
  }

  colorFor(state: string) {
    if (!state) return 'gray';
    const s = state.toLowerCase();
    if (s.includes('ok') || s.includes('done') || s.includes('restored')) return 'green';
    if (s.includes('pending') || s.includes('in_progress')) return 'orange';
    if (s.includes('error') || s.includes('failed')) return 'red';
    return 'black';
  }

  ngOnDestroy() { if (this.sub) this.sub.unsubscribe(); }
}
