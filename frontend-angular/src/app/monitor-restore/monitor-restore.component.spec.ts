import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MonitorRestoreComponent } from './monitor-restore.component';
import { ApiService } from '../api.service';
import { of } from 'rxjs';

describe('MonitorRestoreComponent', () => {
  let component: MonitorRestoreComponent;
  let fixture: ComponentFixture<MonitorRestoreComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService',['monitor']);
    await TestBed.configureTestingModule({
      imports: [MonitorRestoreComponent],
      providers: [{ provide: ApiService, useValue: apiSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(MonitorRestoreComponent);
    component = fixture.componentInstance;
  });

  it('stops polling when items refresh become false', fakeAsync(() => {
    const first = { items: [{ fileName: 'a', fileSize: '1kb', status: 'in progress', refresh: true }] };
    const second = { items: [{ fileName: 'a', fileSize: '1kb', status: 'done', refresh: false }] };
    apiSpy.monitor.and.returnValues(of(first), of(second));
    component.reloadInfo = { reloadTime: 1, selectedEnvs: ['E1'], monitorLotids: ['L1'] };
    component.ngOnChanges({ reloadInfo: { currentValue: component.reloadInfo, previousValue: null, firstChange: true, isFirstChange: () => true } as any });
    tick(100); // first immediate fetch
    expect(component.items.length).toBe(1);
    tick(10000); // interval trigger -> second response
    expect(component.items[0].status).toBe('done');
    // after processing, pollingActive should be false
    expect(component.pollingActive).toBeFalse();
  }));
});
