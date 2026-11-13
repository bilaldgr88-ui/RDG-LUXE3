import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { INITIAL_PRODUCTS, INITIAL_ORDERS } from './src/data/seedData.ts';
import type { Product, Order, OrderItem, CustomerProfile } from './src/types/index.ts';
import {
  calculateCartTotals,
  getEffectivePrice,
  getNormalizedGallery,
  sanitizeProductPricing,
  validateOrderInput,
} from './src/utils/pricing.ts';
import {
  decodeFirestoreDocument,
  sanitizeAndClampProductForStorage,
  sortCatalogProducts,
  validateImagePayloadBudget,
} from './src/utils/productCatalog.ts';
import {
  ADMIN_SESSION_TTL_MS,
  CUSTOMER_SESSION_TTL_MS,
  consumeResetGrant,
  createOtpRecord,
  generateSessionToken,
  hashPassword,
  hashToken,
  isValidEmail,
  validateStrongPassword,
  verifyOtpAttempt,
  verifyPassword,
} from './src/utils/authSecurity.ts';
import type { OtpRecord } from './src/utils/authSecurity.ts';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_ROOT = path.join(__dirname, 'public', 'uploads');
const PRODUCT_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'products');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PRODUCT_UPLOADS_DIR)) {
  fs.mkdirSync(PRODUCT_UPLOADS_DIR, { recursive: true });
}

const SESSION_COOKIE_NAME = 'rgd_session';

interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'customer';
  recoveryEmail?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  role: 'admin' | 'customer';
  createdAt: number;
  expiresAt: number;
}

interface DatabaseSchema {
  products: Product[];
  orders: Order[];
  users: StoredUser[];
  sessions: SessionRecord[];
  passwordResetOtps: OtpRecord[];
  subscribers: string[];
  contactMessages: Array<{
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    createdAt: string;
  }>;
}

function sanitizeUser(u: StoredUser): CustomerProfile {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    phone: u.phone || '',
    address: u.address || '',
    city: u.city || '',
    postalCode: u.postalCode || '',
    country: u.country || '',
  };
}

function normalizeProductRecord(raw: Product): Product {
  const gallery = getNormalizedGallery(raw);
  const mainImg = gallery[0] || raw.image || '';
  const pricing = sanitizeProductPricing({
    originalPrice:
      typeof raw.originalPrice === 'number' && raw.originalPrice > 0
        ? raw.originalPrice
        : raw.price,
    price: raw.price,
    discountEnabled:
      raw.discountEnabled !== undefined
        ? raw.discountEnabled
        : Boolean(raw.originalPrice && raw.originalPrice > raw.price),
    discountPercentage: raw.discountPercentage,
  });

  const stock = Math.max(0, Number(raw.stockCount ?? 0));

  return {
    ...raw,
    image: mainImg,
    images: gallery.length > 0 ? gallery : mainImg ? [mainImg] : [],
    price: pricing.valid ? pricing.price : Math.max(1, Number(raw.price) || 1),
    originalPrice: pricing.valid ? pricing.originalPrice : Math.max(1, Number(raw.originalPrice || raw.price) || 1),
    discountEnabled: pricing.valid ? pricing.discountEnabled : false,
    discountPercentage: pricing.valid ? pricing.discountPercentage : 0,
    stockCount: stock,
    inStock: stock > 0,
  };
}

