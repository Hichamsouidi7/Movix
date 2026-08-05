// Serveur statique interne pour le mode packagé (.exe).
// Sert dist/ sur 127.0.0.1 avec fallback SPA, afin que l'application
// n'ait plus besoin du serveur de développement Vite dans un terminal.
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.m3u8': 'application/vnd.apple.mpegurl',
};

// Les appels relatifs /api/* sont relayés vers l'API locale, comme le fait
// le proxy du serveur de développement Vite (voir vite.config.ts).
const API_TARGET = { host: '127.0.0.1', port: 25565 };

// ---------------------------------------------------------------------------
// Rapatriement du jeton OAuth depuis le navigateur système (boucle locale).
//
// Google refuse la connexion dans un navigateur embarqué. L'autorisation se
// déroule donc dans le vrai navigateur de l'utilisateur, qui est redirigé vers
// http://localhost:3000/auth/google#access_token=… . Le jeton étant dans le
// fragment, il n'est jamais transmis au serveur : la page servie le récupère en
// JavaScript et le dépose ici, où l'application vient le chercher.
// ---------------------------------------------------------------------------
const AUTH_HANDOFF_PATH = '/__movix/desktop-auth';
let pendingAuthPayload = null;
let onAuthReceived = null;

/** Enregistre un rappel déclenché à la réception d'un jeton (remise au premier plan). */
function setAuthReceivedHandler(handler) {
  onAuthReceived = handler;
}

function handleAuthHandoff(req, res) {
  const json = (statusCode, body) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(body));
  };

  if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Garde-fou : un jeton OAuth ne pèse que quelques kilo-octets
      if (body.length > 64 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        if (!parsed.accessToken) return json(400, { error: 'accessToken manquant' });
        pendingAuthPayload = { ...parsed, receivedAt: Date.now() };
        if (onAuthReceived) onAuthReceived();
        json(200, { ok: true });
      } catch {
        json(400, { error: 'corps JSON invalide' });
      }
    });
    return;
  }

  if (req.method === 'GET') {
    // Lecture unique : le jeton est consommé par l'application
    const payload = pendingAuthPayload;
    pendingAuthPayload = null;
    return json(200, { pending: Boolean(payload), payload: payload || null });
  }

  return json(405, { error: 'méthode non autorisée' });
}

function proxyToApi(req, res) {
  const upstream = http.request(
    {
      host: API_TARGET.host,
      port: API_TARGET.port,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: `${API_TARGET.host}:${API_TARGET.port}` },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    }
  );

  upstream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ error: 'API locale indisponible (port 25565)' }));
  });

  req.pipe(upstream);
}

function serveFile(res, filePath, statusCode = 200) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(statusCode, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=31536000',
  });
  fs.createReadStream(filePath).pipe(res);
}

/**
 * Démarre le serveur statique sur un port FIXE.
 *
 * Le port ne doit pas varier : la connexion Google construit son `redirect_uri`
 * à partir de `window.location.origin` (voir src/config/google.ts), et Google
 * n'accepte que les URI de redirection déclarées dans sa console — en pratique
 * `http://localhost:3000/auth/google`. Un port aléatoire provoquerait un
 * `redirect_uri_mismatch` et rendrait la connexion Google impossible.
 *
 * Si le port est déjà occupé (serveur de développement Vite en cours), on
 * considère que l'application y est déjà servie et on s'y raccorde.
 *
 * @param {string} rootDir dossier à servir (dist/)
 * @param {number} port port fixe à utiliser
 * @returns {Promise<{url: string, port: number, alreadyServed: boolean}>}
 */
function startStaticServer(rootDir, port = 3000) {
  const indexPath = path.join(rootDir, 'index.html');

  if (!fs.existsSync(indexPath)) {
    return Promise.reject(
      new Error(
        `Build introuvable : ${indexPath}\nLancez "npm run build" avant de packager l'application.`
      )
    );
  }

  const handler = (req, res) => {
    if ((req.url || '').split('?')[0] === AUTH_HANDOFF_PATH) {
      return handleAuthHandoff(req, res);
    }

    const rawPath = (req.url || '/').split('?')[0].split('#')[0];

    if (rawPath.startsWith('/api/')) {
      return proxyToApi(req, res);
    }

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      decodedPath = rawPath;
    }

    // Empêche toute remontée hors du dossier servi (path traversal)
    const candidate = path.join(rootDir, path.normalize(decodedPath).replace(/^([/\\])+/, ''));
    const isInsideRoot = candidate === rootDir || candidate.startsWith(rootDir + path.sep);

    if (isInsideRoot && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return serveFile(res, candidate);
    }

    // Fallback SPA : toutes les routes React Router renvoient index.html
    return serveFile(res, indexPath);
  };

  // `localhost` peut résoudre en ::1 comme en 127.0.0.1 selon la pile réseau :
  // on écoute sur les deux pour que http://localhost:3000 aboutisse toujours.
  const listenOn = (host) =>
    new Promise((resolve, reject) => {
      const server = http.createServer(handler);
      server.once('error', reject);
      server.listen(port, host, () => resolve(server));
    });

  return listenOn('127.0.0.1')
    .then(async () => {
      // L'écoute IPv6 est un complément : son échec n'est pas bloquant.
      await listenOn('::1').catch(() => {});
      return { url: `http://localhost:${port}`, port, alreadyServed: false };
    })
    .catch((error) => {
      if (error.code === 'EADDRINUSE') {
        // Le port est déjà servi (serveur Vite) : on s'y raccorde.
        return { url: `http://localhost:${port}`, port, alreadyServed: true };
      }
      throw error;
    });
}

module.exports = { startStaticServer, setAuthReceivedHandler, AUTH_HANDOFF_PATH };
