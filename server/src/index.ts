import dotenv from 'dotenv';

const result = dotenv.config();
if (result.error) {
  console.warn('Warning: Could not load .env file:', result.error.message);
}

import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { SocketIOService } from './services/socketio.service.js';
import { supabaseService } from './services/supabase.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:3000', process.env.FRONTEND_URL || '*'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 🎯 SERVIR ARCHIVOS ESTÁTICOS DEL FRONTEND
// Vercel: uses process.cwd() for proper path resolution in production
const frontendPath = path.join(process.cwd(), 'dist/planning-poker');
app.use(express.static(frontendPath));

// Initialize Socket.IO service
new SocketIOService(io);

// API Routes
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create game
app.post('/api/games', async (req: Request, res: Response) => {
  try {
    const { name, adminId, scoringMode } = req.body;

    if (!name || !adminId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const game = await supabaseService.createGame(name, adminId, scoringMode);
    res.status(201).json(game);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get game
app.get('/api/games/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;

    const game = await supabaseService.getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const players = await supabaseService.getGamePlayers(gameId);
    const votes = await supabaseService.getGameVotes(gameId);

    res.json({ game, players, votes });
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

// 🎯 FALLBACK: Servir index.html para todas las rutas (Angular SPA)
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
  console.log(`🗄️  Connected to Supabase`);
  console.log(`🎨 Frontend served from: ${frontendPath}`);
});