function loadDb(): DatabaseSchema {
  let loaded: Partial<DatabaseSchema> | null = null;
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      loaded = JSON.parse(data);
    } catch {
      loaded = null;
    }
  }

  let dirty = !loaded;

  const products = (Array.isArray(loaded?.products) && loaded!.products.length > 0
    ? loaded!.products
    : INITIAL_PRODUCTS
  ).map(normalizeProductRecord);

  const orders: Order[] = (Array.isArray(loaded?.orders)
    ? loaded!.orders
    : INITIAL_ORDERS
  ).map((o) => {
    if (o.paymentMethod === 'card_demo' && o.paymentStatus === ('paid' as unknown as string)) {
      dirty = true;
      return { ...o, paymentStatus: 'demo_unpaid' as const };
    }
    return o;
  });

  let users: StoredUser[] = Array.isArray(loaded?.users) ? [...loaded!.users] : [];

  // Security migration: remove legacy hardcoded demo admin account if present
  const beforeLen = users.length;
  users = users.filter((u) => u.email.toLowerCase() !== 'admin@rgdluxe.com');
  if (users.length !== beforeLen) {
    dirty = true;
  }

  // Migrate any legacy plaintext passwords to scrypt hashes
  users = users.map((u) => {
    if (!u.passwordHash || !u.passwordHash.includes(':')) {
      dirty = true;
      return {
        ...u,
        passwordHash: hashPassword(u.passwordHash || crypto.randomBytes(16).toString('hex')),
      };
    }
    return u;
  });

  // Ensure initial admin account exists using backend environment variables only
  const existingAdmin = users.find((u) => u.role === 'admin');
  const envAdminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const envAdminPassword = process.env.ADMIN_PASSWORD || '';
  const envRecoveryEmail = (process.env.ADMIN_RECOVERY_EMAIL || '').trim().toLowerCase();

  if (!existingAdmin && envAdminEmail && envAdminPassword) {
    users.unshift({
      id: 'usr_admin',
      email: envAdminEmail,
      name: 'Maison RGD Director',
      passwordHash: hashPassword(envAdminPassword),
      role: 'admin',
      recoveryEmail: envRecoveryEmail || undefined,
      city: 'New York',
      country: 'United States',
    });
    dirty = true;
  } else if (existingAdmin && !existingAdmin.recoveryEmail && envRecoveryEmail) {
    existingAdmin.recoveryEmail = envRecoveryEmail;
    dirty = true;
  }

  const now = Date.now();
  const sessions: SessionRecord[] = Array.isArray(loaded?.sessions)
    ? loaded!.sessions.filter((s) => s.expiresAt > now)
    : [];

  const passwordResetOtps: OtpRecord[] = Array.isArray(loaded?.passwordResetOtps)
    ? loaded!.passwordResetOtps.filter((o) => now - o.createdAt < 24 * 60 * 60 * 1000)
    : [];

  const schema: DatabaseSchema = {
    products,
    orders,
    users,
    sessions,
    passwordResetOtps,
    subscribers: Array.isArray(loaded?.subscribers) ? loaded!.subscribers : [],
    contactMessages: Array.isArray(loaded?.contactMessages) ? loaded!.contactMessages : [],
  };

  if (dirty || !fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(schema, null, 2));
  }

  return schema;
}

