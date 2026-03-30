import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string;

  private playerJoinedSubject = new Subject<any>();
  private votesUpdatedSubject = new Subject<any>();
  private votesRevealedSubject = new Subject<any>();
  private votesResetSubject = new Subject<any>();
  private playerRoleChangedSubject = new Subject<any>();
  private adminChangedSubject = new Subject<any>();
  private playerLeftSubject = new Subject<any>();
  private playerRemovedSubject = new Subject<any>();
  private gameStateSubject = new Subject<any>();
  private errorSubject = new Subject<any>();
  private allVotedSubject = new Subject<void>();
  private gameDeletedSubject = new Subject<any>();
  private startVotesCountdownSubject = new Subject<any>();

  playerJoined$ = this.playerJoinedSubject.asObservable();
  votesUpdated$ = this.votesUpdatedSubject.asObservable();
  votesRevealed$ = this.votesRevealedSubject.asObservable();
  votesReset$ = this.votesResetSubject.asObservable();
  playerRoleChanged$ = this.playerRoleChangedSubject.asObservable();
  adminChanged$ = this.adminChangedSubject.asObservable();
  playerLeft$ = this.playerLeftSubject.asObservable();
  playerRemoved$ = this.playerRemovedSubject.asObservable();
  gameState$ = this.gameStateSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  allVoted$ = this.allVotedSubject.asObservable();
  gameDeleted$ = this.gameDeletedSubject.asObservable();
  startVotesCountdown$ = this.startVotesCountdownSubject.asObservable();

  constructor() {
    this.serverUrl = environment.socketUrl;
  }

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(this.serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('player-joined', (data: any) => {
      this.playerJoinedSubject.next(data);
    });

    this.socket.on('votes-updated', (data: any) => {
      this.votesUpdatedSubject.next(data);
    });

    this.socket.on('votes-revealed', (data: any) => {
      this.votesRevealedSubject.next(data);
    });

    this.socket.on('votes-reset', (data: any) => {
      this.votesResetSubject.next(data);
    });

    this.socket.on('player-role-changed', (data: any) => {
      this.playerRoleChangedSubject.next(data);
    });

    this.socket.on('admin-changed', (data: any) => {
      this.adminChangedSubject.next(data);
    });

    this.socket.on('player-left', (data: any) => {
      this.playerLeftSubject.next(data);
    });

    this.socket.on('player-removed', (data: any) => {
      this.playerRemovedSubject.next(data);
    });

    this.socket.on('game-state', (data: any) => {
      this.gameStateSubject.next(data);
    });

    this.socket.on('error', (data: any) => {
      this.errorSubject.next(data);
    });

    this.socket.on('all-voted', () => {
      this.allVotedSubject.next();
    });

    this.socket.on('game-deleted', (data: any) => {
      this.gameDeletedSubject.next(data);
    });

    this.socket.on('start-votes-countdown', (data: any) => {
      this.startVotesCountdownSubject.next(data);
    });
  }

  joinGame(gameId: string, playerId: string, playerName: string, playerRole: string): void {
    if (!this.socket) {
      this.connect();
    }

    this.socket?.emit('join-game', {
      gameId,
      playerId,
      playerName,
      playerRole,
    });
  }

  submitVote(gameId: string, playerId: string, vote: number): void {
    this.socket?.emit('submit-vote', {
      gameId,
      playerId,
      vote,
    });
  }

  revealVotes(gameId: string): void {
    this.socket?.emit('reveal-votes', { gameId });
  }

  resetVotes(gameId: string): void {
    this.socket?.emit('reset-votes', { gameId });
  }

  changePlayerRole(gameId: string, playerId: string, newRole: string): void {
    this.socket?.emit('change-player-role', {
      gameId,
      playerId,
      newRole,
    });
  }

  changeAdmin(gameId: string, newAdminId: string, oldAdminId: string): void {
    this.socket?.emit('change-admin', {
      gameId,
      newAdminId,
      oldAdminId,
    });
  }

  getGameState(gameId: string): void {
    this.socket?.emit('get-game-state', { gameId });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}
