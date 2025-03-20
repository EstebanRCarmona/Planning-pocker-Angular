import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateGamePage } from './create-game.component';
import { Router } from '@angular/router';
import { GameService } from '../../../shared/services/functionalyty-service/GameService/game.service.impl';
import { of } from 'rxjs';

class MockGameService {
  createGame = jest.fn().mockReturnValue(of({ id: '123', name: 'Test Game' }));
}

class MockRouter {
  navigate = jest.fn();
}

describe('CreateGamePage', () => {
  let component: CreateGamePage;
  let fixture: ComponentFixture<CreateGamePage>;
  let gameService: MockGameService;
  let router: MockRouter;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateGamePage],
      providers: [
        { provide: GameService, useClass: MockGameService },
        { provide: Router, useClass: MockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateGamePage);
    component = fixture.componentInstance;
    gameService = TestBed.inject(GameService) as unknown as MockGameService;
    router = TestBed.inject(Router) as unknown as MockRouter;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should set isLoaded to true after 600ms', (done) => {
    expect(component.isLoaded).toBe(false);
    setTimeout(() => {
      expect(component.isLoaded).toBe(true);
      done();
    }, 600);
  });

  it('should call createGame and navigate on successful game creation', () => {
    const request = { name: 'New Game' };
    const expectedGame = { id: '123', name: 'Test Game' };

    component.onCreateGame(request);

    expect(gameService.createGame).toHaveBeenCalledWith(request);
    expect(router.navigate).toHaveBeenCalledWith(['/register', expectedGame.name, expectedGame.id]);
  });

  it('should handle createGame error', () => {
    const request = { name: 'New Game' };
    gameService.createGame = jest.fn().mockReturnValue(of({ error: 'Game creation failed' }));

    component.onCreateGame(request);
    expect(gameService.createGame).toHaveBeenCalledWith(request);
  });
});
