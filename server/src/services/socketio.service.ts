import { Server, Socket } from 'socket.io';
import { supabaseService } from './supabase.service.js';
import { GameVotes } from '../types/index.js';

interface GameRoom {
  gameId: string;
  players: Map<string, any>;
  votes: GameVotes;
}

interface DisconnectTimeout {
  [playerId: string]: NodeJS.Timeout;
}

export class SocketIOService {
  private gameRooms: Map<string, GameRoom> = new Map();
  private disconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(private io: Server) {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {

      socket.on('throw-object', async (data: any) => {
        try {
          const { gameId, fromPlayerId, toPlayerId, objectType } = data;
          // Emitir a todos los clientes del room el evento de animación
          this.io.to(gameId).emit('object-thrown', {
            fromPlayerId,
            toPlayerId,
            objectType,
            gameId
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to throw object', error: String(error) });
        }
      });

      // Join game
      socket.on('join-game', async (data: any) => {
        try {
          const { gameId, playerId, playerName, playerRole } = data;
        
          // Si hay un timeout pendiente de desconexión para este jugador, cancelarlo
          if (this.disconnectTimeouts.has(playerId)) {
            clearTimeout(this.disconnectTimeouts.get(playerId));
            this.disconnectTimeouts.delete(playerId);
          }
          
          socket.join(gameId);
          
          // Obtener los jugadores actuales ANTES de agregar el nuevo
          const existingPlayers = await supabaseService.getGamePlayers(gameId);
          const isFirstPlayer = existingPlayers.length === 0;
          
          // Si es el primer jugador, debe ser admin
          const finalRole = isFirstPlayer ? 'admin' : playerRole;
          
          // Add or get player from Supabase database using the client's playerId
          const addedPlayer = await supabaseService.addOrGetPlayer(gameId, playerName, finalRole, isFirstPlayer, playerId);
         
          // Si es el primer jugador, actualizar el admin_id del juego
          if (isFirstPlayer) {
           await supabaseService.updateGameAdmin(gameId, playerId);
          }
          
          // Get game state from Supabase
          const game = await supabaseService.getGame(gameId);
          const players = await supabaseService.getGamePlayers(gameId);
          const votes = await supabaseService.getGameVotes(gameId);
          
          if (!this.gameRooms.has(gameId)) {
            this.gameRooms.set(gameId, {
              gameId,
              players: new Map(),
              votes,
            });
          }

          const room = this.gameRooms.get(gameId)!;
          room.players.set(playerId, {
            id: playerId,
            name: playerName,
            role: playerRole,
            socketId: socket.id,
          });

          // Notify all players in the room
          this.io.to(gameId).emit('player-joined', {
            players,
            game,
            votes,
            gameId,  
          });

        } catch (error) {
          console.error('❌ ERROR in join-game:');
          console.error('Error details:', error);
          if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
          socket.emit('error', { message: 'Failed to join game', error: String(error) });
        }
      });

      // Submit vote
      socket.on('submit-vote', async (data: any) => {
        try {
          const { gameId, playerId, vote } = data;
         
          // Guardar voto en Supabase
          const savedVote = await supabaseService.submitVote(gameId, playerId, vote);
         
          // Obtener votos y jugadores actualizados
          const votes = await supabaseService.getGameVotes(gameId);
          const players = await supabaseService.getGamePlayers(gameId);
         
          // Contar jugadores votantes (player y admin pueden votar)
          const votingPlayers = players.filter((p) => p.role === 'player' || p.role === 'admin');
          const votedPlayers = votingPlayers.filter((p) => votes[p.id] !== undefined && votes[p.id] !== null);
         
          // Verificar si todos votaron
          const allVoted = votingPlayers.length > 0 && votedPlayers.length === votingPlayers.length;
          
          let gameState = 'waiting';
          if (allVoted) {
            const updatedGame = await supabaseService.updateGameState(gameId, 'voted');
            gameState = updatedGame.state;
          } else {
            const currentGame = await supabaseService.getGame(gameId);
            gameState = currentGame?.state || 'waiting';
          }

          // Emitir actualización de votos a todos los jugadores con el estado actual
          const responseData = {
            votes: votes,
            state: gameState,
            allVoted: allVoted
          };
          this.io.to(gameId).emit('votes-updated', responseData);
          
          // Emitir all-voted si aplica
          if (allVoted) {
            this.io.to(gameId).emit('all-voted', { votes, state: gameState });
          }
        } catch (error) {
          console.error('❌ ERROR in submit-vote:');
          console.error('Error details:', error);
          socket.emit('error', { message: 'Failed to submit vote', error: String(error) });
        }
      });

      // Reveal votes
      socket.on('reveal-votes', async (data: any) => {
        try {
          const { gameId } = data;

          await supabaseService.updateGameState(gameId, 'completed');
          const votes = await supabaseService.getGameVotes(gameId);

          // Emitir evento para que TODOS muestren el countdown
          this.io.to(gameId).emit('start-votes-countdown', { gameId });

          // Esperar 4 segundos antes de revelar los votos (mismo tiempo del countdown)
          setTimeout(() => {
           this.io.to(gameId).emit('votes-revealed', { votes });
          }, 4000);
        } catch (error) {
          socket.emit('error', { message: 'Failed to reveal votes', error });
        }
      });

      // Reset votes
      socket.on('reset-votes', async (data: any) => {
        try {
          const { gameId } = data;

          await supabaseService.clearVotes(gameId);
          await supabaseService.updateGameState(gameId, 'waiting');

          this.io.to(gameId).emit('votes-reset', { votes: {} });
        } catch (error) {
          socket.emit('error', { message: 'Failed to reset votes', error });
        }
      });

      // Change player role
      socket.on('change-player-role', async (data: any) => {
        try {
          const { gameId, playerId, newRole } = data;

          await supabaseService.updatePlayerRole(playerId, newRole);
          const players = await supabaseService.getGamePlayers(gameId);

          this.io.to(gameId).emit('player-role-changed', { players, playerId, newRole, gameId });
        } catch (error) {
          socket.emit('error', { message: 'Failed to change player role', error });
        }
      });

      // Change admin
      socket.on('change-admin', async (data: any) => {
        try {
          const { gameId, newAdminId, oldAdminId } = data;
         
          await supabaseService.updateAdmin(gameId, newAdminId, oldAdminId);
          const players = await supabaseService.getGamePlayers(gameId);

          // Emitir a todos los clientes en el room con gameId incluido
          const emitData = { gameId, players, newAdminId };
          this.io.to(gameId).emit('admin-changed', emitData);
         } catch (error) {
          console.error(`❌ Error changing admin:`, error);
          socket.emit('error', { message: 'Failed to change admin', error });
        }
      });

      // Disconnect
      socket.on('disconnect', async () => {
        
        // En lugar de buscar en el caché local, vamos a buscar en todas las salas
        // porque el caché puede no estar sincronizado
        for (const [gameId, room] of this.gameRooms.entries()) {
          // Buscar el jugador en el caché local primero
          let foundPlayerId: string | null = null;
          
          for (const [playerId, player] of room.players.entries()) {
            if (player.socketId === socket.id) {
              foundPlayerId = playerId;
              room.players.delete(playerId);
              break;
            }
          }
          
          if (foundPlayerId) {
           
            const currentGameId = gameId;
            const currentPlayerId = foundPlayerId;
            
            // Esperar 5 segundos antes de eliminar el jugador
            const timeout = setTimeout(async () => {
              try {
                
                // Obtener datos del jugador para verificar si es admin
                const playerData = await supabaseService.getGamePlayers(currentGameId).then(
                  players => players.find(p => p.id === currentPlayerId)
                );
                const isAdmin = playerData?.admin || false;
               
                if (isAdmin) {
                  // 🗑️ El admin se desconectó: eliminar el juego completo
                  await supabaseService.deleteGame(currentGameId);
                  
                  // Emitir evento de juego eliminado
                  this.io.to(currentGameId).emit('game-deleted', {
                    gameId: currentGameId,
                    reason: 'Admin left the game'
                  });
                } else {
                  // Jugador normal: eliminar solo al jugador
                 await supabaseService.removePlayer(currentPlayerId);
                  
                  // Obtener lista actualizada de jugadores
                  const updatedPlayers = await supabaseService.getGamePlayers(currentGameId);
                  
                  // Obtener estado del juego y votos
                  const game = await supabaseService.getGame(currentGameId);
                  const votes = await supabaseService.getGameVotes(currentGameId);
                  
                  // Emitir evento específico de remoción de jugador
                  this.io.to(currentGameId).emit('player-removed', {
                    playerId: currentPlayerId,
                    players: updatedPlayers,
                    game,
                    votes,
                    gameId: currentGameId
                  });
                }
              } catch (error) {
                console.error(`❌ Error in timeout callback:`, error);
                if (error instanceof Error) {
                  console.error(`Error message: ${error.message}`);
                  console.error(`Error stack: ${error.stack}`);
                }
              } finally {
                this.disconnectTimeouts.delete(currentPlayerId);
              }
            }, 5000);
            
            this.disconnectTimeouts.set(currentPlayerId, timeout);
            
            // Solo procesamos una desconexión por socket
            break;
          }
        }
      });

      // Get game state
      socket.on('get-game-state', async (data: any) => {
        try {
          const { gameId } = data;

          const game = await supabaseService.getGame(gameId);
          const players = await supabaseService.getGamePlayers(gameId);
          const votes = await supabaseService.getGameVotes(gameId);

          socket.emit('game-state', { game, players, votes });
        } catch (error) {
          socket.emit('error', { message: 'Failed to get game state', error });
        }
      });
    });
  }
}
