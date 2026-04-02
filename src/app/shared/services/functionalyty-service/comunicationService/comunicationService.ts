import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { RolUsuario, User } from 'src/app/shared/interfaces/user.model';
import { SocketService } from '../socketio/socket.service';

@Injectable({
  providedIn: 'root'
})
export class GameCommunicationService {
      // Exponer observable para animaciones de objetos lanzados
      get objectThrown$() {
        return this.socketService.objectThrown$;
      }
    throwObject(gameId: string, fromPlayerId: string, toPlayerId: string, objectType: 'heart' | 'paper' | 'star') {
      this.socketService.throwObject(gameId, fromPlayerId, toPlayerId, objectType);
    }
  readonly playerSubject = new BehaviorSubject<User | null>(null);
  player$ = this.playerSubject.asObservable();
  
  // BehaviorSubject para los jugadores del juego
  readonly gamePlayersSubject = new BehaviorSubject<User[]>([]);
  gamePlayers$ = this.gamePlayersSubject.asObservable();
  
  readonly playerColorChangeSubject = new Subject<{ playerId: string, color: string }>();
  playerColorChange$ = this.playerColorChangeSubject.asObservable();
  
  readonly playerVoteChangeSubject = new Subject<{ playerId: string, vote: number }>();
  playerVoteChange$ = this.playerVoteChangeSubject.asObservable();
  
  readonly gameStateSubject = new BehaviorSubject<'waiting' | 'voted' | 'completed'>('waiting');
  gameState$ = this.gameStateSubject.asObservable();
  
  readonly gameVotesSubject = new BehaviorSubject<{ [userId: string]: number | null}>({});
  gameVotes$ = this.gameVotesSubject.asObservable();
  
  readonly clearOverlaysSubject = new Subject<void>();
  clearOverlays$ = this.clearOverlaysSubject.asObservable();
  
  readonly resetPlayerVotesSubject = new Subject<void>();
  resetPlayerVotes$ = this.resetPlayerVotesSubject.asObservable();
  
  readonly playerRoleChangeSubject = new Subject<{ playerId: string, gameId: string, newRole: RolUsuario }>();
  playerRoleChange$ = this.playerRoleChangeSubject.asObservable();
  
  readonly adminChangeSubject = new Subject<{ playerId: string, gameId: string }>();
  adminChange$ = this.adminChangeSubject.asObservable();

  readonly gameDeletedSubject = new Subject<{ gameId: string, reason: string }>();
  gameDeleted$ = this.gameDeletedSubject.asObservable();

  readonly startVotesCountdownSubject = new Subject<any>();
  startVotesCountdown$ = this.startVotesCountdownSubject.asObservable();