function saveDb(data: DatabaseSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const db = loadDb();

interface FirebaseConfigFile {
  projectId?: string;
  apiKey?: string;
  firestoreDatabaseId?: string;
}

function loadFirebaseConfig(): FirebaseConfigFile | null {
  const cfgPath = path.join(__dirname, 'firebase-applet-config.json');
  if (!fs.existsSync(cfgPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as FirebaseConfigFile;
  } catch {
    return null;
  }
}

let lastFirestoreSyncAt = 0;

async function syncProductsFromFirestoreRest(force = false): Promise<boolean> {
  const now = Date.now();
  if (!force && now - lastFirestoreSyncAt < 3000) {
    return false;
  }
  const cfg = loadFirebaseConfig();
  if (!cfg?.projectId || !cfg?.apiKey) return false;

  const databaseId = cfg.firestoreDatabaseId || '(default)';
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/${encodeURIComponent(databaseId)}/documents`;

  try {
    const metaRes = await fetch(`${baseUrl}/catalog_meta/state?key=${encodeURIComponent(cfg.apiKey)}`);
    let seeded = false;
    if (metaRes.ok) {
      const metaJson = await metaRes.json();
      const decodedMeta = decodeFirestoreDocument(metaJson);
      seeded = Boolean(decodedMeta?.seeded);
    }

    const collected: Product[] = [];
    let pageToken = '';
    do {
      const url = `${baseUrl}/products?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}&key=${encodeURIComponent(cfg.apiKey)}`;
      const res = await fetch(url);
      if (!res.ok) break;
      const payload = await res.json() as { documents?: any[]; nextPageToken?: string };
      if (Array.isArray(payload.documents)) {
        for (const docItem of payload.documents) {
          const decoded = decodeFirestoreDocument(docItem);
          if (decoded && decoded.name) {
            collected.push(sanitizeAndClampProductForStorage(decoded as Product) as Product);
          }
        }
      }
      pageToken = payload.nextPageToken || '';
    } while (pageToken);

    lastFirestoreSyncAt = Date.now();

    if (seeded || collected.length > 0) {
      db.products = sortCatalogProducts(collected.map(normalizeProductRecord));
      saveDb(db);
      return true;
    }
  } catch (err) {
    console.warn('[RGD LUXE] Firestore REST catalog sync skipped:', (err as Error)?.message || err);
  }
  return false;
}

function setNoCacheHeaders(res: express.Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

app.use(express.json({ limit: '12mb' }));
app.use('/uploads', express.static(UPLOADS_ROOT));
app.use('/api', (_req, res, next) => {
  setNoCacheHeaders(res);
  next();
});

// --- COOKIE & SESSION HELPERS ---
function parseCookies(req: express.Request): Record<string, string> {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  }
  return out;
}

function isRequestHttps(req: express.Request): boolean {
  const forwarded = req.headers['x-forwarded-proto'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim().toLowerCase() === 'https';
  }
  return Boolean(req.secure);
}

function setSessionCookie(req: express.Request, res: express.Response, rawToken: string, ttlMs: number) {
  const isHttps = isRequestHttps(req);
  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    maxAge: ttlMs,
  });
}

function clearSessionCookie(req: express.Request, res: express.Response) {
  const isHttps = isRequestHttps(req);
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
  });
}

function createUserSession(req: express.Request, res: express.Response, user: StoredUser) {
  const now = Date.now();
  const ttl = user.role === 'admin' ? ADMIN_SESSION_TTL_MS : CUSTOMER_SESSION_TTL_MS;
  const { token, tokenHash } = generateSessionToken();

  // Prune expired sessions
  db.sessions = db.sessions.filter((s) => s.expiresAt > now);
  db.sessions.push({
    id: 'sess_' + crypto.randomBytes(8).toString('hex'),
    userId: user.id,
    tokenHash,
    role: user.role,
    createdAt: now,
    expiresAt: now + ttl,
  });
  saveDb(db);
  setSessionCookie(req, res, token, ttl);
}

function getAuthContext(req: express.Request): { user: StoredUser; session: SessionRecord } | null {
  const cookies = parseCookies(req);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (!rawToken) return null;

  const incomingHash = hashToken(rawToken);
  const now = Date.now();
  const session = db.sessions.find((s) => s.tokenHash === incomingHash && s.expiresAt > now);
  if (!session) return null;

  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return null;

  return { user, session };
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  (req as any).auth = auth;
  return next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Administrator authentication required.' });
  }
  if (auth.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }
  (req as any).auth = auth;
  return next();
}

// --- RATE LIMITING ---
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const loginAttempts = new Map<string, RateLimitBucket>();
const otpRequests = new Map<string, RateLimitBucket>();

function getClientIp(req: express.Request): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) {
    return xf.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function checkRateLimit(map: Map<string, RateLimitBucket>, key: string, maxCount: number, windowMs: number): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const bucket = map.get(key);
  if (!bucket || now > bucket.resetAt) {
    return { allowed: true };
  }
  if (bucket.count >= maxCount) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

function recordRateLimitHit(map: Map<string, RateLimitBucket>, key: string, windowMs: number) {
  const now = Date.now();
  const bucket = map.get(key);
  if (!bucket || now > bucket.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    bucket.count += 1;
  }
}

function clearRateLimit(map: Map<string, RateLimitBucket>, key: string) {
  map.delete(key);
}

// --- EMAIL SERVICE CONFIG & DELIVERY ---
function getEmailProviderStatus(): {
  configured: boolean;
  provider: 'resend' | 'smtp' | 'none';
} {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0) {
    return { configured: true, provider: 'resend' };
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return { configured: true, provider: 'smtp' };
  }
  return { configured: false, provider: 'none' };
}

async function sendRecoveryOtpEmail(toEmail: string, otpCode: string): Promise<{ sent: boolean; error?: string }> {
  const status = getEmailProviderStatus();
  if (!status.configured) {
    return {
      sent: false,
      error:
        'Email delivery service is not configured on this server. Configure RESEND_API_KEY or SMTP credentials in backend environment variables to enable OTP recovery.',
    };
  }

  const fromAddress =
    process.env.EMAIL_FROM ||
    (process.env.SMTP_USER ? `RGD LUXE Security <${process.env.SMTP_USER}>` : 'RGD LUXE Security <onboarding@resend.dev>');

  const subject = 'RGD LUXE Admin Security Verification Code';
  const html = `
    <div style="font-family: Georgia, serif; background:#09090B; color:#F5F5F7; padding:32px; border:1px solid #C6A45B;">
      <p style="letter-spacing:0.25em; font-size:11px; color:#C6A45B; text-transform:uppercase; margin:0 0 12px;">RGD LUXE · Admin Security</p>
      <h2 style="margin:0 0 16px; color:#FFFFFF; font-weight:normal;">Password Recovery Verification Code</h2>
      <p style="color:#A1A1AA; font-size:14px; line-height:1.6;">
        Use the single-use verification code below to reset your Maison Director password. This code expires in <strong>5 minutes</strong>.
      </p>
      <div style="margin:24px 0; padding:18px 24px; background:#111115; border:1px solid #C6A45B; display:inline-block; font-family:monospace; font-size:28px; letter-spacing:0.35em; color:#E8CA7A;">
        ${otpCode}
      </div>
      <p style="color:#71717A; font-size:12px; margin-top:20px;">
        If you did not request this recovery code, do not share it and check your admin account security immediately.
      </p>
    </div>
  `;
  const text = `RGD LUXE Admin Password Recovery OTP: ${otpCode}. This code expires in 5 minutes and can only be used once.`;

  try {
    if (status.provider === 'resend') {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [toEmail],
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        return { sent: false, error: `Email provider rejected delivery (${response.status}): ${errBody}` };
      }
      return { sent: true };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      text,
      html,
    });

    return { sent: true };
  } catch (err: any) {
    return { sent: false, error: err?.message || 'Failed to dispatch OTP email.' };
  }
}

// --- AUTH API ---
app.get('/api/auth/me', (req, res) => {
  const auth = getAuthContext(req);
  if (!auth) {
    return res.json({ user: null });
  }
  return res.json({ user: sanitizeUser(auth.user) });
});

function handleLogin(req: express.Request, res: express.Response, adminOnly: boolean) {
  const { email, password } = req.body || {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const rawPassword = typeof password === 'string' ? password : '';

  if (!cleanEmail || !rawPassword) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const rateKey = `${getClientIp(req)}:${cleanEmail}`;
  const limit = checkRateLimit(loginAttempts, rateKey, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return res.status(429).json({
      error: `Too many failed sign-in attempts. Please wait ${limit.retryAfterSec} seconds before trying again.`,
    });
  }

  const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user || !verifyPassword(rawPassword, user.passwordHash)) {
    recordRateLimitHit(loginAttempts, rateKey, 15 * 60 * 1000);
    return res.status(401).json({ error: 'Invalid credentials. Access denied.' });
  }

  if (adminOnly && user.role !== 'admin') {
    recordRateLimitHit(loginAttempts, rateKey, 15 * 60 * 1000);
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }

  clearRateLimit(loginAttempts, rateKey);
  createUserSession(req, res, user);

  return res.json({ user: sanitizeUser(user) });
}

app.post('/api/auth/login', (req, res) => handleLogin(req, res, false));
app.post('/api/auth/admin/login', (req, res) => handleLogin(req, res, true));

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, phone, address, city, postalCode } = req.body || {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }
  const passCheck = validateStrongPassword(password);
  if (!passCheck.valid) {
    return res.status(400).json({ error: passCheck.error });
  }

  const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const newUser: StoredUser = {
    id: 'usr_' + crypto.randomBytes(6).toString('hex'),
    email: cleanEmail,
    name: name.trim(),
    passwordHash: hashPassword(password),
    role: 'customer',
    phone: typeof phone === 'string' ? phone.trim() : '',
    address: typeof address === 'string' ? address.trim() : '',
    city: typeof city === 'string' ? city.trim() : '',
    postalCode: typeof postalCode === 'string' ? postalCode.trim() : '',
    country: 'United States',
  };

  db.users.push(newUser);
  createUserSession(req, res, newUser);

  return res.status(201).json({ user: sanitizeUser(newUser) });
});

app.post('/api/auth/logout', (req, res) => {
  const cookies = parseCookies(req);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (rawToken) {
    const incomingHash = hashToken(rawToken);
    db.sessions = db.sessions.filter((s) => s.tokenHash !== incomingHash);
    saveDb(db);
  }
  clearSessionCookie(req, res);
  return res.json({ success: true });
});

// --- REAL FORGOT-PASSWORD EMAIL OTP RECOVERY ---
app.post('/api/auth/forgot-password/request-otp', async (req, res) => {
  const emailProvider = getEmailProviderStatus();
  if (!emailProvider.configured) {
    return res.status(503).json({
      error:
        'Password recovery email service is not configured yet. Set RESEND_API_KEY or SMTP_* variables on the server before requesting an OTP.',
    });
  }

  const { email } = req.body || {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const rateKey = `otp:${getClientIp(req)}`;
  const limit = checkRateLimit(otpRequests, rateKey, 3, 15 * 60 * 1000);
  if (!limit.allowed) {
    return res.status(429).json({
      error: `Too many OTP requests. Please wait ${limit.retryAfterSec} seconds before requesting another code.`,
    });
  }
  recordRateLimitHit(otpRequests, rateKey, 15 * 60 * 1000);

  const admin = db.users.find((u) => u.role === 'admin' && u.email.toLowerCase() === cleanEmail);
  const neutralSuccess =
    'If this email is registered as an administrator account, a 6-digit verification code has been dispatched to the private recovery inbox. The code expires in 5 minutes.';

  if (!admin) {
    return res.json({ success: true, message: neutralSuccess });
  }

  const destinationEmail = (admin.recoveryEmail || process.env.ADMIN_RECOVERY_EMAIL || admin.email).trim();

  // Invalidate any previous unused OTPs for this account
  db.passwordResetOtps = db.passwordResetOtps.map((o) =>
    o.userId === admin.id && !o.used ? { ...o, used: true } : o
  );

  const { otp, record } = createOtpRecord(admin.id, admin.email);
  db.passwordResetOtps.push(record);
  saveDb(db);

  const delivery = await sendRecoveryOtpEmail(destinationEmail, otp);
  if (!delivery.sent) {
    record.used = true;
    saveDb(db);
    return res.status(502).json({
      error: delivery.error || 'Email service failed to deliver the verification code.',
    });
  }

  return res.json({ success: true, message: neutralSuccess });
});

app.post('/api/auth/forgot-password/verify-otp', (req, res) => {
  const { email, otp } = req.body || {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanOtp = typeof otp === 'string' ? otp.trim() : '';

  if (!isValidEmail(cleanEmail) || !/^\d{6}$/.test(cleanOtp)) {
    return res.status(400).json({ error: 'Valid email address and 6-digit verification code are required.' });
  }

  const result = verifyOtpAttempt(db.passwordResetOtps, cleanEmail, cleanOtp);
  saveDb(db);

  if (!result.success || !result.resetGrantToken) {
    return res.status(400).json({ error: result.error || 'Invalid or expired verification code.' });
  }

  return res.json({
    success: true,
    resetGrantToken: result.resetGrantToken,
    message: 'Code verified. You may now set a new strong password.',
  });
});

app.post('/api/auth/forgot-password/reset-password', (req, res) => {
  const { email, resetGrantToken, newPassword, confirmPassword } = req.body || {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }
  if (!newPassword || newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'New password and confirmation do not match.' });
  }
  const strength = validateStrongPassword(newPassword);
  if (!strength.valid) {
    return res.status(400).json({ error: strength.error });
  }

  const grant = consumeResetGrant(db.passwordResetOtps, cleanEmail, resetGrantToken || '');
  if (!grant.valid || !grant.userId) {
    saveDb(db);
    return res.status(400).json({ error: grant.error || 'Verified OTP session is invalid or expired.' });
  }

  const admin = db.users.find((u) => u.id === grant.userId && u.role === 'admin');
  if (!admin) {
    saveDb(db);
    return res.status(400).json({ error: 'Account could not be updated.' });
  }

  admin.passwordHash = hashPassword(newPassword);
  // Invalidate all existing sessions and OTPs for this admin
  db.sessions = db.sessions.filter((s) => s.userId !== admin.id);
  db.passwordResetOtps = db.passwordResetOtps.filter((o) => o.userId !== admin.id);
  saveDb(db);
  clearSessionCookie(req, res);

  return res.json({
    success: true,
    message: 'Administrator password has been reset. Please sign in with your new password.',
  });
});

// --- ADMIN SECURITY SETTINGS API ---
app.get('/api/admin/settings', requireAdmin, (req, res) => {
  const auth = (req as any).auth as { user: StoredUser };
  const emailProvider = getEmailProviderStatus();
  const hasRecovery = Boolean(auth.user.recoveryEmail || process.env.ADMIN_RECOVERY_EMAIL);

  return res.json({
    adminEmail: auth.user.email,
    name: auth.user.name,
    hasPrivateRecoveryEmail: hasRecovery,
    emailServiceConfigured: emailProvider.configured,
    emailProvider: emailProvider.provider,
  });
});

app.put('/api/admin/settings/email', requireAdmin, (req, res) => {
  const auth = (req as any).auth as { user: StoredUser; session: SessionRecord };
  const { currentPassword, newEmail } = req.body || {};

  if (!currentPassword || !verifyPassword(String(currentPassword), auth.user.passwordHash)) {
    return res.status(401).json({ error: 'Current administrator password is incorrect.' });
  }

  const cleanNewEmail = typeof newEmail === 'string' ? newEmail.trim().toLowerCase() : '';
  if (!isValidEmail(cleanNewEmail)) {
    return res.status(400).json({ error: 'Please enter a valid new administrator email address.' });
  }
  if (cleanNewEmail === auth.user.email.toLowerCase()) {
    return res.status(400).json({ error: 'New email matches your current administrator email.' });
  }
  const conflict = db.users.find((u) => u.id !== auth.user.id && u.email.toLowerCase() === cleanNewEmail);
  if (conflict) {
    return res.status(409).json({ error: 'This email address is already associated with another account.' });
  }

  auth.user.email = cleanNewEmail;
  // Invalidate all other sessions and issue a rotated session for current device
  db.sessions = db.sessions.filter((s) => s.userId !== auth.user.id);
  createUserSession(req, res, auth.user);

  return res.json({
    success: true,
    user: sanitizeUser(auth.user),
    message: 'Administrator email updated successfully.',
  });
});

app.put('/api/admin/settings/password', requireAdmin, (req, res) => {
  const auth = (req as any).auth as { user: StoredUser; session: SessionRecord };
  const { currentPassword, newPassword, confirmPassword } = req.body || {};

  if (!currentPassword || !verifyPassword(String(currentPassword), auth.user.passwordHash)) {
    return res.status(401).json({ error: 'Current administrator password is incorrect.' });
  }
  if (!newPassword || newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'New password and confirmation do not match.' });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'New password must differ from your current password.' });
  }
  const strength = validateStrongPassword(newPassword);
  if (!strength.valid) {
    return res.status(400).json({ error: strength.error });
  }

  auth.user.passwordHash = hashPassword(newPassword);
  // Invalidate all old sessions & rotate current session
  db.sessions = db.sessions.filter((s) => s.userId !== auth.user.id);
  createUserSession(req, res, auth.user);

  return res.json({
    success: true,
    message: 'Administrator password updated and active sessions rotated.',
  });
});

app.put('/api/admin/settings/recovery-email', requireAdmin, (req, res) => {
  const auth = (req as any).auth as { user: StoredUser; session: SessionRecord };
  const { currentPassword, newRecoveryEmail } = req.body || {};

  if (!currentPassword || !verifyPassword(String(currentPassword), auth.user.passwordHash)) {
    return res.status(401).json({ error: 'Current administrator password is incorrect.' });
  }

  const cleanRecovery = typeof newRecoveryEmail === 'string' ? newRecoveryEmail.trim().toLowerCase() : '';
  if (!isValidEmail(cleanRecovery)) {
    return res.status(400).json({ error: 'Please enter a valid private recovery email address.' });
  }

  auth.user.recoveryEmail = cleanRecovery;
  saveDb(db);

  return res.json({
    success: true,
    hasPrivateRecoveryEmail: true,
    message: 'Private recovery email updated securely (kept hidden from public UI).',
  });
});

// --- ADMIN IMAGE UPLOAD API ---
app.post('/api/admin/upload-image', requireAdmin, (req, res) => {
  const { filename, dataUrl } = req.body || {};
  if (!dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ error: 'Image file data is required.' });
  }

  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) {
    return res.status(400).json({ error: 'Unsupported image format. Upload JPG, PNG, WEBP, or GIF files.' });
  }

  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const base64Data = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image file exceeds the 5MB maximum upload limit.' });
  }

  const rawBase = typeof filename === 'string' ? path.basename(filename, path.extname(filename)) : 'product';
  const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 32) || 'product';
  const outName = `${safeBase}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
  const outPath = path.join(PRODUCT_UPLOADS_DIR, outName);

  fs.writeFileSync(outPath, buffer);
  return res.status(201).json({ url: `/uploads/products/${outName}` });
});

