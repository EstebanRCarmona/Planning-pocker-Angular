import { GameService } from '../../../shared/services/functionalyty-service/GameService/game.service.impl';
import { Game } from 'src/app/shared/interfaces/game.model';
import { RolUsuario, User } from '../../../shared/interfaces/user.model';
import { Component, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { CustomValidators } from 'src/app/shared/services/Validators/CustomValidators';
import { ActivatedRoute, Router } from '@angular/router';
import { GameCommunicationService } from 'src/app/shared/services/functionalyty-service/comunicationService/comunicationService';
import { NAME_CANNOT_ONLY_NUMBERS, NAME_MAX_3_NUMBERS, NAME_MAX_LENGTH, NAME_MIN_LENGHT, NAME_NO_SPECIAL_CHARACTERS, NAME_REQUIERED } from 'src/app/shared/Constants';
import { ToastService } from 'src/app/shared/services/toast/toast.service';
import { LoadingService } from 'src/app/shared/services/loading.service';

  @Component({
  selector: 'app-register-user',
  templateUrl: './register.user.component.html',
  styleUrls: ['./register.user.component.scss']
})
export class RegisterUserComponent implements OnInit, OnDestroy {
  private readonly USERS_STORAGE_KEY = 'game_users';
  userForm: FormGroup;
  @Output() createUser = new EventEmitter();
  showErrors = false;
  private errorTimeout: any;
  game: Game | null = null;
  isJoiningExistingGame: boolean = false;
  headerTitle: string = 'Regístrate';
  buttonLabel: string = 'Continuar';
  isLoading: boolean = false;
  errorMessage: string = 'El nombre no debe estar vacío';
  isClosing: boolean = false;

  get nameControl(): FormControl {
    return this.userForm.get('name') as FormControl;
  }
  get roleControl(): FormControl {
    return this.userForm.get('role') as FormControl;
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private gameService: GameService,
    private router: Router,
    private gameCommunicationService: GameCommunicationService,
    private toastService: ToastService,
    private loadingService: LoadingService
  ) {
    this.userForm = this.fb.group({
      name: [''],
      role: ['player']
    });
  }

  private getStoredUsers(): User[] {
    const usersJson = sessionStorage.getItem(this.USERS_STORAGE_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
  }

  private saveUserToStorage(user: User): void {
    const users = this.getStoredUsers();
    users.push(user);
    sessionStorage.setItem(this.USERS_STORAGE_KEY, JSON.stringify(users));
  }

  private getUsersByGameId(gameId: string): User[] {
    const users = this.getStoredUsers();
    return users.filter(user => user.gameId === gameId);
  }

  ngOnInit() {
    const gameId = this.route.snapshot.paramMap.get('id');
    const gameName = this.route.snapshot.paramMap.get('name');

    if (gameId && gameId !== 'undefined' && gameId.length > 0) {
      if (!this.loadingService.hasLoadingBeenShown()) {
        this.router.navigate(['/loading'], {
          queryParams: { 
            redirect: `/register/${gameName}/${gameId}` 
          }
        });
        return;
      }
    }

    // 🎮 Detectar contexto: si hay gameId en la ruta, es unirse a partida existente
    // gameId debe ser un string válido y no ser 'undefined' literal
    if (gameId && gameId !== 'undefined' && gameId.length > 0) {
      this.isJoiningExistingGame = true;
      this.headerTitle = 'Únete a la partida';
      this.buttonLabel = 'Unirme';
      
      this.gameService.getGameById(gameId).subscribe({
        next: (game) => {
          this.game = game;
          const storedUsers = this.getUsersByGameId(gameId);
        },
        error: (err) => {
        }
      });
    } else {
      this.isJoiningExistingGame = false;
      this.headerTitle = 'Regístrate';
      this.buttonLabel = 'Continuar';
    }

    this.nameControl.valueChanges.subscribe(() => {
      if (this.nameControl.invalid) {
        this.nameControl.markAsTouched();
        this.showErrors = true;
        this.startErrorTimeout();
      }
    });
  }

  ngOnDestroy() {
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
  }

  startErrorTimeout() {
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }

    this.errorTimeout = setTimeout(() => {
      this.showErrors = false;
    }, 4000);
  }

  onSubmit(): void {
    const name = this.userForm.get('name')?.value?.trim();
    if (name) {
      this.showErrors = false;
      this.isLoading = true;
      const gameId = this.route.snapshot.paramMap.get('id') || '';
      const newUser: User = {
        id: this.generateId(),
        gameId: gameId,
        name: name,
        rol: this.userForm.value.role === 'spectator' ? RolUsuario.VIEWER  : RolUsuario.PLAYER,
        assigned: false
      };
      this.handleCreateUser(newUser);
    } else {
      this.showErrors = true;
      this.startErrorTimeout();
    }
  }

  handleCreateUser(newUser: User): void {
    const gameId = this.route.snapshot.paramMap.get('id');

    if (gameId) {
      this.gameService.joinGame(gameId, newUser).subscribe({
        next: (updatedGame) => {
          this.saveUserToStorage(newUser);

          this.gameCommunicationService.addPlayerToGame(newUser);
          sessionStorage.setItem(`userName_${gameId}`, newUser.name);
          sessionStorage.setItem('currentUserId', newUser.id);
          sessionStorage.setItem('currentUserName', newUser.name);  // 🔑 Guardar nombre para sincronización
          
          // Limpiar caché de admin status cuando cambia de usuario para forzar recalcular
          sessionStorage.removeItem(`isAdmin_${gameId}`);

          // Animación de salida antes de navegar
          this.isClosing = true;
          setTimeout(() => {
            this.router.navigate(['/game', gameId]);
          }, 600);
        },
        error: (err) => {
          if (err.message === 'Game is full') {
            this.toastService.showToast('Partida llena', 'error');
          } else {
            this.toastService.showToast('Error al unirse al juego', 'error');
          }
        }
      });
    }
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
