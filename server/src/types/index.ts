export interface Game {
  id: string;
  name: string;
  scoringMode: 'fibonacci' | 'oneToTen' | 'twoToTwenty';
  state: 'waiting' | 'voted' | 'completed';
  createdAt: string;
  updatedAt: string;
  adminId: string;
}

export interface Player {
  id: string;
  gameId: string;
  name: string;
  role: 'player' | 'viewer' | 'admin';
  admin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  id: string;
  gameId: string;
  playerId: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface GameVotes {
  [playerId: string]: number;
}

export interface GameState {
  game: Game;
  players: Player[];
  votes: GameVotes;
}
