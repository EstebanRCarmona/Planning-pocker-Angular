import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastComponent } from './toast.component';
import { ToastService } from 'src/app/shared/services/toast/toast.service';
import { Subject } from 'rxjs';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;
  let mockToastService: Partial<ToastService>;

  beforeEach(async () => {
    mockToastService = {
      toastState: new Subject()
    };

    await TestBed.configureTestingModule({
      declarations: [ToastComponent],
      providers: [
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default values', () => {
    expect(component.message).toBe('');
    expect(component.type).toBe('success');
    expect(component.isVisible).toBeFalsy();
  });

  it('should update toast state when service emits new toast', fakeAsync(() => {
    const testToast = { message: 'Test message', type: 'error' as 'success' | 'error' };
    (mockToastService.toastState as Subject<any>).subscribe(toast => {
      component.message = toast.message;
      component.type = toast.type;
      component.isVisible = true;
      fixture.detectChanges();
    });

    (mockToastService.toastState as Subject<any>).next(testToast);
    tick();

    expect(component.message).toBe(testToast.message);
    expect(component.type).toBe(testToast.type);
    expect(component.isVisible).toBeTruthy();
  }));


  it('should hide toast after 3 seconds', fakeAsync(() => {
    (mockToastService.toastState as Subject<any>).next({ message: 'Test', type: 'success' });

    tick();
    fixture.detectChanges();
    expect(component.isVisible).toBeTruthy();

    tick(3000);
    fixture.detectChanges();
    expect(component.isVisible).toBeFalsy();
  }));

  it('should close toast when closeToast is called', () => {
    component.isVisible = true;
    component.closeToast();
    expect(component.isVisible).toBeFalsy();
  });
});
