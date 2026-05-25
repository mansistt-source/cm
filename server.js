import http from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '.data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-change-this-secret-now';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);
const PAYMENT_INSTRUCTIONS = process.env.PAYMENT_INSTRUCTIONS || 'Payment link is not configured yet. Contact admin.';

const PACKAGES = {
  starter: { key: 'starter', name: 'Starter', priceUsd: 150 },
  growth: { key: 'growth', name: 'Growth', priceUsd: 300 },
  pro: { key: 'pro', name: 'Pro', priceUsd: 800 },
  agency: { key: 'agency', name: 'Agency', priceUsd: 1500 }
};

const SERVICE_TYPES = new Set(['film_maker', 'marketing_agent', 'service_agent', 'youtube_documentary', 'ugc_avatar']);
const PROJECT_STATUSES = new Set(['draft', 'pending_payment', 'paid', 'in_production', 'delivered', 'cancelled', 'failed']);

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
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip'
};

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function json(res, status, data) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function notFound(res) {
  json(res, 404, { error: 'not_found' });
}

function fail(res, status, code, message) {
  json(res, status, { error: code, message });
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp && payload.exp < Date.now()) return null;
  return payload;
}

function makeToken(user) {
  return signToken({ userId: user.id, role: user.role, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

function checkPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
}

async function ensureData() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOAD_DIR, { recursive: true });
  try {
    await stat(DB_FILE);
  } catch {
    await writeFile(DB_FILE, JSON.stringify({ users: [], projects: [], files: [], payments: [], deliverables: [] }, null, 2));
  }
}

async function loadDb() {
  await ensureData();
  return JSON.parse(await readFile(DB_FILE, 'utf8'));
}

async function saveDb(db) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

async function getCurrentUser(req) {
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const cookieToken = parseCookies(req).cm_token;
  const payload = verifyToken(bearer || cookieToken);
  if (!payload) return null;
  const db = await loadDb();
  return db.users.find((u) => u.id === payload.userId) || null;
}

async function requireUser(req, res) {
  const user = await getCurrentUser(req);
  if (!user) {
    fail(res, 401, 'unauthorized', 'Login required');
    return null;
  }
  return user;
}

async function requireAdmin(req, res) {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    fail(res, 403, 'forbidden', 'Admin only');
    return null;
  }
  return user;
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

function packageList() {
  return Object.values(PACKAGES).map((p) => ({ ...p }));
}

function assertProjectOwnerOrAdmin(user, project) {
  return project.userId === user.id || user.role === 'admin';
}

