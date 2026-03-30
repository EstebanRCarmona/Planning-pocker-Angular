import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

// Import the backend server
import('../server/dist/index.js').then(({ app }) => {
  module.exports = app;
}).catch(err => {
  console.error('Failed to load server:', err);
  process.exit(1);
});
