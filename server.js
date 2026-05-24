import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 8080);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4'
};

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '');
  const resolved = path.resolve(publicDir, clean || 'index.html');
  if (!resolved.startsWith(publicDir)) return path.join(publicDir, 'index.html');
  return resolved;
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', mode: 'design-only', ts: new Date().toISOString() }));
    return;
  }

  let filePath = safePath(req.url || '/');
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = path.join(filePath, 'index.html');
    createReadStream(filePath)
      .on('error', async () => serveIndex(res))
      .pipe(res.writeHead(200, { 'content-type': mime[path.extname(filePath)] || 'application/octet-stream' }));
  } catch {
    await serveIndex(res);
  }
});

async function serveIndex(res) {
  const html = await readFile(path.join(publicDir, 'index.html'));
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Design-only server running on 0.0.0.0:${PORT}`);
});
