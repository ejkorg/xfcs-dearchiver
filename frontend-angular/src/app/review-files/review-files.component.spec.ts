import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReviewFilesComponent } from './review-files.component';
import { ApiService } from '../api.service';
import { of } from 'rxjs';

describe('ReviewFilesComponent', () => {
  let component: ReviewFilesComponent;
  let fixture: ComponentFixture<ReviewFilesComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService',['downloadFiles','reload']);
    await TestBed.configureTestingModule({
      imports: [ReviewFilesComponent],
      providers: [{ provide: ApiService, useValue: apiSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewFilesComponent);
    component = fixture.componentInstance;
  });

  it('normalizes selected files and calls downloadFiles', fakeAsync(() => {
    component.selectedFiles = [{ path: '/tmp/a/file1' }, { file: '/tmp/b/file2' }, '/tmp/c/file3'];
    const blob = new Blob(['x']);
    apiSpy.downloadFiles.and.returnValue(of(blob));
    component.downloadSelected();
    tick();
    expect(apiSpy.downloadFiles).toHaveBeenCalled();
  }));

  it('normalizes and calls reload then emits response', fakeAsync(() => {
    component.selectedFiles = [{ path: '/tmp/a/file1' }];
    const resp = { reloadTime: 123, selectedEnvs: ['E1'], monitorLotids: ['LOT1'] };
    apiSpy.reload.and.returnValue(of(resp));
    let emitted: any = null;
    component.reviewComplete.subscribe((r:any) => emitted = r);
    component.complete();
    tick();
    expect(apiSpy.reload).toHaveBeenCalled();
    expect(emitted).toEqual(resp);
  }));
});
