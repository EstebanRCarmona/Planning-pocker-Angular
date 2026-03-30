import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-countdown',
  templateUrl: './countdown.component.html',
  styleUrls: ['./countdown.component.scss'],
  animations: [
    trigger('slideAnimation', [
      transition('* => *', [
        style({ opacity: 0, transform: 'scale(0) rotate(-180deg)' }),
        animate('300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', style({ opacity: 1, transform: 'scale(1) rotate(0deg)' }))
      ]),
      transition('* => exit', [
        animate('300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', style({ opacity: 0, transform: 'scale(0) rotate(180deg)' }))
      ])
    ])
  ]
})
export class CountdownComponent implements OnInit, OnDestroy {
  countdown: number = 3;
  animationState: any = 3; 
  private interval: any;

  ngOnInit(): void {
    setTimeout(() => {
      this.startCountdown();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private startCountdown(): void {
    let count = 3;
    
    this.countdown = count;
    this.animationState = count;
    count--;
    
    this.interval = setInterval(() => {
      if (count > 0) {
        this.countdown = count;
        this.animationState = count;
        count--;
      } else if (count === 0) {
        this.countdown = 0;
        this.animationState = 0;
        count--;
        clearInterval(this.interval);
      }
    }, 800);
  }
}
