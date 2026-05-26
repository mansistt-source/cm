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
const MAIL_FROM = process.env.MAIL_FROM || 'Content Machine <security@content-machine.local>';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const MAILJET_API_KEY = process.env.MAILJET_API_KEY || '';
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY || '';
const EMAIL_PROVIDER = String(process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
const ALLOW_DEV_2FA_CODE = String(process.env.ALLOW_DEV_2FA_CODE || '').trim().toLowerCase() === 'true';
const TWOFA_CODE_TTL_MS = 1000 * 60 * 10;
const COOKIE_SECURE = process.env.NODE_ENV === 'production' ? '; Secure' : '';

const APP_URL = (process.env.APP_URL || process.env.PUBLIC_APP_URL || '').replace(/\/$/, '');
const PAYPAL_MODE = String(process.env.PAYPAL_MODE || 'sandbox').trim().toLowerCase();
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const MIN_TOPUP_USD = Number(process.env.MIN_TOPUP_USD || 30);
const TOPUP_AMOUNTS_USD = (process.env.TOPUP_AMOUNTS_USD || '30,50,100,300,800,1500')
  .split(',')
  .map((x) => Number(String(x).trim()))
  .filter((n) => Number.isFinite(n) && n >= MIN_TOPUP_USD);
const EARLY_DYNAMIC_MARKUP = Number(process.env.EARLY_DYNAMIC_MARKUP || 1.65);
const ESTIMATE_SAFETY_BUFFER_RATE = Number(process.env.ESTIMATE_SAFETY_BUFFER_RATE || 0.15);

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
  return makeTempToken({ purpose: '2fa_login', userId: user.id, sv: Number(user.sessionVersion || 0) }, 10);
}

function generateEmailCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashSecurityCode(code) {
  return crypto.createHmac('sha256', JWT_SECRET).update(String(code || '').trim()).digest('hex');
}

function senderFromMailFrom() {
  const raw = String(MAIL_FROM || '').trim();
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim() || 'Content Machine', email: match[2].trim() };
  return { name: 'Content Machine', email: raw || 'security@content-machine.local' };
}

function activeEmailProvider() {
  if (EMAIL_PROVIDER) return EMAIL_PROVIDER;
  if (RESEND_API_KEY) return 'resend';
  if (BREVO_API_KEY) return 'brevo';
  if (MAILJET_API_KEY && MAILJET_SECRET_KEY) return 'mailjet';
  return ALLOW_DEV_2FA_CODE ? 'console' : 'none';
}

async function deliverSecurityEmail({ to, code, purpose }) {
  const subject = purpose === 'login' ? 'Content Machine login code' : purpose === 'disable_2fa' ? 'Content Machine disable 2FA code' : 'Content Machine 2FA activation code';
  const text = `Your Content Machine security code is: ${code}\nThis code expires in 10 minutes.\n\nIf you did not request this code, ignore this email.`;
  const sender = senderFromMailFrom();
  const provider = activeEmailProvider();

  if (provider === 'none') {
    throw new Error('Email provider is not configured. Set EMAIL_PROVIDER=resend and RESEND_API_KEY, or explicitly set ALLOW_DEV_2FA_CODE=true for local testing only.');
  }

  if (provider === 'console') {
    console.log(`[SECURITY_EMAIL_DEV] to=${to} purpose=${purpose} code=${code}`);
    return { sent: false, provider: 'console' };
  }

  if (provider === 'resend') {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is missing');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, text })
    });
    if (!response.ok) throw new Error(`Resend failed: ${await response.text().catch(() => response.status)}`);
    return { sent: true, provider: 'resend' };
  }

  if (provider === 'brevo') {
    if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY is missing');
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
      body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: text })
    });
    if (!response.ok) throw new Error(`Brevo failed: ${await response.text().catch(() => response.status)}`);
    return { sent: true, provider: 'brevo' };
  }

  if (provider === 'mailjet') {
    if (!MAILJET_API_KEY || !MAILJET_SECRET_KEY) throw new Error('MAILJET_API_KEY or MAILJET_SECRET_KEY is missing');
    const auth = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64');
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({ Messages: [{ From: sender, To: [{ Email: to }], Subject: subject, TextPart: text }] })
    });
    if (!response.ok) throw new Error(`Mailjet failed: ${await response.text().catch(() => response.status)}`);
    return { sent: true, provider: 'mailjet' };
  }

  throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
}

async function createEmailCodeChallenge(db, user, purpose) {
  const code = generateEmailCode();
  db.twoFactorCodes ||= [];
  db.twoFactorCodes = db.twoFactorCodes.filter((c) => !(c.userId === user.id && c.purpose === purpose));
  const record = {
    id: id('security_code'),
    userId: user.id,
    purpose,
    codeHash: hashSecurityCode(code),
    expiresAt: Date.now() + TWOFA_CODE_TTL_MS,
    attempts: 0,
    createdAt: now()
  };
  db.twoFactorCodes.push(record);
  const delivery = await deliverSecurityEmail({ to: user.email, code, purpose });
  return { record, delivery, devCode: ALLOW_DEV_2FA_CODE && activeEmailProvider() === 'console' ? code : undefined };
}

function verifyEmailSecurityCode(db, user, purpose, code) {
  db.twoFactorCodes ||= [];
  const clean = String(code || '').replace(/\s+/g, '');
  const record = db.twoFactorCodes.find((c) => c.userId === user.id && c.purpose === purpose);
  if (!record) return { ok: false, reason: 'missing' };
  if (Date.now() > Number(record.expiresAt || 0)) return { ok: false, reason: 'expired' };
  record.attempts = Number(record.attempts || 0) + 1;
  if (record.attempts > 6) return { ok: false, reason: 'too_many_attempts' };
  const ok = crypto.timingSafeEqual(Buffer.from(record.codeHash), Buffer.from(hashSecurityCode(clean)));
  if (ok) db.twoFactorCodes = db.twoFactorCodes.filter((c) => c.id !== record.id);
  return { ok, reason: ok ? 'ok' : 'bad_code' };
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
    await writeFile(DB_FILE, JSON.stringify({ users: [], projects: [], files: [], payments: [], deliverables: [], sessions: [], twoFactorCodes: [], wallets: [], creditLedger: [], activityLog: [], subscriptions: [], creditReservations: [] }, null, 2));
  }
}

function normalizeDb(db) {
  db.users ||= [];
  db.projects ||= [];
  db.files ||= [];
  db.payments ||= [];
  db.deliverables ||= [];
  db.sessions ||= [];
  db.twoFactorCodes ||= [];
  db.wallets ||= [];
  db.creditLedger ||= [];
  db.activityLog ||= [];
  db.subscriptions ||= [];
  db.creditReservations ||= [];
  db.opsPlans ||= [];
  db.opsRuns ||= [];
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

async function requireUserWithDb(req, res) {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    fail(res, 401, 'unauthorized', 'Login required');
    return null;
  }
  return ctx;
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


const CREDITS_PER_USD = Number(process.env.CREDITS_PER_USD || 10);
const ACTIVITY_LOG_LIMIT = Number(process.env.ACTIVITY_LOG_LIMIT || 5000);

function publicWallet(wallet) {
  const balanceCredits = Number(wallet.balanceCredits || 0);
  const reservedCredits = Number(wallet.reservedCredits || 0);
  return {
    userId: wallet.userId,
    balanceCredits,
    reservedCredits,
    availableCredits: Math.max(0, balanceCredits - reservedCredits),
    lifetimePurchasedCredits: Number(wallet.lifetimePurchasedCredits || 0),
    lifetimeUsedCredits: Number(wallet.lifetimeUsedCredits || 0),
    updatedAt: wallet.updatedAt
  };
}

function getWallet(db, userId) {
  db.wallets ||= [];
  let wallet = db.wallets.find((w) => w.userId === userId);
  if (!wallet) {
    wallet = { userId, balanceCredits: 0, reservedCredits: 0, lifetimePurchasedCredits: 0, lifetimeUsedCredits: 0, createdAt: now(), updatedAt: now() };
    db.wallets.push(wallet);
  }
  return wallet;
}

function sanitizeMeta(meta = {}) {
  try {
    return JSON.parse(JSON.stringify(meta));
  } catch {
    return {};
  }
}

function pushActivity(db, { userId, sessionId = null, action, entityType = 'system', entityId = null, summary = '', metadata = {}, req = null }) {
  if (!userId || !action) return null;
  db.activityLog ||= [];
  const event = {
    id: id('activity'),
    userId,
    sessionId,
    action,
    entityType,
    entityId,
    summary: String(summary || '').slice(0, 260),
    metadata: sanitizeMeta(metadata),
    ip: req ? clientIp(req) : '',
    userAgent: req ? String(req.headers['user-agent'] || '') : '',
    createdAt: now()
  };
  db.activityLog.push(event);
  if (db.activityLog.length > ACTIVITY_LOG_LIMIT) db.activityLog = db.activityLog.slice(-ACTIVITY_LOG_LIMIT);
  return event;
}

function addCreditLedger(db, { userId, projectId = null, paymentId = null, type, deltaCredits, reason = '', metadata = {}, req = null, sessionId = null }) {
  db.creditLedger ||= [];
  const wallet = getWallet(db, userId);
  const delta = Number(deltaCredits || 0);
  wallet.balanceCredits = Number(wallet.balanceCredits || 0) + delta;
  if (delta > 0) wallet.lifetimePurchasedCredits = Number(wallet.lifetimePurchasedCredits || 0) + delta;
  if (delta < 0) wallet.lifetimeUsedCredits = Number(wallet.lifetimeUsedCredits || 0) + Math.abs(delta);
  wallet.updatedAt = now();
  const entry = {
    id: id('credit'),
    userId,
    projectId,
    paymentId,
    type,
    deltaCredits: delta,
    balanceAfter: wallet.balanceCredits,
    reason: String(reason || '').slice(0, 260),
    metadata: sanitizeMeta(metadata),
    sessionId,
    ip: req ? clientIp(req) : '',
    createdAt: now()
  };
  db.creditLedger.push(entry);
  pushActivity(db, {
    userId,
    sessionId,
    action: `credits.${type}`,
    entityType: projectId ? 'project' : 'wallet',
    entityId: projectId || userId,
    summary: `${type}: ${delta} credits`,
    metadata: { paymentId, deltaCredits: delta, balanceAfter: wallet.balanceCredits, ...sanitizeMeta(metadata) },
    req
  });
  return { wallet, entry };
}

function projectSummary(project) {
  return {
    id: project.id,
    title: project.title,
    serviceType: project.serviceType,
    packageKey: project.packageKey,
    priceUsd: project.priceUsd,
    status: project.status,
    paymentStatus: project.paymentStatus
  };
}

function paymentCredits(amountUsd) {
  return Math.max(0, Math.round(Number(amountUsd || 0) * CREDITS_PER_USD));
}

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function creditsForUsd(amountUsd) {
  return Math.max(0, Math.round(Number(amountUsd || 0) * CREDITS_PER_USD));
}

function topupPlans() {
  const seen = new Set();
  return TOPUP_AMOUNTS_USD
    .filter((amount) => {
      if (seen.has(amount)) return false;
      seen.add(amount);
      return true;
    })
    .sort((a, b) => a - b)
    .map((amountUsd) => ({
      key: `topup_${String(amountUsd).replace(/\./g, '_')}`,
      amountUsd,
      credits: creditsForUsd(amountUsd),
      label: `$${amountUsd} = ${creditsForUsd(amountUsd)} credits`
    }));
}

function findTopupPlan(planKey) {
  return topupPlans().find((p) => p.key === planKey) || null;
}

function paypalApiBase() {
  return PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

async function paypalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) throw new Error('PayPal credentials are not configured');
  const response = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(`PayPal token failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function createPayPalOrder({ amountUsd, customId }) {
  const token = await paypalAccessToken();
  const origin = APP_URL || '';
  const payload = {
    intent: 'CAPTURE',
    purchase_units: [{
      custom_id: customId,
      description: 'Content Machine credits top-up',
      amount: { currency_code: 'USD', value: money(amountUsd).toFixed(2) }
    }],
    application_context: {
      brand_name: 'Content Machine',
      user_action: 'PAY_NOW',
      shipping_preference: 'NO_SHIPPING',
      return_url: origin ? `${origin}/#/billing?paypal=approved` : undefined,
      cancel_url: origin ? `${origin}/#/billing?paypal=cancelled` : undefined
    }
  };
  const response = await fetch(`${paypalApiBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id) throw new Error(`PayPal create order failed: ${JSON.stringify(data)}`);
  return data;
}

async function capturePayPalOrder(paypalOrderId) {
  const token = await paypalAccessToken();
  const response = await fetch(`${paypalApiBase()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`PayPal capture failed: ${JSON.stringify(data)}`);
  return data;
}

