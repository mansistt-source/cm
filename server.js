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
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
const COOKIE_SECURE = process.env.NODE_ENV === 'production' ? '; Secure' : '';

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
  return true;
}

function fail(res, status, code, message) {
  json(res, status, { error: code, message });
  return true;
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
  if (Buffer.byteLength(sig) !== Buffer.byteLength(expected)) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp && payload.exp < Date.now()) return null;
  return payload;
}

function makeToken(user) {
  return signToken({ purpose: 'auth', userId: user.id, role: user.role, sv: Number(user.sessionVersion || 0), exp: Date.now() + 1000 * 60 * 60 * 24 * 7 });
}

function makeTempToken(payload, minutes = 10) {
  return signToken({ ...payload, exp: Date.now() + 1000 * 60 * minutes });
}

function tokenFromRequest(req) {
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  return bearer || parseCookies(req).cm_token || '';
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim()
    .replace(/^::ffff:/, '') || 'unknown';
}

function deviceNameFromUserAgent(userAgent) {
  const ua = String(userAgent || 'Unknown device');
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  let os = 'Unknown OS';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  return `${browser} · ${os}`;
}

function createSession(db, user, req, method = 'password') {
  const session = {
    id: id('session'),
    userId: user.id,
    method,
    deviceName: deviceNameFromUserAgent(req.headers['user-agent'] || ''),
    userAgent: String(req.headers['user-agent'] || ''),
    ip: clientIp(req),
    active: true,
    createdAt: now(),
    lastSeenAt: now()
  };
  db.sessions ||= [];
  db.sessions.push(session);
  return session;
}

function makeTokenForSession(user, session) {
  return signToken({ purpose: 'auth', userId: user.id, role: user.role, sv: Number(user.sessionVersion || 0), sid: session?.id || null, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 });
}

function sessionPublic(session, currentSid) {
  return {
    id: session.id,
    deviceName: session.deviceName || deviceNameFromUserAgent(session.userAgent),
    ip: session.ip || 'unknown',
    method: session.method || 'password',
    active: session.active !== false,
    current: Boolean(currentSid && session.id === currentSid),
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    userAgent: session.userAgent || ''
  };
}

function setAuthCookie(res, token, maxAge = 604800) {
  res.setHeader('set-cookie', `cm_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${COOKIE_SECURE}`);
}

function clearAuthCookie(res) {
  res.setHeader('set-cookie', `cm_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE}`);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

function checkPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
}


function validatePasswordStrength(password) {
  const value = String(password || '');
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter';
  if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter';
  if (!/[0-9]/.test(value)) return 'Password must include a number';
  return null;
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(buffer) {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    out += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return out;
}
function base32Decode(input) {
  const clean = String(input || '').toUpperCase().replace(/=+$/g, '').replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const c of clean) {
    const v = BASE32_ALPHABET.indexOf(c);
    if (v >= 0) bits += v.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
function hotp(secretBase32, counter) {
  const key = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  const big = BigInt(counter);
  buf.writeUInt32BE(Number((big >> 32n) & 0xffffffffn), 0);
  buf.writeUInt32BE(Number(big & 0xffffffffn), 4);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}
function verifyTotp(secretBase32, code) {
  const clean = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) return false;
  const step = Math.floor(Date.now() / 30000);
  for (let drift = -1; drift <= 1; drift += 1) {
    if (hotp(secretBase32, step + drift) === clean) return true;
  }
  return false;
}
function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}
function otpauthUrl({ email, secret }) {
  const label = encodeURIComponent(`Content Machine:${email}`);
  const issuer = encodeURIComponent('Content Machine');
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

function makeTwoFactorChallenge(user) {
  return makeTempToken({ purpose: '2fa_login', userId: user.id, sv: Number(user.sessionVersion || 0) }, 5);
}

async function verifyGoogleIdToken(idToken) {
  if (!GOOGLE_CLIENT_ID) throw new Error('Google sign-in is not configured');
  const token = String(idToken || '').trim();
  if (!token) throw new Error('Missing Google credential');
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || 'Invalid Google token');
  if (data.aud !== GOOGLE_CLIENT_ID) throw new Error('Google token audience mismatch');
  if (!(data.email_verified === 'true' || data.email_verified === true)) throw new Error('Google email is not verified');
  if (!data.email || !data.sub) throw new Error('Incomplete Google profile');
  return {
    googleSub: String(data.sub),
    email: String(data.email).toLowerCase(),
    suggestedName: String(data.name || data.email.split('@')[0] || '').trim(),
    picture: data.picture || ''
  };
}

