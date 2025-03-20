import { TestBed } from '@angular/core/testing';
import { GameCommunicationService } from './comunicationService';
import { RolUsuario, User } from 'src/app/shared/interfaces/user.model';

describe('GameCommunicationService', () => {
  let service: GameCommunicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameCommunicationService);

    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add a player to the game', () => {
    const player: User = { id: '1', name: 'juan andres', gameId: 'game1', rol: RolUsuario.PLAYER, assigned: false };

    service.addPlayerToGame(player);

    expect(localStorage.getItem('currentPlayer')).toBe(JSON.stringify(player));

    const storedPlayers = service.getStoredPlayers(player.gameId);
    expect(storedPlayers).toEqual([player]);
  });

  it('should not add a player if they already exist in the game', () => {
    const player: User = { id: '1', name: 'juan andres', gameId: 'game1', rol: RolUsuario.PLAYER, assigned: false };

    service.addPlayerToGame(player);
    service.addPlayerToGame(player);

    const storedPlayers = service.getStoredPlayers(player.gameId);
    expect(storedPlayers.length).toBe(1);
    expect(storedPlayers).toEqual([player]);
  });

  it('should clear the game state', () => {
    const player: User = { id: '1', name: 'John Doe', gameId: 'game1', rol: RolUsuario.PLAYER, assigned: false };

    service.addPlayerToGame(player);
    service.clearState(player.gameId);

    expect(localStorage.getItem('currentPlayer')).toBeNull();
    expect(service.getStoredPlayers(player.gameId)).toEqual([]);
  });

  it('should load the stored player on initialization', () => {
    const player: User = { id: '1', name: 'John Doe', gameId: 'game1', rol: RolUsuario.PLAYER, assigned: false };
    localStorage.setItem('currentPlayer', JSON.stringify(player));

    const newService = TestBed.inject(GameCommunicationService);

    newService.player$.subscribe(storedPlayer => {
      expect(storedPlayer).toEqual(player);
    });
  });

  it('should not add a player to the game if they already exist', () => {
    const player: User = { id: '1', name: 'Juan Andres', gameId: 'game1', rol: RolUsuario.PLAYER, assigned: false };

    service.addPlayerToGame(player);

    service.addPlayerToGame(player);

    const storedPlayers = service.getStoredPlayers(player.gameId);
    expect(storedPlayers.length).toBe(1);
    expect(storedPlayers).toEqual([player]);
  });

  it('should update the player vote', () => {
    const player: User = { id: '1', name: 'Juan Andres', gameId: 'game1', rol: RolUsuario.PLAYER, assigned: false };
    service.addPlayerToGame(player);

    const initialVote = 0;
    const updatedVote = 5;

    service.updateUserVote(player.id, player.gameId, updatedVote);

    const storedPlayers = service.getStoredPlayers(player.gameId);
    const updatedPlayer = storedPlayers.find(p => p.id === player.id);
    expect(updatedPlayer?.voted).toBe(updatedVote);

    service.player$.subscribe(storedPlayer => {
      expect(storedPlayer?.voted).toBe(updatedVote);
    });
  });

  it('should clear the state of the game', () => {
    const player: User = { id: '1', name: 'Juan Andres', gameId: 'game1', rol: RolUsuario.PLAYER, assigned: false };
    service.addPlayerToGame(player);

    expect(localStorage.getItem('currentPlayer')).toBe(JSON.stringify(player));

    service.clearState(player.gameId);

    expect(localStorage.getItem('currentPlayer')).toBeNull();
    const storedPlayers = service.getStoredPlayers(player.gameId);
    expect(storedPlayers).toEqual([]);
  });

  it('should notify player color and vote change', () => {
    const playerId = '1';
    const color = 'red';
    const vote = 3;

    let colorChangeNotified = false;
    let voteChangeNotified = false;

    service.playerColorChange$.subscribe(({ playerId: id, color: c }) => {
      if (id === playerId && c === color) {
        colorChangeNotified = true;
      }
    });

    service.playerVoteChange$.subscribe(({ playerId: id, vote: v }) => {
      if (id === playerId && v === vote) {
        voteChangeNotified = true;
      }
    });
    service.notifyPlayerColorChange(playerId, color, vote);

    expect(colorChangeNotified).toBe(true);
  expect(voteChangeNotified).toBe(true);
  });

  it('should update game votes and notify observers', () => {
    const gameId = 'game1';
    const votes = { '1': 5, '2': 3 };

    service.updateGameVotes(gameId, votes);
    const storedVotes = localStorage.getItem(`game_votes_${gameId}`);
    expect(storedVotes).toBeTruthy();
    expect(JSON.parse(storedVotes!).votes).toEqual(votes);

    service.gameVotes$.subscribe(votes => {
      expect(votes).toEqual(votes);
    });
  });

  it('should update the game completion status', () => {
    const gameId = 'game1';
    const isComplete = true;

    service.updateGameCompletedStatus(gameId, isComplete);

    const gameStatus = localStorage.getItem(`game_complete_${gameId}`);
    expect(gameStatus).toBeTruthy();
    expect(JSON.parse(gameStatus!).isComplete).toBe(isComplete);
  });

  it('should return the latest game votes', () => {
    const gameId = 'game1';
    const votes = { '1': 5, '2': 3 };

    service.updateGameVotes(gameId, votes);

    const latestVotes = service.getLatestGameVotes(gameId);

    expect(latestVotes).toEqual(votes);
  });

  it('should notify clear overlays', () => {
    let clearOverlaysNotified = false;

    service.clearOverlays$.subscribe(() => {
      clearOverlaysNotified = true;
    });

    service.notifyClearOverlays();

    expect(clearOverlaysNotified).toBe(true);
  });

  it('should initialize player$ with null if no player is stored', () => {
    const newService = TestBed.inject(GameCommunicationService);

    newService.player$.subscribe(player => {
      expect(player).toBeNull();
    });
  });

  it('should update game state when resetGameState is called', () => {
    service.gameState$.subscribe(state => {
      expect(state).toBe('waiting');
    });
    service.resetGameState('game1');
  });

  it('should return an empty object when there are no game votes stored', () => {
    const gameId = 'game1';
    const latestVotes = service.getLatestGameVotes(gameId);
    expect(latestVotes).toEqual({});
  });

  it('should store players separately for different games', () => {
    const player1: User = { id: '1', name: 'Player 1', gameId: 'game1', rol: RolUsuario.PLAYER, assigned: false };
    const player2: User = { id: '2', name: 'Player 2', gameId: 'game2', rol: RolUsuario.PLAYER, assigned: false };

    service.addPlayerToGame(player1);
    service.addPlayerToGame(player2);

    const playersGame1 = service.getStoredPlayers('game1');
    const playersGame2 = service.getStoredPlayers('game2');

    expect(playersGame1).toEqual([player1]);
    expect(playersGame2).toEqual([player2]);
  });

  it('should handle null or empty color and vote in notifyPlayerColorChange', () => {
    let colorChangeNotified = false;
    let voteChangeNotified = false;

    service.playerColorChange$.subscribe(({ playerId, color }) => {
      if (playerId === '1' && color === '') {
        colorChangeNotified = true;
      }
    });

    service.playerVoteChange$.subscribe(({ playerId, vote }) => {
      if (playerId === '1' && vote === 0) {
        voteChangeNotified = true;
      }
    });

    service.notifyPlayerColorChange('1', '', 0);

    expect(colorChangeNotified).toBe(true);
    expect(voteChangeNotified).toBe(true);
  });

  it('should notify player role change', () => {
    const playerId = '1';
    const gameId = 'game1';
    const newRole = RolUsuario.ADMIN;

    let roleChangeNotified = false;

    service.playerRoleChange$.subscribe(({ playerId: id, gameId: gId, newRole: role }) => {
      if (id === playerId && gId === gameId && role === newRole) {
        roleChangeNotified = true;
      }
    });

    service.notifyPlayerRoleChange(playerId, gameId, newRole);

    expect(roleChangeNotified).toBe(true);
  });

  it('should notify admin change and store the change in localStorage', () => {
    const playerId = '1';
    const gameId = 'game1';

    let adminChangeNotified = false;

    service.adminChange$.subscribe(({ playerId: id, gameId: gId }) => {
      if (id === playerId && gId === gameId) {
        adminChangeNotified = true;
      }
    });

    service.notifyAdminChange(playerId, gameId);

    expect(adminChangeNotified).toBe(true);

    const adminChangeData = localStorage.getItem(`admin_change_${gameId}`);
    expect(adminChangeData).toBeTruthy();
    const parsedData = JSON.parse(adminChangeData!);
    expect(parsedData.playerId).toBe(playerId);
    expect(parsedData.gameId).toBe(gameId);
  });

  it('should notify reset player votes', () => {
    let resetVotesNotified = false;

    service.resetPlayerVotes$.subscribe(() => {
      resetVotesNotified = true;
    });

    service.resetPlayerVotesSubject.next();

    expect(resetVotesNotified).toBe(true);
  });

  it('should reset player votes and notify observers', () => {
    const gameId = 'game1';
    const votes = { '1': 5, '2': 3 };

    service.updateGameVotes(gameId, votes);
    service.resetGameState(gameId);

    service.gameVotes$.subscribe(votes => {
      expect(votes).toEqual({ '1': 0, '2': 0 });
    });
  });

});
