import { Component, OnInit } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingService } from 'src/app/shared/services/loading.service';

@Component({
  selector: 'app-pre-loading',
  templateUrl: './pre.loading.component.html',
  styleUrls: ['./pre.loading.component.scss'],
  animations: [
    trigger('rotate', [
      state('start', style({ transform: 'rotate(0deg)' })),
      state('end', style({ transform: 'rotate(720deg)' })),
      transition('start => end', [
        animate('4s ease-in-out')
      ])
    ]),
    trigger('fadeIn', [
      state('hidden', style({ opacity: 0 })),
      state('visible', style({ opacity: 1 })),
      transition('hidden => visible', [
        animate('1s ease-in')
      ])
    ])
  ]
})
export class PreLoadingComponent implements OnInit {
  rotationState: 'start' | 'end' = 'start';
  textState: 'hidden' | 'visible' = 'hidden';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private loadingService: LoadingService
  ) {
  }

  ngOnInit() {
    // Marcar que el usuario vio el loading
    this.loadingService.setLoadingShown();

    setTimeout(() => {
      this.rotationState = 'end';
    }, 500);

    setTimeout(() => {
      this.textState = 'visible';
    }, 3400);

    setTimeout(() => {
      this.route.queryParams.subscribe(params => {
        if (params['redirect']) {
          this.router.navigateByUrl(params['redirect']);
        } else {
          this.router.navigate(['/create-game']);
        }
      });
    }, 5500);
  }
}
