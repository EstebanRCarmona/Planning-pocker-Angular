import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import { createClient } from '@supabase/supabase-js';
import { Game, Player, Vote } from '../types/index.js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseService {
  // Games
  async createGame(name: string, adminId: string, scoringMode: string = 'fibonacci'): Promise<Game> {
    const { data, error } = await supabase
      .from('games')
      .insert({
        name,
        admin_id: adminId,
        scoring_mode: scoringMode,
        state: 'waiting',
      })
      .select()
      .single();

    if (error) throw error;
    return data as Game;
  }

  async getGame(gameId: string): Promise<Game | null> {
    const { data, error } = await supabase
      .from('games')
      .select()
      .eq('id', gameId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data as Game) || null;
  }

  async updateGameState(gameId: string, state: 'waiting' | 'voted' | 'completed'): Promise<Game> {
    const { data, error } = await supabase
      .from('games')
      .update({ state, updated_at: new Date().toISOString() })
      .eq('id', gameId)
      .select()
      .single();

    if (error) throw error;
    return data as Game;
  }

  async updateGameAdmin(gameId: string, newAdminId: string): Promise<Game> {
    const { data, error } = await supabase
      .from('games')
      .update({ admin_id: newAdminId, updated_at: new Date().toISOString() })
      .eq('id', gameId)
      .select()
      .single();

    if (error) throw error;
    return data as Game;
  }

  async deleteGame(gameId: string): Promise<void> {
    // Primero eliminar todos los votos del juego
    const { error: votesError } = await supabase
      .from('votes')
      .delete()
      .eq('game_id', gameId);

    if (votesError) throw votesError;

    // Luego eliminar todos los jugadores del juego
    const { error: playersError } = await supabase
      .from('players')
      .delete()
      .eq('game_id', gameId);

    if (playersError) throw playersError;

    // Finalmente eliminar el juego
    const { error: gameError } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId);

    if (gameError) throw gameError;
  }

  // Players
  async addPlayer(gameId: string, name: string, role: string = 'player', isAdmin: boolean = false, playerId?: string): Promise<Player> {
    const playerData: any = {
      game_id: gameId,
      name,
      role,
      admin: isAdmin,
    };

    // Si se proporciona un playerId, usarlo como ID
    if (playerId) {
      playerData.id = playerId;
    }

    const { data, error } = await supabase
      .from('players')
      .insert(playerData)
      .select()
      .single();

    if (error) throw error;
    return data as Player;
  }

  async addOrGetPlayer(gameId: string, name: string, role: string = 'player', isAdmin: boolean = false, playerId?: string): Promise<Player> {
    // Si no hay playerId, crear uno nuevo
    if (!playerId) {
      return this.addPlayer(gameId, name, role, isAdmin, playerId);
    }

    // Primero verificar si el jugador ya existe
    const { data: existingPlayer } = await supabase
      .from('players')
      .select()
      .eq('id', playerId)
      .eq('game_id', gameId)
      .single();

    if (existingPlayer) {
      return existingPlayer as Player;
    }

    // Si no existe, crear uno nuevo
    return this.addPlayer(gameId, name, role, isAdmin, playerId);
  }

  async getGamePlayers(gameId: string): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select()
      .eq('game_id', gameId);

    if (error) throw error;
    return (data || []) as Player[];
  }

  async updatePlayerRole(playerId: string, role: string): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', playerId)
      .select()
      .single();

    if (error) throw error;
    return data as Player;
  }

  async updateAdmin(gameId: string, newAdminId: string, oldAdminId: string): Promise<void> {
    // Actualizar players: poner admin=false al antiguo admin
    const { error } = await supabase
      .from('players')
      .update({ admin: false })
      .eq('id', oldAdminId);

    if (error) throw error;

    // Actualizar players: poner admin=true al nuevo admin
    const { error: updateError } = await supabase
      .from('players')
      .update({ admin: true })
      .eq('id', newAdminId);

    if (updateError) throw updateError;

    // Actualizar games: actualizar admin_id en la tabla games
    const { error: gameError } = await supabase
      .from('games')
      .update({ admin_id: newAdminId, updated_at: new Date().toISOString() })
      .eq('id', gameId);

    if (gameError) throw gameError;
  }

  async removePlayer(playerId: string): Promise<void> {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (error) throw error;
  }

  // Votes
  async submitVote(gameId: string, playerId: string, value: number): Promise<Vote> {
    const { data: existingVote } = await supabase
      .from('votes')
      .select()
      .eq('game_id', gameId)
      .eq('player_id', playerId)
      .single();

    if (existingVote) {
      const { data, error } = await supabase
        .from('votes')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('id', existingVote.id)
        .select()
        .single();

      if (error) throw error;
      return data as Vote;
    }

    const { data, error } = await supabase
      .from('votes')
      .insert({
        game_id: gameId,
        player_id: playerId,
        value,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Vote;
  }

  async getGameVotes(gameId: string): Promise<{ [playerId: string]: number }> {
    const { data, error } = await supabase
      .from('votes')
      .select()
      .eq('game_id', gameId);

    if (error) throw error;

    const votes: { [playerId: string]: number } = {};
    (data || []).forEach((vote: any) => {
      votes[vote.player_id] = vote.value;
    });

    return votes;
  }

  async clearVotes(gameId: string): Promise<void> {
    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('game_id', gameId);

    if (error) throw error;
  }
}

export const supabaseService = new SupabaseService();
