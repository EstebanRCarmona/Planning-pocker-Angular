/**
 * Vercel Serverless Function
 * Handles all backend logic and static files
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:4200', 'http://localhost:3000', '*'],
  credentials: true
}));

app.use(express.json());

// Serve static files from public directory
const publicPath = path.join(__dirname, '../dist/planning-poker');
app.use(express.static(publicPath));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback - serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

export default app;


