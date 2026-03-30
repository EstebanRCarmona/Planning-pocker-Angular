// Entry point for Vercel
import('./server/dist/index.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