function extractCapturedUsd(captureData) {
  const captures = captureData?.purchase_units?.flatMap((u) => u?.payments?.captures || []) || [];
  const completed = captures.find((c) => c.status === 'COMPLETED') || captures[0];
  return {
    captureId: completed?.id || '',
    status: completed?.status || captureData?.status || '',
    amountUsd: Number(completed?.amount?.value || 0)
  };
}

function estimateOperationCredits(input = {}) {
  const operationType = String(input.operationType || input.serviceType || input.type || 'custom').toLowerCase();
  const quality = String(input.quality || input.styleQuality || input.tier || 'standard').toLowerCase();
  const agentLevel = String(input.agentLevel || input.thinkingLevel || input.complexity || 'normal').toLowerCase();
  const durationSeconds = Math.max(0, Number(input.durationSeconds || input.duration || 0));
  const requestedVideoCount = Number(input.videoCount || input.count || 0);
  const isVideoLike = /(video|film|reel|ugc|documentary|cinematic|youtube)/.test(operationType) || durationSeconds > 0;
  const videoCount = Math.max(isVideoLike ? 1 : 0, Number.isFinite(requestedVideoCount) ? requestedVideoCount : 0);
  const videoUnits15 = videoCount * Math.max(0, Math.ceil((durationSeconds || 15) / 15));
  const imageCount = Math.max(0, Number(input.imageCount || input.images || 0));
  const voiceMinutes = Math.max(0, Number(input.voiceMinutes || 0));
  const researchLevel = String(input.researchLevel || 'none').toLowerCase();

  // Internal cost model. User sees only credits range, not this breakdown.
  const per15sUsd = quality === 'premium' ? 6 : quality === 'draft' || quality === 'fast' ? 3.5 : 5;
  const providerUsd = money((videoUnits15 * per15sUsd) + (imageCount * 0.35) + (voiceMinutes * 0.8));
  const agentUsdMap = { none: 0, light: 0.4, normal: 1.0, deep: 2.5, heavy: 3.5 };
  const researchUsdMap = { none: 0, light: 0.5, normal: 1.25, deep: 2.5 };
  const brainUsd = money((agentUsdMap[agentLevel] ?? agentUsdMap.normal) + (researchUsdMap[researchLevel] ?? 0));
  const infrastructureUsd = money(Math.max(0.35, providerUsd * 0.08));
  const internalCostUsd = money(providerUsd + brainUsd + infrastructureUsd);

  // Platform quote before safety reserve. This includes platform operation margin.
  let estimatedLowUsd = money(internalCostUsd * EARLY_DYNAMIC_MARKUP);
  if (!isVideoLike) estimatedLowUsd = Math.max(2, estimatedLowUsd);
  if (isVideoLike) estimatedLowUsd = Math.max(9, estimatedLowUsd);

  const estimatedHighUsd = money(estimatedLowUsd * (1 + ESTIMATE_SAFETY_BUFFER_RATE));
  const estimatedLowCredits = Math.max(1, Math.ceil((estimatedLowUsd * CREDITS_PER_USD) / 5) * 5);
  const estimatedHighCredits = Math.max(estimatedLowCredits, Math.ceil((estimatedHighUsd * CREDITS_PER_USD) / 5) * 5);

  return {
    estimatedLowCredits,
    estimatedHighCredits,
    requiredCredits: estimatedHighCredits,
    credits: estimatedHighCredits,
    estimatedLowUsd: money(estimatedLowCredits / CREDITS_PER_USD),
    estimatedHighUsd: money(estimatedHighCredits / CREDITS_PER_USD),
    estimatedUsd: money(estimatedHighCredits / CREDITS_PER_USD),
    unit: { creditsPerUsd: CREDITS_PER_USD, usdPerCredit: money(1 / CREDITS_PER_USD) },
    priceMode: 'dynamic_reserve_v2',
    explanation: 'The system reserves the high estimate before execution, then charges the actual final cost and releases the unused reserve.',
    formula: {
      operationType,
      quality,
      agentLevel,
      researchLevel,
      durationSeconds: durationSeconds || (isVideoLike ? 15 : 0),
      videoCount,
      videoUnits15,
      imageCount,
      voiceMinutes,
      safetyBufferRate: ESTIMATE_SAFETY_BUFFER_RATE
    },
    internalBreakdown: {
      providerUsd,
      brainUsd,
      infrastructureUsd,
      internalCostUsd,
      estimatedLowUsd,
      estimatedHighUsd
    }
  };
}

function ledgerEntryOnly(db, { userId, projectId = null, reservationId = null, paymentId = null, type, deltaCredits = 0, reason = '', metadata = {}, req = null, sessionId = null }) {
  db.creditLedger ||= [];
  const wallet = getWallet(db, userId);
  const entry = {
    id: id('credit'),
    userId,
    projectId,
    reservationId,
    paymentId,
    type,
    deltaCredits: Number(deltaCredits || 0),
    balanceAfter: Number(wallet.balanceCredits || 0),
    reservedAfter: Number(wallet.reservedCredits || 0),
    availableAfter: Math.max(0, Number(wallet.balanceCredits || 0) - Number(wallet.reservedCredits || 0)),
    reason: String(reason || '').slice(0, 260),
    metadata: sanitizeMeta(metadata),
    sessionId,
    ip: req ? clientIp(req) : '',
    createdAt: now()
  };
  db.creditLedger.push(entry);
  pushActivity(db, {
    userId,
    sessionId,
    action: `credits.${type}`,
    entityType: projectId ? 'project' : 'wallet',
    entityId: projectId || userId,
    summary: `${type}: ${entry.deltaCredits} credits`,
    metadata: { reservationId, paymentId, deltaCredits: entry.deltaCredits, balanceAfter: entry.balanceAfter, reservedAfter: entry.reservedAfter, ...sanitizeMeta(metadata) },
    req
  });
  return entry;
}

function reserveOperationCredits(db, { userId, projectId = null, estimate, input = {}, req = null, sessionId = null }) {
  db.creditReservations ||= [];
  const wallet = getWallet(db, userId);
  const requiredCredits = requirePositiveCredits(estimate?.requiredCredits || estimate?.estimatedHighCredits || estimate?.credits);
  if (!requiredCredits) throw new Error('Could not calculate reservation credits');
  const availableCredits = Math.max(0, Number(wallet.balanceCredits || 0) - Number(wallet.reservedCredits || 0));
  if (availableCredits < requiredCredits) {
    const err = new Error('Not enough available credits for this operation');
    err.code = 'insufficient_credits';
    err.requiredCredits = requiredCredits;
    err.availableCredits = availableCredits;
    throw err;
  }
  wallet.reservedCredits = Number(wallet.reservedCredits || 0) + requiredCredits;
  wallet.updatedAt = now();
  const reservation = {
    id: id('reservation'),
    userId,
    projectId,
    status: 'reserved',
    input: sanitizeMeta(input),
    estimate: sanitizeMeta(estimate),
    estimatedLowCredits: Number(estimate.estimatedLowCredits || 0),
    estimatedHighCredits: Number(estimate.estimatedHighCredits || requiredCredits),
    reservedCredits: requiredCredits,
    actualCredits: null,
    chargedCredits: 0,
    refundedCredits: 0,
    createdAt: now(),
    updatedAt: now()
  };
  db.creditReservations.push(reservation);
  const entry = ledgerEntryOnly(db, {
    userId,
    projectId,
    reservationId: reservation.id,
    type: 'reservation_created',
    deltaCredits: 0,
    reason: 'Reserved credits for operation maximum estimate',
    metadata: { reservedCredits: requiredCredits, estimate },
    req,
    sessionId
  });
  return { reservation, wallet, entry };
}

function finalizeOperationReservation(db, { reservationId, actualCredits, actualUsd = null, req = null, sessionId = null }) {
  db.creditReservations ||= [];
  const reservation = db.creditReservations.find((r) => r.id === reservationId);
  if (!reservation) {
    const err = new Error('Reservation not found');
    err.code = 'reservation_not_found';
    throw err;
  }
  if (reservation.status !== 'reserved') {
    const err = new Error(`Reservation is already ${reservation.status}`);
    err.code = 'reservation_not_open';
    throw err;
  }
  const wallet = getWallet(db, reservation.userId);
  const reserved = Number(reservation.reservedCredits || 0);
  let actual = requirePositiveCredits(actualCredits || 0);
  if (!actual && actualUsd !== null && actualUsd !== undefined) actual = creditsForUsd(Number(actualUsd || 0));
  if (!actual) actual = requirePositiveCredits(reservation.estimatedLowCredits || reserved);
  const charged = Math.min(reserved, actual);
  const refunded = Math.max(0, reserved - charged);
  wallet.reservedCredits = Math.max(0, Number(wallet.reservedCredits || 0) - reserved);
  wallet.balanceCredits = Math.max(0, Number(wallet.balanceCredits || 0) - charged);
  wallet.lifetimeUsedCredits = Number(wallet.lifetimeUsedCredits || 0) + charged;
  wallet.updatedAt = now();
  reservation.status = 'finalized';
  reservation.actualCredits = actual;
  reservation.chargedCredits = charged;
  reservation.refundedCredits = refunded;
  reservation.finalizedAt = now();
  reservation.updatedAt = now();
  const entry = ledgerEntryOnly(db, {
    userId: reservation.userId,
    projectId: reservation.projectId,
    reservationId: reservation.id,
    type: 'operation_finalized',
    deltaCredits: -charged,
    reason: 'Final operation charge after actual cost calculation',
    metadata: { actualCredits: actual, chargedCredits: charged, refundedCredits: refunded, reservedCredits: reserved, actualUsd },
    req,
    sessionId
  });
  return { reservation, wallet, entry };
}

