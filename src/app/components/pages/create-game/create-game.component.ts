import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../../../shared/services/functionalyty-service/GameService/game.service.impl';
import { LoadingService } from '../../../shared/services/loading.service';

@Component({
  selector: 'app-create-game',
  templateUrl: './create-game.component.html',
  styleUrls: ['./create-game.component.scss']
})
export class CreateGamePage implements OnInit{
  isLoaded = false;
  constructor(
    private gameService: GameService,
    private router: Router,
    private loadingService: LoadingService
  ) {}

  ngOnInit() {
    setTimeout(() => {
      this.isLoaded = true;
      const logoContainer = document.getElementById('miLogoContainer');
      if (logoContainer) {
        logoContainer.classList.add('loaded');
      }
    }, 200);
  }

  onCreateGame(request: any): void {
    this.gameService.createGame(request).subscribe({
      next: (game) => {
        this.loadingService.setLoadingShown();
        this.router.navigate(['/register', game.name, game.id]);
      },
      error: (error) => {
      }
    });
  }

}