  constructor(private socketService: SocketService) {
    const storedPlayer = sessionStorage.getItem('currentPlayer');
    if (storedPlayer) {
      this.playerSubject.next(JSON.parse(storedPlayer));
    }

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    // Cuando se actualizan los votos
    this.socketService.votesUpdated$.subscribe((data: any) => {
      this.gameVotesSubject.next(data.votes);
      // Si el servidor envía el estado (cuando todos votaron), actualizar también el estado
      if (data.state) {
        this.gameStateSubject.next(data.state);
      }
    });

    // Cuando se revelan los votos
    this.socketService.votesRevealed$.subscribe((data: any) => {
      this.gameStateSubject.next('completed');
      this.gameVotesSubject.next(data.votes);
    });

    // Cuando se resetean los votos
    this.socketService.votesReset$.subscribe((data: any) => {
      this.gameVotesSubject.next(data.votes);
      this.gameStateSubject.next('waiting');
      this.resetPlayerVotesSubject.next();
    });

    // Cuando se unen jugadores
    this.socketService.playerJoined$.subscribe((data: any) => {
      this.gameVotesSubject.next(data.votes);
      // 🎮 Emitir los jugadores también y persistir en sessionStorage
      if (data.players && Array.isArray(data.players)) {
        this.gamePlayersSubject.next(data.players);
        // 💾 Persistir jugadores en sessionStorage
        if (data.gameId) {
          sessionStorage.setItem(`players_${data.gameId}`, JSON.stringify(data.players));
        }
        
        // 🔑 Sincronizar el usuario actual con los datos del servidor
        const currentPlayer = this.playerSubject.value;
        const currentUserName = sessionStorage.getItem('currentUserName');
        const currentUserId = sessionStorage.getItem('currentUserId');
        
        // Buscar el jugador en la lista del servidor por nombre O por ID
        const serverPlayer = data.players.find((p: any) => 
          (currentUserName && p.name === currentUserName) || 
          (currentUserId && p.id === currentUserId)
        );
        
        if (serverPlayer) {
         const updatedPlayer: User = {
            id: serverPlayer.id,
            gameId: serverPlayer.game_id,
            name: serverPlayer.name,
            rol:
              serverPlayer.role === 'admin' ? RolUsuario.ADMIN :
              serverPlayer.role === 'viewer' ? RolUsuario.VIEWER :
              serverPlayer.role === 'spectator' ? RolUsuario.VIEWER :
              RolUsuario.PLAYER,
            assigned: false
          };
          sessionStorage.setItem('currentPlayer', JSON.stringify(updatedPlayer));
          sessionStorage.setItem('currentUserId', serverPlayer.id);
          sessionStorage.setItem('currentUserName', serverPlayer.name);
          this.playerSubject.next(updatedPlayer);
        }
      }
    });

    // Cuando todos votaron
    this.socketService.allVoted$.subscribe(() => {
      this.gameStateSubject.next('voted');
    });

    // Cuando cambia el rol de un jugador
    this.socketService.playerRoleChanged$.subscribe((data: any) => {
      if (data && data.playerId) {
        // Actualizar el estado del jugador actual si es él
        const currentPlayer = this.playerSubject.value;
        if (currentPlayer && currentPlayer.id === data.playerId) {
          const updatedPlayer = { ...currentPlayer, rol: data.newRole };
          sessionStorage.setItem('currentPlayer', JSON.stringify(updatedPlayer));
          this.playerSubject.next(updatedPlayer);
        }
        this.playerRoleChangeSubject.next({ playerId: data.playerId, gameId: data.gameId, newRole: data.newRole });
      }
    });

    // Cuando cambia el admin del juego
    this.socketService.adminChanged$.subscribe((data: any) => {
      if (data && data.gameId && data.newAdminId) {
        // Actualizar el admin_id en sessionStorage
        sessionStorage.setItem(`admin_${data.gameId}`, data.newAdminId);
        // Emitir evento de cambio de admin
        this.adminChangeSubject.next({ playerId: data.newAdminId, gameId: data.gameId });
        // Si se recibieron los jugadores, actualizar el gamePlayersSubject
        if (data.players && Array.isArray(data.players)) {
          this.gamePlayersSubject.next(data.players);
          sessionStorage.setItem(`players_${data.gameId}`, JSON.stringify(data.players));
        }
      }
    });

    // Cuando un jugador se desconecta y es removido
    this.socketService.playerRemoved$.subscribe((data: any) => {
      if (data && data.players && Array.isArray(data.players)) {
       // Actualizar la lista de jugadores sin el removido
        this.gamePlayersSubject.next(data.players);
        // Actualizar votos si viene en los datos
        if (data.votes) {
         this.gameVotesSubject.next(data.votes);
        }
        // Persistir en sessionStorage también
        const gameId = data.gameId || sessionStorage.getItem('currentGameId');
        if (gameId) {
          sessionStorage.setItem(`players_${gameId}`, JSON.stringify(data.players));
        }
      } else {
        console.warn('⚠️ Player removed event received but missing players array:', data);
      }
    });

    // Cuando se elimina el juego (admin desconectado)
    this.socketService.gameDeleted$.subscribe((data: any) => {
      if (data && data.gameId) {
        // Limpiar el estado del juego
        sessionStorage.removeItem(`players_${data.gameId}`);
        sessionStorage.removeItem(`admin_${data.gameId}`);
        // Emitir el evento de juego eliminado
        this.gameDeletedSubject.next({ gameId: data.gameId, reason: data.reason || 'Game was deleted' });
      }
    });

    this.socketService.startVotesCountdown$.subscribe((data: any) => {
      this.startVotesCountdownSubject.next(data);
    });
  }

  addPlayerToGame(player: User) {
    sessionStorage.setItem('currentPlayer', JSON.stringify(player));
    this.playerSubject.next(player);
  }

  getStoredPlayers(gameId: string): User[] {
    const playersJson = sessionStorage.getItem(`players_${gameId}`);
    return playersJson ? JSON.parse(playersJson) : [];
  }

  clearState(gameId: string): void {
    sessionStorage.removeItem('currentPlayer');
    this.playerSubject.next(null);
    this.socketService.disconnect();
  }

  updateUserVote(playerId: string, gameId: string, vote: number): void {
    const player = this.playerSubject.value;
    if (player && player.id === playerId) {
      const updatedPlayer = { ...player, voted: vote };
      sessionStorage.setItem('currentPlayer', JSON.stringify(updatedPlayer));
      this.playerSubject.next(updatedPlayer);
    }
  }

  notifyPlayerColorChange(playerId: string, color: string, vote: number) {
    this.playerColorChangeSubject.next({ playerId, color });
    this.playerVoteChangeSubject.next({ playerId, vote });
  }

  notifyClearOverlays(): void {
    this.clearOverlaysSubject.next();
  }

  updateGameVotes(gameId: string, votes: { [userId: string]: number }) {
    this.gameVotesSubject.next(votes);
  }

  updateGameCompletedStatus(gameId: string | null, isComplete: boolean) {
   }

  getLatestGameVotes(gameId: string | null): { [userId: string]: number } {
    const votes = this.gameVotesSubject.value || {};
    const result: { [userId: string]: number } = {};
    Object.keys(votes).forEach(key => {
      if (votes[key] !== null && votes[key] !== undefined) {
        result[key] = votes[key] as number;
      }
    });
    return result;
  }

  resetGameState(gameId: string): void {
    this.gameVotesSubject.next({});
    this.gameStateSubject.next('waiting');
    this.resetPlayerVotesSubject.next();
  }

  notifyPlayerRoleChange(playerId: string, gameId: string, newRole: RolUsuario): void {
    this.playerRoleChangeSubject.next({ playerId, gameId, newRole });
  }

  notifyAdminChange(playerId: string, gameId: string) {
    this.adminChangeSubject.next({ playerId, gameId });
  }
}
