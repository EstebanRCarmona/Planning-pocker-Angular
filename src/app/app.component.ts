import { Component, OnInit } from '@angular/core';
import { CleanupService } from './shared/services/cleanup.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Planning-Poker';

  constructor(private cleanupService: CleanupService) {}

  ngOnInit(): void {
    setTimeout(() => {
      const logoContainer = document.getElementById('logoContainer');
      if (logoContainer) {
        logoContainer.classList.add('loaded');
      }
    }, 200);
  }


  onInputChanged(newValue: string): void {
  }

  onSubmit(): void {
  }
}
