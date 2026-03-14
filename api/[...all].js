import app from '../backend/server.js';

export default function handler(req, res) {
  if (typeof req.url === 'string' && req.url.startsWith('/api/')) {
    req.url = req.url.replace(/^\/api/, '') || '/';
  }

  return app(req, res);
}