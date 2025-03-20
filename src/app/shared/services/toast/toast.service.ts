import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast>();
  toastState = this.toastSubject.asObservable();

  showToast(message: string, type: 'success' | 'error') {
    this.toastSubject.next({ message, type });
  }
}