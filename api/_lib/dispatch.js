import app from '../../backend/server.js';

function normalizeOrigin(value) {
  return value.replace(/\/$/, '');
}

function getAllowedOrigins() {
  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map(normalizeOrigin)
  );

  [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].forEach((domain) => {
    if (domain) {
      allowedOrigins.add(normalizeOrigin(`https://${domain}`));
    }
  });

  return allowedOrigins;
}

function applyCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  const normalizedOrigin = normalizeOrigin(origin);

  if (allowedOrigins.size > 0 && !allowedOrigins.has(normalizedOrigin)) {
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');

  return true;
}

export function dispatchToApp(req, res, routePath) {
  const originAllowed = applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    if (!originAllowed) {
      res.statusCode = 403;
      return res.end('CORS origin not allowed');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || 'Content-Type, Authorization'
    );
    res.statusCode = 204;
    return res.end();
  }

  if (!originAllowed) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: `CORS: origin ${req.headers.origin} not allowed` }));
  }

  req.url = routePath;
  return app(req, res);
}