import { GameService } from '../../../shared/services/functionalyty-service/GameService/game.service.impl';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RolUsuario, User } from 'src/app/shared/interfaces/user.model';
import { GameCommunicationService } from 'src/app/shared/services/functionalyty-service/comunicationService/comunicationService';
import { Observable, Subscription } from 'rxjs';
import { ToastService } from 'src/app/shared/services/toast/toast.service';
import { SERVICE_ERROR } from 'src/app/shared/Constants';
import { faCheck, faTableColumns } from '@fortawesome/free-solid-svg-icons';

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
    readonly gameService: GameService,
    readonly gameCommunicationService: GameCommunicationService,
    readonly changeDetectorRef:ChangeDetectorRef,
    readonly toastService: ToastService
  ) {
    this.player$ = this.gameCommunicationService.player$;
  }

  ngOnInit(): void {
    this.fibonacciNumbers = this.generateCardNumbers();
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith('game_complete_') && event.newValue) {
        const gameCompleteData = JSON.parse(event.newValue);
        if (gameCompleteData.gameId === this.gameId) {
          this.isGameComplete = gameCompleteData.isComplete;
          this.gameVotes = this.gameCommunicationService.getLatestGameVotes(this.gameId);
          this.gameCommunicationService.notifyClearOverlays();
          this.changeDetectorRef.detectChanges();
        }
      }

      if (event.key && event.key.startsWith('game_restart_') && event.newValue) {
        const gameRestartData = JSON.parse(event.newValue);
        if (gameRestartData.gameId === this.gameId) {
          this.resetAllGame();
          if(this.gameId){
            this.gameCommunicationService.resetGameState(this.gameId);
            this.resetAllGame();
            this.gameService.resetGameVotesAndStatus(this.gameId);
            this.gameCommunicationService.resetPlayerVotesSubject.next();
          }
      }
      }

      if (event.key && event.key.startsWith('admin_change_') && event.newValue) {
        const adminChangeData = JSON.parse(event.newValue);
        if (adminChangeData.gameId === this.gameId) {
          this.isAdmin=false;
          this.checkAdminStatus();
          this.changeDetectorRef.detectChanges();
        }
      }

      this.loadUserRole();
    });

    this.subscriptions.add(
      this.gameCommunicationService.adminChange$.subscribe(() => {
        this.isAdmin=false;
        this.checkAdminStatus();
        this.changeDetectorRef.detectChanges();

      })
    );

    this.subscriptions.add(
      this.route.paramMap.subscribe(params => {
        this.gameId = params.get('gameId');
        if (this.gameId) {
          this.gameService.getGameById(this.gameId).subscribe({
            next: (game) => {
              this.gameName = game.name;
              this.gameState = game.state;
              this.gameVotes = game.votes || {};
              this.checkAdminStatus();
            }
          });
        }
      })
    );

    window.addEventListener('storage', (event) => {
      if (event.key === 'scoring_mode_change' && event.newValue) {
        const modeChangeData = JSON.parse(event.newValue);
        if (modeChangeData.gameId === this.gameId) {
          this.scoringMode = modeChangeData.mode;
          this.fibonacciNumbers = this.generateCardNumbers();
          this.changeDetectorRef.detectChanges();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadUserRole(): void {
    const currentUser = this.gameService.getCurrentUser(this.gameId!, this.userName!);
  if (currentUser && currentUser.rol) {
    this.currentUserRole = currentUser.rol.toLowerCase();
  } else {
    this.currentUserRole = 'void';
  }
  }

  checkAdminStatus(): void {
    if (this.gameId) {
      this.userName = localStorage.getItem(`userName_${this.gameId}`);

      if (this.userName) {
        this.isAdmin = this.gameService.isAdminUser(this.gameId, this.userName);
      }

      this.changeDetectorRef.detectChanges();
    }

  }

  getInitials(name: string): string {
    const firstWord = name.split(' ')[0];
    const initials = firstWord.substring(0, 2);
    return initials.toUpperCase();
  }

  vote(vote: number): void {
    if (this.currentUserVote !== null) {
      return;
    }
    if (this.gameId && this.userName) {
      const currentUser = this.gameService.getCurrentUser(this.gameId, this.userName);

      if (currentUser && currentUser.rol === RolUsuario.PLAYER) {
        this.subscriptions.add(
          this.gameService.playerVote(this.gameId, currentUser.id, vote).subscribe({
            next: (game) => {
              this.currentUserVote = vote;
              this.gameVotes = game.votes;
              this.gameState = game.state;
              if(this.gameId)
            this.gameCommunicationService.updateGameVotes(this.gameId, game.votes);
              this.onCardSelected(currentUser.id, this.gameId!, vote);
            },
            error: (err) => {
              this.toastService.showToast(SERVICE_ERROR,"error");

            }
          })
        );
      }
    }
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
    if (!this.gameId) return false;
    const isStillAdmin = this.gameService.isAdminUser(this.gameId, this.userName!);
    const playerCount = this.gameService.getGamePlayerCount(this.gameId, RolUsuario.PLAYER);
    const votedCount = this.gameVotes ? Object.keys(this.gameVotes).length : 0;

    return isStillAdmin && playerCount === votedCount && this.gameState === 'voted';
  }

  revealVotes(): void {
    if (this.gameId) {
      this.isLoading = true;

      setTimeout(() => {
      if(this.gameId)
      this.subscriptions.add(
        this.gameService.revealVotes(this.gameId).subscribe({
          next: (game) => {
            this.gameState = game.state;
            this.gameVotes = game.votes;
            this.isGameComplete = true;
            this.isLoading = false;
            this.changeDetectorRef.detectChanges();
            if(this.gameId)
            this.gameCommunicationService.updateGameCompletedStatus(this.gameId, true);
            this.gameCommunicationService.notifyClearOverlays();
          }
        })
      );
    }, 4000);
    }
  }

  copyInvitationLink(): void {
    if (this.gameId && this.gameName) {
      const baseUrl = window.location.origin;
      const invitationLink = `${baseUrl}/register/${this.gameName}/${this.gameId}`;
      navigator.clipboard.writeText(invitationLink).then(() => {
        this.linkCopied = true;
        setTimeout(() => this.linkCopied = false, 3000);
        this.toastService.showToast("✓ Link copiado", "success")
      }).catch(err => {
        this.toastService.showToast(SERVICE_ERROR,"error")
      });
    }
  }
  openInviteModal() {
    if (this.gameId && this.gameName) {
      const baseUrl = window.location.origin;
      this.invitationLink = `${baseUrl}/register/${this.gameName}/${this.gameId}`;
      this.isInviteModalVisible = true;
    }
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
    this.loadUserRole();
    this.isRoleChangeVisible = !this.isRoleChangeVisible;
  }

  changeRole(): void {
    if(this.gameVotes || Object.keys(this.gameVotes).length > 0){
      this.toastService.showToast('Ya inicio la votación, no se puede cambiar', 'error');

    }
    if (this.gameId && this.userName && Object.keys(this.gameVotes).length === 0) {
      const currentUser = this.gameService.getCurrentUser(this.gameId, this.userName);
      if (currentUser) {
        this.gameService.updateUserRole(this.gameId, currentUser.id);
            this.isRoleChangeVisible = false;

            if(this.gameId && currentUser.rol)
              this.gameCommunicationService.notifyPlayerRoleChange(
                currentUser.id,
                this.gameId,
                currentUser.rol
              );
      this.toastService.showToast('cambio de rol exitoso', 'success');
    }
  }

  }

  restartGame() {
    if (this.gameId) {
      localStorage.setItem(`game_restart_${this.gameId}`, JSON.stringify({
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
    localStorage.setItem(`scoringMode_${this.gameId}`, mode);
    localStorage.setItem('scoring_mode_change', JSON.stringify({
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