// --- PRODUCTS API ---
app.get('/api/products', async (req, res) => {
  if (req.query.refresh === '1') {
    await syncProductsFromFirestoreRest(true);
  }
  let results = [...db.products];
  const { category, search, sort, filter } = req.query;

  if (category && category !== 'all') {
    results = results.filter((p) => p.category === category);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q)
    );
  }

  if (filter === 'new') {
    results = results.filter((p) => p.isNewArrival);
  } else if (filter === 'bestseller') {
    results = results.filter((p) => p.isBestSeller);
  } else if (filter === 'offer') {
    results = results.filter((p) => p.isSpecialOffer || p.discountEnabled);
  }

  if (sort === 'price_asc') {
    results.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
  } else if (sort === 'price_desc') {
    results.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
  } else if (sort === 'rating') {
    results.sort((a, b) => b.rating - a.rating);
  }

  res.json({ products: results, total: results.length });
});

app.get('/api/products/:id', async (req, res) => {
  let prod = db.products.find((p) => p.id === req.params.id);
  if (!prod) {
    await syncProductsFromFirestoreRest(true);
    prod = db.products.find((p) => p.id === req.params.id);
  }
  if (!prod) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(prod);
});

function buildValidatedProductPayload(body: any, existing?: Product): { product?: Product; error?: string } {
  const name = typeof body.name === 'string' ? body.name.trim() : existing?.name || '';
  if (name.length < 2) {
    return { error: 'Product name is required.' };
  }

  const category = (body.category || existing?.category || 'watches') as 'men' | 'women' | 'watches';
  if (!['men', 'women', 'watches'].includes(category)) {
    return { error: 'Invalid product category.' };
  }

  const categoryLabel =
    category === 'watches'
      ? 'Luxury Watches'
      : category === 'men'
      ? "Men's Clothing"
      : "Women's Clothing";

  const rawImages: string[] = Array.isArray(body.images)
    ? body.images.map((s: any) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
    : body.image && typeof body.image === 'string'
    ? [body.image.trim()]
    : existing
    ? getNormalizedGallery(existing)
    : [];

  const uniqueImages = Array.from(new Set(rawImages));
  if (uniqueImages.length === 0) {
    return { error: 'At least one product image is required.' };
  }

  const requestedMain = typeof body.image === 'string' ? body.image.trim() : '';
  const mainImage = requestedMain && uniqueImages.includes(requestedMain) ? requestedMain : uniqueImages[0];
  const orderedImages = [mainImage, ...uniqueImages.filter((u) => u !== mainImage)];
  const budget = validateImagePayloadBudget(orderedImages);
  if (!budget.valid) {
    return { error: budget.error || 'Product image gallery exceeds allowed limits.' };
  }

  const pricing = sanitizeProductPricing({
    originalPrice:
      body.originalPrice !== undefined
        ? Number(body.originalPrice)
        : existing?.originalPrice ?? existing?.price,
    price: body.price !== undefined ? Number(body.price) : existing?.price,
    discountEnabled:
      body.discountEnabled !== undefined ? Boolean(body.discountEnabled) : existing?.discountEnabled,
    discountPercentage:
      body.discountPercentage !== undefined ? Number(body.discountPercentage) : existing?.discountPercentage,
  });

  if (!pricing.valid) {
    return { error: pricing.error || 'Invalid product pricing configuration.' };
  }

  const stockCount = Math.max(0, Math.round(Number(body.stockCount ?? existing?.stockCount ?? 0)));
  const requestedId =
    !existing && typeof body.id === 'string' && /^[a-zA-Z0-9_-]{3,80}$/.test(body.id.trim())
      ? body.id.trim()
      : null;
  const resolvedId =
    existing?.id ||
    (requestedId && !db.products.some((p) => p.id === requestedId)
      ? requestedId
      : 'rgd-cust-' + Date.now());

  const product: Product = {
    id: resolvedId,
    name,
    subtitle: typeof body.subtitle === 'string' ? body.subtitle.trim() : existing?.subtitle || '',
    category,
    categoryLabel,
    price: pricing.price,
    originalPrice: pricing.originalPrice,
    discountEnabled: pricing.discountEnabled,
    discountPercentage: pricing.discountPercentage,
    rating: Number(body.rating ?? existing?.rating ?? 5.0),
    reviewsCount: Number(body.reviewsCount ?? existing?.reviewsCount ?? 0),
    image: mainImage,
    images: orderedImages,
    description: typeof body.description === 'string' ? body.description.trim() : existing?.description || '',
    details: Array.isArray(body.details) ? body.details : existing?.details || ['Bespoke Luxury Release'],
    composition: typeof body.composition === 'string' ? body.composition : existing?.composition || '100% Bespoke Materials',
    sizes: Array.isArray(body.sizes) && body.sizes.length > 0 ? body.sizes : existing?.sizes || ['One Size'],
    colors:
      Array.isArray(body.colors) && body.colors.length > 0
        ? body.colors
        : existing?.colors || [{ name: 'Obsidian & Gold', hex: '#C6A45B' }],
    inStock: stockCount > 0,
    stockCount,
    isNewArrival: body.isNewArrival !== undefined ? Boolean(body.isNewArrival) : existing?.isNewArrival ?? true,
    isBestSeller: body.isBestSeller !== undefined ? Boolean(body.isBestSeller) : existing?.isBestSeller ?? false,
    isSpecialOffer:
      body.isSpecialOffer !== undefined
        ? Boolean(body.isSpecialOffer)
        : existing?.isSpecialOffer ?? pricing.discountEnabled,
    sku: typeof body.sku === 'string' && body.sku.trim() ? body.sku.trim() : existing?.sku || 'RGD-CUSTOM-' + Math.floor(1000 + Math.random() * 9000),
    isDemo: body.isDemo !== undefined ? Boolean(body.isDemo) : existing?.isDemo ?? false,
  };

  return { product };
}

app.post('/api/products', requireAdmin, (req, res) => {
  const result = buildValidatedProductPayload(req.body || {});
  if (!result.product) {
    return res.status(400).json({ error: result.error });
  }

  db.products.unshift(result.product);
  saveDb(db);
  return res.status(201).json(result.product);
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const result = buildValidatedProductPayload(req.body || {}, db.products[idx]);
  if (!result.product) {
    return res.status(400).json({ error: result.error });
  }

  db.products[idx] = result.product;
  saveDb(db);
  return res.json(result.product);
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const initialLen = db.products.length;
  db.products = db.products.filter((p) => p.id !== req.params.id);
  if (db.products.length === initialLen) {
    return res.status(404).json({ error: 'Product not found' });
  }
  saveDb(db);
  return res.json({ success: true, message: 'Product removed from collection.' });
});

// --- ORDERS API ---
app.get('/api/orders', requireAuth, (req, res) => {
  const auth = (req as any).auth as { user: StoredUser };

  if (auth.user.role === 'admin') {
    return res.json({ orders: db.orders });
  }

  const ownOrders = db.orders.filter(
    (o) =>
      (o.userId && o.userId === auth.user.id) ||
      o.customer.email.toLowerCase() === auth.user.email.toLowerCase()
  );
  return res.json({ orders: ownOrders });
});

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  return res.json({ orders: db.orders });
});

