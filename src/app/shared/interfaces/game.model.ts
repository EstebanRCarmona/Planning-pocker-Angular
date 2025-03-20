import { User } from "./user.model";


export interface Game {
  id: string;
  name: string;
  scoringMode?: 'fibonacci' | 'oneToTen' | 'twoToTwenty';
  players: User[];
  state: 'waiting' | 'voted' | 'completed';
  votes: { [userId: string]: number };
}
export interface CreateGameRequest {
  name: string;
}
