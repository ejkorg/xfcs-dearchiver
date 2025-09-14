import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReviewFilesComponent } from './review-files.component';
import { ApiService } from '../api.service';
import { of } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('ReviewFilesComponent', () => {
  let component: ReviewFilesComponent;
  let fixture: ComponentFixture<ReviewFilesComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService', ['reload', 'downloadFiles']);
    await TestBed.configureTestingModule({
      imports: [ReviewFilesComponent, BrowserAnimationsModule],
      providers: [{ provide: ApiService, useValue: apiSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewFilesComponent);
    component = fixture.componentInstance;
  });

  it('initializes selectedFiles from searchResults raw_files', () => {
    const sr = [{ raw_files: [{ path: '/a/f1.gz', size: '1Kb' }, { path: '/a/f2.gz', size: '2Kb' }] }];
    component.searchResults = sr as any;
    component.ngOnChanges({ searchResults: { currentValue: sr, firstChange: true, previousValue: null, isFirstChange: () => true } } as any);
    expect(component.selectedFiles.length).toBe(2);
    expect(component.excludedFiles.length).toBe(0);
  });

  it('moves checked selected items to excluded and back', () => {
    component.selectedFiles = [{ path: '/a/f1', size: '1Kb', __selected_selected: true }, { path: '/a/f2', size: '2Kb', __selected_selected: false }];
    component.moveRight();
    expect(component.selectedFiles.length).toBe(1);
    expect(component.excludedFiles.length).toBe(1);
    // now check excluded item and move left
    component.excludedFiles[0].__excluded_selected = true;
    component.moveLeft();
    expect(component.excludedFiles.length).toBe(0);
    expect(component.selectedFiles.length).toBe(2);
  });

  it('calls downloadFiles on downloadSelected()', fakeAsync(() => {
    component.selectedFiles = [{ path: '/tmp/a/file1' }];
    const blob = new Blob(['x']);
    apiSpy.downloadFiles.and.returnValue(of(blob));
    component.downloadSelected();
    tick();
    expect(apiSpy.downloadFiles).toHaveBeenCalled();
  }));

  it('normalizes and calls reload then emits response', fakeAsync(() => {
    component.selectedFiles = [{ path: '/tmp/a/file1' }];
    const resp = { reload_time: 123, selected_envs: ['env1'], monitor_lotids: ['L1'] };
    apiSpy.reload.and.returnValue(of(resp));
    let emitted: any = null;
    component.reviewComplete.subscribe((r:any) => (emitted = r));
    component.complete();
    tick();
    expect(apiSpy.reload).toHaveBeenCalled();
    expect(emitted).toEqual(resp);
  }));
});
