-- Copiar este SQL y ejecutarlo en la consola de Supabase (SQL Editor)
-- https://app.supabase.com -> Tu proyecto -> SQL Editor

-- Tabla de juegos
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admin_id UUID NOT NULL,
  scoring_mode TEXT DEFAULT 'fibonacci',
  state TEXT DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de jugadores
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'player',
  admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de votos
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  value INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- Índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_games_admin_id ON games(admin_id);
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_votes_game_id ON votes(game_id);
CREATE INDEX IF NOT EXISTS idx_votes_player_id ON votes(player_id);

-- Habilitar Row Level Security (RLS) - Opcional pero recomendado
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir todo por ahora - puedes restringir después)
-- Para desarrollo, permitimos todo. En producción, deberías ser más restrictivo.

-- Política para tabla games
CREATE POLICY "Allow all on games" ON games
FOR ALL
USING (true)
WITH CHECK (true);

-- Política para tabla players
CREATE POLICY "Allow all on players" ON players
FOR ALL
USING (true)
WITH CHECK (true);

-- Política para tabla votes
CREATE POLICY "Allow all on votes" ON votes
FOR ALL
USING (true)
WITH CHECK (true);

-- Verificar que las tablas se crearon
SELECT * FROM information_schema.tables 
WHERE table_name IN ('games', 'players', 'votes');