async function ensureData() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOAD_DIR, { recursive: true });
  try {
    await stat(DB_FILE);
  } catch {
    await writeFile(DB_FILE, JSON.stringify({ users: [], projects: [], files: [], payments: [], deliverables: [], sessions: [] }, null, 2));
  }
}

function normalizeDb(db) {
  db.users ||= [];
  db.projects ||= [];
  db.files ||= [];
  db.payments ||= [];
  db.deliverables ||= [];
  db.sessions ||= [];
  db.users = db.users.map((u) => ({
    sessionVersion: 0,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    loginMethod: u.googleSub ? 'google' : 'password',
    ...u,
  }));
  return db;
}

async function loadDb() {
  await ensureData();
  return normalizeDb(JSON.parse(await readFile(DB_FILE, 'utf8')));
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

async function getAuthContext(req) {
  const payload = verifyToken(tokenFromRequest(req));
  if (!payload || payload.purpose !== 'auth') return null;
  const db = await loadDb();
  const user = db.users.find((u) => u.id === payload.userId) || null;
  if (!user) return null;
  if (Number(payload.sv || 0) !== Number(user.sessionVersion || 0)) return null;
  let session = null;
  if (payload.sid) {
    session = (db.sessions || []).find((s) => s.id === payload.sid && s.userId === user.id) || null;
    if (!session || session.active === false) return null;
    session.lastSeenAt = now();
    await saveDb(db);
  }
  return { user, payload, session, db };
}

async function getCurrentUser(req) {
  const ctx = await getAuthContext(req);
  return ctx ? ctx.user : null;
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
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    loginMethod: user.loginMethod || (user.googleSub ? 'google' : 'password'),
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    createdAt: user.createdAt
  };
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
  let params;

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

  if (method === 'GET' && pathname === '/api/config') {
    json(res, 200, { googleClientId: GOOGLE_CLIENT_ID });
    return true;
  }

  if (method === 'POST' && pathname === '/api/auth/register') {
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim();
    const password = String(body.password || '');
    if (!name || name.length < 2) return fail(res, 400, 'name_required', 'Name is required');
    if (!email || !email.includes('@')) return fail(res, 400, 'bad_email', 'Valid email required');
    const weak = validatePasswordStrength(password);
    if (weak) return fail(res, 400, 'weak_password', weak);
    const db = await loadDb();
    if (db.users.some((u) => u.email === email)) return fail(res, 409, 'email_exists', 'Email already registered');
    const { salt, hash } = hashPassword(password);
    const isFirstUser = db.users.length === 0;
    const role = isFirstUser || ADMIN_EMAILS.includes(email) ? 'admin' : 'user';
    const user = { id: id('user'), name, email, passwordSalt: salt, passwordHash: hash, googleSub: null, loginMethod: 'password', role, sessionVersion: 0, twoFactorEnabled: false, twoFactorSecret: null, createdAt: now(), updatedAt: now() };
    db.users.push(user);
    await saveDb(db);
    const session = createSession(db, user, req, 'password_register');
    await saveDb(db);
    const token = makeTokenForSession(user, session);
    setAuthCookie(res, token);
    json(res, 201, { user: publicUser(user), token });
    return true;
  }

  if (method === 'POST' && pathname === '/api/auth/login') {
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const db = await loadDb();
    const user = db.users.find((u) => u.email === email);
    if (!user || !user.passwordHash || !checkPassword(password, user.passwordSalt, user.passwordHash)) return fail(res, 401, 'bad_login', 'Invalid email or password');
    if (user.twoFactorEnabled) {
      json(res, 200, { requires2fa: true, challenge: makeTwoFactorChallenge(user), userPreview: { email: user.email, name: user.name } });
      return true;
    }
    const session = createSession(db, user, req, 'password_login');
    await saveDb(db);
    const token = makeTokenForSession(user, session);
    setAuthCookie(res, token);
    json(res, 200, { user: publicUser(user), token });
    return true;
  }

  if (method === 'POST' && pathname === '/api/auth/google') {
    const body = await readBody(req);
    let profile;
    try {
      profile = await verifyGoogleIdToken(body.idToken);
    } catch (error) {
      return fail(res, 401, 'bad_google_token', error.message || 'Google sign-in failed');
    }
    const db = await loadDb();
    const user = db.users.find((u) => u.email === profile.email || u.googleSub === profile.googleSub);
    if (!user) {
      const googleSession = makeTempToken({ purpose: 'google_complete', email: profile.email, googleSub: profile.googleSub, suggestedName: profile.suggestedName, picture: profile.picture }, 10);
      json(res, 200, { needsName: true, email: profile.email, suggestedName: profile.suggestedName, googleSession });
      return true;
    }
    user.googleSub ||= profile.googleSub;
    user.loginMethod = user.passwordHash ? 'password_google' : 'google';
    user.updatedAt = now();
    await saveDb(db);
    if (user.twoFactorEnabled) {
      json(res, 200, { requires2fa: true, challenge: makeTwoFactorChallenge(user), userPreview: { email: user.email, name: user.name } });
      return true;
    }
    const session = createSession(db, user, req, 'google_login');
    await saveDb(db);
    const token = makeTokenForSession(user, session);
    setAuthCookie(res, token);
    json(res, 200, { user: publicUser(user), token });
    return true;
  }

  if (method === 'POST' && pathname === '/api/auth/google/complete') {
    const body = await readBody(req);
    const name = String(body.name || '').trim();
    const payload = verifyToken(String(body.googleSession || ''));
    if (!payload || payload.purpose !== 'google_complete') return fail(res, 401, 'bad_google_session', 'Google session expired');
    if (!name || name.length < 2) return fail(res, 400, 'name_required', 'Name is required');
    const db = await loadDb();
    if (db.users.some((u) => u.email === payload.email)) return fail(res, 409, 'email_exists', 'Email already registered');
    const isFirstUser = db.users.length === 0;
    const role = isFirstUser || ADMIN_EMAILS.includes(String(payload.email).toLowerCase()) ? 'admin' : 'user';
    const user = { id: id('user'), name, email: String(payload.email).toLowerCase(), googleSub: payload.googleSub, loginMethod: 'google', passwordSalt: null, passwordHash: null, role, sessionVersion: 0, twoFactorEnabled: false, twoFactorSecret: null, createdAt: now(), updatedAt: now() };
    db.users.push(user);
    await saveDb(db);
    const session = createSession(db, user, req, 'google_register');
    await saveDb(db);
    const token = makeTokenForSession(user, session);
    setAuthCookie(res, token);
    json(res, 201, { user: publicUser(user), token });
    return true;
  }

  if (method === 'POST' && pathname === '/api/auth/2fa/verify') {
    const body = await readBody(req);
    const payload = verifyToken(String(body.challenge || ''));
    if (!payload || payload.purpose !== '2fa_login') return fail(res, 401, 'bad_2fa_session', '2FA session expired');
    const db = await loadDb();
    const user = db.users.find((u) => u.id === payload.userId);
    if (!user || Number(payload.sv || 0) !== Number(user.sessionVersion || 0)) return fail(res, 401, 'bad_2fa_session', '2FA session expired');
    if (!user.twoFactorEnabled || !verifyTotp(user.twoFactorSecret, body.code)) return fail(res, 401, 'bad_2fa_code', 'Invalid 2FA code');
    const session = createSession(db, user, req, '2fa_login');
    await saveDb(db);
    const token = makeTokenForSession(user, session);
    setAuthCookie(res, token);
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
    const payload = verifyToken(tokenFromRequest(req));
    if (payload?.sid) {
      const db = await loadDb();
      const session = (db.sessions || []).find((s) => s.id === payload.sid);
      if (session) { session.active = false; session.lastSeenAt = now(); await saveDb(db); }
    }
    clearAuthCookie(res);
    json(res, 200, { ok: true });
    return true;
  }

  if (method === 'POST' && pathname === '/api/security/change-password') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const body = await readBody(req);
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    const confirmPassword = String(body.confirmPassword || '');
    if (newPassword !== confirmPassword) return fail(res, 400, 'password_mismatch', 'New passwords do not match');
    const weak = validatePasswordStrength(newPassword);
    if (weak) return fail(res, 400, 'weak_password', weak);
    const db = await loadDb();
    const target = db.users.find((u) => u.id === user.id);
    if (!target) return fail(res, 404, 'user_not_found', 'User not found');
    if (target.passwordHash && !checkPassword(currentPassword, target.passwordSalt, target.passwordHash)) return fail(res, 401, 'bad_current_password', 'Current password is incorrect');
    const { salt, hash } = hashPassword(newPassword);
    target.passwordSalt = salt;
    target.passwordHash = hash;
    target.loginMethod = target.googleSub ? 'password_google' : 'password';
    target.sessionVersion = Number(target.sessionVersion || 0) + 1;
    target.updatedAt = now();
    (db.sessions || []).forEach((s) => { if (s.userId === target.id) s.active = false; });
    await saveDb(db);
    (db.sessions || []).forEach((s) => { if (s.userId === target.id) s.active = false; });
    const session = createSession(db, target, req, 'password_changed');
    await saveDb(db);
    const token = makeTokenForSession(target, session);
    setAuthCookie(res, token);
    json(res, 200, { ok: true, user: publicUser(target), token });
    return true;
  }

  if (method === 'POST' && pathname === '/api/security/2fa/setup') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const db = await loadDb();
    const target = db.users.find((u) => u.id === user.id);
    if (!target) return fail(res, 404, 'user_not_found', 'User not found');
    if (!target.twoFactorSecret) target.twoFactorSecret = generateTotpSecret();
    target.updatedAt = now();
    await saveDb(db);
    json(res, 200, { secret: target.twoFactorSecret, otpauthUrl: otpauthUrl({ email: target.email, secret: target.twoFactorSecret }) });
    return true;
  }

  if (method === 'POST' && pathname === '/api/security/2fa/enable') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const body = await readBody(req);
    const db = await loadDb();
    const target = db.users.find((u) => u.id === user.id);
    if (!target || !target.twoFactorSecret) return fail(res, 400, 'setup_required', 'Run 2FA setup first');
    if (!verifyTotp(target.twoFactorSecret, body.code)) return fail(res, 401, 'bad_2fa_code', 'Invalid 2FA code');
    target.twoFactorEnabled = true;
    target.updatedAt = now();
    await saveDb(db);
    json(res, 200, { ok: true, user: publicUser(target) });
    return true;
  }

  if (method === 'POST' && pathname === '/api/security/2fa/disable') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const body = await readBody(req);
    const db = await loadDb();
    const target = db.users.find((u) => u.id === user.id);
    if (!target) return fail(res, 404, 'user_not_found', 'User not found');
    if (target.passwordHash && !checkPassword(String(body.password || ''), target.passwordSalt, target.passwordHash)) return fail(res, 401, 'bad_password', 'Password is incorrect');
    if (target.twoFactorEnabled && !verifyTotp(target.twoFactorSecret, body.code)) return fail(res, 401, 'bad_2fa_code', 'Invalid 2FA code');
    target.twoFactorEnabled = false;
    target.twoFactorSecret = null;
    target.updatedAt = now();
    await saveDb(db);
    json(res, 200, { ok: true, user: publicUser(target) });
    return true;
  }


  if (method === 'GET' && pathname === '/api/security/sessions') {
    const ctx = await getAuthContext(req);
    if (!ctx) return fail(res, 401, 'unauthorized', 'Login required');
    const sessions = (ctx.db.sessions || [])
      .filter((s) => s.userId === ctx.user.id && s.active !== false)
      .sort((a, b) => String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || '')))
      .map((s) => sessionPublic(s, ctx.payload.sid));
    json(res, 200, { sessions });
    return true;
  }

  params = routeMatch(pathname, '/api/security/sessions/:id/revoke');
  if (params && method === 'POST') {
    const ctx = await getAuthContext(req);
    if (!ctx) return fail(res, 401, 'unauthorized', 'Login required');
    const session = (ctx.db.sessions || []).find((s) => s.id === params.id && s.userId === ctx.user.id);
    if (!session) return notFound(res);
    session.active = false;
    session.lastSeenAt = now();
    await saveDb(ctx.db);
    if (ctx.payload.sid === session.id) clearAuthCookie(res);
    json(res, 200, { ok: true, currentRevoked: ctx.payload.sid === session.id });
    return true;
  }

  if (method === 'POST' && pathname === '/api/security/logout-all') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const db = await loadDb();
    const target = db.users.find((u) => u.id === user.id);
    if (!target) return fail(res, 404, 'user_not_found', 'User not found');
    target.sessionVersion = Number(target.sessionVersion || 0) + 1;
    target.updatedAt = now();
    await saveDb(db);
    clearAuthCookie(res);
    json(res, 200, { ok: true });
    return true;
  }

  if (method === 'POST' && pathname === '/api/projects') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const body = await readBody(req);
    const packageKey = String(body.packageKey || '').trim();
    const pack = packageKey ? PACKAGES[packageKey] : null;
    if (packageKey && !pack) return fail(res, 400, 'bad_package', 'Unknown package');
    const serviceType = String(body.serviceType || 'service_agent');
    if (!SERVICE_TYPES.has(serviceType)) return fail(res, 400, 'bad_service_type', 'Unknown service type');
    const db = await loadDb();
    const project = {
      id: id('project'),
      userId: user.id,
      title: String(body.title || 'Untitled Project').slice(0, 120),
      serviceType,
      packageKey: pack ? packageKey : '',
      priceUsd: pack ? pack.priceUsd : 0,
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

  params = routeMatch(pathname, '/api/projects/:id');
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
    if (body.serviceType !== undefined) {
      const nextServiceType = String(body.serviceType || 'service_agent');
      if (!SERVICE_TYPES.has(nextServiceType)) return fail(res, 400, 'bad_service_type', 'Unknown service type');
      project.serviceType = nextServiceType;
    }
    if (body.packageKey !== undefined) {
      const nextPackageKey = String(body.packageKey || '').trim();
      const nextPack = nextPackageKey ? PACKAGES[nextPackageKey] : null;
      if (nextPackageKey && !nextPack) return fail(res, 400, 'bad_package', 'Unknown package');
      project.packageKey = nextPack ? nextPackageKey : '';
      project.priceUsd = nextPack ? nextPack.priceUsd : 0;
      if (project.paymentStatus !== 'paid') project.paymentStatus = 'unpaid';
      if (project.status === 'pending_payment') project.status = 'draft';
    }
    if (body.style !== undefined) project.style = String(body.style);
    if (body.durationSeconds !== undefined) project.durationSeconds = Number(body.durationSeconds || 0);
    project.updatedAt = now();
    await saveDb(db);
    json(res, 200, { project });
    return true;
  }


  params = routeMatch(pathname, '/api/projects/:id');
  if (params && method === 'DELETE') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    db.projects = db.projects.filter((p) => p.id !== project.id);
    db.files = db.files.filter((f) => f.projectId !== project.id);
    db.payments = db.payments.filter((pay) => pay.projectId !== project.id);
    db.deliverables = db.deliverables.filter((d) => d.projectId !== project.id);
    await saveDb(db);
    json(res, 200, { ok: true });
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
    const pack = project.packageKey ? PACKAGES[project.packageKey] : null;
    if (!pack || !Number(project.priceUsd || 0)) {
      return fail(res, 400, 'package_required', 'Choose a package inside the project before checkout');
    }
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
    res.writeHead(200, { 'content-type': mime[ext] || 'application/octet-stream', 'cache-control': ['.html', '.jsx', '.js'].includes(ext) ? 'no-store' : 'public, max-age=3600' });
    createReadStream(filePath).on('error', () => serveIndex(res)).pipe(res);
  } catch {
    await serveIndex(res);
  }
}

async function serveIndex(res) {
  try {
    const html = await readFile(path.join(publicDir, 'index.html'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
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