function refundOperationReservation(db, { reservationId, reason = 'Operation cancelled or failed', req = null, sessionId = null }) {
  db.creditReservations ||= [];
  const reservation = db.creditReservations.find((r) => r.id === reservationId);
  if (!reservation) {
    const err = new Error('Reservation not found');
    err.code = 'reservation_not_found';
    throw err;
  }
  if (reservation.status !== 'reserved') {
    const err = new Error(`Reservation is already ${reservation.status}`);
    err.code = 'reservation_not_open';
    throw err;
  }
  const wallet = getWallet(db, reservation.userId);
  const reserved = Number(reservation.reservedCredits || 0);
  wallet.reservedCredits = Math.max(0, Number(wallet.reservedCredits || 0) - reserved);
  wallet.updatedAt = now();
  reservation.status = 'refunded';
  reservation.refundedCredits = reserved;
  reservation.updatedAt = now();
  reservation.refundedAt = now();
  reservation.refundReason = String(reason || '').slice(0, 260);
  const entry = ledgerEntryOnly(db, {
    userId: reservation.userId,
    projectId: reservation.projectId,
    reservationId: reservation.id,
    type: 'reservation_released',
    deltaCredits: 0,
    reason,
    metadata: { releasedCredits: reserved },
    req,
    sessionId
  });
  return { reservation, wallet, entry };
}

