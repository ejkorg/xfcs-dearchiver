import { Component, Output, EventEmitter, Input } from '@angular/core';
import { ApiService } from '../api.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-review-files',
  template: `
    <h2>Review Files</h2>
    <div *ngIf="!searchResults || searchResults.length===0">No files to review. Go back and run a search.</div>
    <div *ngIf="searchResults && searchResults.length">
      <label>Choose target env:
        <input placeholder="env name" [(ngModel)]="selectedEnv" />
      </label>
      <ul>
        <li *ngFor="let f of searchResults">
          <label>
            <input type="checkbox" (change)="toggleFile(f)" /> {{f.file || f.name || f.path}}
          </label>
        </li>
      </ul>
      <div class="actions">
        <button mat-raised-button color="primary" (click)="downloadSelected()" [disabled]="downloading">{{downloading ? 'Downloading...' : 'Download Selected'}}</button>
        <button mat-raised-button color="accent" (click)="complete()" [disabled]="reloading">{{reloading ? 'Reloading...' : 'Reload Selected'}}</button>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, MatButtonModule, FormsModule]
})
export class ReviewFilesComponent {
  @Input() searchResults: any[] = [];
  selectedFiles: any[] = [];
  selectedEnv: string | null = null;
  @Output() reviewComplete = new EventEmitter<any>();
  downloading = false;
  reloading = false;
  constructor(private api: ApiService) {}

  toggleFile(f: any) {
    const idx = this.selectedFiles.indexOf(f);
    if (idx >= 0) this.selectedFiles.splice(idx, 1);
    else this.selectedFiles.push(f);
  }

  complete() {
    // call reload API and emit the response so Monitor can poll
    if (!this.selectedFiles.length) {
      this.reviewComplete.emit({ files: [], env: this.selectedEnv });
      return;
    }
    this.reloading = true;
    const ids = this.selectedFiles.map(f => (f.path || f.file || f.name || f));
    const payload = { files: ids, env: this.selectedEnv };
    this.api.reload(payload).subscribe({
      next: (r:any) => { this.reloading = false; this.reviewComplete.emit(r); },
      error: () => { this.reloading = false; this.reviewComplete.emit({ files: ids, env: this.selectedEnv }); }
    });
  }

  downloadSelected() {
    if (!this.selectedFiles.length) return;
    this.downloading = true;
    const ids = this.selectedFiles.map(f => (f.path || f.file || f.name || f));
    this.api.downloadFiles(ids).subscribe({
      next: (blob: Blob) => { this.downloading = false; this.saveBlob(blob, 'files.zip'); },
      error: () => { this.downloading = false; }
    });
  }

  private saveBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
}
