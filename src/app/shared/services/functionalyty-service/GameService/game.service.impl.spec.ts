import { TestBed } from '@angular/core/testing';
import { GameService } from './game.service.impl';
import { Game, CreateGameRequest } from 'src/app/shared/interfaces/game.model';
import { User, RolUsuario } from 'src/app/shared/interfaces/user.model';
import { GAME_NOT_FOUND } from 'src/app/shared/Constants';

describe('GameService', () => {
  let service: GameService;
  let localStorageMock: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GameService]
    });
    service = TestBed.inject(GameService);
    localStorage.clear();
    localStorageMock = jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      switch (key) {
        case 'games':
          return JSON.stringify([{
            id: 'game1',
            name: 'Test Game',
            players: [],
            state: 'waiting',
            votes: {}
          }]);
        case 'userName':
          return 'testUser';
        default:
          return null;
      }
    });

    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });


  it('should throw error if joining a non-existing game', (done) => {
    const user: User = { id: 'user1', name: 'Test User', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game2' };
    service.joinGame('game2', user).subscribe({
      error: (error) => {
        expect(error.message).toBe(GAME_NOT_FOUND);
        done();
      }
    });
  });

  it('should throw error if user already joined the game', (done) => {
    const user: User = { id: 'user1', name: 'Test User', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };
    service.joinGame('game1', user).subscribe(() => {
      service.joinGame('game1', user).subscribe({
        error: (error) => {
          expect(error.message).toBe('User already joined the game');
          done();
        }
      });
    });
  });

  it('should vote in a game', (done) => {
    const user: User = { id: 'user1', name: 'Test User', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };
    service.joinGame('game1', user).subscribe(() => {
      service.vote('game1', 'user1', 5).subscribe((game: Game) => {
        expect(game.votes['user1']).toBe(5);
        done();
      });
    });
  });

  it('should throw error if voting in a non-existing game', (done) => {
    service.vote('game2', 'user1', 5).subscribe({
      error: (error) => {
        expect(error.message).toBe(GAME_NOT_FOUND);
        done();
      }
    });
  });

  it('should get a game by ID', (done) => {
    service.getGameById('game1').subscribe((game: Game) => {
      expect(game.name).toBe('Test Game');
      done();
    });
  });

  it('should throw error if getting a non-existing game by ID', (done) => {
    service.getGameById('game2').subscribe({
      error: (error) => {
        expect(error.message).toBe(GAME_NOT_FOUND);
        done();
      }
    });
  });

  it('should return the authenticated user name', () => {
    const userName = service.AuthService();
    expect(userName).toBe('testUser');
  });

  it('should throw error if joining a full game', (done) => {
    const user: User = { id: 'user2', name: 'Test User 2', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };

    const game: Game = {
      id: 'game1',
      name: 'Test Game',
      players: Array(8).fill({ id: 'player', name: 'Player', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' }),
      state: 'waiting',
      votes: {}
    };

    service['games'] = [game];

    service.joinGame('game1', user).subscribe({
      error: (error) => {
        expect(error.message).toBe('Game is full');
        done();
      }
    });
  });

  it('should throw error if user is not part of the game when voting', (done) => {
    const user: User = { id: 'user1', name: 'Test User', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };

    const game: Game = {
      id: 'game1',
      name: 'Test Game',
      players: [{ id: 'user2', name: 'Other User', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' }],
      state: 'waiting',
      votes: {}
    };
    localStorage.setItem('games', JSON.stringify([game]));

    service.vote('game1', 'user1', 5).subscribe({
      error: (error) => {
        expect(error.message).toBe('User not part of the game');
        done();
      }
    });
  });

  it('should create a new game', (done) => {
    const newGameRequest: CreateGameRequest = { name: 'New Game' };

    service.createGame(newGameRequest).subscribe((game: Game) => {
      expect(game.name).toBe('New Game');
      expect(game.players.length).toBe(0);
      expect(game.state).toBe('waiting');
      done();
    });
  });

  it('should return true if the user is an admin', () => {
    const user: User = { id: 'user1', name: 'Test User', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };
    const game: Game = {
      id: 'game1',
      name: 'Test Game',
      players: [user],
      state: 'waiting',
      votes: {}
    };

    service['games'] = [game];

    service.joinGame('game1', user).subscribe(() => {
      const isAdmin = service.isAdminUser('game1', 'Test User');
      expect(isAdmin).toBe(true);
    });
  });


  it('should return the current user in the game', () => {
    const user: User = { id: 'user1', name: 'Test User', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };
    const game: Game = {
      id: 'game1',
      name: 'Test Game',
      players: [user],
      state: 'waiting',
      votes: {}
    };

    service['games'] = [game];

    const currentUser = service.getCurrentUser('game1', 'Test User');
    expect(currentUser).toEqual(user);
  });

  it('should update game state to voted when all players vote', (done) => {
    const user1: User = { id: 'user1', name: 'Test User 1', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };
    const user2: User = { id: 'user2', name: 'Test User 2', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };

    service.joinGame('game1', user1).subscribe(() => {
      service.joinGame('game1', user2).subscribe(() => {
        service.playerVote('game1', 'user1', 5).subscribe(() => {
          service.playerVote('game1', 'user2', 8).subscribe((game: Game) => {
            expect(game.state).toBe('voted');
            done();
          });
        });
      });
    });
  });

  it('should change game state to completed when revealing votes', (done) => {
    const user1: User = { id: 'user1', name: 'Test User 1', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };
    const user2: User = { id: 'user2', name: 'Test User 2', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };

    service.joinGame('game1', user1).subscribe(() => {
      service.joinGame('game1', user2).subscribe(() => {
        service.playerVote('game1', 'user1', 5).subscribe(() => {
          service.playerVote('game1', 'user2', 8).subscribe(() => {
            service.revealVotes('game1').subscribe((game: Game) => {
              expect(game.state).toBe('completed');
              done();
            });
          });
        });
      });
    });
  });

  it('should return undefined when getting current user not in game', () => {
    const currentUser = service.getCurrentUser('game1', 'NonExistentUser');
    expect(currentUser).toBeUndefined();
  });

  it('should generate unique game ID when creating a game', (done) => {
    const newGameRequest: CreateGameRequest = { name: 'Unique Game' };

    service.createGame(newGameRequest).subscribe((game: Game) => {
      expect(game.name).toBe('Unique Game');
      expect(game.id).toBeTruthy();
      expect(game.players.length).toBe(0);
      expect(game.state).toBe('waiting');
      expect(Object.keys(game.votes).length).toBe(0);
      done();
    });
  });

  it('should set first joined user as admin', (done) => {
    const user: User = { id: 'user1', name: 'Admin User', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };

    service.joinGame('game1', user).subscribe(() => {
      const isAdmin = service.isAdminUser('game1', 'Admin User');
      expect(isAdmin).toBe(true);
      done();
    });
  });

  it('should throw error if attempting to vote without being in the game', (done) => {
    service.vote('game1', 'nonexistentUser', 5).subscribe({
      error: (error) => {
        expect(error.message).toBe('User not part of the game');
        done();
      }
    });
  });

  it('should reset game votes and state to waiting', () => {
    const user1: User = { id: 'user1', name: 'Test User 1', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };

    const game: Game = {
      id: 'game1',
      name: 'Test Game',
      players: [user1],
      state: 'voted',
      votes: { 'user1': 5 }
    };

    service['games'] = [game];

    service.resetGameVotesAndStatus('game1');

    const resetGame = service['games'].find(g => g.id === 'game1');
    expect(resetGame?.state).toBe('waiting');
    expect(Object.keys(resetGame?.votes || {}).length).toBe(0);
  });

  it('should return false if the user is not an admin', () => {
    const user: User = { id: 'user1', name: 'Test User', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };

    const game: Game = {
      id: 'game1',
      name: 'Test Game',
      players: [user],
      state: 'waiting',
      votes: {}
    };

    service['games'] = [game];

    const isAdmin = service.isAdminUser('game1', 'Test User');
    expect(isAdmin).toBe(false);
  });

  it('should return null if no user is authenticated', () => {
    jest.spyOn(localStorage, 'getItem').mockReturnValueOnce(null);

    const userName = service.AuthService();
    expect(userName).toBeNull();
  });

  it('should create a game with a unique ID even if the name is empty', (done) => {
    const newGameRequest: CreateGameRequest = { name: '' };

    service.createGame(newGameRequest).subscribe((game: Game) => {
      expect(game.id).toBeTruthy();
      expect(game.name).toBe('');
      expect(game.players.length).toBe(0);
      expect(game.state).toBe('waiting');
      done();
    });
  });

  it('should throw error if revealing votes for a non-existing game', (done) => {
    service.revealVotes('nonexistentGame').subscribe({
      error: (error) => {
        expect(error.message).toBe(GAME_NOT_FOUND);
        done();
      }
    });
  });

  it('should throw error if joining a game that is full', (done) => {
    const user: User = { id: 'user2', name: 'Test User 2', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };

    const game: Game = {
      id: 'game1',
      name: 'Test Game',
      players: Array(8).fill({ id: 'player', name: 'Player', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' }),
      state: 'waiting',
      votes: {}
    };

    service['games'] = [game];

    service.joinGame('game1', user).subscribe({
      error: (error) => {
        expect(error.message).toBe('Game is full');
        done();
      }
    });
  });


  it('should return null if user name is not found in AuthService', () => {
    localStorageMock.mockImplementationOnce(() => null);
    const userName = service.AuthService();
    expect(userName).toBeNull();
  });

  it('should get the authenticated user name by game ID', () => {
    localStorageMock.mockImplementationOnce(() => 'testUser');
    const userName = service.AuthService('game1');
    expect(userName).toBe('testUser');
  });


  it('should return false if user is not admin in isAdminUser', () => {
    const user: User = { id: 'user1', name: 'Test User', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };
    const game: Game = {
      id: 'game1',
      name: 'Test Game',
      players: [user],
      state: 'waiting',
      votes: {}
    };

    service['games'] = [game];
    const isAdmin = service.isAdminUser('game1', 'NonExistentUser');
    expect(isAdmin).toBe(false);
  });


  it('should handle getting current user when user is found', () => {
    const user: User = { id: 'user1', name: 'Test User', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };
    const game: Game = {
      id: 'game1',
      name: 'Test Game',
      players: [user],
      state: 'waiting',
      votes: {}
    };

    service['games'] = [game];

    const currentUser = service.getCurrentUser('game1', 'Test User');
    expect(currentUser).toEqual(user);
  });

  it('should handle multiple users in getCurrentUser', () => {
    const user1: User = { id: 'user1', name: 'Test User 1', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };
    const user2: User = { id: 'user2', name: 'Test User 2', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };

    const game: Game = {
      id: 'game1',
      name: 'Test Game',
      players: [user1, user2],
      state: 'waiting',
      votes: {}
    };

    service['games'] = [game];

    const currentUser = service.getCurrentUser('game1', 'Test User 2');
    expect(currentUser).toEqual(user2);
  });


  it('should correctly join game and mark user as assigned', (done) => {
    const user: User = { id: 'user3', name: 'Test User 3', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' };
    const game: Game = {
      id: 'game1',
      name: 'Test Game',
      players: [{ id: 'user2', name: 'Test User 2', rol: RolUsuario.PLAYER, assigned: false, gameId: 'game1' }],
      state: 'waiting',
      votes: {}
    };

    service['games'] = [game];
    service.joinGame('game1', user).subscribe((updatedGame: Game) => {
      expect(updatedGame.players.length).toBe(2);
      done();
    });
  });

  it('should update user role from PLAYER to VIEWER', () => {
    const user: User = {
      id: 'user1',
      name: 'Test User',
      rol: RolUsuario.PLAYER,
      assigned: false,
      gameId: 'game1'
    };

    const game: Game = {
      id: 'game1',
      name: 'Test Game',
      players: [user],
      state: 'waiting',
      votes: {}
    };

    service['games'] = [game];
    service.updateUserRole('game1', 'user1');

    const updatedUser = service['games'][0].players[0];
    expect(updatedUser.rol).toBe(RolUsuario.VIEWER);
  });

  it('should update user role from VIEWER to PLAYER', () => {
    const user: User = {
      id: 'user1',
      name: 'Test User',
      rol: RolUsuario.VIEWER,
      assigned: false,
      gameId: 'game1'
    };

    const game: Game = {
      id: 'game1',
      name: 'Test Game',
      players: [user],
      state: 'waiting',
      votes: {}
    };

    service['games'] = [game];
    service.updateUserRole('game1', 'user1');

    const updatedUser = service['games'][0].players[0];
    expect(updatedUser.rol).toBe(RolUsuario.PLAYER);
  });

  it('should change admin from current admin to another user', () => {
    const adminUser: User = {
      id: 'admin',
      name: 'Admin User',
      rol: RolUsuario.PLAYER,
      admin: true,
      assigned: false,
      gameId: 'game1'
    };

    const regularUser: User = {
      id: 'user1',
      name: 'Regular User',
      rol: RolUsuario.PLAYER,
      admin: false,
      assigned: false,
      gameId: 'game1'
    };

    const game: Game = {
      id: 'game1',
      name: 'Test Game',
      players: [adminUser, regularUser],
      state: 'waiting',
      votes: {}
    };

    service['games'] = [game];
    service.changeAdmin('user1', 'game1');

    const updatedGame = service['games'][0];
    expect(updatedGame.players.find(p => p.id === 'admin')?.admin).toBe(false);
    expect(updatedGame.players.find(p => p.id === 'user1')?.admin).toBe(true);
  });

  it('should return 0 if game is not found when counting players', () => {
    const playerCount = service.getGamePlayerCount('nonexistentGame', RolUsuario.PLAYER);
    expect(playerCount).toBe(0);
  });

  it('should return null if no userName is found for specific gameId', () => {
    const userName = service.AuthService('nonexistentGame');
    expect(userName).toBeNull();
  });

});
