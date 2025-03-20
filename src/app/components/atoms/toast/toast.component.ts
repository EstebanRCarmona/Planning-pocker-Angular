import { Component, Input, OnInit } from '@angular/core';
import { ToastService } from 'src/app/shared/services/toast/toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent implements OnInit {
  @Input() message: string = '';
  @Input() type: 'success' | 'error' = 'success';
  isVisible: boolean = false;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.toastState.subscribe(toast => {
      this.message = toast.message;
      this.type = toast.type;
      this.isVisible = true;


      setTimeout(() => {
        this.isVisible = false;
      }, 4000);
    });
  }

  closeToast() {
    this.isVisible = false;
  }
}

