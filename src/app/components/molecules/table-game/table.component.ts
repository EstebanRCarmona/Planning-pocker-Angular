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
    // Tooltip de lanzar objeto
    showThrowTooltip: { [position: string]: boolean } = {};
    tooltipHideTimers: { [position: string]: any } = {};
    // Animaciones activas
    activeAnimations: Array<{
      fromPosition: string;
      toPosition: string;
      objectType: 'heart' | 'paper' | 'star';
      id: string;
      direction?: 'left' | 'right-direction';
      sequence?: number; // Número de objeto en la secuencia
      totalInSequence?: number; // Total de objetos lanzados a este jugador
      isImpact?: boolean; // Si está en fase de impacto
      endX?: number; 
      endY?: number; 
    }> = [];
    
    // Rastrear objetos lanzados a cada jugador para calcular secuencias
    private objectSequenceMap: { [position: string]: number } = {};

    showThrowTooltipFor(position: string) {
      const player = this.getPlayerByID(position);
      const currentUserId = sessionStorage.getItem('currentUserId');
      // Cancelar el temporizador de ocultamiento si existe
      if (this.tooltipHideTimers[position]) {
        clearTimeout(this.tooltipHideTimers[position]);
        this.tooltipHideTimers[position] = null;
      }
      if (player?.userId && player.userId !== currentUserId) {
        this.showThrowTooltip[position] = true;
        this.changeDetectorRef.detectChanges();
      }
    }
    
    hideThrowTooltip(position: string) {
      this.tooltipHideTimers[position] = setTimeout(() => {
        this.showThrowTooltip[position] = false;
        this.changeDetectorRef.detectChanges();
      }, 250);
    }

    throwObjectToPlayer(position: string, objectType: 'heart' | 'paper' | 'star', event: MouseEvent) {
      event.stopPropagation();
      const toPlayer = this.getPlayerByID(position);
      const fromPlayerId = sessionStorage.getItem('currentUserId');
      if (!toPlayer?.userId || !this.gameId || !fromPlayerId || toPlayer.userId === fromPlayerId) return;
      this.gameCommunicationService.throwObject(this.gameId, fromPlayerId, toPlayer.userId, objectType);
    }

  @Input() currentUserVote: { vote: number | null, id: string | null }= { vote: null, id: null };
  private readonly TABLE_STATE_KEY = 'game_table_state';
  private gameId: string | null = null;
  readonly subscriptions: Subscription = new Subscription();
  private gameCompl:boolean = false;
  userName:string="";
  showAdminTransferOption = false;
  adminTransferOptions: { [key: string]: boolean } = {};
  private adminTransferHideTimers: { [position: string]: any } = {};
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
        // Suscripción para animaciones de objetos lanzados
        this.subscriptions.add(
          this.gameCommunicationService.objectThrown$.subscribe((data: any) => {
            console.log(`[DEBUG] Objeto lanzado:`, data);
            const fromPlayer = this.players.find(p => p.userId === data.fromPlayerId);
            const toPlayer = this.players.find(p => p.userId === data.toPlayerId);
            console.log(`[DEBUG] From: ${fromPlayer?.name}, To: ${toPlayer?.name}`);
            
            if (fromPlayer && toPlayer) {
              // Calcular secuencia de objetos para este jugador
              const toPosition = toPlayer.id;
              this.objectSequenceMap[toPosition] = (this.objectSequenceMap[toPosition] || 0) + 1;
              const sequence = this.objectSequenceMap[toPosition];
              
              // Rastrear cuántos objetos se lanzarán en esta secuencia (aprox 200ms de ventana)
              let totalInSequence = 1;
              const checkSequence = () => {
                const currentCount = this.activeAnimations.filter(a => a.toPosition === toPosition && !a.isImpact).length + 1;
                totalInSequence = Math.max(currentCount, totalInSequence);
              };
              checkSequence();
              
              const animId = `${Date.now()}_${Math.random()}`;
              const direction = sequence % 2 === 1 ? 'left' : 'right-direction';
              
              console.log(`[DEBUG] Creando animación ${animId}, secuencia ${sequence}, dirección ${direction}`);
              
              // Fase 1: Animación de vuelo (parábola)
              const anim = {
                fromPosition: fromPlayer.id,
                toPosition: toPlayer.id,
                objectType: data.objectType,
                id: animId,
                direction: direction as 'left' | 'right-direction',
                sequence: sequence,
                totalInSequence: totalInSequence,
                isImpact: false,
                endX: 0,  
                endY: 0  
              };
              this.activeAnimations.push(anim);
              this.changeDetectorRef.detectChanges();
              
              setTimeout(() => {
                this.createCustomThrowAnimation(animId, toPlayer.id, direction);
              }, 10);
              
              // Fase 2: Transición a impacto después del vuelo (1.5 segundos)
              setTimeout(() => {
                console.log(`[DEBUG] Cambiando a impacto para ${animId}`);
                const anim = this.activeAnimations.find(a => a.id === animId);
                if (anim) {
                  anim.isImpact = true;
                  this.changeDetectorRef.detectChanges();
                  
                  // Aplicar la animación de impacto
                  setTimeout(() => {
                    this.applyImpactAnimation(animId, anim.objectType, anim.endX || 0, anim.endY || 0);
                  }, 0);
                }
              }, 1500);
              
              setTimeout(() => {
                console.log(`[DEBUG] Removiendo animación ${animId}`);
                this.activeAnimations = this.activeAnimations.filter(a => a.id !== animId);
                this.changeDetectorRef.detectChanges();
              }, 2100);
            }
          })
        );
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

  // 🎮 Obtener la posición del jugador destino para la animación global
  getTargetPosition(position: string): { x: number; y: number } {
    try {
      const playerElement = document.querySelector(`[data-player-position="${position}"]`);
      if (!playerElement) {
        console.warn(`[DEBUG] Elemento de jugador no encontrado: ${position}`);
        return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      }

      const rect = playerElement.getBoundingClientRect();
      const result = {
        x: rect.left + rect.width / 2 - 20,
        y: rect.top + rect.height / 2
      };
      
      console.log(`[DEBUG] Posición de ${position}: x=${result.x}, y=${result.y}`);
      return result;
    } catch (e) {
      console.error(`[DEBUG] Error obteniendo posición:`, e);
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }
  }

  // 🎮 Aplicar animación de impacto según el tipo de objeto
  private applyImpactAnimation(animId: string, objectType: string, endX: number, endY: number): void {
    const animElement = document.querySelector(`[data-anim-id="${animId}"]`) as HTMLElement;
    if (!animElement) {
      console.warn(`[DEBUG] Elemento no encontrado para impacto: ${animId}`);
      return;
    }

   const currentX = endX;
    const currentY = endY;  
    
    let impactKeyframeName = `impact-heart-${animId.replace(/[^a-zA-Z0-9-_]/g, '')}`;
    let impactKeyframes = '';
    
    if (objectType === 'paper') {
      impactKeyframeName = `impact-bomb-${animId.replace(/[^a-zA-Z0-9-_]/g, '')}`;
      impactKeyframes = `
        @keyframes ${impactKeyframeName} {
          0% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: brightness(1) saturate(1);
          }
          10% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(1.3) rotate(45deg);
            filter: brightness(1.4) saturate(1.2);
          }
          25% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(1.6) rotate(90deg);
            opacity: 1;
            filter: brightness(1.8) saturate(1.4);
          }
          50% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(2) rotate(180deg);
            opacity: 0.8;
            filter: brightness(2) saturate(1.6) drop-shadow(0 0 20px rgba(255, 100, 0, 0.8));
          }
          75% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(1.2) rotate(270deg);
            opacity: 0.4;
            filter: brightness(1.2) saturate(0.8) drop-shadow(0 0 10px rgba(255, 100, 0, 0.4));
          }
          100% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(0.05) rotate(360deg);
            opacity: 0;
            filter: brightness(0) saturate(0) drop-shadow(0 0 0px rgba(255, 100, 0, 0));
          }
        }
      `;
    } else if (objectType === 'star') {
      impactKeyframeName = `impact-star-${animId.replace(/[^a-zA-Z0-9-_]/g, '')}`;
      impactKeyframes = `
        @keyframes ${impactKeyframeName} {
          0% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: drop-shadow(0 0 0px rgba(255, 215, 0, 0)) brightness(1);
          }
          10% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(1.4) rotate(45deg);
            filter: drop-shadow(0 0 20px rgba(255, 215, 0, 1)) brightness(1.5);
          }
          30% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(1.8) rotate(90deg);
            filter: drop-shadow(0 0 40px rgba(255, 215, 0, 1)) brightness(1.8);
          }
          50% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(1.5) rotate(180deg);
            filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.8)) brightness(1.4);
          }
          75% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(0.8) rotate(270deg);
            opacity: 0.6;
            filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.4)) brightness(0.8);
          }
          100% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(0) rotate(360deg);
            opacity: 0;
            filter: drop-shadow(0 0 0px rgba(255, 215, 0, 0)) brightness(0);
          }
        }
      `;
    } else {
      // Corazón
      impactKeyframes = `
        @keyframes ${impactKeyframeName} {
          0% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: brightness(1) drop-shadow(0 0 2px rgba(255, 107, 157, 0.3));
          }
          10% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(1.9) rotate(0deg);
            filter: brightness(1.15) drop-shadow(0 0 12px rgba(255, 107, 157, 0.6));
          }
          17% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(0.75) rotate(0deg);
            filter: brightness(0.9) drop-shadow(0 0 2px rgba(255, 107, 157, 0.1));
          }
          30% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(2) rotate(0deg);
            filter: brightness(1.15) drop-shadow(0 0 12px rgba(255, 107, 157, 0.6));
          }
          37% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(0.7) rotate(0deg);
            filter: brightness(0.9) drop-shadow(0 0 2px rgba(255, 107, 157, 0.1));
          }
          50% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(1.95) rotate(0deg);
            filter: brightness(1.15) drop-shadow(0 0 12px rgba(255, 107, 157, 0.6));
          }
          57% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(0.72) rotate(0deg);
            filter: brightness(0.9) drop-shadow(0 0 2px rgba(255, 107, 157, 0.1));
          }
          75% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(0.6) rotate(0deg);
            opacity: 0.6;
            filter: brightness(0.95) drop-shadow(0 0 2px rgba(255, 107, 157, 0.15));
          }
          100% {
            left: ${currentX}px;
            top: ${currentY}px;
            transform: scale(0) rotate(0deg);
            opacity: 0;
            filter: brightness(0) drop-shadow(0 0 0px rgba(255, 107, 157, 0));
          }
        }
      `;
    }

    console.log(`[DEBUG] Aplicando animación de impacto: ${impactKeyframeName} en posición final almacenada: x=${currentX}, y=${currentY}`);
    
    animElement.style.left = `${currentX}px`;
    animElement.style.top = `${currentY}px`;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = impactKeyframes;
    document.head.appendChild(styleSheet);
    
    // Aplicar la animación de impacto 
    const duration = objectType === 'heart' ? '2.5s' : '1s';
    animElement.style.animation = `${impactKeyframeName} ${duration} ease-out forwards`;
  }

  // 🎮 Crear animación personalizada dinámicamente
  private createCustomThrowAnimation(animId: string, toPositionId: string, direction: string): void {
    // Intentar encontrar el elemento con reintentos
    const tryAttachAnimation = (attempt = 0) => {
      const animElement = document.querySelector(`[data-anim-id="${animId}"]`) as HTMLElement;
      
      if (!animElement) {
        if (attempt < 10) {
          // Reintentar en 10ms
          setTimeout(() => tryAttachAnimation(attempt + 1), 10);
        } else {
          console.warn(`[DEBUG] Elemento de animación no encontrado para ${animId}`);
        }
        return;
      }

      console.log(`[DEBUG] Creando animación para ${animId} hacia posición ${toPositionId}`);

      const targetPos = this.getTargetPosition(toPositionId);
      console.log(`[DEBUG] Posición objetivo: x=${targetPos.x}, y=${targetPos.y}`);
      
      const isFromLeft = direction === 'left';
      
      // Crear keyframes dinámicos
      const keyframeName = `throw-anim-${animId.replace(/[^a-zA-Z0-9-_]/g, '')}`;
      const startX = isFromLeft ? -100 : window.innerWidth + 100;
      const endX = targetPos.x;
      const endY = targetPos.y;
      const startY = window.innerHeight * 0.85; // 85% de la altura (mucho más abajo)

      const distX = endX - startX;
      const distY = endY - startY;
      
      // 🎯 Usar una parábola suave: altura máxima en el medio del recorrido
      // Calcular puntos cada 5% para una curva más suave sin saltos
      const maxHeight = Math.abs(distY) > 100 ? 350 : 250; // Altura máxima de la parábola
      
      const points: { [key: string]: { x: number; y: number; rot: number } } = {};
      
      // Generar puntos cada 5%
      for (let i = 0; i <= 100; i += 5) {
        const t = i / 100; // 0 a 1
        
        // Parábola suave: altura máxima en el medio (t=0.5)
        const parabolaHeight = -maxHeight * Math.sin(t * Math.PI); // Usa sen() para una parábola suave
        
        // Rotación suave: 0° al inicio, máximo a los 80%, 90° al final
        const rot = (isFromLeft ? -1 : 1) * (90 * t);
        
        points[`p${i}`] = {
          x: startX + distX * t,
          y: startY + distY * t + parabolaHeight,
          rot: rot
        };
      }

      console.log(`[DEBUG] Keyframe: ${keyframeName}, startX=${startX}, startY=${startY}, endX=${endX}, endY=${endY}, distX=${distX}, distY=${distY}, maxHeight=${maxHeight}, isFromLeft=${isFromLeft}`);

      // Construir los keyframes dinámicamente
      let keyframesContent = `@keyframes ${keyframeName} {`;
      keyframesContent += `
        0% {
          left: ${startX}px;
          top: ${startY}px;
          opacity: 0;
          transform: scale(0.3) rotate(0deg);
        }`;
      
      // Agregar cada punto del 5% al 95%
      for (let i = 5; i <= 95; i += 5) {
        const p = points[`p${i}`];
        const t = i / 100;
        const opacity = t < 0.05 ? 0.2 + t * 16 : (t > 0.95 ? 1 - (t - 0.95) * 20 : 1); // Desvanecimiento suave
        const scale = Math.min(1, 0.3 + t * 1.4); // Escala gradual
        
        keyframesContent += `
        ${i}% {
          left: ${p.x}px;
          top: ${p.y}px;
          opacity: ${opacity};
          transform: scale(${scale}) rotate(${p.rot}deg);
        }`;
      }
      
      keyframesContent += `
        100% {
          left: ${endX}px;
          top: ${endY}px;
          opacity: 1;
          transform: scale(1) rotate(${isFromLeft ? -90 : 90}deg);
        }
      }`;

      const keyframes = keyframesContent;

      // Inyectar estilos en el documento
      const styleSheet = document.createElement('style');
      styleSheet.textContent = keyframes;
      document.head.appendChild(styleSheet);

     const animObj = this.activeAnimations.find(a => a.id === animId);
      if (animObj) {
        animObj.endX = endX;
        animObj.endY = endY;
        console.log(`[DEBUG] Posiciones finales almacenadas para ${animId}: endX=${endX}, endY=${endY}`);
      }

      // Aplicar la animación al elemento - 1.5 segundos para una animación más lenta y suave
      animElement.style.animation = `${keyframeName} 1.5s ease-in-out forwards`;
      
      const animationDuration = 1500; // 1.5 segundos para que coincida con la duración de la animación 
      setTimeout(() => {
        animElement.style.left = `${endX}px`;
        animElement.style.top = `${endY}px`;
        console.log(`[DEBUG] Posición final establecida para ${animId}: left=${endX}px, top=${endY}px`);
      }, animationDuration);
      
      console.log(`[DEBUG] Animación aplicada: ${keyframeName}`);
    };

    tryAttachAnimation();
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
        // Cancelar timeout anterior si existe
        if (this.adminTransferHideTimers[position]) {
          clearTimeout(this.adminTransferHideTimers[position]);
          this.adminTransferHideTimers[position] = null;
        }
        this.adminTransferOptions = {};
        this.adminTransferOptions[position] = true;
        this.changeDetectorRef.detectChanges();
      }
    }
  }
  hideAdminTransferTooltip(position: string) {
    if (this.adminTransferHideTimers[position]) {
      clearTimeout(this.adminTransferHideTimers[position]);
    }
   this.adminTransferHideTimers[position] = setTimeout(() => {
      this.adminTransferOptions[position] = false;
      this.changeDetectorRef.detectChanges();
    }, 300);
  }

  showAdminTransferTooltipAgain(position: string) {
    if (this.adminTransferHideTimers[position]) {
      clearTimeout(this.adminTransferHideTimers[position]);
      this.adminTransferHideTimers[position] = null;
    }
    if (this.isAdmin()) {
      this.adminTransferOptions[position] = true;
      this.changeDetectorRef.detectChanges();
    }
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
