// Local-only admin server: serves the site and provides the editing API.
// Never deploy this file to a public host — it shells out to git.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const ROOT = __dirname;
const PORT = process.env.PORT || 8743;
const SECRET_FILE = path.join(ROOT, '.admin-secret');
const CONTENT_FILE = path.join(ROOT, 'content.json');
const UPLOADS_DIR = path.join(ROOT, 'assets', 'uploads');
const INDEX_FILE = path.join(ROOT, 'index.html');
const SITE_URL = 'https://eladadler.github.io/pashtut-baav/';

// og:image intentionally stays pinned to assets/uploads/og-image.jpg — a small,
// pre-cropped (1200x630) JPEG — rather than whatever raw file gets uploaded as
// the hero poster. WhatsApp's link-preview crawler silently fails on large
// images (the original poster PNG was ~2.3MB) even when Facebook's own
// debugger fetches it fine. If the poster photo changes, regenerate
// og-image.jpg from it (crop to 1200x630, export as JPEG ~100-150KB) rather
// than pointing this meta tag at the raw upload again.

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(CONTENT_FILE)) {
  fs.writeFileSync(CONTENT_FILE, JSON.stringify({ texts: {}, images: {} }, null, 2));
}

let adminPassword;
if (fs.existsSync(SECRET_FILE)) {
  adminPassword = fs.readFileSync(SECRET_FILE, 'utf8').trim();
} else {
  adminPassword = crypto.randomBytes(6).toString('base64url');
  fs.writeFileSync(SECRET_FILE, adminPassword);
  console.log('Generated admin password (saved to .admin-secret, never committed):');
  console.log('  ' + adminPassword);
}

const sessions = new Set();

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 25 * 1024 * 1024) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function requireAuth(req) {
  const token = req.headers['x-admin-token'];
  return token && sessions.has(token);
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/login') {
      const body = JSON.parse((await readBody(req)) || '{}');
      if (body.password === adminPassword) {
        const token = crypto.randomBytes(24).toString('base64url');
        sessions.add(token);
        return json(res, 200, { ok: true, token });
      }
      return json(res, 401, { ok: false, error: 'wrong password' });
    }

    if (req.method === 'POST' && req.url === '/api/save') {
      if (!requireAuth(req)) return json(res, 401, { ok: false, error: 'not authenticated' });
      const body = JSON.parse((await readBody(req)) || '{}');
      const current = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
      const next = {
        texts: Object.assign({}, current.texts, body.texts || {}),
        images: Object.assign({}, current.images, body.images || {}),
        settings: Object.assign({}, current.settings, body.settings || {})
      };
      fs.writeFileSync(CONTENT_FILE, JSON.stringify(next, null, 2));
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && req.url === '/api/upload') {
      if (!requireAuth(req)) return json(res, 401, { ok: false, error: 'not authenticated' });
      const body = JSON.parse((await readBody(req)) || '{}');
      const { key, filename, dataBase64 } = body;
      if (!key || !dataBase64) return json(res, 400, { ok: false, error: 'missing key/data' });
      const ext = (path.extname(filename || '') || '.jpg').toLowerCase().replace(/[^a-z0-9.]/g, '') || '.jpg';
      const safeKey = String(key).replace(/[^a-z0-9-]/gi, '');
      const outName = safeKey + ext;
      const outPath = path.join(UPLOADS_DIR, outName);
      fs.writeFileSync(outPath, Buffer.from(dataBase64, 'base64'));
      const relPath = 'assets/uploads/' + outName;
      if (safeKey === 'hero-poster') updateOgImage(relPath);
      return json(res, 200, { ok: true, path: relPath });
    }

    if (req.method === 'POST' && req.url === '/api/publish') {
      if (!requireAuth(req)) return json(res, 401, { ok: false, error: 'not authenticated' });
      const body = JSON.parse((await readBody(req)) || '{}');
      const message = (body.message || 'Update content via admin').toString().slice(0, 200);
      execFile('git', ['add', '-A'], { cwd: ROOT }, (e1, o1, err1) => {
        if (e1) return json(res, 500, { ok: false, step: 'add', error: err1 || String(e1) });
        execFile('git', ['commit', '-m', message], { cwd: ROOT }, (e2, o2, err2) => {
          if (e2 && !/nothing to commit/.test(o2 + err2)) {
            return json(res, 500, { ok: false, step: 'commit', error: err2 || String(e2), output: o2 });
          }
          execFile('git', ['push'], { cwd: ROOT }, (e3, o3, err3) => {
            if (e3) return json(res, 500, { ok: false, step: 'push', error: err3 || String(e3) });
            return json(res, 200, { ok: true, output: [o1, o2, o3].join('\n') });
          });
        });
      });
      return;
    }

    return serveStatic(req, res);
  } catch (e) {
    json(res, 500, { ok: false, error: String(e) });
  }
});

server.listen(PORT, () => {
  console.log('pashtut-baav admin server: http://localhost:' + PORT + '/');
  console.log('Admin panel:              http://localhost:' + PORT + '/admin.html');
});
