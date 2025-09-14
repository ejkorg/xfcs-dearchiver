import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../api.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-review-files',
  template: `
    <h2>Review Files</h2>
    <div *ngIf="!searchResults || searchResults.length===0">No files to review. Go back and run a search.</div>
    <div *ngIf="searchResults && searchResults.length">
      <div style="display:flex; gap:1rem; align-items:flex-start;">
        <div style="flex:1">
          <h3>Files to Exclude <small *ngIf="excludedFiles.length">({{excludedFiles.length}})</small></h3>
          <mat-list>
            <mat-list-item *ngFor="let f of excludedFiles">
              <mat-checkbox [(ngModel)]="f.__excluded_selected">{{ displayFile(f.path) }} — {{ f.size }}</mat-checkbox>
            </mat-list-item>
          </mat-list>
          <div style="margin-top: .5rem"><button mat-button (click)="moveRight()" [disabled]="!hasExcludedSelection()"> &lt; </button></div>
        </div>
        <mat-divider vertical></mat-divider>
        <div style="flex:1">
          <h3>Files to Restore/Download <small *ngIf="selectedFiles.length">({{selectedFiles.length}})</small></h3>
          <mat-list>
            <mat-list-item *ngFor="let f of selectedFiles">
              <mat-checkbox [(ngModel)]="f.__selected_selected">{{ displayFile(f.path) }} — {{ f.size }}</mat-checkbox>
            </mat-list-item>
          </mat-list>
          <div style="margin-top: .5rem"><button mat-button (click)="moveLeft()" [disabled]="!hasSelectedSelection()"> &gt; </button></div>
        </div>
      </div>
      <div style="margin-top:1rem">
        <label>Choose target env: <input placeholder="env name" [(ngModel)]="selectedEnv" /></label>
      </div>
      <div class="actions" style="margin-top:1rem; display:flex; gap:.5rem; align-items:center">
        <button mat-raised-button color="primary" (click)="downloadSelected()" [disabled]="downloading || selectedFiles.length===0">{{downloading ? 'Downloading...' : 'Download Files'}}</button>
        <button mat-raised-button color="accent" (click)="complete()" [disabled]="reloading || selectedFiles.length===0">{{reloading ? 'Reloading...' : 'Start Reload'}}</button>
        <div style="margin-left: auto; color:#666">Selected: {{selectedFiles.length}} / Excluded: {{excludedFiles.length}}</div>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, MatButtonModule, FormsModule, MatListModule, MatCheckboxModule, MatIconModule, MatDividerModule]
})
export class ReviewFilesComponent implements OnChanges {
  @Input() searchResults: any[] = [];
  @Output() reviewComplete = new EventEmitter<any>();

  // file lists
  selectedFiles: any[] = []; // right pane
  excludedFiles: any[] = []; // left pane

  // selections (array of paths) bound to <select multiple>
  selectedSelection: string[] = [];
  excludedSelection: string[] = [];

  selectedEnv: string | null = null;
  downloading = false;
  reloading = false;

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['searchResults']) {
      // initialize selectedFiles with raw_files if present, otherwise map searchResults directly
      const files: any[] = [];
      for (const r of this.searchResults || []) {
        if (r.raw_files && r.raw_files.length) {
          for (const f of r.raw_files) files.push(f);
        } else if (r.files && r.files.length) {
          for (const f of r.files) files.push(f);
        }
      }
      // initialize flags used by MatCheckbox bindings
      this.selectedFiles = files.map(f => ({ ...f, __selected_selected: false }));
      this.excludedFiles = [];
      this.selectedSelection = [];
      this.excludedSelection = [];
    }
  }

  displayFile(path: string) {
    const parts = path.split('/');
    const name = parts[parts.length-1];
    if (name.length > 45) {
      const dot = name.lastIndexOf('.');
      const base = name.slice(0, 40);
      const ext = dot > -1 ? name.slice(dot) : '';
      return base + '…' + ext;
    }
    return name;
  }

  moveLeft() {
    // move all excluded items that are checked into selectedFiles
    const moving = this.excludedFiles.filter(f => f.__excluded_selected);
    this.excludedFiles = this.excludedFiles.filter(f => !f.__excluded_selected);
    for (const m of moving) delete m.__excluded_selected;
    this.selectedFiles = [...this.selectedFiles, ...moving.map(f => ({ ...f, __selected_selected: false }))];
  }

  moveRight() {
    // move all selected items that are checked into excludedFiles
    const moving = this.selectedFiles.filter(f => f.__selected_selected);
    this.selectedFiles = this.selectedFiles.filter(f => !f.__selected_selected);
    for (const m of moving) delete m.__selected_selected;
    this.excludedFiles = [...this.excludedFiles, ...moving.map(f => ({ ...f, __excluded_selected: false }))];
  }

  hasSelectedSelection() {
    return this.selectedFiles.some(f => f.__selected_selected);
  }

  hasExcludedSelection() {
    return this.excludedFiles.some(f => f.__excluded_selected);
  }

  complete() {
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
      next: (blob: Blob) => { this.downloading = false; this.saveBlob(blob, 'Exensio_Files.zip'); },
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
