/**
 * Production server entry point for Vercel
 * Runs the Express server with the Angular frontend
 */

require('dotenv').config();

const path = require('path');
const module = require('module');
const createRequire = module.createRequire;

// Start the server dynamically
(async () => {
  try {
    // Use dynamic import for ESM module
    const serverModule = await import('./server/dist/index.js');
    console.log('✅ Server started successfully');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();