app.post('/api/orders', async (req, res) => {
  const { customer, items, paymentMethod, notes, promoCode } = req.body || {};

  const customerValidation = validateOrderInput(customer || {});
  if (!customerValidation.valid) {
    const firstError = Object.values(customerValidation.errors)[0] || 'Incomplete customer delivery information.';
    return res.status(400).json({ error: firstError, errors: customerValidation.errors });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  const hasMissingFromLocal = items.some((it: any) => !db.products.some((p) => p.id === it.productId));
  if (hasMissingFromLocal) {
    await syncProductsFromFirestoreRest(true);
  }

  const resolvedCartItems: Array<{ product: Product; quantity: number; selectedSize?: string; selectedColor?: string }> = [];

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Invalid item quantity.' });
    }
    const prod = db.products.find((p) => p.id === item.productId);
    if (!prod) {
      return res.status(400).json({ error: `Product "${item.name || item.productId}" no longer exists.` });
    }
    if (prod.stockCount < qty) {
      return res.status(400).json({
        error: `Insufficient inventory for "${prod.name}". Only ${prod.stockCount} available.`,
      });
    }
    resolvedCartItems.push({
      product: prod,
      quantity: qty,
      selectedSize: typeof item.selectedSize === 'string' ? item.selectedSize : undefined,
      selectedColor: typeof item.selectedColor === 'string' ? item.selectedColor : undefined,
    });
  }

  // Compute authoritative totals strictly on server using DB products
  const totals = calculateCartTotals(resolvedCartItems, typeof promoCode === 'string' ? promoCode : undefined);

  // Deduct stock after all validations succeed
  for (const resolved of resolvedCartItems) {
    resolved.product.stockCount -= resolved.quantity;
    if (resolved.product.stockCount <= 0) {
      resolved.product.inStock = false;
      resolved.product.stockCount = 0;
    }
  }

  const authoritativeItems: OrderItem[] = resolvedCartItems.map((resolved) => {
    const effPrice = getEffectivePrice(resolved.product);
    return {
      productId: resolved.product.id,
      name: resolved.product.name,
      price: effPrice,
      originalPrice: resolved.product.originalPrice,
      quantity: resolved.quantity,
      selectedSize: resolved.selectedSize,
      selectedColor: resolved.selectedColor,
      image: resolved.product.image,
    };
  });

  const auth = getAuthContext(req);
  const method = paymentMethod === 'cod' ? 'cod' : 'card_demo';

  const orderNum = 'RGD-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);
  const trackNum = 'RGD-EXP-' + Math.floor(10000000 + Math.random() * 90000000);

  const newOrder: Order = {
    id: 'ord_' + Date.now() + '_' + crypto.randomBytes(2).toString('hex'),
    orderNumber: orderNum,
    createdAt: new Date().toISOString(),
    userId: auth?.user.id,
    customer: {
      name: customer.name.trim(),
      email: customer.email.trim().toLowerCase(),
      phone: customer.phone.trim(),
      address: customer.address.trim(),
      city: customer.city.trim(),
      postalCode: customer.postalCode.trim(),
      country: (customer.country || 'United States').trim(),
    },
    items: authoritativeItems,
    subtotal: totals.subtotal,
    shippingFee: totals.shippingFee,
    tax: totals.tax,
    discount: totals.discount,
    total: totals.total,
    paymentMethod: method,
    paymentStatus: method === 'cod' ? 'pending' : 'demo_unpaid',
    orderStatus: 'Confirmed',
    trackingNumber: trackNum,
    notes: typeof notes === 'string' ? notes.trim() : '',
  };

  db.orders.unshift(newOrder);
  saveDb(db);

  return res.status(201).json(newOrder);
});

