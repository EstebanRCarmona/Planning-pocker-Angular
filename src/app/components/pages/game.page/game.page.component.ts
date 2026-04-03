import { GameService } from '../../../shared/services/functionalyty-service/GameService/game.service.impl';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RolUsuario, User } from 'src/app/shared/interfaces/user.model';
import { GameCommunicationService } from 'src/app/shared/services/functionalyty-service/comunicationService/comunicationService';
import { Observable, Subscription } from 'rxjs';
import { ToastService } from 'src/app/shared/services/toast/toast.service';
import { SERVICE_ERROR } from 'src/app/shared/Constants';
import { faCheck, faTableColumns, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { LoadingService } from 'src/app/shared/services/loading.service';

@Component({
  selector: 'app-game-page',
  templateUrl: './game.page.component.html',
  styleUrls: ['./game.page.component.scss']
})
export class GamePageComponent implements OnInit, OnDestroy {
  gameName: string | null = null;
  userName: string | null = null;
  gameId: string | null = null;
  gameState: 'waiting' | 'voted' | 'completed' = 'waiting';
  gameVotes: { [userId: string]: number | null } = {};
  isAdmin = false;
  isGameComplete:boolean=false;
  currentUserVote: number | null = null;
  player$: Observable<User | null>;
  users: User[] = [];
  revealedCards: { [userId: string]: number } = {};
  fibonacciNumbers: number[] = this.generateFibonacciUpTo89();
  linkCopied: boolean =false;
  faCheck = faCheck;
  faRotateRight = faRotateRight;
  isRoleChangeVisible = false;
  currentUserRole: string = '';
  faTableColumns = faTableColumns;
  isScoringModeVisible = false;
  scoringMode: 'fibonacci' | 'oneToTen' | 'twoToTwenty' = 'fibonacci';
  isLoading:boolean=false;
  isInviteModalVisible: boolean = false;
  invitationLink: string = '';
  private subscriptions: Subscription = new Subscription();

  constructor(
    readonly route: ActivatedRoute,
    readonly router: Router,
    readonly gameService: GameService,
    readonly gameCommunicationService: GameCommunicationService,
    readonly changeDetectorRef:ChangeDetectorRef,
    readonly toastService: ToastService,
    readonly loadingService: LoadingService
  ) {
    this.player$ = this.gameCommunicationService.player$;
  }

  ngOnInit(): void {
    // Verificar si necesita mostrar loading primero
    if (!this.loadingService.hasLoadingBeenShown()) {
      const gameId = this.route.snapshot.paramMap.get('gameId');
      if (gameId) {
        this.router.navigate(['/loading'], {
          queryParams: { 
            redirect: `/game/${gameId}` 
          }
        });
        return;
      }
    }

    this.fibonacciNumbers = this.generateCardNumbers();
    
    // Cargar el gameId desde la ruta PRIMERO
    this.subscriptions.add(
      this.route.paramMap.subscribe(params => {
        this.gameId = params.get('gameId');
        
        if (this.gameId) {
          // Guardar el gameId en sessionStorage para usarlo en otros servicios
          sessionStorage.setItem('currentGameId', this.gameId);
          
          this.gameService.getGameById(this.gameId).subscribe({
            next: (response) => {
              const game = response.game;
              const players = response.players;
              const votes = response.votes;
              
              this.gameName = game.name;
              this.gameState = game.state;
              this.gameCommunicationService.gameStateSubject.next(game.state);
              
              this.gameVotes = votes || {};
              // Guardar el admin_id del juego (evitar guardar 'undefined')
              const adminId = game.admin_id || game.adminId;
              if (adminId) {
                sessionStorage.setItem(`admin_${this.gameId}`, adminId);
              }
              this.checkAdminStatus();
              
              // Cargar el voto actual del usuario desde los votos del juego
              const currentUserId = sessionStorage.getItem('currentUserId');
              if (currentUserId && this.gameVotes[currentUserId] !== undefined && this.gameVotes[currentUserId] !== null) {
                this.currentUserVote = this.gameVotes[currentUserId];
               
              }
              
              // 🎮 Cargar y persistir jugadores existentes del juego
              if (players && Array.isArray(players)) {
                this.users = players;
                sessionStorage.setItem(`players_${this.gameId}`, JSON.stringify(players));
                this.gameCommunicationService.gamePlayersSubject.next(players);
              } else {
                // Si no hay jugadores en el juego, cargar desde sessionStorage
                const storedPlayers = sessionStorage.getItem(`players_${this.gameId}`);
                if (storedPlayers) {
                  const players = JSON.parse(storedPlayers);
                  this.users = players;
                  this.gameCommunicationService.gamePlayersSubject.next(players);
                }
              }
              
              // 🔑 Si no hay usuario, redirigir a registro
              const currentPlayer = this.gameCommunicationService.playerSubject.value;
              if (!currentPlayer || !currentPlayer.rol) {
                this.router.navigate(['/register', this.gameName || 'Game', this.gameId]);
              } else {
                // 🎮 Si hay usuario, emitir join-game para sincronizar con el socket
                this.gameService.joinGame(this.gameId!, currentPlayer).subscribe({
                  next: () => {
                  },
                  error: (err) => {
                    console.error('❌ Error joining game via socket:', err);
                  }
                });
              }
            }
          });
        }
      })
    );
    
    // Suscribirse al jugador actual desde GameCommunicationService
    this.subscriptions.add(
      this.player$.subscribe(player => {
        if (player && player.rol) {
          this.userName = player.name;
          this.currentUserRole = player.rol.toLowerCase();
        }
      })
    );

    // Escuchar cambios de admin
    this.subscriptions.add(
      this.gameCommunicationService.adminChange$.subscribe(() => {
        // NO resetear el caché, simplemente limpiar la variable local y recalcular
        // Esto forzará a checkAdminStatus() a recalcular sin usar el caché viejo
        if (this.gameId) {
          sessionStorage.removeItem(`isAdmin_${this.gameId}`);
        }
        this.checkAdminStatus();
        this.changeDetectorRef.detectChanges();
      })
    );

    // Escuchar cambios de rol del jugador
    this.subscriptions.add(
      this.gameCommunicationService.playerRoleChange$.subscribe((data: any) => {
        if (data && data.playerId && this.gameId === data.gameId) {
          // Si el servidor envía la lista actualizada de jugadores, usar esa
          if (data.players && Array.isArray(data.players)) {
            this.users = data.players;
            sessionStorage.setItem(`players_${this.gameId}`, JSON.stringify(data.players));
          } else {
            // Si no, actualizar el jugador específico en la lista local
            const playerIndex = this.users.findIndex(u => u.id === data.playerId);
            if (playerIndex !== -1) {
              this.users[playerIndex] = { ...this.users[playerIndex], rol: data.newRole };
              sessionStorage.setItem(`players_${this.gameId}`, JSON.stringify(this.users));
            }
          }
          
          // Notificar a través del BehaviorSubject
          this.gameCommunicationService.gamePlayersSubject.next([...this.users]);
          
          // Si el cambio es del jugador actual, actualizar el rol local
          const currentUserId = sessionStorage.getItem('currentUserId');
          if (data.playerId === currentUserId) {
            this.currentUserRole = data.newRole.toLowerCase();
          }
          
          this.changeDetectorRef.detectChanges();
        }
      })
    );

    // Escuchar cambios en los votos para actualizar currentUserVote y gameVotes
    this.subscriptions.add(
      this.gameCommunicationService.gameVotes$.subscribe((votes: any) => {
        // Actualizar gameVotes con los votos broadcast del servidor
        this.gameVotes = votes || {};
        
        const currentUserId = sessionStorage.getItem('currentUserId');
        
        // Si los votos están vacíos o no contienen el usuario actual, limpiar
        if (!votes || Object.keys(votes).length === 0) {
          this.currentUserVote = null;
        } else if (currentUserId && votes[currentUserId] !== undefined) {
          // Si el usuario actual aparece en los votos, actualizar currentUserVote
          if (votes[currentUserId] !== null) {
            this.currentUserVote = votes[currentUserId];
         } else {
            // Si el voto es null (después de reset), limpiar currentUserVote
            this.currentUserVote = null;
          }
        } else {
          // Si el usuario no aparece en los votos, limpiar
          this.currentUserVote = null;
        }
        this.changeDetectorRef.detectChanges();
      })
    );

    // Escuchar cambios en el estado del juego
    this.subscriptions.add(
      this.gameCommunicationService.gameState$.subscribe((state: any) => {
        this.gameState = state;
        // Si el estado es 'completed', actualizar isGameComplete para todos los jugadores
        if (state === 'completed') {
          this.isGameComplete = true;
        } else if (state === 'waiting') {
          this.isGameComplete = false;
          // Limpiar el voto actual cuando se resetea el juego
          this.currentUserVote = null;
        }
        this.changeDetectorRef.detectChanges();
      })
    );

    // Escuchar cambios en la lista de jugadores (cuando alguien se desconecta)
    this.subscriptions.add(
      this.gameCommunicationService.gamePlayers$.subscribe((players: any) => {
        if (players && Array.isArray(players)) {
          this.users = players;
          this.changeDetectorRef.detectChanges();
        }
      })
    );

    // Escuchar cuando el juego es eliminado (admin se desconectó)
    this.subscriptions.add(
      this.gameCommunicationService.gameDeleted$.subscribe((data: any) => {
        // Mostrar toast de error
        this.toastService.showToast('El administrador abandonó el juego. El juego ha sido eliminado.', 'error');
        // Redirigir a home después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      })
    );

    this.subscriptions.add(
      this.gameCommunicationService.startVotesCountdown$.subscribe((data: any) => {
       this.isLoading = true;
        this.changeDetectorRef.detectChanges();
        
        setTimeout(() => {
          this.isLoading = false;
          // Cuando el countdown termina, actualizar el estado del juego
          this.gameState = 'completed';
          this.isGameComplete = true;
          this.changeDetectorRef.detectChanges();
        }, 4000);
      })
    );

    // Escuchar cambios en el modo de puntuación (una sola vez)
    const handleScoringModeChange = (event: StorageEvent) => {
      if (event.key === 'scoring_mode_change' && event.newValue) {
        const modeChangeData = JSON.parse(event.newValue);
        if (modeChangeData.gameId === this.gameId) {
          this.scoringMode = modeChangeData.mode;
          this.fibonacciNumbers = this.generateCardNumbers();
          this.changeDetectorRef.detectChanges();
        }
      }
    };
    window.addEventListener('storage', handleScoringModeChange);
    this.subscriptions.add(() => {
      window.removeEventListener('storage', handleScoringModeChange);
    });

    // Cerrar dropdowns al hacer click fuera
    const handleClickOutside = (event: any) => {
      const userCircle = document.querySelector('.user-circle');
      const roleContainer = document.querySelector('.role-change-container');
      const scoringButton = document.querySelector('.scoring-mode-button');
      const scoringDropdown = document.querySelector('.scoring-mode-dropdown');
      
      // Cerrar dropdown de rol
      if (userCircle && roleContainer && 
          !userCircle.contains(event.target) && 
          !roleContainer.contains(event.target)) {
        this.isRoleChangeVisible = false;
      }
      
      // Cerrar dropdown de scoring
      if (scoringButton && scoringDropdown && 
          !scoringButton.contains(event.target) && 
          !scoringDropdown.contains(event.target)) {
        this.isScoringModeVisible = false;
      }
    };
    document.addEventListener('click', handleClickOutside);
    this.subscriptions.add(() => {
      document.removeEventListener('click', handleClickOutside);
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadUserRole(): void {
    // Intentar obtener del playerSubject primero
    const currentUser = this.gameService.getCurrentUser(this.gameId!, this.userName!);
    
    if (currentUser && currentUser.rol) {
      this.currentUserRole = currentUser.rol.toLowerCase();
    } else {
      // Fallback: obtener del sessionStorage
      const storedPlayer = sessionStorage.getItem('currentPlayer');
      if (storedPlayer) {
        try {
          const player = JSON.parse(storedPlayer);
          this.currentUserRole = player.rol?.toLowerCase() || 'player'; // Por defecto 'player' si no hay rol
        } catch (e) {
          this.currentUserRole = 'player'; // Por defecto 'player' si hay error
        }
      } else {
        // Si es admin, probablemente sea 'player' (pueden cambiar a viewer)
        this.currentUserRole = this.isAdmin ? 'player' : 'void';
      }
    }
  }

  checkAdminStatus(): void {
    if (this.gameId) {
      // Primero verificar si hay un estado guardado en sessionStorage
      const cachedAdminStatus = sessionStorage.getItem(`isAdmin_${this.gameId}`);
      if (cachedAdminStatus !== null) {
        this.isAdmin = cachedAdminStatus === 'true';
        this.changeDetectorRef.detectChanges();
        // Si hay estado en caché, no necesitamos hacer la llamada al servidor
        return;
      }
      
      // Si no hay caché, obtener del servidor
      this.gameService.getGameById(this.gameId).subscribe({
        next: (gameData) => {
          const adminIdFromGame = gameData.game?.admin_id || gameData?.admin_id;
          const currentUserId = sessionStorage.getItem('currentUserId');
          
          // Si el admin_id está en el juego, comparar con el usuario actual
          if (adminIdFromGame) {
            this.isAdmin = currentUserId === adminIdFromGame;
          } else {
            // Fallback: buscar si el usuario está en la lista de jugadores con admin=true
            const currentUser = this.gameService.getCurrentUser(this.gameId!, this.userName || '');
            this.isAdmin = currentUser?.rol === 'admin' || currentUser?.admin === true;
          }
          
          // Guardar el estado en sessionStorage para que persista en recargas
          sessionStorage.setItem(`isAdmin_${this.gameId}`, this.isAdmin ? 'true' : 'false');
          
          this.changeDetectorRef.detectChanges();
        },
        error: (err) => {
          console.error('Error checking admin status:', err);
          this.isAdmin = false;
        }
      });
    }
  }

  getInitials(name: string): string {
    const firstWord = name.split(' ')[0];
    const initials = firstWord.substring(0, 2);
    return initials.toUpperCase();
  }

  vote(vote: number): void {
    if (this.currentUserVote !== null) {
      this.toastService.showToast('Ya votaste en esta ronda', 'success');
      return;
    }
    
    if (!this.gameId || !this.userName) {
      this.toastService.showToast('Error: No hay gameId o userName', 'error');
      return;
    }

    // Usar el ID del sessionStorage que es el ID real del jugador
    const playerId = sessionStorage.getItem('currentUserId');
    if (!playerId) {
      this.toastService.showToast('Error: No hay playerId', 'error');
      return;
    }

    const currentUser = this.gameService.getCurrentUser(this.gameId, this.userName);
    if (!currentUser) {
      this.toastService.showToast('Error: Usuario actual no encontrado', 'error');
      return;
    }

    // Verificar que sea jugador (player o admin pueden votar)
    if (currentUser.rol !== RolUsuario.PLAYER && currentUser.rol !== 'admin') {
      this.toastService.showToast('Solo los jugadores pueden votar', 'error');
      return;
    }

    
    // ACTUALIZAR UI INMEDIATAMENTE (optimistic update)
    this.currentUserVote = vote;
    // Actualizar gameVotes localmente para que se refleje inmediatamente en la UI
    if (!this.gameVotes) {
      this.gameVotes = {};
    }
    this.gameVotes[playerId] = vote;

     if (this.gameId) {
      this.gameCommunicationService.updateGameVotes(this.gameId, { [playerId]: vote });
    }
    
    this.changeDetectorRef.detectChanges();

    this.subscriptions.add(
      this.gameService.playerVote(this.gameId, playerId, vote).subscribe({
        next: (votesData) => {
          this.gameVotes = votesData.votes || {};
          this.gameState = votesData.state;
          if (this.gameId) {
            // Filter out null values before updating
            const votesWithoutNull = Object.fromEntries(
              Object.entries(this.gameVotes).filter(([_, v]) => v !== null)
            ) as { [userId: string]: number };
            this.gameCommunicationService.updateGameVotes(this.gameId, votesWithoutNull);
          }
          this.onCardSelected(playerId, this.gameId!, vote);
          this.changeDetectorRef.detectChanges();
        },
        error: (err) => {
          console.error('❌ Error al votar:', err);
          this.currentUserVote = null; // Revertir optimistic update
          if (this.gameVotes) {
            delete this.gameVotes[playerId];
          }
          this.toastService.showToast('Error al registrar voto', 'error');
          this.changeDetectorRef.detectChanges();
        }
      })
    );
  }

  isPlayerRole(): boolean {
    if (this.gameId && this.userName) {
      const currentUser = this.gameService.getCurrentUser(this.gameId, this.userName);
      return currentUser ? currentUser.rol === RolUsuario.PLAYER : false;
    }
    return false;
  }

  onCardSelected(playerId: string, gameId: string, vote: number): void {
    this.gameCommunicationService.updateUserVote(playerId, gameId, vote);
    this.users = this.gameCommunicationService.getStoredPlayers(gameId);
  }

  canRevealVotes(): boolean {
    if (!this.gameId || !this.userName) {
      return false;
    }
    
    // Usar el flag isAdmin que ya está siendo actualizado por checkAdminStatus()
    const isStillAdmin = this.isAdmin;
    
   const currentState = this.gameCommunicationService.gameStateSubject.value;
    const allVotedByServer = currentState === 'voted';

    const canReveal = isStillAdmin && allVotedByServer;

    return canReveal;
  }

  validateAndRevealVotes(): void {
    if (!this.gameId) {
      console.error('❌ validateAndRevealVotes: Missing gameId');
      return;
    }


    // Verificar que el usuario es admin
    if (!this.isAdmin) {
      this.toastService.showToast('❌ Solo el admin puede revelar votos', 'error');
      return;
    }

    // Verificar que el estado es 'voted'
    if (this.gameState !== 'voted') {
      this.toastService.showToast('⚠️ Espera a que todos los jugadores voten', 'error');
      return;
    }

    this.revealVotes();
  }

  revealVotes(): void {
    if (this.gameId) {
      this.subscriptions.add(
        this.gameService.revealVotes(this.gameId).subscribe({
          next: (game) => {
         },
          error: (err) => {
            console.error('❌ Error revealing votes:', err);
            this.toastService.showToast('Error al revelar votos', 'error');
          }
        })
      );
    }
  }

  copyInvitationLink(): void {
    if (this.invitationLink) {
      navigator.clipboard.writeText(this.invitationLink).then(() => {
        this.linkCopied = true;
        setTimeout(() => this.linkCopied = false, 3000);
        this.toastService.showToast("✓ Link copiado correctamente", "success")
      }).catch(err => {
        this.toastService.showToast(SERVICE_ERROR,"error")
      });
    } else {
      this.toastService.showToast('Error: No hay enlace disponible', 'error');
    }
  }
  openInviteModal() {
    if (!this.gameId) {
      this.toastService.showToast('Error: ID del juego no encontrado', 'error');
      return;
    }
    
    const baseUrl = window.location.origin;
    const gameName = this.gameName || 'Game';
    this.invitationLink = `${baseUrl}/register/${gameName}/${this.gameId}`;
    this.isInviteModalVisible = true;
  }

  closeInviteModal() {
    this.isInviteModalVisible = false;
  }

  copyLinkAndClose() {
    this.copyInvitationLink();
    this.closeInviteModal();
  }

  getVotesForNumber(vote: number): number {
    return Object.values(this.gameVotes).filter(v => v === vote).length;
  }

  getCurrentUserVote(): { vote: number | null; id: string } {
    const currentUserId = sessionStorage.getItem('currentUserId');
    if (currentUserId && this.gameVotes && this.gameVotes[currentUserId] !== undefined) {
      const vote = this.gameVotes[currentUserId];
      return { vote: vote !== null ? vote : null, id: currentUserId };
    }
    // Fallback a la búsqueda anterior si no hay currentUserId
    const currentUser = this.gameService.getCurrentUser(this.gameId!, this.userName!);
    if (currentUser && this.gameVotes) {
      const vote = this.gameVotes[currentUser.id];
      return { vote: vote !== undefined ? vote : null, id: currentUser.id };
    }
    return { vote: null, id: '' };
  }

  generateFibonacciUpTo89(): number[] {
    let fib = [0, 1, 3, 5];
    while (true) {
      const nextFib = fib[fib.length - 1] + fib[fib.length - 2];
      if (nextFib > 89) break;
      fib.push(nextFib);
    }
    return fib;
  }

  generateCardNumbers(): number[] {
    const mode = this.scoringMode;
    switch(mode) {
      case 'fibonacci':
        return this.generateFibonacciUpTo89();
      case 'oneToTen':
        return Array.from({length: 10}, (_, i) => i + 1);
      case 'twoToTwenty':
        return Array.from({length: 10}, (_, i) => (i + 1) * 2);
      default:
        return this.generateFibonacciUpTo89();
    }
  }

  getAverageVote(): number {
    const votes = Object.values(this.gameVotes).filter(vote => typeof vote === 'number') as number[];
    if (votes.length === 0) return 0;
    const sum = votes.reduce((a, b) => a + b, 0);
    return sum / votes.length;
  }


  getUniqueVotes(): { vote: number, count: number }[] {
    const voteCounts: { [key: number]: number } = {};

    for (const vote of Object.values(this.gameVotes)) {
      if (typeof vote === 'number') {
        if (!voteCounts[vote]) {
          voteCounts[vote] = 0;
        }
        voteCounts[vote]++;
      }
    }

    return Object.keys(voteCounts).map(vote => ({
      vote: Number(vote),
      count: voteCounts[Number(vote)]
    }));
  }

  toggleRoleChange(): void {
    if (!this.isRoleChangeVisible) {
      this.loadUserRole();
    }
    this.isRoleChangeVisible = !this.isRoleChangeVisible;
  }

  changeRole(): void {
    if (this.gameVotes && Object.keys(this.gameVotes).length > 0) {
      this.toastService.showToast('Ya inició la votación, no se puede cambiar de rol', 'error');
      return;
    }

    if (this.gameId && this.userName) {
      const currentUser = this.gameService.getCurrentUser(this.gameId, this.userName);
      if (currentUser && currentUser.id) {
        // Alternar entre player y viewer
        const newRole = currentUser.rol === RolUsuario.PLAYER ? RolUsuario.VIEWER : RolUsuario.PLAYER;
        
        // Crear usuario actualizado
        const updatedUser = { ...currentUser, rol: newRole };
        
        // Actualizar sessionStorage
        sessionStorage.setItem('currentPlayer', JSON.stringify(updatedUser));
        
        // Actualizar el estado local INMEDIATAMENTE
        this.currentUserRole = newRole.toLowerCase();
        this.isRoleChangeVisible = false;
        
        // Actualizar via Socket.IO
        this.gameService.updateUserRole(this.gameId, currentUser.id, newRole);
        
        // Actualizar el playerSubject para que los cambios sean persistentes
        (this.gameCommunicationService as any).playerSubject.next(updatedUser);
        
        // Notificar el cambio
        this.gameCommunicationService.notifyPlayerRoleChange(currentUser.id, this.gameId, newRole);
        this.toastService.showToast('Cambio de rol exitoso', 'success');
        
        // Forzar detección de cambios
        this.changeDetectorRef.detectChanges();
      }
    }
  }

  restartGame() {
    if (this.gameId) {
      sessionStorage.setItem(`game_restart_${this.gameId}`, JSON.stringify({
        gameId: this.gameId,
        timestamp: Date.now()
      }));
      this.gameCommunicationService.resetGameState(this.gameId);
      this.resetAllGame();
      this.gameService.resetGameVotesAndStatus(this.gameId);
      this.gameCommunicationService.resetPlayerVotesSubject.next();
    }
  }

  toggleScoringMode(): void {
    if (this.gameVotes && Object.keys(this.gameVotes).length > 0) {
      this.toastService.showToast('No se puede cambiar el modo durante la votación', 'error');
      return;
    }
    this.isScoringModeVisible = !this.isScoringModeVisible;
  }

  changeScoringMode(mode: 'fibonacci' | 'oneToTen' | 'twoToTwenty'): void {
    if (this.gameVotes && Object.keys(this.gameVotes).length > 0) {
      this.toastService.showToast('No se puede cambiar el modo durante la votación', 'error');
      return;
    }

    this.scoringMode = mode;
    this.fibonacciNumbers = this.generateCardNumbers();
    sessionStorage.setItem(`scoringMode_${this.gameId}`, mode);
    sessionStorage.setItem('scoring_mode_change', JSON.stringify({
      gameId: this.gameId,
      mode: mode,
      timestamp: Date.now()
    }));
    this.isScoringModeVisible = false;
    this.changeDetectorRef.detectChanges();
  }

  private resetAllGame(): void {

    this.isGameComplete=false;
    this.gameState="waiting";
    Object.keys(this.gameVotes).forEach(userId => {
      this.gameVotes = {};
    });
    this.currentUserVote = null;
    this.changeDetectorRef.detectChanges();
  }

  get objectKeys() {
    return Object.keys;
  }


}
