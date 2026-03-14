import app from '../../backend/server.js';

export function dispatchToApp(req, res, routePath) {
  req.url = routePath;
  return app(req, res);
}