app.put('/api/orders/:id/status', requireAdmin, (req, res) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const { status, trackingNumber } = req.body || {};
  const allowedStatuses = ['Confirmed', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status.' });
  }
  if (status) order.orderStatus = status;
  if (typeof trackingNumber === 'string' && trackingNumber.trim()) {
    order.trackingNumber = trackingNumber.trim();
  }

  saveDb(db);
  return res.json(order);
});

// --- NEWSLETTER & INQUIRY API ---
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body || {};
  if (!email || !isValidEmail(String(email))) {
    return res.status(400).json({ error: 'Valid email address required.' });
  }
  const clean = String(email).trim().toLowerCase();
  if (!db.subscribers.includes(clean)) {
    db.subscribers.push(clean);
    saveDb(db);
  }
  return res.json({ success: true, message: 'Welcome to the RGD LUXE Private Gazette.' });
});

app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !isValidEmail(String(email || '')) || !message) {
    return res.status(400).json({ error: 'Valid name, email, and message are required.' });
  }
  db.contactMessages.push({
    id: 'msg_' + Date.now(),
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    subject: String(subject || 'General Concierge Inquiry').trim(),
    message: String(message).trim(),
    createdAt: new Date().toISOString(),
  });
  saveDb(db);
  return res.json({ success: true, message: 'Your concierge inquiry has been securely delivered.' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', brand: 'RGD LUXE', timestamp: new Date().toISOString() });
});

// --- VITE & STATIC SERVING ---
async function startServer() {
  await syncProductsFromFirestoreRest(true);

  app.use('/public', express.static(path.join(__dirname, 'public')));
  app.use('/src/assets', express.static(path.join(__dirname, 'src', 'assets')));

  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RGD LUXE] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