function requirePositiveCredits(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
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


// --- STEP 22: Operational Minds Registry (configuration only, no paid model calls) ---
const OPS_AGENT_REGISTRY = [
  {
    "id": "mission_director",
    "module": "core",
    "modelLane": "director",
    "role": "Understands the user goal and selects the workflow.",
    "skills": [
      "readProject",
      "buildContext",
      "estimateCost",
      "selectAgents"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "intent_classifier",
    "module": "core",
    "modelLane": "router",
    "role": "Classifies the request into a workflow.",
    "skills": [
      "classifyIntent"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "context_builder",
    "module": "core",
    "modelLane": "long_context",
    "role": "Builds compact project context for downstream agents.",
    "skills": [
      "readProject",
      "readAssets",
      "readReferences"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "workflow_router",
    "module": "core",
    "modelLane": "router",
    "role": "Selects the minimum useful agent path.",
    "skills": [
      "selectWorkflow",
      "estimateCost"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "clarification_agent",
    "module": "core",
    "modelLane": "director",
    "role": "Asks only necessary missing-information questions.",
    "skills": [
      "buildQuestions"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "decision_button_agent",
    "module": "core",
    "modelLane": "director",
    "role": "Creates context-aware decision buttons.",
    "skills": [
      "buildDecisionButtons"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "approval_gate_agent",
    "module": "core",
    "modelLane": "deterministic",
    "role": "Blocks execution until payment, credits and approval are valid.",
    "skills": [
      "checkWallet",
      "reserveCredits"
    ],
    "costLevel": "none",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "asset_inspector",
    "module": "assets",
    "modelLane": "multimodal",
    "role": "Analyzes uploaded assets and reference sheets.",
    "skills": [
      "readAssets",
      "analyzeImage"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "asset_classifier",
    "module": "assets",
    "modelLane": "router",
    "role": "Classifies assets as character, product, tool, car, reference or location.",
    "skills": [
      "classifyAsset"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "mention_resolver",
    "module": "assets",
    "modelLane": "deterministic",
    "role": "Resolves @char1, @tool1, @product1, @account1 mentions.",
    "skills": [
      "resolveMentions"
    ],
    "costLevel": "none",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "reference_librarian",
    "module": "assets",
    "modelLane": "long_context",
    "role": "Retrieves relevant project references and skill notes.",
    "skills": [
      "readReferences",
      "retrieveSkillDocs"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "brand_memory_agent",
    "module": "assets",
    "modelLane": "long_context",
    "role": "Keeps project tone, decisions and brand constraints.",
    "skills": [
      "readProject",
      "buildMemory"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "consistency_reference_agent",
    "module": "assets",
    "modelLane": "multimodal",
    "role": "Maintains visual consistency references across outputs.",
    "skills": [
      "readAssets",
      "analyzeImage"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "film_concept_agent",
    "module": "film",
    "modelLane": "creative",
    "role": "Turns a film brief into an executable concept.",
    "skills": [
      "callCreativeModel",
      "readAssets"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "style_interpreter",
    "module": "film",
    "modelLane": "creative",
    "role": "Translates selected visual style into production rules.",
    "skills": [
      "callCreativeModel",
      "retrieveSkillDocs"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "scene_planner_agent",
    "module": "film",
    "modelLane": "creative",
    "role": "Splits a film into duration-aware scenes.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "storyboard_agent",
    "module": "film",
    "modelLane": "creative",
    "role": "Creates storyboard with start/end frame instructions.",
    "skills": [
      "callCreativeModel",
      "retrieveSkillDocs"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "start_end_frame_agent",
    "module": "film",
    "modelLane": "creative",
    "role": "Builds start/end frame generation payloads.",
    "skills": [
      "callCreativeModel",
      "readAssets"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "film_consistency_agent",
    "module": "film",
    "modelLane": "multimodal",
    "role": "Checks scenes for character and object consistency.",
    "skills": [
      "analyzeImage",
      "readAssets"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "higgsfield_prompt_agent",
    "module": "film",
    "modelLane": "creative",
    "role": "Converts storyboard into Higgsfield-ready payloads.",
    "skills": [
      "callCreativeModel",
      "submitHiggsfieldJob"
    ],
    "costLevel": "high",
    "requiresPaidExecution": true,
    "requiresApproval": true,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "film_assembly_planner",
    "module": "film",
    "modelLane": "creative",
    "role": "Plans clip order, transitions and final assembly.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "documentary_mode_agent",
    "module": "documentary",
    "modelLane": "router",
    "role": "Chooses manual or auto-think documentary mode.",
    "skills": [
      "classifyIntent"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "topic_generator_agent",
    "module": "documentary",
    "modelLane": "creative",
    "role": "Generates viral documentary topic options.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "documentary_research_agent",
    "module": "documentary",
    "modelLane": "long_context",
    "role": "Researches documentary facts, sources and gaps.",
    "skills": [
      "searchWeb",
      "callLongContextModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": true,
    "enabled": true
  },
  {
    "id": "fact_assumption_splitter",
    "module": "documentary",
    "modelLane": "creative",
    "role": "Separates facts from assumptions and uncertainties.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "script_architect",
    "module": "documentary",
    "modelLane": "creative",
    "role": "Writes duration-aware documentary script structure.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "beat_splitter",
    "module": "documentary",
    "modelLane": "deterministic",
    "role": "Splits script into timed beats.",
    "skills": [
      "createTaskGraph"
    ],
    "costLevel": "none",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "visual_beat_agent",
    "module": "documentary",
    "modelLane": "creative",
    "role": "Creates visual prompts for each documentary beat.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "narration_agent",
    "module": "documentary",
    "modelLane": "creative",
    "role": "Creates narration and voice direction.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "documentary_consistency_agent",
    "module": "documentary",
    "modelLane": "multimodal",
    "role": "Checks visual continuity across documentary beats.",
    "skills": [
      "analyzeImage"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "business_understanding_agent",
    "module": "marketing",
    "modelLane": "creative",
    "role": "Extracts product, market, offer, audience and constraints.",
    "skills": [
      "callCreativeModel",
      "readReferences"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "audience_agent",
    "module": "marketing",
    "modelLane": "creative",
    "role": "Defines audience segments and objections.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "reference_account_agent",
    "module": "marketing",
    "modelLane": "long_context",
    "role": "Analyzes added TikTok/Instagram/YouTube reference accounts.",
    "skills": [
      "searchWeb",
      "readReferences"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": true,
    "enabled": true
  },
  {
    "id": "market_research_agent",
    "module": "marketing",
    "modelLane": "long_context",
    "role": "Researches the market, competitors and content gaps.",
    "skills": [
      "searchWeb",
      "callLongContextModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": true,
    "enabled": true
  },
  {
    "id": "trend_discovery_agent",
    "module": "marketing",
    "modelLane": "long_context",
    "role": "Finds relevant platform trends.",
    "skills": [
      "searchWeb"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": true,
    "enabled": true
  },
  {
    "id": "viral_pattern_agent",
    "module": "marketing",
    "modelLane": "creative",
    "role": "Explains what makes examples go viral.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "failure_pattern_agent",
    "module": "marketing",
    "modelLane": "creative",
    "role": "Explains weak content and what to avoid.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "creative_strategy_agent",
    "module": "marketing",
    "modelLane": "director",
    "role": "Synthesizes market research into a strategy.",
    "skills": [
      "callDirectorModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "campaign_planner_agent",
    "module": "marketing",
    "modelLane": "creative",
    "role": "Builds campaign map and jobs.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "ugc_expansion_agent",
    "module": "marketing",
    "modelLane": "creative",
    "role": "Expands campaign into UGC video jobs.",
    "skills": [
      "callCreativeModel",
      "retrieveSkillDocs"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "hook_writer_agent",
    "module": "marketing",
    "modelLane": "creative",
    "role": "Writes platform-specific hooks.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "script_writer_agent",
    "module": "marketing",
    "modelLane": "creative",
    "role": "Writes short platform scripts.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "caption_cta_agent",
    "module": "marketing",
    "modelLane": "creative",
    "role": "Writes captions, hashtags and CTAs.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "service_conversation_agent",
    "module": "service",
    "modelLane": "director",
    "role": "Maintains client-facing service conversation state.",
    "skills": [
      "callDirectorModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "tool_selection_agent",
    "module": "service",
    "modelLane": "router",
    "role": "Selects platform tools for user goal.",
    "skills": [
      "selectTools"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "skill_planner_agent",
    "module": "service",
    "modelLane": "director",
    "role": "Plans skill sequence for a workflow.",
    "skills": [
      "retrieveSkillDocs",
      "callDirectorModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "user_goal_refiner",
    "module": "service",
    "modelLane": "creative",
    "role": "Turns vague requests into clear production goals.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "cross_workflow_coordinator",
    "module": "service",
    "modelLane": "director",
    "role": "Coordinates mixed workflows.",
    "skills": [
      "callDirectorModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "avatar_input_qa",
    "module": "avatar",
    "modelLane": "multimodal",
    "role": "Checks avatar training photos.",
    "skills": [
      "analyzeImage"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "identity_lock_agent",
    "module": "avatar",
    "modelLane": "multimodal",
    "role": "Builds identity lock instructions.",
    "skills": [
      "analyzeImage",
      "readAssets"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "avatar_training_planner",
    "module": "avatar",
    "modelLane": "creative",
    "role": "Plans avatar training settings.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "avatar_usage_agent",
    "module": "avatar",
    "modelLane": "creative",
    "role": "Plans avatar usage in marketing/film workflows.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "avatar_safety_quality_agent",
    "module": "avatar",
    "modelLane": "multimodal",
    "role": "Checks avatar output quality.",
    "skills": [
      "analyzeImage"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "task_graph_agent",
    "module": "execution",
    "modelLane": "deterministic",
    "role": "Turns approved plan into executable jobs.",
    "skills": [
      "createTaskGraph"
    ],
    "costLevel": "none",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "cost_estimator_agent",
    "module": "execution",
    "modelLane": "deterministic",
    "role": "Calculates dynamic estimate and reserve range.",
    "skills": [
      "estimateCost"
    ],
    "costLevel": "none",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "credit_reservation_agent",
    "module": "execution",
    "modelLane": "deterministic",
    "role": "Reserves credits before execution.",
    "skills": [
      "reserveCredits"
    ],
    "costLevel": "none",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "provider_router_agent",
    "module": "execution",
    "modelLane": "router",
    "role": "Chooses provider/model for each job.",
    "skills": [
      "selectProvider"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "job_dispatcher_agent",
    "module": "execution",
    "modelLane": "deterministic",
    "role": "Dispatches approved paid jobs.",
    "skills": [
      "submitHiggsfieldJob"
    ],
    "costLevel": "execution",
    "requiresPaidExecution": true,
    "requiresApproval": true,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "progress_monitor_agent",
    "module": "execution",
    "modelLane": "deterministic",
    "role": "Tracks job progress.",
    "skills": [
      "monitorJob"
    ],
    "costLevel": "none",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "recovery_agent",
    "module": "execution",
    "modelLane": "director",
    "role": "Plans recovery for failed jobs.",
    "skills": [
      "callDirectorModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "retry_strategy_agent",
    "module": "execution",
    "modelLane": "creative",
    "role": "Rewrites failed prompts/retry strategy.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "output_qa_agent",
    "module": "qa",
    "modelLane": "multimodal",
    "role": "Reviews final outputs against brief.",
    "skills": [
      "runQA",
      "analyzeImage"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "brand_safety_agent",
    "module": "qa",
    "modelLane": "creative",
    "role": "Checks brand risk and content safety.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "consistency_qa_agent",
    "module": "qa",
    "modelLane": "multimodal",
    "role": "Checks output consistency against references.",
    "skills": [
      "analyzeImage"
    ],
    "costLevel": "medium",
    "requiresPaidExecution": true,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "delivery_packaging_agent",
    "module": "qa",
    "modelLane": "creative",
    "role": "Packages deliverables and notes.",
    "skills": [
      "packageDelivery"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "client_summary_agent",
    "module": "qa",
    "modelLane": "creative",
    "role": "Summarizes delivered work to client.",
    "skills": [
      "callCreativeModel"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  },
  {
    "id": "feedback_learning_agent",
    "module": "qa",
    "modelLane": "long_context",
    "role": "Turns feedback into future project memory.",
    "skills": [
      "callLongContextModel"
    ],
    "costLevel": "low",
    "requiresPaidExecution": false,
    "requiresApproval": false,
    "canUseInternet": false,
    "enabled": true
  }
];
const OPS_SKILL_REGISTRY = [
  {
    "id": "analyzeImage",
    "costBucket": "api",
    "enabled": true
  },
  {
    "id": "buildContext",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "buildDecisionButtons",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "buildMemory",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "buildQuestions",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "callCreativeModel",
    "costBucket": "api",
    "enabled": true
  },
  {
    "id": "callDirectorModel",
    "costBucket": "api",
    "enabled": true
  },
  {
    "id": "callLongContextModel",
    "costBucket": "api",
    "enabled": true
  },
  {
    "id": "checkWallet",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "classifyAsset",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "classifyIntent",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "createTaskGraph",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "estimateCost",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "monitorJob",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "packageDelivery",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "readAssets",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "readProject",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "readReferences",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "reserveCredits",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "resolveMentions",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "retrieveSkillDocs",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "runQA",
    "costBucket": "api",
    "enabled": true
  },
  {
    "id": "searchWeb",
    "costBucket": "api",
    "enabled": true
  },
  {
    "id": "selectAgents",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "selectProvider",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "selectTools",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "selectWorkflow",
    "costBucket": "system",
    "enabled": true
  },
  {
    "id": "submitHiggsfieldJob",
    "costBucket": "api",
    "enabled": true
  }
];
const OPS_WORKFLOW_TEMPLATES = {
  "film_maker": [
    "mission_director",
    "context_builder",
    "mention_resolver",
    "film_concept_agent",
    "style_interpreter",
    "scene_planner_agent",
    "storyboard_agent",
    "start_end_frame_agent",
    "higgsfield_prompt_agent",
    "task_graph_agent",
    "cost_estimator_agent",
    "approval_gate_agent",
    "job_dispatcher_agent",
    "output_qa_agent",
    "delivery_packaging_agent"
  ],
  "marketing_agent": [
    "mission_director",
    "context_builder",
    "business_understanding_agent",
    "audience_agent",
    "reference_account_agent",
    "market_research_agent",
    "trend_discovery_agent",
    "viral_pattern_agent",
    "failure_pattern_agent",
    "creative_strategy_agent",
    "campaign_planner_agent",
    "ugc_expansion_agent",
    "hook_writer_agent",
    "script_writer_agent",
    "caption_cta_agent",
    "task_graph_agent",
    "cost_estimator_agent",
    "approval_gate_agent",
    "output_qa_agent",
    "delivery_packaging_agent"
  ],
  "youtube_documentary": [
    "mission_director",
    "documentary_mode_agent",
    "topic_generator_agent",
    "documentary_research_agent",
    "fact_assumption_splitter",
    "script_architect",
    "beat_splitter",
    "visual_beat_agent",
    "narration_agent",
    "documentary_consistency_agent",
    "task_graph_agent",
    "cost_estimator_agent",
    "approval_gate_agent",
    "job_dispatcher_agent",
    "output_qa_agent"
  ],
  "ugc_avatar": [
    "mission_director",
    "asset_inspector",
    "avatar_input_qa",
    "identity_lock_agent",
    "avatar_training_planner",
    "avatar_usage_agent",
    "avatar_safety_quality_agent",
    "task_graph_agent",
    "cost_estimator_agent",
    "approval_gate_agent"
  ],
  "service_agent": [
    "mission_director",
    "service_conversation_agent",
    "user_goal_refiner",
    "tool_selection_agent",
    "skill_planner_agent",
    "cross_workflow_coordinator",
    "task_graph_agent",
    "cost_estimator_agent"
  ]
};

function opsAgent(id) { return OPS_AGENT_REGISTRY.find((a) => a.id === id) || null; }
function opsWorkflowType(raw) {
  const key = String(raw || 'service_agent').trim();
  return OPS_WORKFLOW_TEMPLATES[key] ? key : 'service_agent';
}
function opsDefaultInput(project, body = {}) {
  return {
    operationType: opsWorkflowType(body.operationType || project.serviceType),
    durationSeconds: Number(body.durationSeconds || project.durationSeconds || 15),
    quality: String(body.quality || body.style || project.style || 'standard'),
    agentLevel: String(body.agentLevel || 'normal'),
    researchLevel: String(body.researchLevel || 'normal'),
    videoCount: Number(body.videoCount || 1),
    imageCount: Number(body.imageCount || 0),
    voiceMinutes: Number(body.voiceMinutes || 0),
    prompt: String(body.prompt || project.brief || ''),
    style: String(body.style || project.style || ''),
  };
}
function opsSuggestedSkills(agentIds) {
  const set = new Set();
  for (const id of agentIds || []) {
    const agent = opsAgent(id);
    for (const sk of agent?.skills || []) set.add(sk);
  }
  return [...set].map((id) => OPS_SKILL_REGISTRY.find((s) => s.id === id) || { id, enabled: true });
}
function buildOpsPlan({ project, body = {}, userId, estimate }) {
  const workflowType = opsWorkflowType(body.operationType || project.serviceType);
  const agentIds = OPS_WORKFLOW_TEMPLATES[workflowType] || OPS_WORKFLOW_TEMPLATES.service_agent;
  const agents = agentIds.map(opsAgent).filter(Boolean);
  const input = opsDefaultInput(project, body);
  return {
    id: id('ops_plan'),
    userId,
    projectId: project.id,
    workflowType,
    status: 'planned',
    title: String(body.title || `Operational plan · ${workflowType}`).slice(0, 160),
    input: sanitizeMeta(input),
    estimate: sanitizeMeta(estimate),
    agents: agents.map((a, i) => ({ step: i + 1, id: a.id, name: a.name, module: a.module, modelLane: a.modelLane, role: a.role, costLevel: a.costLevel, skills: a.skills, promptId: opsPromptId(a.id), skillEvaluation: opsEvaluateAgentSkillNeed({ agentId: a.id, workflowType, task: `${workflowType} planning step ${i + 1}`, operationInput: input }) })),
    skills: opsSuggestedSkills(agentIds),
    gates: { requiresCredits: true, requiresApproval: true, reserveBeforeExecution: true, chargeActualAndRefundUnused: true },
    promptPackVersion: OPS_PROMPT_PACK_VERSION,
    estimatedArtifacts: agents.flatMap((a) => expectedArtifactsForAgent(a.id)).filter((v, i, arr) => arr.indexOf(v) === i),
    nextAction: 'reserve_credits_before_execution',
    createdAt: now(),
    updatedAt: now()
  };
}
function opsRunFromPlan(plan, reservation) {
  return {
    id: id('ops_run'),
    userId: plan.userId,
    projectId: plan.projectId,
    planId: plan.id,
    reservationId: reservation?.id || null,
    workflowType: plan.workflowType,
    status: reservation ? 'reserved_waiting_manual_execution' : 'planned',
    currentStep: 0,
    steps: plan.agents.map((a, i) => ({ step: i + 1, agentId: a.id, status: 'pending', module: a.module, modelLane: a.modelLane, costLevel: a.costLevel, instruction: buildStepInstruction(opsAgent(a.id) || a, plan, i), output: null, startedAt: null, completedAt: null })),
    timeline: [{ at: now(), type: 'run_created', message: 'Ops run created from approved/reserved plan.' }],
    artifacts: [],
    createdAt: now(),
    updatedAt: now()
  };
}

// --- STEP 23: OPERATIONAL MINDS CONTROL LAYER ---
const OPS_PROMPT_PACK_VERSION = 'ops_prompts_v1_dry_run';

const OPS_KEYWORD_SKILL_HINTS = {
  film: ['callCreativeModel','resolveMentions','readAssets','createTaskGraph','submitHiggsfieldJob','runQA'],
  cinematic: ['callCreativeModel','readAssets','createTaskGraph','submitHiggsfieldJob'],
  storyboard: ['callCreativeModel','readAssets','createTaskGraph'],
  scene: ['callCreativeModel','readAssets'],
  marketing: ['readReferences','searchWeb','analyzeReferenceAccount','callCreativeModel','createTaskGraph'],
  campaign: ['readReferences','searchWeb','callCreativeModel','createTaskGraph'],
  ugc: ['callCreativeModel','readAssets','submitHiggsfieldJob'],
  documentary: ['searchWeb','callLongContextModel','callCreativeModel','createTaskGraph'],
  research: ['searchWeb','callLongContextModel','readReferences'],
  avatar: ['callMultimodalModel','readAssets','submitHiggsfieldJob'],
  billing: ['estimateCost','reserveCredits'],
  credits: ['estimateCost','reserveCredits'],
  qa: ['runQA','readProject','readAssets'],
};

function opsPromptId(agentId) {
  return `prompt_${agentId}_${OPS_PROMPT_PACK_VERSION}`;
}

function buildAgentPromptPack(agent) {
  const a = agent || {};
  const role = a.role || 'Specialist operating unit.';
  const skills = (a.skills || []).join(', ') || 'none';
  return {
    id: opsPromptId(a.id || 'unknown_agent'),
    version: OPS_PROMPT_PACK_VERSION,
    agentId: a.id,
    name: a.name,
    module: a.module,
    modelLane: a.modelLane,
    systemPrompt: [
      `You are ${a.name || a.id}, a specialist operating unit inside Content Machine.`,
      `Your role: ${role}`,
      'You do not behave like a general chatbot. You produce structured operational output only.',
      'You must never start paid provider execution. Paid execution is only allowed through payment-gated runners.',
      'Before using any skill, evaluate whether the skill is actually needed, useful, and allowed for this step.',
      'If required context is missing, report missingFields instead of inventing details.',
      'Return JSON only when invoked by the backend runner.'
    ].join('\n'),
    inputContract: {
      required: ['workflowId','project','operationInput','currentStepContext'],
      optional: ['assets','references','previousAgentOutputs','wallet','estimate','skills']
    },
    outputContract: {
      required: ['status','summary','confidence','nextAction'],
      optional: ['missingFields','selectedSkills','artifact','handoff','warnings']
    },
    allowedSkills: a.skills || [],
    guardrails: [
      'Do not call external APIs directly.',
      'Do not spend credits.',
      'Do not claim provider execution has happened unless a provider job result exists.',
      'Do not expose internal cost breakdown to customers unless explicitly allowed.',
      'Do not hallucinate uploaded assets, payment status, or project state.'
    ],
    selfEvaluationQuestions: [
      'Do I have enough project context?',
      `Do I need one of my allowed skills: ${skills}?`,
      'Will this skill change the output quality enough to justify using it?',
      'Is the operation paid or preview-only?',
      'What should I hand off to the next agent?'
    ],
    expectedArtifacts: expectedArtifactsForAgent(a.id)
  };
}

function expectedArtifactsForAgent(agentId='') {
  if (/storyboard|scene|frame|film/.test(agentId)) return ['film_concept','scene_plan','storyboard','higgsfield_payload_draft'];
  if (/campaign|ugc|hook|script|caption|marketing|trend|viral|failure|audience/.test(agentId)) return ['business_understanding','campaign_map','ugc_jobs','hooks','scripts'];
  if (/documentary|topic|beat|narration/.test(agentId)) return ['topic_options','research_notes','script','visual_beats','narration_plan'];
  if (/avatar|identity/.test(agentId)) return ['avatar_input_report','identity_lock_plan','avatar_usage_plan'];
  if (/cost|credit|approval|dispatcher|task/.test(agentId)) return ['cost_estimate','task_graph','approval_gate_result'];
  if (/qa|delivery|summary/.test(agentId)) return ['qa_report','delivery_package','client_summary'];
  return ['structured_agent_output'];
}

function allPromptPacks() {
  return OPS_AGENT_REGISTRY.map(buildAgentPromptPack);
}

function normalizeSearchText(...parts) {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function opsRecommendSkills({ agentId = '', workflowType = '', task = '', operationType = '', limit = 8 } = {}) {
  const agent = opsAgent(agentId);
  const agentSkillIds = new Set(agent?.skills || []);
  const text = normalizeSearchText(agentId, workflowType, operationType, task);
  const scores = [];
  for (const skill of OPS_SKILL_REGISTRY) {
    let score = 0;
    const reasons = [];
    if (agentSkillIds.has(skill.id)) { score += 70; reasons.push('allowed_by_agent'); }
    const skText = normalizeSearchText(skill.id, skill.description, skill.costBucket);
    for (const [kw, hinted] of Object.entries(OPS_KEYWORD_SKILL_HINTS)) {
      if (text.includes(kw) && (hinted.includes(skill.id) || skText.includes(kw))) {
        score += 15;
        reasons.push(`task_keyword:${kw}`);
      }
    }
    if (workflowType && skText.includes(workflowType.replace('_',' '))) { score += 8; reasons.push('workflow_text_match'); }
    if (agent && skill.costBucket === 'system') { score += 2; reasons.push('safe_system_skill'); }
    if (score > 0) scores.push({ ...skill, score, reasons });
  }
  return scores.sort((a,b) => b.score - a.score).slice(0, Number(limit || 8));
}

function opsEvaluateAgentSkillNeed({ agentId, workflowType = '', task = '', operationInput = {} } = {}) {
  const agent = opsAgent(agentId);
  if (!agent) return { agentId, exists: false, needsSkill: false, confidence: 0, selectedSkills: [], reason: 'Agent not found' };
  const selectedSkills = opsRecommendSkills({ agentId, workflowType, task, operationType: operationInput.operationType, limit: 6 });
  const hasPaidOrApiSkill = selectedSkills.some((s) => s.costBucket === 'api');
  const hasSystemSkill = selectedSkills.some((s) => s.costBucket === 'system');
  const needsSkill = selectedSkills.length > 0 && (agent.modelLane !== 'deterministic' || hasSystemSkill || hasPaidOrApiSkill);
  const confidence = Math.min(0.95, 0.45 + (selectedSkills[0]?.score || 0) / 120);
  return {
    agentId: agent.id,
    agentName: agent.name,
    workflowType,
    needsSkill,
    confidence: Number(confidence.toFixed(2)),
    selectedSkills: selectedSkills.map((s) => ({ id: s.id, costBucket: s.costBucket, score: s.score, reasons: s.reasons })),
    reason: needsSkill ? 'Useful skills are available and allowed for this agent.' : 'No additional skill is needed for this step.',
    paidExecutionBlocked: hasPaidOrApiSkill,
    rule: 'This is a dry-run evaluation only. No provider API is called here.'
  };
}

function buildStepInstruction(agent, plan, stepIndex) {
  const promptPack = buildAgentPromptPack(agent);
  const task = `${plan.workflowType} step ${stepIndex + 1}: ${agent.role || agent.id}`;
  const skillEvaluation = opsEvaluateAgentSkillNeed({ agentId: agent.id, workflowType: plan.workflowType, task, operationInput: plan.input });
  return {
    promptId: promptPack.id,
    promptVersion: promptPack.version,
    role: agent.role,
    inputContract: promptPack.inputContract,
    outputContract: promptPack.outputContract,
    allowedSkills: promptPack.allowedSkills,
    expectedArtifacts: promptPack.expectedArtifacts,
    skillEvaluation,
    guardrails: promptPack.guardrails
  };
}

function buildDryRunAgentOutput(agentId, plan, stepNumber) {
  const agent = opsAgent(agentId) || { id: agentId, name: agentId, module: 'unknown', modelLane: 'deterministic' };
  const skillEvaluation = opsEvaluateAgentSkillNeed({ agentId, workflowType: plan.workflowType, task: `${plan.workflowType} dry run`, operationInput: plan.input });
  return {
    status: 'completed_dry_run',
    agentId,
    agentName: agent.name,
    module: agent.module,
    modelLane: agent.modelLane,
    stepNumber,
    summary: `${agent.name || agentId} completed a dry-run planning step. No paid API was called.`,
    confidence: skillEvaluation.confidence || 0.7,
    selectedSkills: skillEvaluation.selectedSkills,
    artifact: {
      type: expectedArtifactsForAgent(agentId)[0],
      title: `${agent.name || agentId} output draft`,
      data: {
        workflowType: plan.workflowType,
        planId: plan.id,
        note: 'Dry-run artifact placeholder. Real provider/model output plugs in here later.'
      }
    },
    nextAction: 'continue_to_next_agent'
  };
}

function opsRunActualCreditsDraft(run, plan) {
  const low = Number(plan?.estimate?.estimatedLowCredits || 0);
  const high = Number(plan?.estimate?.estimatedHighCredits || plan?.estimate?.requiredCredits || 0);
  if (!low && !high) return 0;
  // For dry-run/manual completion, assume actual cost starts at the low estimate.
  // Real provider usage will replace this when API execution is enabled.
  return Math.max(1, low || Math.ceil(high * 0.85));
}
// --- END STEP 23: OPERATIONAL MINDS CONTROL LAYER ---

// --- END STEP 22 ---

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




  if (method === 'GET' && pathname === '/api/ops/catalog') {
    json(res, 200, {
      modelLanes: ['director','router','long_context','creative','multimodal','deterministic','higgsfield_execution'],
      agents: OPS_AGENT_REGISTRY,
      skills: OPS_SKILL_REGISTRY,
      workflows: OPS_WORKFLOW_TEMPLATES
    });
    return true;
  }

  if (method === 'GET' && pathname === '/api/ops/agents') {
    json(res, 200, { agents: OPS_AGENT_REGISTRY });
    return true;
  }

  if (method === 'GET' && pathname === '/api/ops/skills') {
    json(res, 200, { skills: OPS_SKILL_REGISTRY });
    return true;
  }


  if (method === 'GET' && pathname === '/api/ops/prompts') {
    json(res, 200, { version: OPS_PROMPT_PACK_VERSION, prompts: allPromptPacks() });
    return true;
  }

  params = routeMatch(pathname, '/api/ops/prompts/:id');
  if (params && method === 'GET') {
    const agent = opsAgent(params.id);
    if (!agent) return notFound(res);
    json(res, 200, { prompt: buildAgentPromptPack(agent) });
    return true;
  }

  if (method === 'POST' && pathname === '/api/ops/skills/recommend') {
    const body = await readBody(req);
    const skills = opsRecommendSkills({ agentId: body.agentId, workflowType: body.workflowType, task: body.task, operationType: body.operationType, limit: body.limit || 8 });
    json(res, 200, { skills });
    return true;
  }

  params = routeMatch(pathname, '/api/ops/agents/:id/evaluate');
  if (params && method === 'POST') {
    const body = await readBody(req);
    const evaluation = opsEvaluateAgentSkillNeed({ agentId: params.id, workflowType: body.workflowType, task: body.task, operationInput: body.operationInput || body });
    json(res, 200, { evaluation });
    return true;
  }

  params = routeMatch(pathname, '/api/projects/:id/ops/plan');
  if (params && method === 'POST') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const body = await readBody(req);
    const project = ctx.db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(ctx.user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const input = opsDefaultInput(project, body);
    const estimate = estimateOperationCredits(input);
    ctx.db.opsPlans ||= [];
    const plan = buildOpsPlan({ project, body: input, userId: ctx.user.id, estimate });
    ctx.db.opsPlans.push(plan);
    pushActivity(ctx.db, { userId: ctx.user.id, sessionId: ctx.session?.id, action: 'ops.plan_created', entityType: 'project', entityId: project.id, summary: `Operational plan created: ${plan.workflowType}`, metadata: { planId: plan.id, requiredCredits: estimate.requiredCredits, agents: plan.agents.length }, req });
    await saveDb(ctx.db);
    json(res, 201, { plan });
    return true;
  }

  params = routeMatch(pathname, '/api/projects/:id/ops/plans');
  if (params && method === 'GET') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const project = ctx.db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(ctx.user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const plans = (ctx.db.opsPlans || []).filter((p) => p.projectId === project.id).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    json(res, 200, { plans });
    return true;
  }

  params = routeMatch(pathname, '/api/projects/:id/ops/reserve-start');
  if (params && method === 'POST') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const body = await readBody(req);
    const project = ctx.db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(ctx.user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    let plan = null;
    if (body.planId) plan = (ctx.db.opsPlans || []).find((p) => p.id === body.planId && p.projectId === project.id);
    if (!plan) {
      const input = opsDefaultInput(project, body);
      const estimate = estimateOperationCredits(input);
      ctx.db.opsPlans ||= [];
      plan = buildOpsPlan({ project, body: input, userId: ctx.user.id, estimate });
      ctx.db.opsPlans.push(plan);
    }
    try {
      const reserved = reserveOperationCredits(ctx.db, { userId: ctx.user.id, projectId: project.id, estimate: plan.estimate, input: { operationType: plan.workflowType, planId: plan.id }, req, sessionId: ctx.session?.id });
      plan.status = 'reserved';
      plan.reservationId = reserved.reservation.id;
      plan.updatedAt = now();
      ctx.db.opsRuns ||= [];
      const run = opsRunFromPlan(plan, reserved.reservation);
      ctx.db.opsRuns.push(run);
      pushActivity(ctx.db, { userId: ctx.user.id, sessionId: ctx.session?.id, action: 'ops.run_reserved', entityType: 'project', entityId: project.id, summary: `Operational run reserved: ${run.workflowType}`, metadata: { planId: plan.id, runId: run.id, reservationId: reserved.reservation.id, requiredCredits: plan.estimate.requiredCredits }, req });
      await saveDb(ctx.db);
      json(res, 201, { plan, run, reservation: reserved.reservation, wallet: publicWallet(reserved.wallet) });
    } catch (e) {
      if (e.code === 'insufficient_credits') return json(res, 402, { error: 'insufficient_credits', message: e.message, requiredCredits: e.requiredCredits, availableCredits: e.availableCredits, plan });
      throw e;
    }
    return true;
  }

  params = routeMatch(pathname, '/api/projects/:id/ops/runs');
  if (params && method === 'GET') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const project = ctx.db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(ctx.user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const runs = (ctx.db.opsRuns || []).filter((r) => r.projectId === project.id).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    json(res, 200, { runs });
    return true;
  }


  params = routeMatch(pathname, '/api/ops/runs/:id');
  if (params && method === 'GET') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const run = (ctx.db.opsRuns || []).find((r) => r.id === params.id);
    if (!run) return notFound(res);
    const project = ctx.db.projects.find((p) => p.id === run.projectId);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(ctx.user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const plan = (ctx.db.opsPlans || []).find((p) => p.id === run.planId) || null;
    json(res, 200, { run, plan });
    return true;
  }

  params = routeMatch(pathname, '/api/ops/runs/:id/step');
  if (params && method === 'POST') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const run = (ctx.db.opsRuns || []).find((r) => r.id === params.id);
    if (!run) return notFound(res);
    const project = ctx.db.projects.find((p) => p.id === run.projectId);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(ctx.user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const plan = (ctx.db.opsPlans || []).find((p) => p.id === run.planId);
    if (!plan) return fail(res, 404, 'plan_not_found', 'Ops plan not found for this run');
    const nextStep = (run.steps || []).find((s) => s.status === 'pending' || s.status === 'running');
    if (!nextStep) return fail(res, 400, 'run_already_complete', 'No pending step left');
    nextStep.status = 'completed';
    nextStep.startedAt ||= now();
    nextStep.completedAt = now();
    nextStep.output = buildDryRunAgentOutput(nextStep.agentId, plan, nextStep.step || ((run.currentStep || 0) + 1));
    run.currentStep = Math.max(Number(run.currentStep || 0), Number(nextStep.step || 0));
    run.status = (run.steps || []).every((s) => s.status === 'completed') ? 'dry_run_complete_ready_for_actual_cost' : 'running_dry_run';
    run.artifacts ||= [];
    if (nextStep.output?.artifact) run.artifacts.push({ id: id('artifact'), agentId: nextStep.agentId, ...nextStep.output.artifact, createdAt: now() });
    run.timeline ||= [];
    run.timeline.push({ at: now(), type: 'agent_step_completed', agentId: nextStep.agentId, step: nextStep.step, message: 'Dry-run agent step completed without paid API calls.' });
    run.updatedAt = now();
    pushActivity(ctx.db, { userId: ctx.user.id, sessionId: ctx.session?.id, action: 'ops.step_completed', entityType: 'project', entityId: project.id, summary: `Ops agent step completed: ${nextStep.agentId}`, metadata: { runId: run.id, step: nextStep.step, dryRun: true }, req });
    await saveDb(ctx.db);
    json(res, 200, { run, step: nextStep });
    return true;
  }

  params = routeMatch(pathname, '/api/ops/runs/:id/complete-dry-run');
  if (params && method === 'POST') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const run = (ctx.db.opsRuns || []).find((r) => r.id === params.id);
    if (!run) return notFound(res);
    const project = ctx.db.projects.find((p) => p.id === run.projectId);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(ctx.user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const plan = (ctx.db.opsPlans || []).find((p) => p.id === run.planId);
    if (!plan) return fail(res, 404, 'plan_not_found', 'Ops plan not found for this run');
    const actualCreditsDraft = opsRunActualCreditsDraft(run, plan);
    run.status = 'dry_run_complete_ready_for_finalize';
    run.actualCreditsDraft = actualCreditsDraft;
    run.timeline ||= [];
    run.timeline.push({ at: now(), type: 'dry_run_completed', message: `Dry-run completed. Suggested actual credits: ${actualCreditsDraft}.` });
    run.updatedAt = now();
    await saveDb(ctx.db);
    json(res, 200, { run, actualCreditsDraft, reservationId: run.reservationId, nextAction: 'admin_finalize_reservation_with_actualCreditsDraft' });
    return true;
  }

  params = routeMatch(pathname, '/api/ops/runs/:id/status');
  if (params && method === 'PATCH') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const body = await readBody(req);
    const run = (ctx.db.opsRuns || []).find((r) => r.id === params.id);
    if (!run) return notFound(res);
    const project = ctx.db.projects.find((p) => p.id === run.projectId);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(ctx.user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const status = String(body.status || '').trim();
    const allowed = new Set(['reserved_waiting_manual_execution','running','qa','delivered','failed','cancelled']);
    if (!allowed.has(status)) return fail(res, 400, 'bad_status', 'Invalid ops run status');
    run.status = status;
    run.updatedAt = now();
    await saveDb(ctx.db);
    json(res, 200, { run });
    return true;
  }

  if (method === 'GET' && pathname === '/api/billing/plans') {
    json(res, 200, {
      creditsPerUsd: CREDITS_PER_USD,
      minTopupUsd: MIN_TOPUP_USD,
      plans: topupPlans(),
      note: '1 USD = 10 credits. Credits are the only customer-facing currency inside the platform.'
    });
    return true;
  }

  if (method === 'POST' && pathname === '/api/pricing/estimate') {
    const body = await readBody(req);
    json(res, 200, { estimate: estimateOperationCredits(body) });
    return true;
  }

  if (method === 'POST' && pathname === '/api/operations/estimate') {
    const body = await readBody(req);
    const estimate = estimateOperationCredits(body);
    json(res, 200, { estimate });
    return true;
  }

  params = routeMatch(pathname, '/api/projects/:id/operations/estimate');
  if (params && method === 'POST') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const body = await readBody(req);
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const estimate = estimateOperationCredits({
      serviceType: body.serviceType || project.serviceType,
      operationType: body.operationType || body.operation || project.serviceType,
      durationSeconds: body.durationSeconds || project.durationSeconds,
      quality: body.quality || project.style || 'standard',
      videoCount: body.videoCount || 1,
      imageCount: body.imageCount || 0,
      voiceMinutes: body.voiceMinutes || 0,
      agentLevel: body.agentLevel || 'normal',
      researchLevel: body.researchLevel || 'none'
    });
    json(res, 200, { estimate, wallet: publicWallet(getWallet(db, project.userId)) });
    return true;
  }

  params = routeMatch(pathname, '/api/projects/:id/operations/reserve');
  if (params && method === 'POST') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const body = await readBody(req);
    const project = ctx.db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(ctx.user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const estimate = estimateOperationCredits({
      serviceType: body.serviceType || project.serviceType,
      operationType: body.operationType || body.operation || project.serviceType,
      durationSeconds: body.durationSeconds || project.durationSeconds,
      quality: body.quality || project.style || 'standard',
      videoCount: body.videoCount || 1,
      imageCount: body.imageCount || 0,
      voiceMinutes: body.voiceMinutes || 0,
      agentLevel: body.agentLevel || 'normal',
      researchLevel: body.researchLevel || 'none'
    });
    let result;
    try {
      result = reserveOperationCredits(ctx.db, { userId: project.userId, projectId: project.id, estimate, input: body, req, sessionId: ctx.session?.id });
    } catch (error) {
      if (error.code === 'insufficient_credits') {
        return fail(res, 402, 'insufficient_credits', `You need at least ${error.requiredCredits} available credits. Available: ${error.availableCredits}`);
      }
      return fail(res, 400, 'reservation_failed', error.message || 'Could not reserve credits');
    }
    project.updatedAt = now();
    await saveDb(ctx.db);
    json(res, 200, { reservation: result.reservation, estimate, wallet: publicWallet(result.wallet) });
    return true;
  }

  params = routeMatch(pathname, '/api/projects/:id/operations');
  if (params && method === 'GET') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const reservations = (db.creditReservations || []).filter((r) => r.projectId === project.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    json(res, 200, { reservations });
    return true;
  }

  params = routeMatch(pathname, '/api/operations/:id/finalize');
  if (params && method === 'POST') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    if (ctx.user.role !== 'admin') return fail(res, 403, 'forbidden', 'Admin only until internal executors are enabled');
    const body = await readBody(req);
    let result;
    try {
      result = finalizeOperationReservation(ctx.db, { reservationId: params.id, actualCredits: body.actualCredits, actualUsd: body.actualUsd, req, sessionId: ctx.session?.id });
    } catch (error) {
      return fail(res, error.code === 'reservation_not_found' ? 404 : 400, error.code || 'finalize_failed', error.message || 'Could not finalize reservation');
    }
    await saveDb(ctx.db);
    json(res, 200, { reservation: result.reservation, wallet: publicWallet(result.wallet), entry: result.entry });
    return true;
  }

  params = routeMatch(pathname, '/api/operations/:id/refund');
  if (params && method === 'POST') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    if (ctx.user.role !== 'admin') return fail(res, 403, 'forbidden', 'Admin only until internal executors are enabled');
    const body = await readBody(req);
    let result;
    try {
      result = refundOperationReservation(ctx.db, { reservationId: params.id, reason: body.reason || 'Operation cancelled or failed', req, sessionId: ctx.session?.id });
    } catch (error) {
      return fail(res, error.code === 'reservation_not_found' ? 404 : 400, error.code || 'refund_failed', error.message || 'Could not refund reservation');
    }
    await saveDb(ctx.db);
    json(res, 200, { reservation: result.reservation, wallet: publicWallet(result.wallet), entry: result.entry });
    return true;
  }

  if (method === 'POST' && pathname === '/api/billing/paypal/create-order') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const body = await readBody(req);

    let plan = null;
    const planKey = String(body.planKey || '').trim();
    if (planKey) plan = findTopupPlan(planKey);

    // Flexible top-up: the customer may choose any amount >= MIN_TOPUP_USD.
    // The frontend is not trusted. The server validates the amount and calculates credits here.
    if (!plan && body.amountUsd != null) {
      const rawAmount = Number(body.amountUsd);
      const amountUsd = money(rawAmount);
      const maxTopupUsd = Number(process.env.MAX_TOPUP_USD || 5000);
      if (!Number.isFinite(amountUsd) || amountUsd < MIN_TOPUP_USD) {
        return fail(res, 400, 'topup_minimum_required', `Minimum top-up is $${MIN_TOPUP_USD}`);
      }
      if (amountUsd > maxTopupUsd) {
        return fail(res, 400, 'topup_maximum_exceeded', `Maximum top-up is $${maxTopupUsd}`);
      }
      plan = {
        key: `flex_${String(amountUsd).replace(/\./g, '_')}`,
        amountUsd,
        credits: creditsForUsd(amountUsd),
        label: `$${amountUsd} = ${creditsForUsd(amountUsd)} credits`,
        flexible: true
      };
    }

    if (!plan) return fail(res, 400, 'bad_topup_plan', 'Choose a valid credit top-up plan or send a valid amountUsd');

    let paypalOrder;
    try {
      paypalOrder = await createPayPalOrder({ amountUsd: plan.amountUsd, customId: `${ctx.user.id}:${plan.key}:${Date.now()}` });
    } catch (error) {
      return fail(res, 502, 'paypal_create_failed', error.message || 'PayPal create order failed');
    }
    const approvalUrl = (paypalOrder.links || []).find((l) => l.rel === 'approve')?.href || '';
    const payment = {
      id: id('payment'),
      userId: ctx.user.id,
      projectId: null,
      type: 'wallet_topup',
      provider: 'paypal',
      providerOrderId: paypalOrder.id,
      planKey: plan.key,
      amountUsd: plan.amountUsd,
      credits: plan.credits,
      flexible: Boolean(plan.flexible),
      status: 'pending',
      approvalUrl,
      createdAt: now(),
      updatedAt: now()
    };
    ctx.db.payments.push(payment);
    pushActivity(ctx.db, { userId: ctx.user.id, sessionId: ctx.session?.id, action: 'billing.paypal_order_created', entityType: 'payment', entityId: payment.id, summary: `PayPal top-up created: ${plan.credits} credits`, metadata: { amountUsd: plan.amountUsd, credits: plan.credits, paypalOrderId: paypalOrder.id, flexible: Boolean(plan.flexible) }, req });
    await saveDb(ctx.db);
    json(res, 200, { payment, paypalOrderId: paypalOrder.id, approvalUrl });
    return true;
  }

  if (method === 'POST' && pathname === '/api/billing/paypal/capture-order') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const body = await readBody(req);
    const paypalOrderId = String(body.paypalOrderId || body.orderID || body.orderId || '').trim();
    if (!paypalOrderId) return fail(res, 400, 'paypal_order_required', 'PayPal order ID is required');
    const payment = (ctx.db.payments || []).find((p) => p.provider === 'paypal' && p.providerOrderId === paypalOrderId && p.userId === ctx.user.id);
    if (!payment) return fail(res, 404, 'payment_not_found', 'Payment record not found');
    if (payment.status === 'paid') {
      json(res, 200, { payment, wallet: publicWallet(getWallet(ctx.db, ctx.user.id)), alreadyCaptured: true });
      return true;
    }
    let captureData;
    try {
      captureData = await capturePayPalOrder(paypalOrderId);
    } catch (error) {
      return fail(res, 502, 'paypal_capture_failed', error.message || 'PayPal capture failed');
    }
    const captured = extractCapturedUsd(captureData);
    if (captured.status !== 'COMPLETED') return fail(res, 402, 'paypal_not_completed', `PayPal status is ${captured.status || 'unknown'}`);
    if (captured.amountUsd + 0.001 < Number(payment.amountUsd || 0)) return fail(res, 402, 'paypal_amount_mismatch', 'PayPal captured amount is lower than expected');
    payment.status = 'paid';
    payment.providerCaptureId = captured.captureId;
    payment.rawCapture = captureData;
    payment.updatedAt = now();
    if (!payment.creditsAwarded) {
      addCreditLedger(ctx.db, {
        userId: ctx.user.id,
        paymentId: payment.id,
        type: 'purchase',
        deltaCredits: Number(payment.credits || 0),
        reason: `Wallet top-up ${payment.planKey}`,
        metadata: { amountUsd: payment.amountUsd, provider: 'paypal', paypalOrderId, captureId: captured.captureId },
        req,
        sessionId: ctx.session?.id
      });
      payment.creditsAwarded = true;
    }
    pushActivity(ctx.db, { userId: ctx.user.id, sessionId: ctx.session?.id, action: 'billing.paypal_captured', entityType: 'payment', entityId: payment.id, summary: `Wallet topped up: ${payment.credits} credits`, metadata: { amountUsd: payment.amountUsd, credits: payment.credits }, req });
    await saveDb(ctx.db);
    json(res, 200, { payment, wallet: publicWallet(getWallet(ctx.db, ctx.user.id)) });
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
    const user = { id: id('user'), name, email, passwordSalt: salt, passwordHash: hash, googleSub: null, loginMethod: 'password', role, sessionVersion: 0, twoFactorEnabled: false, twoFactorSecret: null, twoFactorMethod: 'email', createdAt: now(), updatedAt: now() };
    db.users.push(user);
    getWallet(db, user.id);
    pushActivity(db, { userId: user.id, action: 'auth.registered', entityType: 'user', entityId: user.id, summary: 'Account created with email/password', req });
    await saveDb(db);
    const session = createSession(db, user, req, 'password_register');
    pushActivity(db, { userId: user.id, sessionId: session.id, action: 'auth.session_started', entityType: 'session', entityId: session.id, summary: 'New password registration session', req });
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
      const challenge = makeTwoFactorChallenge(user);
      const emailCode = await createEmailCodeChallenge(db, user, 'login');
      await saveDb(db);
      json(res, 200, { requires2fa: true, method: 'email', challenge, userPreview: { email: user.email, name: user.name }, devCode: emailCode.devCode });
      return true;
    }
    const session = createSession(db, user, req, 'password_login');
    pushActivity(db, { userId: user.id, sessionId: session.id, action: 'auth.login', entityType: 'session', entityId: session.id, summary: 'User logged in with password', req });
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
      const challenge = makeTwoFactorChallenge(user);
      const emailCode = await createEmailCodeChallenge(db, user, 'login');
      await saveDb(db);
      json(res, 200, { requires2fa: true, method: 'email', challenge, userPreview: { email: user.email, name: user.name }, devCode: emailCode.devCode });
      return true;
    }
    const session = createSession(db, user, req, 'google_login');
    pushActivity(db, { userId: user.id, sessionId: session.id, action: 'auth.login', entityType: 'session', entityId: session.id, summary: 'User logged in with Google', req });
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
    const user = { id: id('user'), name, email: String(payload.email).toLowerCase(), googleSub: payload.googleSub, loginMethod: 'google', passwordSalt: null, passwordHash: null, role, sessionVersion: 0, twoFactorEnabled: false, twoFactorSecret: null, twoFactorMethod: 'email', createdAt: now(), updatedAt: now() };
    db.users.push(user);
    await saveDb(db);
    const session = createSession(db, user, req, 'google_register');
    pushActivity(db, { userId: user.id, sessionId: session.id, action: 'auth.session_started', entityType: 'session', entityId: session.id, summary: 'New Google registration session', req });
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
    if (!user.twoFactorEnabled) return fail(res, 401, 'bad_2fa_code', '2FA is not enabled');
    const verified = verifyEmailSecurityCode(db, user, 'login', body.code);
    if (!verified.ok) return fail(res, 401, 'bad_2fa_code', 'Invalid or expired email code');
    const session = createSession(db, user, req, '2fa_email_login');
    pushActivity(db, { userId: user.id, sessionId: session.id, action: 'auth.login_2fa', entityType: 'session', entityId: session.id, summary: 'User completed email 2FA login', req });
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

  if (method === 'PATCH' && pathname === '/api/auth/profile') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const body = await readBody(req);
    const name = String(body.name || '').trim();
    if (!name || name.length < 2) return fail(res, 400, 'name_required', 'Name must be at least 2 characters');
    if (name.length > 60) return fail(res, 400, 'name_too_long', 'Name is too long');
    const db = await loadDb();
    const target = db.users.find((u) => u.id === user.id);
    if (!target) return fail(res, 404, 'user_not_found', 'User not found');
    target.name = name;
    target.updatedAt = now();
    await saveDb(db);
    json(res, 200, { ok: true, user: publicUser(target) });
    return true;
  }


  if (method === 'GET' && pathname === '/api/me/wallet') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const wallet = getWallet(ctx.db, ctx.user.id);
    await saveDb(ctx.db);
    json(res, 200, { wallet: publicWallet(wallet) });
    return true;
  }

  if (method === 'GET' && pathname === '/api/me/activity') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50)));
    const activities = (ctx.db.activityLog || [])
      .filter((e) => e.userId === ctx.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
    json(res, 200, { activities });
    return true;
  }

  if (method === 'GET' && pathname === '/api/me/credits/ledger') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 50)));
    const ledger = (ctx.db.creditLedger || [])
      .filter((e) => e.userId === ctx.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
    json(res, 200, { wallet: publicWallet(getWallet(ctx.db, ctx.user.id)), ledger });
    return true;
  }

  if (method === 'GET' && pathname === '/api/me/subscriptions') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const subscriptions = (ctx.db.subscriptions || [])
      .filter((s) => s.userId === ctx.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    json(res, 200, { subscriptions });
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
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const target = ctx.db.users.find((u) => u.id === ctx.user.id);
    if (!target) return fail(res, 404, 'not_found', 'User not found');
    try {
      const emailCode = await createEmailCodeChallenge(ctx.db, target, 'enable_2fa');
      await saveDb(ctx.db);
      json(res, 200, { method: 'email', email: target.email, expiresInSeconds: 600, message: 'Security code sent to your email', devCode: emailCode.devCode });
    } catch (e) {
      return fail(res, 500, 'email_failed', e.message || 'Failed to send email code');
    }
    return true;
  }

  if (method === 'POST' && pathname === '/api/security/2fa/enable') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const body = await readBody(req);
    const target = ctx.db.users.find((u) => u.id === ctx.user.id);
    if (!target) return fail(res, 404, 'not_found', 'User not found');
    const verified = verifyEmailSecurityCode(ctx.db, target, 'enable_2fa', body.code);
    if (!verified.ok) return fail(res, 401, 'bad_2fa_code', 'Invalid or expired email code');
    target.twoFactorEnabled = true;
    target.twoFactorMethod = 'email';
    target.twoFactorSecret = null;
    target.updatedAt = now();
    await saveDb(ctx.db);
    json(res, 200, { user: publicUser(target) });
    return true;
  }

  if (method === 'POST' && pathname === '/api/security/2fa/disable/request') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const target = ctx.db.users.find((u) => u.id === ctx.user.id);
    if (!target) return fail(res, 404, 'not_found', 'User not found');
    if (!target.twoFactorEnabled) return fail(res, 400, 'not_enabled', '2FA is not enabled');
    try {
      const emailCode = await createEmailCodeChallenge(ctx.db, target, 'disable_2fa');
      await saveDb(ctx.db);
      json(res, 200, { method: 'email', email: target.email, expiresInSeconds: 600, message: 'Disable code sent to your email', devCode: emailCode.devCode });
    } catch (e) {
      return fail(res, 500, 'email_failed', e.message || 'Failed to send email code');
    }
    return true;
  }

  if (method === 'POST' && pathname === '/api/security/2fa/disable') {
    const ctx = await requireUserWithDb(req, res);
    if (!ctx) return true;
    const body = await readBody(req);
    const target = ctx.db.users.find((u) => u.id === ctx.user.id);
    if (!target) return fail(res, 404, 'not_found', 'User not found');
    if (target.passwordHash && !checkPassword(String(body.password || ''), target.passwordSalt, target.passwordHash)) return fail(res, 401, 'bad_password', 'Password is incorrect');
    const verified = verifyEmailSecurityCode(ctx.db, target, 'disable_2fa', body.code);
    if (!verified.ok) return fail(res, 401, 'bad_2fa_code', 'Invalid or expired email code');
    target.twoFactorEnabled = false;
    target.twoFactorMethod = 'email';
    target.twoFactorSecret = null;
    target.updatedAt = now();
    await saveDb(ctx.db);
    json(res, 200, { user: publicUser(target) });
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
    pushActivity(db, { userId: user.id, sessionId: null, action: 'project.created', entityType: 'project', entityId: project.id, summary: `Created project: ${project.title}`, metadata: { project: projectSummary(project) }, req });
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
    pushActivity(db, { userId: user.id, action: 'project.opened', entityType: 'project', entityId: project.id, summary: `Opened project: ${project.title}`, metadata: { project: projectSummary(project) }, req });
    await saveDb(db);
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
    const beforeProject = { ...project };
    const changedFields = [];
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
    ['title','brief','serviceType','packageKey','priceUsd','style','durationSeconds','paymentStatus','status'].forEach((field) => {
      if (JSON.stringify(beforeProject[field]) !== JSON.stringify(project[field])) changedFields.push(field);
    });
    project.updatedAt = now();
    pushActivity(db, { userId: user.id, action: 'project.updated', entityType: 'project', entityId: project.id, summary: `Updated project: ${project.title}`, metadata: { changedFields, before: projectSummary(beforeProject), after: projectSummary(project) }, req });
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
    pushActivity(db, { userId: user.id, action: 'project.deleted', entityType: 'project', entityId: project.id, summary: `Deleted project: ${project.title}`, metadata: { project: projectSummary(project) }, req });
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
    pushActivity(db, { userId: user.id, action: 'payment.checkout_created', entityType: 'payment', entityId: payment.id, summary: `Checkout created for ${project.title}`, metadata: { project: projectSummary(project), paymentId: payment.id, amountUsd: payment.amountUsd }, req });
    await saveDb(db);
    json(res, 200, { project, payment, paymentInstructions: PAYMENT_INSTRUCTIONS });
    return true;
  }


  params = routeMatch(pathname, '/api/projects/:id/credits/estimate');
  if (params && method === 'POST') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const body = await readBody(req);
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const estimate = estimateOperationCredits({
      serviceType: body.serviceType || project.serviceType,
      operationType: body.operationType || body.operation || project.serviceType,
      durationSeconds: body.durationSeconds || project.durationSeconds,
      quality: body.quality || project.style || 'standard',
      videoCount: body.videoCount || 1,
      imageCount: body.imageCount || 0,
      voiceMinutes: body.voiceMinutes || 0,
      agentLevel: body.agentLevel || 'normal',
      researchLevel: body.researchLevel || 'none'
    });
    json(res, 200, { estimate, wallet: publicWallet(getWallet(db, project.userId)) });
    return true;
  }

  params = routeMatch(pathname, '/api/projects/:id/credits/consume');
  if (params && method === 'POST') {
    const user = await requireUser(req, res);
    if (!user) return true;
    const body = await readBody(req);
    const db = await loadDb();
    const project = db.projects.find((p) => p.id === params.id);
    if (!project) return notFound(res);
    if (!assertProjectOwnerOrAdmin(user, project)) return fail(res, 403, 'forbidden', 'Not your project');
    const explicitCredits = requirePositiveCredits(body.credits || body.amountCredits);
    const estimate = estimateOperationCredits({
      serviceType: body.serviceType || project.serviceType,
      operationType: body.operationType || body.operation || project.serviceType,
      durationSeconds: body.durationSeconds || project.durationSeconds,
      quality: body.quality || project.style || 'standard',
      videoCount: body.videoCount || 1,
      imageCount: body.imageCount || 0,
      voiceMinutes: body.voiceMinutes || 0,
      agentLevel: body.agentLevel || 'normal',
      researchLevel: body.researchLevel || 'none'
    });
    const credits = user.role === 'admin' && explicitCredits ? explicitCredits : estimate.credits;
    if (!credits) return fail(res, 400, 'bad_credits', 'Could not estimate operation credits');
    const wallet = getWallet(db, project.userId);
    if (Math.max(0, Number(wallet.balanceCredits || 0) - Number(wallet.reservedCredits || 0)) < credits) return fail(res, 402, 'insufficient_credits', 'Not enough available credits');
    const { entry } = addCreditLedger(db, {
      userId: project.userId,
      projectId: project.id,
      type: 'generation_used',
      deltaCredits: -credits,
      reason: String(body.reason || 'Project generation usage'),
      metadata: { provider: body.provider || '', operation: body.operation || '', projectTitle: project.title, estimate: estimate || null },
      req
    });
    project.updatedAt = now();
    await saveDb(db);
    json(res, 200, { wallet: publicWallet(getWallet(db, project.userId)), entry });
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
    pushActivity(db, { userId: user.id, action: 'file.uploaded', entityType: 'file', entityId: file.id, summary: `Uploaded file: ${file.fileName}`, metadata: { projectId: project.id, kind, mimeType, storageKey }, req });
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
    pushActivity(db, { userId: user.id, action: 'file.downloaded', entityType: file.id?.startsWith('deliverable_') ? 'deliverable' : 'file', entityId: file.id, summary: `Downloaded file: ${file.fileName || file.title || file.id}`, metadata: { projectId: project.id }, req });
    await saveDb(db);
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


  if (method === 'GET' && pathname === '/api/admin/activity') {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const db = await loadDb();
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 100)));
    const activities = (db.activityLog || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
    json(res, 200, { activities });
    return true;
  }

  if (method === 'GET' && pathname === '/api/admin/credits') {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const db = await loadDb();
    json(res, 200, { wallets: (db.wallets || []).map(publicWallet), ledger: (db.creditLedger || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 500) });
    return true;
  }

  params = routeMatch(pathname, '/api/admin/users/:id/credits/adjust');
  if (params && method === 'POST') {
    const admin = await requireAdmin(req, res);
    if (!admin) return true;
    const body = await readBody(req);
    const db = await loadDb();
    const target = db.users.find((u) => u.id === params.id);
    if (!target) return notFound(res);
    const credits = Number(body.credits || body.deltaCredits || 0);
    if (!Number.isFinite(credits) || credits === 0) return fail(res, 400, 'bad_credits', 'Non-zero credits amount required');
    const { wallet, entry } = addCreditLedger(db, {
      userId: target.id,
      type: 'admin_adjustment',
      deltaCredits: Math.round(credits),
      reason: String(body.reason || 'Admin credit adjustment'),
      metadata: { adjustedByAdmin: admin.id },
      req
    });
    await saveDb(db);
    json(res, 200, { wallet: publicWallet(wallet), entry });
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
    const previousStatus = project.status;
    project.status = status;
    project.updatedAt = now();
    pushActivity(db, { userId: project.userId, action: 'project.status_changed', entityType: 'project', entityId: project.id, summary: `Project status changed: ${previousStatus} → ${status}`, metadata: { previousStatus, status, changedByAdmin: admin.id }, req });
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
    const paidPayment = {
      id: id('payment'), projectId: project.id, userId: project.userId, provider: 'manual_admin', amountUsd: project.priceUsd,
      status: 'paid', providerRef: String(body.providerRef || ''), createdAt: now(), updatedAt: now()
    };
    db.payments.push(paidPayment);
    const creditsAdded = paymentCredits(project.priceUsd);
    if (!project.creditsAwarded && creditsAdded > 0) {
      addCreditLedger(db, {
        userId: project.userId,
        projectId: project.id,
        paymentId: paidPayment.id,
        type: 'purchase',
        deltaCredits: creditsAdded,
        reason: `Paid ${project.packageKey || 'project'} package`,
        metadata: { amountUsd: project.priceUsd, packageKey: project.packageKey, projectTitle: project.title },
        req
      });
      project.creditsAwarded = true;
      project.creditsAdded = creditsAdded;
    }
    db.subscriptions ||= [];
  db.creditReservations ||= [];
    if (project.packageKey) {
      db.subscriptions.push({
        id: id('subscription'), userId: project.userId, projectId: project.id, packageKey: project.packageKey,
        amountUsd: project.priceUsd, status: 'active', source: 'manual_admin_payment', paymentId: paidPayment.id,
        createdAt: now(), updatedAt: now()
      });
    }
    pushActivity(db, { userId: project.userId, action: 'payment.paid', entityType: 'payment', entityId: paidPayment.id, summary: `Payment confirmed for ${project.title}`, metadata: { project: projectSummary(project), amountUsd: project.priceUsd, creditsAdded }, req });
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
    pushActivity(db, { userId: project.userId, action: 'deliverable.created', entityType: 'deliverable', entityId: deliverable.id, summary: `Deliverable added: ${deliverable.title}`, metadata: { projectId: project.id, type, fileName }, req });
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
