import { Observable } from 'rxjs';
import { Game } from 'src/app/shared/interfaces/game.model';
import { Injectable } from "@angular/core";
import { CreateGameRequest } from 'src/app/shared/interfaces/game.model';
import { RolUsuario, User } from "src/app/shared/interfaces/user.model";
import { HttpClient } from '@angular/common/http';
import { SocketService } from '../socketio/socket.service';
import { GameCommunicationService } from '../comunicationService/comunicationService';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private socketService: SocketService,
    private gameCommunicationService: GameCommunicationService
  ) {}

  createGame(request: CreateGameRequest): Observable<Game> {
    const userId = this.generateId();
    sessionStorage.setItem('currentUserId', userId);
    
    return this.http.post<Game>(`${this.apiUrl}/games`, {
      name: request.name,
      adminId: userId,
      scoringMode: 'fibonacci'
    });
  }

  joinGame(gameId: string, user: User): Observable<any> {
    if (!this.socketService.isConnected()) {
      this.socketService.connect();
    }

    this.socketService.joinGame(gameId, user.id, user.name, user.rol || RolUsuario.PLAYER);
    return this.socketService.playerJoined$;
  }

  vote(gameId: string, userId: string, vote: number): Observable<any> {
    this.socketService.submitVote(gameId, userId, vote);
    return this.socketService.votesUpdated$;
  }

  getGameById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/games/${id}`);
  }

  revealVotes(gameId: string): Observable<any> {
    this.socketService.revealVotes(gameId);
    return this.socketService.votesRevealed$;
  }

  resetGameVotesAndStatus(gameId: string): void {
    this.socketService.resetVotes(gameId);
  }

  playerVote(gameId: string, userId: string, vote: number): Observable<any> {
    this.vote(gameId, userId, vote);
    return this.socketService.votesUpdated$;
  }

  getCurrentUser(gameId: string, userName: string): User | undefined {

    return (this.gameCommunicationService as any).playerSubject.value || undefined;
  }

  getGamePlayerCount(gameId: string, rol: RolUsuario): number {
    const storedPlayers = sessionStorage.getItem(`players_${gameId}`);
    if (!storedPlayers) return 0;
    try {
      const players: User[] = JSON.parse(storedPlayers);
      return players.filter(p => p.rol === rol).length;
    } catch (e) {
      return 0;
    }
  }

  getGameVotingPlayerCount(gameId: string): number {
    const storedPlayers = sessionStorage.getItem(`players_${gameId}`);
    if (!storedPlayers) return 0;
    try {
      const players: User[] = JSON.parse(storedPlayers);
      // Contar players y admins (ambos pueden votar)
      return players.filter(p => p.rol === RolUsuario.PLAYER || p.rol === 'admin').length;
    } catch (e) {
      return 0;
    }
  }

  isAdminUser(gameId: string, userName: string): boolean {
    // Usar directamente el currentUserId del sessionStorage que es la fuente de verdad
    const currentUserId = sessionStorage.getItem('currentUserId');
    const adminId = sessionStorage.getItem(`admin_${gameId}`);
    
    // Evitar comparar con string 'undefined'
    if (!currentUserId || !adminId || adminId === 'undefined') {
      return false;
    }
    
    const isAdmin = currentUserId === adminId;
    return isAdmin;
  }

  updateUserRole(gameId: string, userId: string, newRole?: string): void {
    const role = newRole || RolUsuario.VIEWER;
    this.socketService.changePlayerRole(gameId, userId, role);
  }

  changeAdmin(id: string, gameId: string): void {
    const oldAdminId = sessionStorage.getItem(`admin_${gameId}`) || '';
    this.socketService.changeAdmin(gameId, id, oldAdminId);
    sessionStorage.setItem(`admin_${gameId}`, id);
  }

  private generateId(): string {
   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  AuthService(gameId?: string): string | null {
    if (gameId) {
      return sessionStorage.getItem(`userName_${gameId}`);
    }
    return sessionStorage.getItem('userName');
  }
}
