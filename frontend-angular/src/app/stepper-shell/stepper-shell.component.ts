import { Component } from '@angular/core';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { LotSearchComponent } from '../lot-search/lot-search.component';
import { ReviewFilesComponent } from '../review-files/review-files.component';
import { MonitorRestoreComponent } from '../monitor-restore/monitor-restore.component';

@Component({
  selector: 'app-stepper-shell',
  template: `
    <mat-horizontal-stepper linear>
      <mat-step label="Lot Search" [completed]="lotSearchCompleted">
        <app-lot-search (searchComplete)="onLotSearchComplete($event)"></app-lot-search>
        <div class="step-actions">
          <button mat-button matStepperNext [disabled]="!lotSearchCompleted">Next</button>
        </div>
      </mat-step>
      <mat-step label="Review Files" [completed]="reviewFilesCompleted">
        <app-review-files [searchResults]="searchResults" (reviewComplete)="onReviewFilesComplete($event)"></app-review-files>
        <div class="step-actions">
          <button mat-button matStepperNext [disabled]="!reviewFilesCompleted">Next</button>
        </div>
      </mat-step>
      <mat-step label="Restore/Monitor">
        <app-monitor-restore [reloadInfo]="reloadInfo" (done)="onMonitorDone()"></app-monitor-restore>
        <div class="step-actions">
          <button mat-button matStepperPrevious>Back</button>
        </div>
      </mat-step>
    </mat-horizontal-stepper>
  `,
  standalone: true,
  imports: [MatStepperModule, MatButtonModule, LotSearchComponent, ReviewFilesComponent, MonitorRestoreComponent]
})
export class StepperShellComponent {
  lotSearchCompleted = false;
  reviewFilesCompleted = false;
  searchResults: any[] = [];
  reloadInfo: any = null;
  onLotSearchComplete(event: any) { this.searchResults = event?.results || []; this.lotSearchCompleted = true; }
  onReviewFilesComplete(event: any) {
    // Normalize reload response: ensure reloadTime, selectedEnvs and monitorLotids exist
    const normalized = {
      reloadTime: event?.reloadTime || event?.reload_time || 0,
      selectedEnvs: event?.selectedEnvs || event?.selected_envs || event?.selectedEnvs || (event?.env ? [event.env] : []),
      monitorLotids: event?.monitorLotids || event?.monitor_lotids || event?.monitorLotids || event?.lotids || [],
      raw: event
    };
    this.reloadInfo = normalized;
    this.reviewFilesCompleted = true;
  }

  onMonitorDone() {
    // reset stepper state to allow new workflow
    this.searchResults = [];
    this.reloadInfo = null;
    this.lotSearchCompleted = false;
    this.reviewFilesCompleted = false;
  }
}