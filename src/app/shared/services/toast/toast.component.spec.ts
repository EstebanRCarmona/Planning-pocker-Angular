import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';
import { Subject } from 'rxjs';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit toast message when showToast is called', (done) => {
    const testToast = { message: 'Test message', type: 'success' as 'success' | 'error' };

    service.toastState.subscribe((toast) => {
      expect(toast).toEqual(testToast);
      done(); 
    });

    service.showToast(testToast.message, testToast.type); 
  });

  it('should emit error toast message', (done) => {
    const testToast = { message: 'Error message', type: 'error' as 'success' | 'error' };

    service.toastState.subscribe((toast) => {
      expect(toast).toEqual(testToast);
      done(); 
    });

    service.showToast(testToast.message, testToast.type); 
  });
});