async function saveBase64File({ projectId, fileName, mimeType, dataBase64 }) {
  const cleanName = String(fileName || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileId = id('file');
  const storageName = `${projectId}_${fileId}_${cleanName}`;
  const abs = path.join(UPLOAD_DIR, storageName);
  const base64 = String(dataBase64 || '').replace(/^data:[^;]+;base64,/, '');
  await writeFile(abs, Buffer.from(base64, 'base64'));
  return { storageKey: storageName, fileId };
}

function localUploadPath(storageKey) {
  return path.join(UPLOAD_DIR, storageKey);
}

function safePublicPath(urlPath) {
  const clean = decodeURIComponent((urlPath || '/').split('?')[0]).replace(/^\/+/, '');
  const resolved = path.resolve(publicDir, clean || 'index.html');
  if (!resolved.startsWith(publicDir)) return path.join(publicDir, 'index.html');
  return resolved;
}

function routeMatch(pathname, pattern) {
  const a = pathname.split('/').filter(Boolean);
  const b = pattern.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < b.length; i += 1) {
    if (b[i].startsWith(':')) params[b[i].slice(1)] = a[i];
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

async function handleApi(req, res, url) {
  const method = req.method || 'GET';
  const pathname = url.pathname;

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  if (method === 'GET' && pathname === '/api/health') {
    json(res, 200, { status: 'ok', service: 'content-machine-step1-backend', ts: now() });
    return true;
  }

  if (method === 'GET' && pathname === '/api/packages') {
    json(res, 200, { packages: packageList() });
    return true;
  }

  if (method === 'POST' && pathname === '/api/auth/register') {
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim() || email.split('@')[0];
    const password = String(body.password || '');
    if (!email || !email.includes('@')) return fail(res, 400, 'bad_email', 'Valid email required');
    if (password.length < 6) return fail(res, 400, 'weak_password', 'Password must be at least 6 characters');
    const db = await loadDb();
    if (db.users.some((u) => u.email === email)) return fail(res, 409, 'email_exists', 'Email already registered');
    const { salt, hash } = hashPassword(password);
    const isFirstUser = db.users.length === 0;
    const role = isFirstUser || ADMIN_EMAILS.includes(email) ? 'admin' : 'user';
    const user = { id: id('user'), name, email, passwordSalt: salt, passwordHash: hash, role, createdAt: now(), updatedAt: now() };
    db.users.push(user);
    await saveDb(db);
    const token = makeToken(user);
    res.setHeader('set-cookie', `cm_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
    json(res, 201, { user: publicUser(user), token });
    return true;
  }

  if (method === 'POST' && pathname === '/api/auth/login') {
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const db = await loadDb();
    const user = db.users.find((u) => u.email === email);
    if (!user || !checkPassword(password, user.passwordSalt, user.passwordHash)) return fail(res, 401, 'bad_login', 'Invalid email or password');
    const token = makeToken(user);
    res.setHeader('set-cookie', `cm_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
    json(res, 200, { user: publicUser(user), token });
    return true;
  }

  if (method === 'GET' && pathname === '/api/auth/me') {
    const user = await requireUser(req, res);
    if (!user) return true;
    json(res, 200, { user: publicUser(user) });
    return true;
  }

  if (method === 'POST' && pathname === '/api/auth/logout') {
    res.setHeader('set-cookie', 'cm_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    json(res, 200, { ok: true });
    return true;
  }

  if (method === 'POST' && pathname === '/api/projects') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const body = await readBody(req);
    const packageKey = String(body.packageKey || 'starter');
    const pack = PACKAGES[packageKey];
    if (!pack) return fail(res, 400, 'bad_package', 'Unknown package');
    const serviceType = String(body.serviceType || 'service_agent');
    if (!SERVICE_TYPES.has(serviceType)) return fail(res, 400, 'bad_service_type', 'Unknown service type');
    const db = await loadDb();
    const project = {
      id: id('project'),
      userId: user.id,
      title: String(body.title || `${pack.name} Project`).slice(0, 120),
      serviceType,
      packageKey,
      priceUsd: pack.priceUsd,
      brief: String(body.brief || ''),
      style: String(body.style || ''),
      durationSeconds: Number(body.durationSeconds || 0),
      status: 'draft',
      paymentStatus: 'unpaid',
      createdAt: now(),
      updatedAt: now()
    };
    db.projects.push(project);
    await saveDb(db);
    json(res, 201, { project });
    return true;
  }

  if (method === 'GET' && pathname === '/api/projects') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const db = await loadDb();
    const projects = db.projects.filter((p) => p.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    json(res, 200, { projects });
    return true;
  }

  let params = routeMatch(pathname, '/api/projects/:id');
  if (params && method === 'GET') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    json(res, 200, { project });
    return true;
  }

  if (params && method === 'PATCH') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const body = await readBody(req);
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    if (body.title !== undefined) project.title = String(body.title).slice(0, 120);
    if (body.brief !== undefined) project.brief = String(body.brief);
    if (body.style !== undefined) project.style = String(body.style);
    if (body.durationSeconds !== undefined) project.durationSeconds = Number(body.durationSeconds || 0);
    project.updatedAt = now();
    await saveDb(db);
    json(res, 200, { project });
    return true;
  }

  params = routeMatch(pathname, '/api/projects/:id/checkout');
  if (params && method === 'POST') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    project.status = 'pending_payment';
    project.paymentStatus = 'pending';
    project.updatedAt = now();
    const payment = {
      id: id('payment'),
      projectId: project.id,
      userId: user.id,
      provider: 'manual',
      amountUsd: project.priceUsd,
      status: 'pending',
      instructions: PAYMENT_INSTRUCTIONS,
      createdAt: now(),
      updatedAt: now()
    };
    db.payments.push(payment);
    await saveDb(db);
    json(res, 200, { project, payment, paymentInstructions: PAYMENT_INSTRUCTIONS });
    return true;
  }

  params = routeMatch(pathname, '/api/projects/:id/files');
  if (params && method === 'GET') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const files = db.files.filter((f) => f.projectId === project.id).map((f) => ({ ...f, downloadUrl: `/api/files/${f.id}/download` }));
    json(res, 200, { files });
    return true;
  }

  if (params && method === 'POST') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const body = await readBody(req);
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const fileName = String(body.fileName || 'file.txt');
    const mimeType = String(body.mimeType || 'application/octet-stream');
    const kind = String(body.kind || 'reference');
    let storageKey = null;
    let externalUrl = body.externalUrl ? String(body.externalUrl) : null;
    let fileId = id('file');
    if (body.dataBase64) {
      const saved = await saveBase64File({ projectId: project.id, fileName, mimeType, dataBase64: body.dataBase64 });
      storageKey = saved.storageKey;
      fileId = saved.fileId;
    }
    const file = { id: fileId, projectId: project.id, userId: user.id, kind, fileName, mimeType, storageKey, externalUrl, createdAt: now() };
    db.files.push(file);
    await saveDb(db);
    json(res, 201, { file: { ...file, downloadUrl: `/api/files/${file.id}/download` } });
    return true;
  }

  params = routeMatch(pathname, '/api/files/:id/download');
  if (params && method === 'GET') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const db = await loadDb();
    const file = db.files.find((f) => f.id === params.id) || db.deliverables.find((d) => d.id === params.id);
    if (!file) return notFound(res);
    const project = db.projects.find((p) => p.id === file.projectId);
    if (!project || !assertProjectOwnerOrAdmin(user, project)) return fail(res, 403, 'forbidden', 'Not your file');
    if (file.externalUrl) {
      res.writeHead(302, { location: file.externalUrl });
      res.end();
      return true;
    }
    if (!file.storageKey) return fail(res, 404, 'no_file_data', 'No local file data available');
    const abs = localUploadPath(file.storageKey);
    try {
      await stat(abs);
      res.writeHead(200, { 'content-type': file.mimeType || 'application/octet-stream', 'content-disposition': `attachment; filename="${encodeURIComponent(file.fileName || file.title || 'download')}"` });
      createReadStream(abs).pipe(res);
      return true;
    } catch {
      return notFound(res);
    }
  }

  params = routeMatch(pathname, '/api/projects/:id/deliverables');
  if (params && method === 'GET') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const deliverables = db.deliverables.filter((d) => d.projectId === project.id).map((d) => ({ ...d, downloadUrl: `/api/files/${d.id}/download` }));
    json(res, 200, { deliverables });
    return true;
  }

  if (method === 'GET' && pathname === '/api/admin/projects') {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const db = await loadDb();
    const projects = db.projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    json(res, 200, { projects });
    return true;
  }

  params = routeMatch(pathname, '/api/admin/projects/:id');
  if (params && method === 'GET') {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    json(res, 200, {
      project,
      files: db.files.filter((f) => f.projectId === project.id).map((f) => ({ ...f, downloadUrl: `/api/files/${f.id}/download` })),
      payments: db.payments.filter((p) => p.projectId === project.id),
      deliverables: db.deliverables.filter((d) => d.projectId === project.id).map((d) => ({ ...d, downloadUrl: `/api/files/${d.id}/download` }))
    });
    return true;
  }

  params = routeMatch(pathname, '/api/admin/projects/:id/status');
  if (params && method === 'PATCH') {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const body = await readBody(req);
    const status = String(body.status || '');
    if (!PROJECT_STATUSES.has(status)) return fail(res, 400, 'bad_status', 'Unknown status');
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    project.status = status;
    project.updatedAt = now();
    await saveDb(db);
    json(res, 200, { project });
    return true;
  }

  params = routeMatch(pathname, '/api/admin/projects/:id/mark-paid');
  if (params && method === 'POST') {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const body = await readBody(req);
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    project.paymentStatus = 'paid';
    project.status = 'paid';
    project.updatedAt = now();
    db.payments.push({
      id: id('payment'), projectId: project.id, userId: project.userId, provider: 'manual_admin', amountUsd: project.priceUsd,
      status: 'paid', providerRef: String(body.providerRef || ''), createdAt: now(), updatedAt: now()
    });
    await saveDb(db);
    json(res, 200, { project });
    return true;
  }

  params = routeMatch(pathname, '/api/admin/projects/:id/deliverables');
  if (params && method === 'POST') {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const body = await readBody(req);
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    const title = String(body.title || 'Final deliverable');
    const type = String(body.type || 'file');
    const fileName = String(body.fileName || `${title}.txt`);
    const mimeType = String(body.mimeType || 'application/octet-stream');
    let storageKey = null;
    let externalUrl = body.externalUrl ? String(body.externalUrl) : null;
    let deliverableId = id('deliverable');
    if (body.dataBase64) {
      const saved = await saveBase64File({ projectId: project.id, fileName, mimeType, dataBase64: body.dataBase64 });
      storageKey = saved.storageKey;
      deliverableId = saved.fileId;
    }
    const deliverable = {
      id: deliverableId, projectId: project.id, userId: project.userId, title, type, note: String(body.note || ''),
      fileName, mimeType, storageKey, externalUrl, createdAt: now()
    };
    db.deliverables.push(deliverable);
    project.status = 'delivered';
    project.updatedAt = now();
    await saveDb(db);
    json(res, 201, { deliverable: { ...deliverable, downloadUrl: `/api/files/${deliverable.id}/download` }, project });
    return true;
  }

  if (pathname.startsWith('/api/')) {
    notFound(res);
    return true;
  }

  return false;
}

async function serveStatic(req, res, url) {
  let filePath = safePublicPath(url.pathname || '/');
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = path.join(filePath, 'index.html');
    const ext = path.extname(filePath);
    res.writeHead(200, { 'content-type': mime[ext] || 'application/octet-stream' });
    createReadStream(filePath).on('error', () => serveIndex(res)).pipe(res);
  } catch {
    await serveIndex(res);
  }
}

async function serveIndex(res) {
  try {
    const html = await readFile(path.join(publicDir, 'index.html'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch {
    fail(res, 500, 'missing_frontend', 'public/index.html not found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const handledApi = await handleApi(req, res, url);
    if (handledApi) return;
    await serveStatic(req, res, url);
  } catch (error) {
    console.error('[SERVER_ERROR]', error);
    fail(res, 500, 'server_error', error.message || 'Server error');
  }
});

await ensureData();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Content Machine Step 1 backend running on 0.0.0.0:${PORT}`);
  console.log(`DATA_DIR=${DATA_DIR}`);
});
