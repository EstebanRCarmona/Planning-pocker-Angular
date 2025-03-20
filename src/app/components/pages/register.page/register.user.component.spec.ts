import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of,throwError  } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { RegisterUserComponent } from './register.user.component';
import { GameService } from '../../../shared/services/functionalyty-service/GameService/game.service.impl';
import { GameCommunicationService } from 'src/app/shared/services/functionalyty-service/comunicationService/comunicationService';
import { InputAtomComponent } from '../../atoms/input/input.component';
import { ButtonComponent } from '../../atoms/button/button.component';
import { Game } from 'src/app/shared/interfaces/game.model';
import { ToastService } from 'src/app/shared/services/toast/toast.service';


class MockGameService {
  getGameById = jest.fn().mockReturnValue(of({} as Game));
  joinGame = jest.fn().mockReturnValue(of({} as Game));
}

class MockGameCommunicationService {
  addPlayerToGame = jest.fn();
}

describe('RegisterUserComponent', () => {
  let component: RegisterUserComponent;
  let fixture: ComponentFixture<RegisterUserComponent>;
  let gameService: MockGameService;
  let gameCommunicationService: MockGameCommunicationService;
  let router: any;

  beforeEach(async () => {
    const routerSpy = { navigate: jest.fn() };
    gameService = new MockGameService();
    gameCommunicationService = new MockGameCommunicationService();

    await TestBed.configureTestingModule({
      declarations: [RegisterUserComponent, InputAtomComponent, ButtonComponent],
      imports: [ReactiveFormsModule, FormsModule, RouterTestingModule],
      providers: [
        { provide: GameService, useValue: gameService },
        { provide: GameCommunicationService, useValue: gameCommunicationService },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: jest.fn().mockReturnValue('testGameId'),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterUserComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(ActivatedRoute);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with default values when not players yet', () => {
    expect(component.userForm).toBeDefined();
    expect(component.userForm.get('name')?.value).toBe('');
    expect(component.userForm.get('role')?.value).toBe('player');
  });

  it('should display errors if the name is invalid', fakeAsync(() => {
    const nameControl = component.userForm.get('name');
    nameControl?.setValue('');
    nameControl?.markAsTouched();
    fixture.detectChanges();
    component.startErrorTimeout();
    tick(8000);
    fixture.detectChanges();
    expect(component.showErrors).toBe(false);
  }));


  it('should save a user to storage on form submit', fakeAsync(() => {
    const joinGameSpy = gameService.joinGame.mockReturnValue(of({} as Game));
    const nameControl = component.userForm.get('name');
    nameControl?.setValue('ValidName');
    fixture.detectChanges();
    component.onSubmit();
    tick();
    expect(joinGameSpy).toHaveBeenCalled();
    const routerSpy = TestBed.inject(Router);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/game', 'testGameId']);
  }));

  it('should call handleCreateUser on valid form submit', () => {
    const spy = jest.spyOn(component, 'handleCreateUser');
    const nameControl = component.userForm.get('name');
    nameControl?.setValue('ValidName');
    fixture.detectChanges();
    component.onSubmit();
    expect(spy).toHaveBeenCalled();
  });

  it('should display the correct error message', () => {
    const nameControl = component.userForm.get('name');
    nameControl?.setErrors({ required: true });
    component.showErrors = true;
    fixture.detectChanges();
    const errorMessage = component.getErrorMessage();
    expect(errorMessage).toBe('El nombre es requerido');
  });

  it('should add player to game on successful user creation', fakeAsync(() => {
    const joinGameSpy = gameService.joinGame.mockReturnValue(of({} as Game));
    const addPlayerToGameSpy = gameCommunicationService.addPlayerToGame;
    const nameControl = component.userForm.get('name');
    nameControl?.setValue('ValidName');
    fixture.detectChanges();
    component.onSubmit();
    tick();
    expect(joinGameSpy).toHaveBeenCalled();
    expect(addPlayerToGameSpy).toHaveBeenCalled();
    const routerSpy = TestBed.inject(Router);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/game', 'testGameId']);
  }));

  it('should assign role as player if there are players in the game', () => {
    const getGameByIdSpy = gameService.getGameById.mockReturnValue(of({} as Game));
    component.ngOnInit();
    expect(component.roleControl.value).toBe('player');
    expect(getGameByIdSpy).toHaveBeenCalled();
  });

  it('should return true if the name field is invalid and touched', () => {
    const nameControl = component.userForm.get('name');
    nameControl?.setValue('');
    nameControl?.markAsTouched();

    fixture.detectChanges();
    expect(component.isFieldInvalid()).toBe(true);
  });

  it('should return false if the name field is valid and touched', () => {
    const nameControl = component.userForm.get('name');
    nameControl?.setValue('ValidName');
    nameControl?.markAsTouched();

    fixture.detectChanges();
    expect(component.isFieldInvalid()).toBe(false);
  });

  it('should return the correct error message for required field', () => {
    const nameControl = component.userForm.get('name');
    nameControl?.setErrors({ required: true });
    component.showErrors = true;

    fixture.detectChanges();
    const errorMessage = component.getErrorMessage();
    expect(errorMessage).toBe('El nombre es requerido');
  });

  it('should return the correct error message for minlength', () => {
    const nameControl = component.userForm.get('name');
    nameControl?.setErrors({ minlength: { requiredLength: 5, actualLength: 3 } });
    component.showErrors = true;

    fixture.detectChanges();
    const errorMessage = component.getErrorMessage();
    expect(errorMessage).toBe('El nombre debe tener al menos 5 caracteres');
  });

  it('should return the correct error message for maxlength', () => {
    const nameControl = component.userForm.get('name');
    nameControl?.setErrors({ maxlength: { requiredLength: 20, actualLength: 25 } });
    component.showErrors = true;

    fixture.detectChanges();
    const errorMessage = component.getErrorMessage();
    expect(errorMessage).toBe('El nombre no puede tener más de 20 caracteres');
  });

  it('should not call handleCreateUser if form is invalid', () => {
    const handleCreateUserSpy = jest.spyOn(component, 'handleCreateUser');
    const nameControl = component.userForm.get('name');
    nameControl?.setValue('');

    fixture.detectChanges();
    component.onSubmit();

    expect(handleCreateUserSpy).not.toHaveBeenCalled();
  });

  it('should clear the timeout and set showErrors to false after the timeout', fakeAsync(() => {
    component.startErrorTimeout();
    tick(4000);
    fixture.detectChanges();

    expect(component.showErrors).toBe(false);
  }));

  it('should display error message when name is invalid', () => {
    const nameControl = component.userForm.get('name');
    nameControl?.setValue('');
    nameControl?.markAsTouched();
    fixture.detectChanges();

    expect(component.isFieldInvalid()).toBe(true);
    expect(component.getErrorMessage()).toBe('El nombre es requerido');
  });

  it('should not call handleCreateUser if the form is invalid', () => {
    const handleCreateUserSpy = jest.spyOn(component, 'handleCreateUser');
    component.userForm.get('name')?.setValue('');

    fixture.detectChanges();
    component.onSubmit();

    expect(handleCreateUserSpy).not.toHaveBeenCalled();
  });

  it('should show "Game is full" toast message if the game is full', fakeAsync(() => {
    const joinGameSpy = gameService.joinGame.mockReturnValue(throwError(() => ({ message: 'Game is full' })));
    const toastSpy = jest.spyOn(ToastService.prototype, 'showToast');

    const nameControl = component.userForm.get('name');
    nameControl?.setValue('ValidName');
    fixture.detectChanges();

    component.onSubmit();
    tick();

    expect(joinGameSpy).toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith('Partida llena', 'error');
  }));

  it('should show a generic error toast message if there is an error while joining the game', fakeAsync(() => {
    const joinGameSpy = gameService.joinGame.mockReturnValue(throwError(() => ({ message: 'Some error' })));
    const toastSpy = jest.spyOn(ToastService.prototype, 'showToast');

    const nameControl = component.userForm.get('name');
    nameControl?.setValue('ValidName');
    fixture.detectChanges();

    component.onSubmit();
    tick();

    expect(joinGameSpy).toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith('Error al unirse al juego', 'error');
  }));

  it('should assign the default role "player" if there are players in the game', fakeAsync(() => {
    const mockGame = { id: 'testGameId', players: ['player1', 'player2'] };
    gameService.getGameById.mockReturnValue(of(mockGame));

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.roleControl.value).toBe('player');
  }));

  it('should initialize the form with default values', () => {
    expect(component.userForm).toBeDefined();
    expect(component.userForm.get('name')?.value).toBe('');
    expect(component.userForm.get('role')?.value).toBe('player');
  });

});
