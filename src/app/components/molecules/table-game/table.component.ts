import { Component, OnInit, OnDestroy, NgZone, Input, ChangeDetectorRef } from '@angular/core';
import { User } from '../../../shared/interfaces/user.model';
import { GameCommunicationService } from 'src/app/shared/services/functionalyty-service/comunicationService/comunicationService';
import { ActivatedRoute } from '@angular/router';
import { Subscription, fromEvent } from 'rxjs';
import { GameService } from 'src/app/shared/services/functionalyty-service/GameService/game.service.impl';

@Component({
  selector: 'app-table-game',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableGameComponent implements OnInit, OnDestroy {
  @Input() currentUserVote: { vote: number | null, id: string | null }= { vote: null, id: null };
  private readonly TABLE_STATE_KEY = 'game_table_state';
  private gameId: string | null = null;
  readonly subscriptions: Subscription = new Subscription();
  private gameCompl:boolean = false;
  userName:string="";
  showAdminTransferOption = false;
  adminTransferOptions: { [key: string]: boolean } = {};
  adminPlayerId: string | null = null;

  players: {
    id: string;
    name: string;
    assigned: boolean;
    rol?: string;
    order: number;
    userId?:string
    overlay?: string | null;
    vote?: number | null;
    isAdmin?: boolean; 
  }[] = [
    { id: 'center', name: '', assigned: false, rol: '', order: 1 },
    { id: 'bottom-center', name: '', assigned: false, rol: '', order: 2 },
    { id: 'left-side', name: '', assigned: false, rol: '', order: 3 },
    { id: 'right-side', name: '', assigned: false, rol: '', order: 4 },
    { id: 'side-top-left', name: '', assigned: false, rol: '', order: 5 },
    { id: 'side-top-right', name: '', assigned: false, rol: '', order: 6 },
    { id: 'bottom-left-1', name: '', assigned: false, rol: '', order: 7 },
    { id: 'bottom-right-1', name: '', assigned: false, rol: '', order: 8 }
  ];

  constructor(
    readonly gameCommunicationService: GameCommunicationService,
    readonly route: ActivatedRoute,
    readonly ngZone: NgZone,
    readonly changeDetectorRef: ChangeDetectorRef,
    readonly gameService :GameService
  ) {

   }

  ngOnInit(): void {
    this.subscriptions.add(
      this.gameCommunicationService.clearOverlays$.subscribe(() => {
        this.clearAllPlayerOverlays();
      })
    );

    this.subscriptions.add(
      this.gameCommunicationService.resetPlayerVotes$.subscribe(() => {
        this.resetPlayerVotes();

      })
    );
    this.gameId = this.route.snapshot.paramMap.get('gameId');

    // 🔑 CRÍTICO: Cargar el admin_id de la BD ANTES de procesar jugadores
    if (this.gameId) {
      this.loadAdminIdFromGame();
    }

    // Nuevo: Suscribirse a los jugadores cargados del juego
    this.subscriptions.add(
      this.gameCommunicationService.gamePlayers$.subscribe((players) => {
        if (players && players.length > 0) {
         
          // 🔴 PRIMERO: Limpiar jugadores que ya no están en la lista
          const activePlayerIds = new Set(players.map(p => p.id));
          this.players.forEach(position => {
            if (position.userId && !activePlayerIds.has(position.userId)) {
              position.name = '';
              position.assigned = false;
              position.userId = undefined;
              position.rol = '';
              position.vote = null;
              position.overlay = null;
              position.isAdmin = false;
            }
          });
          
          // 🎮 Obtener el usuario actual
          const currentPlayer = this.gameCommunicationService.playerSubject.value;
          
          // Separar: usuario actual y otros
          const currentPlayerData = currentPlayer ? players.find(p => p.id === currentPlayer.id) : null;
          const otherPlayers = players.filter(p => !currentPlayer || p.id !== currentPlayer.id);
          
          // 1️⃣ Primero asignar al usuario actual al centro
          if (currentPlayerData && !this.players.some(p => p.userId === currentPlayerData.id)) {
            this.assignPlayerToCenter(currentPlayerData);
          }
          
          // 2️⃣ Luego asignar a los otros jugadores
          otherPlayers.forEach(apiPlayer => {
            const isAssigned = this.players.some(p => p.userId === apiPlayer.id);
            if (!isAssigned) {
              this.assignNewPlayer(apiPlayer);
            }
          });
          
          this.changeDetectorRef.detectChanges();

          // 🔑 CRÍTICO: Después de asignar todos los jugadores, actualizar el estado de admin
          // Esto es necesario porque el admin_id puede ya estar en cache desde antes
          this.updatePlayersAdminStatus();
        }
      })
    );

    // 🔑 CRÍTICO: Suscribirse a cambios en playerSubject para re-procesar cuando se sincronice
    // Esto es necesario porque playerSubject puede sincronizarse DESPUÉS de que gamePlayers$ emita
    this.subscriptions.add(
      this.gameCommunicationService.playerSubject.subscribe((currentPlayer) => {
        if (currentPlayer) {
          // El usuario actual se ha sincronizado, re-procesar los jugadores
          const currentPlayers = this.gameCommunicationService.gamePlayersSubject.value;
          if (currentPlayers && currentPlayers.length > 0) {
            // Buscar el usuario actual en la lista
            const currentPlayerData = currentPlayers.find(p => p.id === currentPlayer.id);
            const otherPlayers = currentPlayers.filter(p => p.id !== currentPlayer.id);
            
            if (currentPlayerData) {
              // 🔑 CRÍTICO: El usuario debe estar en el CENTRO, no en cualquier otra posición
              // Primero, verificar si ya está en el centro
              const centerPlayer = this.players.find(p => p.id === 'center');
              const isInCenter = centerPlayer?.userId === currentPlayerData.id;
              
              if (isInCenter) {
              } else {
                // El usuario está en otra posición o sin asignar. Moverlo al centro
                // Desasignar de cualquier otra posición
                this.players.forEach(p => {
                  if (p.userId === currentPlayerData.id && p.id !== 'center') {
                    p.name = '';
                    p.assigned = false;
                    p.userId = undefined;
                    p.rol = '';
                  }
                });
                
                // Asignar al centro
                this.assignPlayerToCenter(currentPlayerData);
                this.changeDetectorRef.detectChanges();
              }
            }
          }
        }
      })
    );

    if (this.gameId) {
      this.initializeGameState();
      this.setupStorageListener();
      this.setupPlayerSubscription();
      this.setupPlayerColorChangeSubscription();
      this.setupPlayerVoteChangeSubscription();
      this.setupPlayerRoleChangeSubscription();
      this.setupAdminChangeSubscription();
      this.setupGameVotesSubscription();
      this.setupVotesRevealedSubscription();
    }

  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // 🔑 Cargar el admin_id desde la BD y guardarlo en sessionStorage
  private loadAdminIdFromGame(): void {
    if (!this.gameId) return;
    
    // Primero verificar si ya está en sessionStorage
    const cachedAdminId = sessionStorage.getItem(`admin_${this.gameId}`);
    if (cachedAdminId) {
      return;
    }
    
    // Si no está en cache, obtenerlo de la BD
    this.subscriptions.add(
      this.gameService.getGameById(this.gameId).subscribe({
        next: (gameData) => {
          const adminId = gameData.game?.admin_id || gameData?.admin_id;
          if (adminId) {
            sessionStorage.setItem(`admin_${this.gameId}`, adminId);
            
            // 🔑 CRÍTICO: Después de cargar el admin_id, actualizar el estado de los jugadores ya asignados
            this.updatePlayersAdminStatus();
          }
        },
        error: (err) => {
        }
      })
    );
  }

  // 🔑 Actualizar el estado de admin para todos los jugadores ya asignados
  private updatePlayersAdminStatus(): void {
    const adminId = sessionStorage.getItem(`admin_${this.gameId}`);
    if (!adminId) {
      return;
    }

    let updated = false;
    this.players.forEach((player, index) => {
      if (player.assigned && player.userId) {
        const isAdmin = this.isPlayerAdmin(player.userId);
        if (isAdmin && !player.isAdmin) {
          player.isAdmin = true;
          this.adminPlayerId = player.userId;
          updated = true;
        } else if (!isAdmin && player.isAdmin) {
          player.isAdmin = false;
          updated = true;
        }
      }
    });

    if (updated) {
      this.saveTableState();
      this.changeDetectorRef.detectChanges();
    }
  }

  private initializeGameState(): void {
    this.loadTableState();
    const storedPlayers = this.gameCommunicationService.getStoredPlayers(this.gameId!);
    // 🎮 No resetear si hay jugadores almacenados
    if (storedPlayers.length === 0) {
      this.resetPlayers();
    }
    storedPlayers.forEach(player => {
      if (!this.isPlayerAssigned(player)) {
        this.assignPlayer(player);
      }
    });
  }

  private setupPlayerColorChangeSubscription(): void {
    this.subscriptions.add(
      this.gameCommunicationService.playerColorChange$.subscribe(({ playerId, color }) => {
        const player = this.getPlayerByID(playerId);
        if (player) {
          player.overlay = color;
          this.saveTableState();
          this.changeDetectorRef.detectChanges();
        }
      })
    );
  }

  private setupPlayerRoleChangeSubscription(): void {
    this.subscriptions.add(
      this.gameCommunicationService.playerRoleChange$.subscribe(({ playerId, gameId, newRole }) => {
        if (gameId === this.gameId) {
          const player = this.getPlayerByUserId(playerId);
          if (player) {
            // 🎮 Normalizar rol: si es admin, mostrarlo como 'player' en el template
            player.rol = this.getRoleForDisplay(newRole);
            // 🎮 Actualizar el flag de admin basándose en admin_id del localStorage
            player.isAdmin = this.isPlayerAdmin(playerId);
            // 🎮 Actualizar adminPlayerId si cambia
            if (player.isAdmin) {
              this.adminPlayerId = playerId;
            } else if (this.adminPlayerId === playerId) {
              this.adminPlayerId = null;
            }
            this.saveTableState();
            this.changeDetectorRef.detectChanges();
            this.notifyPlayersUpdate();

          }
        }
      })
    );
  }

  private setupAdminChangeSubscription(): void {
    this.subscriptions.add(
      this.gameCommunicationService.adminChange$.subscribe(({ playerId, gameId }) => {
        if (gameId === this.gameId) {
          
          // Actualizar el admin_id en sessionStorage
          sessionStorage.setItem(`admin_${this.gameId}`, playerId);
          
          // Actualizar el estado de admin para todos los jugadores
          this.updatePlayersAdminStatus();
          
          // Forzar detección de cambios
          this.changeDetectorRef.detectChanges();
          this.saveTableState();
        }
      })
    );
  }

  private setupPlayerVoteChangeSubscription(): void {
    this.subscriptions.add(
      this.gameCommunicationService.playerVoteChange$.subscribe(({ playerId, vote }) => {
        const player = this.getPlayerByID(playerId);
        if (player) {
          player.vote = vote;
          this.saveTableState();
          this.changeDetectorRef.detectChanges();
        }
      })
    );
  }

  private setupGameVotesSubscription(): void {
    this.subscriptions.add(
      this.gameCommunicationService.gameVotes$.subscribe((votes: any) => {
        if (votes && typeof votes === 'object') {
          // Actualizar los votos de todos los jugadores en la tabla
          for (const [userId, voteValue] of Object.entries(votes)) {
            const player = this.players.find(p => p.userId === userId);
            if (player) {
              player.vote = voteValue as number | null;
            }
          }
          
          // Si el estado actual es 'completed', marcar como revelado
          const currentState = this.gameCommunicationService.gameStateSubject.value;
          if (currentState === 'completed') {
            this.gameCompl = true;
          }
          
          this.saveTableState();
          this.changeDetectorRef.detectChanges();
          this.changeDetectorRef.markForCheck();
        }
      })
    );
  }

  private setupVotesRevealedSubscription(): void {
    this.subscriptions.add(
      this.gameCommunicationService.gameState$.subscribe((state) => {
        if (state === 'completed') {
          this.gameCompl = true;
          // Asegurar que los votos están sincronizados cuando se revelan
          const currentVotes = this.gameCommunicationService.gameVotesSubject.value;
          if (currentVotes && typeof currentVotes === 'object') {
            for (const [userId, voteValue] of Object.entries(currentVotes)) {
              const player = this.players.find(p => p.userId === userId);
              if (player) {
                player.vote = voteValue as number | null;
              }
            }
          }
          this.saveTableState();
          this.changeDetectorRef.detectChanges();
        } else if (state === 'waiting') {
          this.gameCompl = false;
          this.changeDetectorRef.detectChanges();
        }
      })
    );
  }

  private setupStorageListener(): void {
    this.subscriptions.add(
      fromEvent(window, 'storage').subscribe((event: any) => {
        if (event.key === `${this.TABLE_STATE_KEY}_${this.gameId}`) {
          this.ngZone.run(() => {
            this.loadTableState();
          });
        }
      })
    );
  }

  private setupPlayerSubscription(): void {
    this.subscriptions.add(
      this.gameCommunicationService.player$.subscribe(player => {
        if (player && !this.isPlayerAssigned(player)) {
          this.assignPlayer(player);
          this.notifyPlayersUpdate();
        }
      })
    );
  }


  private notifyPlayersUpdate(): void {
    sessionStorage.setItem('last_update_' + this.gameId, Date.now().toString());
  }



  private resetPlayers(): void {
    this.players.forEach(player => {
      player.name = '';
      player.assigned = false;
      player.rol = '';
    });
  }

  getPlayerCardOverlay(playerId: string):{ overlay: string | null, vote: number | null } {
    const player = this.getPlayerByID(playerId);

    if (!player) {
      return { overlay: null, vote: null };
    }

    const color = 'rgba(219, 96, 213, 0.788)'; // Color rosado para indicar que votó

    // Si el jugador votó (tiene voto), mostrar rosado
    if (player.vote !== null && player.vote !== undefined) {
      // Si son los votos revelados (gameCompl = true), mostrar también el número
      if (this.gameCompl) {
        return { overlay: color, vote: player.vote };
      }
      // Si aún no están revelados, solo mostrar el color rosado sin el número
      else {
        return { overlay: color, vote: null };
      }
    }
    
    // Si el jugador no ha votado, sin overlay ni voto
    return { overlay: null, vote: null };
  }


  private loadTableState(): void {
    if (!this.gameId) return;

    const savedState = sessionStorage.getItem(`${this.TABLE_STATE_KEY}_${this.gameId}`);
    if (savedState) {
      const newPlayers = JSON.parse(savedState);

      if (JSON.stringify(this.players) !== JSON.stringify(newPlayers)) {
        this.players = newPlayers;
      }
    }
  }

  private saveTableState(): void {
    if (!this.gameId) return;
    sessionStorage.setItem(`${this.TABLE_STATE_KEY}_${this.gameId}`, JSON.stringify(this.players));
    this.notifyPlayersUpdate();
  }

  private isPlayerAssigned(user: User): boolean {
    return this.players.some(player =>
      player.name === user.name &&
      player.assigned
    );
  }

  private resetPlayerVotes(): void {
    this.gameCompl=false;
    this.players.forEach(player => {
      player.vote = null;
      player.overlay = null; // 🔑 Limpiar el overlay (color rosa)
    });
    // 🔑 Limpiar también el voto del usuario actual para que se remueva la carta de la mesa
    this.currentUserVote = { vote: null, id: null };
    this.saveTableState();
    this.changeDetectorRef.detectChanges();
    this.notifyPlayersUpdate();
  }

  assignPlayer(user: User) {
    if (this.isPlayerAssigned(user)) {
      return;
    }
    const unassignedPlayer = this.players
      .filter(player => !player.assigned)
      .sort((a, b) => a.order - b.order)[0];

    if (unassignedPlayer) {
      unassignedPlayer.name = user.name;
      unassignedPlayer.assigned = true;
      unassignedPlayer.rol = user.rol;
      unassignedPlayer.userId=user.id;
      this.saveTableState();
      this.userName=user.name;
    }
  }

  // 🎮 Nuevo método para asignar jugadores desde API (con estructura diferente)
  assignNewPlayer(apiPlayer: any): void {
    // Verificar si ya está asignado
    const alreadyAssigned = this.players.some(p => p.userId === apiPlayer.id);
    if (alreadyAssigned) {
      return;
    }

    // Encontrar primera posición desocupada (excluyendo center que es para el usuario actual)
    const unassignedPosition = this.players
      .filter(p => !p.assigned && p.id !== 'center')
      .sort((a, b) => a.order - b.order)[0];

    if (unassignedPosition) {
      unassignedPosition.name = apiPlayer.name;
      unassignedPosition.assigned = true;
      // 🎮 Normalizar rol: si es admin, mostrarlo como 'player' en el template
      const role = apiPlayer.role || apiPlayer.rol || 'player';
      unassignedPosition.rol = this.getRoleForDisplay(role);
      // 🎮 Marcar si es admin basándose en el admin_id del juego en localStorage
      unassignedPosition.isAdmin = this.isPlayerAdmin(apiPlayer.id);
      unassignedPosition.userId = apiPlayer.id;
      // 🎮 Guardar el ID del admin para el indicador visual
      if (unassignedPosition.isAdmin) {
        this.adminPlayerId = apiPlayer.id;
      }
      this.saveTableState();
      this.changeDetectorRef.detectChanges();
    }
  }

  // 🎮 Asignar específicamente al usuario actual en el centro
  assignPlayerToCenter(apiPlayer: any): void {
    const centerPosition = this.players.find(p => p.id === 'center');
    if (centerPosition) {
      centerPosition.name = apiPlayer.name;
      centerPosition.assigned = true;
      // 🎮 Normalizar rol: si es admin, mostrarlo como 'player' en el template
      // Los admins también deben verse como jugadores, pero con privilegios especiales
      const role = apiPlayer.role || apiPlayer.rol || 'player';
      centerPosition.rol = this.getRoleForDisplay(role);
      // 🎮 Marcar si es admin basándose en el admin_id del juego en sessionStorage
      centerPosition.isAdmin = this.isPlayerAdmin(apiPlayer.id);
      centerPosition.userId = apiPlayer.id;
      this.userName = apiPlayer.name;
      // 🎮 Guardar el ID del admin para el indicador visual
      if (centerPosition.isAdmin) {
        this.adminPlayerId = apiPlayer.id;
      }
      this.saveTableState();
      this.changeDetectorRef.detectChanges();
    }
  }

  getPlayerForPosition(id: string): string | null {
    const player = this.getAssignedPlayers().find(p => p.id === id);
    return player ? player.name : null;
  }

  getPlayerByID(id: string) {
    return this.players.find(player => player.id === id);
  }

  getPlayerByUserId(id:string){
    return this.players.find(player => player.userId ===id);
  }

  getAssignedPlayers(): {id: string, name: string}[] {
    return this.players
      .filter(player => player.assigned)
      .map(player => ({ id: player.id, name: player.name }));
  }

  clearAllPlayerOverlays(): void {
    this.players = this.players.map(player => ({
      ...player,
      overlay: null
    }));
    this.saveTableState();
    this.changeDetectorRef.detectChanges();
  }

  isAdmin():boolean{
    if (!this.gameId) return false;
    const currentUserId = sessionStorage.getItem('currentUserId');
    const adminId = sessionStorage.getItem(`admin_${this.gameId}`);
    return !!(currentUserId && adminId && currentUserId === adminId);
  }

  // 🎮 Determinar si un jugador específico es admin
  // Primero intenta desde sessionStorage, si no encuentra, hace petición HTTP
  private isPlayerAdmin(playerId: string | undefined): boolean {
    if (!playerId || !this.gameId) return false;
    
    // 1️⃣ Intenta obtener del sessionStorage
    const adminIdFromStorage = sessionStorage.getItem(`admin_${this.gameId}`);
    if (adminIdFromStorage) {
      const isAdmin = adminIdFromStorage === playerId;
      return isAdmin;
    }
    
    // 2️⃣ Si no está en sessionStorage, intenta desde la BD
    const gameData = this.gameService.getGameById(this.gameId)?.pipe();
    if (gameData) {
      // Nota: Esta es una llamada síncrona que puede no funcionar bien
      // Lo ideal sería hacer esto en ngOnInit
    }
    
    return false;
  }

  // 🎮 Normalizar el rol para mostrarlo en el template
  // Los admins se muestran como 'player' en el template pero con privilegios especiales
  private getRoleForDisplay(role: string | undefined): string {
    if (!role) return 'player';
    const normalizedRole = role.toLowerCase();
    return normalizedRole === 'admin' ? 'player' : normalizedRole;
  }

  showAdminTransferTooltip(position: string) {
    if (this.isAdmin()) {
      const player = this.getPlayerByID(position);
      const currentUserId = sessionStorage.getItem('currentUserId');
      // No mostrar tooltip si es el mismo jugador (admin actual)
      if (player?.userId && player.userId !== currentUserId) {
        this.adminTransferOptions = {};
        this.adminTransferOptions[position] = true;

        setTimeout(() => {
          this.showAdminTransferOption = false;
        }, 5000);
      }
    }
  }
  hideAdminTransferTooltip(position: string) {
    this.adminTransferOptions[position] = false;
  }

  passAdmin(position: string):void{
    this.hideAdminTransferTooltip(position);
    const user = this.getPlayerByID(position);
    const currentUserId = sessionStorage.getItem('currentUserId');
    
    // Validar que no sea el mismo jugador
    if (user?.userId === currentUserId) {
      return;
    }
    
    if (user?.userId && this.gameId) {
      // Llamar a changeAdmin que emitirá el evento de socket
      // El servidor broadcast admin-changed a todos los clientes
      this.gameService.changeAdmin(user.userId, this.gameId);
      this.saveTableState();
    }
  }
}
