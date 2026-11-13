import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import type { Product, CustomerProfile } from './src/types/index.ts';
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
  createOtpRecord,
  hashPassword,
  hashToken,
  isValidEmail,
  validateStrongPassword,
  verifyPassword,
} from './src/utils/authSecurity.ts';
import { getFirebaseAdminContext } from './src/lib/firebaseAdmin.ts';
import { StoreRepository } from './src/lib/storeRepository.ts';
import type { SessionRecord, StoredUserRecord } from './src/lib/migrateDbToFirestore.ts';

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
const store = new StoreRepository(DB_FILE);

function sanitizeUser(u: StoredUserRecord): CustomerProfile {
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
    originalPrice: pricing.valid
      ? pricing.originalPrice
      : Math.max(1, Number(raw.originalPrice || raw.price) || 1),
    discountEnabled: pricing.valid ? pricing.discountEnabled : false,
    discountPercentage: pricing.valid ? pricing.discountPercentage : 0,
    stockCount: stock,
    inStock: stock > 0,
  };
}

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
  if (store.getStatus().mode === 'firestore') {
    return false;
  }

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
      const payload = (await res.json()) as { documents?: any[]; nextPageToken?: string };
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
      await store.replaceProductsFromRestFallback(
        sortCatalogProducts(collected.map(normalizeProductRecord))
      );
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

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
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

async function createUserSession(req: express.Request, res: express.Response, user: StoredUserRecord) {
  const { rawToken, ttlMs } = await store.createSession(user);
  setSessionCookie(req, res, rawToken, ttlMs);
}

async function getAuthContext(
  req: express.Request
): Promise<{ user: StoredUserRecord; session: SessionRecord } | null> {
  const cookies = parseCookies(req);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (!rawToken) return null;
  const incomingHash = hashToken(rawToken);
  return await store.getAuthContextByTokenHash(incomingHash);
}

async function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    (req as any).auth = auth;
    return next();
  } catch (err) {
    console.error('[Auth Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Authentication verification failed.' });
  }
}

async function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return res.status(401).json({ error: 'Administrator authentication required.' });
    }
    if (auth.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
    }
    (req as any).auth = auth;
    return next();
  } catch (err) {
    console.error('[Admin Auth Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Administrator verification failed.' });
  }
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

function checkRateLimit(
  map: Map<string, RateLimitBucket>,
  key: string,
  maxCount: number,
  _windowMs: number
): { allowed: boolean; retryAfterSec?: number } {
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

async function sendRecoveryOtpEmail(
  toEmail: string,
  otpCode: string
): Promise<{ sent: boolean; error?: string }> {
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
    (process.env.SMTP_USER
      ? `RGD LUXE Security <${process.env.SMTP_USER}>`
      : 'RGD LUXE Security <onboarding@resend.dev>');

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
app.get('/api/auth/me', async (req, res) => {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return res.json({ user: null });
    }
    return res.json({ user: sanitizeUser(auth.user) });
  } catch {
    return res.json({ user: null });
  }
});

async function handleLogin(req: express.Request, res: express.Response, adminOnly: boolean) {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (!cleanEmail || !rawPassword) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const ip = getClientIp(req);
    const ipEmailKey = `${ip}:${cleanEmail}`;
    const emailKey = `email:${cleanEmail}`;
    const ipLimit = checkRateLimit(loginAttempts, ipEmailKey, 5, 15 * 60 * 1000);
    const emailLimit = checkRateLimit(loginAttempts, emailKey, 10, 15 * 60 * 1000);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retry = Math.max(ipLimit.retryAfterSec || 0, emailLimit.retryAfterSec || 0);
      return res.status(429).json({
        error: `Too many failed sign-in attempts. Please wait ${retry} seconds before trying again.`,
      });
    }

    const user = await store.findUserByEmail(cleanEmail);
    if (!user || !verifyPassword(rawPassword, user.passwordHash)) {
      recordRateLimitHit(loginAttempts, ipEmailKey, 15 * 60 * 1000);
      recordRateLimitHit(loginAttempts, emailKey, 15 * 60 * 1000);
      return res.status(401).json({ error: 'Invalid credentials. Access denied.' });
    }

    if (adminOnly && user.role !== 'admin') {
      recordRateLimitHit(loginAttempts, ipEmailKey, 15 * 60 * 1000);
      recordRateLimitHit(loginAttempts, emailKey, 15 * 60 * 1000);
      return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
    }

    clearRateLimit(loginAttempts, ipEmailKey);
    clearRateLimit(loginAttempts, emailKey);
    await createUserSession(req, res, user);

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('[Login Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Authentication service failed.' });
  }
}

app.post('/api/auth/login', (req, res) => handleLogin(req, res, false));
app.post('/api/auth/admin/login', (req, res) => handleLogin(req, res, true));

app.post('/api/auth/register', async (req, res) => {
  try {
    const regKey = `reg:${getClientIp(req)}`;
    const regLimit = checkRateLimit(otpRequests, regKey, 5, 15 * 60 * 1000);
    if (!regLimit.allowed) {
      return res.status(429).json({
        error: `Too many registration attempts. Please wait ${regLimit.retryAfterSec} seconds.`,
      });
    }
    recordRateLimitHit(otpRequests, regKey, 15 * 60 * 1000);

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

    const existing = await store.findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const newUser: StoredUserRecord = {
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

    await store.createUser(newUser);
    await createUserSession(req, res, newUser);

    return res.status(201).json({ user: sanitizeUser(newUser) });
  } catch (err) {
    console.error('[Register Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Account registration failed.' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const cookies = parseCookies(req);
    const rawToken = cookies[SESSION_COOKIE_NAME];
    if (rawToken) {
      const incomingHash = hashToken(rawToken);
      await store.deleteSessionByTokenHash(incomingHash);
    }
  } catch {
    // ensure cookie still clears
  }
  clearSessionCookie(req, res);
  return res.json({ success: true });
});

// --- REAL FORGOT-PASSWORD EMAIL OTP RECOVERY ---
app.post('/api/auth/forgot-password/request-otp', async (req, res) => {
  try {
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

    const ipKey = `otp:${getClientIp(req)}`;
    const emailOtpKey = `otp-email:${cleanEmail}`;
    const ipLimit = checkRateLimit(otpRequests, ipKey, 3, 15 * 60 * 1000);
    const emailLimit = checkRateLimit(otpRequests, emailOtpKey, 3, 15 * 60 * 1000);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retry = Math.max(ipLimit.retryAfterSec || 0, emailLimit.retryAfterSec || 0);
      return res.status(429).json({
        error: `Too many OTP requests. Please wait ${retry} seconds before requesting another code.`,
      });
    }
    recordRateLimitHit(otpRequests, ipKey, 15 * 60 * 1000);
    recordRateLimitHit(otpRequests, emailOtpKey, 15 * 60 * 1000);

    const admin = await store.findAdminByEmail(cleanEmail);
    const neutralSuccess =
      'If this email is registered as an administrator account, a 6-digit verification code has been dispatched to the private recovery inbox. The code expires in 5 minutes.';

    if (!admin) {
      return res.json({ success: true, message: neutralSuccess });
    }

    const destinationEmail = (
      admin.recoveryEmail ||
      process.env.ADMIN_RECOVERY_EMAIL ||
      admin.email
    ).trim();

    const { otp, record } = createOtpRecord(admin.id, admin.email);
    await store.replaceActiveOtpsForUser(admin.id, record);

    const delivery = await sendRecoveryOtpEmail(destinationEmail, otp);
    if (!delivery.sent) {
      await store.markOtpUsed(record.id);
      return res.status(502).json({
        error: delivery.error || 'Email service failed to deliver the verification code.',
      });
    }

    return res.json({ success: true, message: neutralSuccess });
  } catch (err) {
    console.error('[Request OTP Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Unable to process recovery OTP request.' });
  }
});

app.post('/api/auth/forgot-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanOtp = typeof otp === 'string' ? otp.trim() : '';

    const verifyKey = `otp-verify:${getClientIp(req)}:${cleanEmail}`;
    const verifyLimit = checkRateLimit(otpRequests, verifyKey, 8, 15 * 60 * 1000);
    if (!verifyLimit.allowed) {
      return res.status(429).json({
        error: `Too many verification attempts. Please wait ${verifyLimit.retryAfterSec} seconds.`,
      });
    }

    if (!isValidEmail(cleanEmail) || !/^\d{6}$/.test(cleanOtp)) {
      recordRateLimitHit(otpRequests, verifyKey, 15 * 60 * 1000);
      return res
        .status(400)
        .json({ error: 'Valid email address and 6-digit verification code are required.' });
    }

    const result = await store.verifyOtp(cleanEmail, cleanOtp);
    if (!result.success || !result.resetGrantToken) {
      recordRateLimitHit(otpRequests, verifyKey, 15 * 60 * 1000);
      return res.status(400).json({ error: result.error || 'Invalid or expired verification code.' });
    }

    clearRateLimit(otpRequests, verifyKey);
    return res.json({
      success: true,
      resetGrantToken: result.resetGrantToken,
      message: 'Code verified. You may now set a new strong password.',
    });
  } catch (err) {
    console.error('[Verify OTP Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'OTP verification failed.' });
  }
});

app.post('/api/auth/forgot-password/reset-password', async (req, res) => {
  try {
    const { email, resetGrantToken, newPassword, confirmPassword } = req.body || {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    const resetKey = `otp-reset:${getClientIp(req)}:${cleanEmail}`;
    const resetLimit = checkRateLimit(otpRequests, resetKey, 5, 15 * 60 * 1000);
    if (!resetLimit.allowed) {
      return res.status(429).json({
        error: `Too many password reset attempts. Please wait ${resetLimit.retryAfterSec} seconds.`,
      });
    }

    if (!isValidEmail(cleanEmail)) {
      recordRateLimitHit(otpRequests, resetKey, 15 * 60 * 1000);
      return res.status(400).json({ error: 'Valid email address is required.' });
    }
    if (!newPassword || newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation do not match.' });
    }
    const strength = validateStrongPassword(newPassword);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.error });
    }

    const result = await store.consumeResetGrantAndUpdateAdminPassword({
      email: cleanEmail,
      resetGrantToken: resetGrantToken || '',
      newPasswordHash: hashPassword(newPassword),
    });

    if (!result.valid) {
      recordRateLimitHit(otpRequests, resetKey, 15 * 60 * 1000);
      return res
        .status(400)
        .json({ error: result.error || 'Verified OTP session is invalid or expired.' });
    }

    clearRateLimit(otpRequests, resetKey);
    clearSessionCookie(req, res);

    return res.json({
      success: true,
      message: 'Administrator password has been reset. Please sign in with your new password.',
    });
  } catch (err) {
    console.error('[Reset Password Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Password reset failed.' });
  }
});

// --- ADMIN SECURITY SETTINGS API ---
app.get('/api/admin/settings', requireAdmin, (req, res) => {
  const auth = (req as any).auth as { user: StoredUserRecord };
  const emailProvider = getEmailProviderStatus();
  const hasRecovery = Boolean(auth.user.recoveryEmail || process.env.ADMIN_RECOVERY_EMAIL);
  const status = store.getStatus();

  return res.json({
    adminEmail: auth.user.email,
    name: auth.user.name,
    hasPrivateRecoveryEmail: hasRecovery,
    emailServiceConfigured: emailProvider.configured,
    emailProvider: emailProvider.provider,
    persistenceMode: status.mode,
  });
});

app.put('/api/admin/settings/email', requireAdmin, async (req, res) => {
  try {
    const auth = (req as any).auth as { user: StoredUserRecord; session: SessionRecord };
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
    const conflict = await store.findUserByEmail(cleanNewEmail);
    if (conflict && conflict.id !== auth.user.id) {
      return res.status(409).json({ error: 'This email address is already associated with another account.' });
    }

    const { updatedUser, rawToken, ttlMs } = await store.updateAdminProfileAndRotateSession({
      user: auth.user,
      patch: { email: cleanNewEmail },
    });
    setSessionCookie(req, res, rawToken, ttlMs);

    return res.json({
      success: true,
      user: sanitizeUser(updatedUser),
      message: 'Administrator email updated successfully.',
    });
  } catch (err) {
    console.error('[Update Admin Email Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Failed to update administrator email.' });
  }
});

app.put('/api/admin/settings/password', requireAdmin, async (req, res) => {
  try {
    const auth = (req as any).auth as { user: StoredUserRecord; session: SessionRecord };
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

    const { rawToken, ttlMs } = await store.updateAdminProfileAndRotateSession({
      user: auth.user,
      patch: { passwordHash: hashPassword(newPassword) },
    });
    setSessionCookie(req, res, rawToken, ttlMs);

    return res.json({
      success: true,
      message: 'Administrator password updated and active sessions rotated.',
    });
  } catch (err) {
    console.error('[Update Admin Password Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Failed to update administrator password.' });
  }
});

app.put('/api/admin/settings/recovery-email', requireAdmin, async (req, res) => {
  try {
    const auth = (req as any).auth as { user: StoredUserRecord; session: SessionRecord };
    const { currentPassword, newRecoveryEmail } = req.body || {};

    if (!currentPassword || !verifyPassword(String(currentPassword), auth.user.passwordHash)) {
      return res.status(401).json({ error: 'Current administrator password is incorrect.' });
    }

    const cleanRecovery =
      typeof newRecoveryEmail === 'string' ? newRecoveryEmail.trim().toLowerCase() : '';
    if (!isValidEmail(cleanRecovery)) {
      return res.status(400).json({ error: 'Please enter a valid private recovery email address.' });
    }

    await store.updateAdminRecoveryEmail(auth.user.id, cleanRecovery);

    return res.json({
      success: true,
      hasPrivateRecoveryEmail: true,
      message: 'Private recovery email updated securely (kept hidden from public UI).',
    });
  } catch (err) {
    console.error('[Update Recovery Email Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Failed to update recovery email.' });
  }
});

app.post('/api/admin/cloud-sync-claim', requireAdmin, async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (typeof idToken !== 'string' || !idToken.trim()) {
      return res.status(400).json({ error: 'Firebase ID token is required.' });
    }

    const ctx = getFirebaseAdminContext();
    if (!ctx.configured || !ctx.auth) {
      return res.status(503).json({
        error: 'Server-side Firebase Admin is not configured yet.',
      });
    }

    const decoded = await ctx.auth.verifyIdToken(idToken.trim());
    if (!decoded.email_verified || !decoded.email) {
      return res.status(403).json({ error: 'Verified Google account email is required.' });
    }

    const result = await store.grantAdminCloudAccess(decoded.uid, decoded.email);
    return res.json({
      success: true,
      uid: decoded.uid,
      customClaimSet: result.customClaimSet,
    });
  } catch (err: any) {
    return res.status(401).json({ error: err?.message || 'Unable to verify Firebase ID token.' });
  }
});

// --- ADMIN IMAGE UPLOAD API ---
app.post('/api/admin/upload-image', requireAdmin, (req, res) => {
  const { filename, dataUrl } = req.body || {};
  if (!dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ error: 'Image file data is required.' });
  }

  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) {
    return res
      .status(400)
      .json({ error: 'Unsupported image format. Upload JPG, PNG, WEBP, or GIF files.' });
  }

  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const base64Data = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image file exceeds the 5MB maximum upload limit.' });
  }

  const rawBase =
    typeof filename === 'string' ? path.basename(filename, path.extname(filename)) : 'product';
  const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 32) || 'product';
  const outName = `${safeBase}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
  const outPath = path.join(PRODUCT_UPLOADS_DIR, outName);

  fs.writeFileSync(outPath, buffer);
  return res.status(201).json({ url: `/uploads/products/${outName}` });
});

// --- PRODUCTS API ---
app.get('/api/products', async (req, res) => {
  try {
    if (req.query.refresh === '1') {
      await syncProductsFromFirestoreRest(true);
    }
    let results = await store.listProducts();
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

    return res.json({ products: results, total: results.length });
  } catch (err) {
    console.error('[List Products Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Unable to load product catalog.' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    let prod = await store.getProductById(req.params.id);
    if (!prod) {
      await syncProductsFromFirestoreRest(true);
      prod = await store.getProductById(req.params.id);
    }
    if (!prod) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json(prod);
  } catch (err) {
    console.error('[Get Product Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Unable to load product details.' });
  }
});

async function buildValidatedProductPayload(
  body: any,
  existing?: Product
): Promise<{ product?: Product; error?: string }> {
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
  const mainImage =
    requestedMain && uniqueImages.includes(requestedMain) ? requestedMain : uniqueImages[0];
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
      body.discountPercentage !== undefined
        ? Number(body.discountPercentage)
        : existing?.discountPercentage,
  });

  if (!pricing.valid) {
    return { error: pricing.error || 'Invalid product pricing configuration.' };
  }

  const stockCount = Math.max(0, Math.round(Number(body.stockCount ?? existing?.stockCount ?? 0)));
  const requestedId =
    !existing && typeof body.id === 'string' && /^[a-zA-Z0-9_-]{3,80}$/.test(body.id.trim())
      ? body.id.trim()
      : null;

  let resolvedId: string = existing?.id ?? '';
  if (!resolvedId) {
    if (requestedId && !(await store.hasProductId(requestedId))) {
      resolvedId = requestedId;
    } else {
      resolvedId = 'rgd-cust-' + Date.now();
    }
  }

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
    description:
      typeof body.description === 'string' ? body.description.trim() : existing?.description || '',
    details: Array.isArray(body.details)
      ? body.details
      : existing?.details || ['Bespoke Luxury Release'],
    composition:
      typeof body.composition === 'string'
        ? body.composition
        : existing?.composition || '100% Bespoke Materials',
    sizes:
      Array.isArray(body.sizes) && body.sizes.length > 0 ? body.sizes : existing?.sizes || ['One Size'],
    colors:
      Array.isArray(body.colors) && body.colors.length > 0
        ? body.colors
        : existing?.colors || [{ name: 'Obsidian & Gold', hex: '#C6A45B' }],
    inStock: stockCount > 0,
    stockCount,
    isNewArrival:
      body.isNewArrival !== undefined ? Boolean(body.isNewArrival) : existing?.isNewArrival ?? true,
    isBestSeller:
      body.isBestSeller !== undefined ? Boolean(body.isBestSeller) : existing?.isBestSeller ?? false,
    isSpecialOffer:
      body.isSpecialOffer !== undefined
        ? Boolean(body.isSpecialOffer)
        : existing?.isSpecialOffer ?? pricing.discountEnabled,
    sku:
      typeof body.sku === 'string' && body.sku.trim()
        ? body.sku.trim()
        : existing?.sku || 'RGD-CUSTOM-' + Math.floor(1000 + Math.random() * 9000),
    isDemo: body.isDemo !== undefined ? Boolean(body.isDemo) : existing?.isDemo ?? false,
  };

  return { product };
}

app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    const result = await buildValidatedProductPayload(req.body || {});
    if (!result.product) {
      return res.status(400).json({ error: result.error });
    }

    const created = await store.createProduct({
      ...result.product,
      sortOrder:
        typeof req.body?.sortOrder === 'number' && Number.isFinite(req.body.sortOrder)
          ? req.body.sortOrder
          : Date.now(),
    });
    return res.status(201).json(created);
  } catch (err) {
    console.error('[Create Product Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Unable to save new product.' });
  }
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await store.getProductById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await buildValidatedProductPayload(req.body || {}, existing);
    if (!result.product) {
      return res.status(400).json({ error: result.error });
    }

    const updated = await store.updateProduct(req.params.id, {
      ...result.product,
      sortOrder:
        typeof req.body?.sortOrder === 'number' && Number.isFinite(req.body.sortOrder)
          ? req.body.sortOrder
          : undefined,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json(updated);
  } catch (err) {
    console.error('[Update Product Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Unable to update product.' });
  }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const removed = await store.deleteProduct(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json({ success: true, message: 'Product removed from collection.' });
  } catch (err) {
    console.error('[Delete Product Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Unable to remove product.' });
  }
});

// --- ORDERS API ---
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const auth = (req as any).auth as { user: StoredUserRecord };
    if (auth.user.role === 'admin') {
      const orders = await store.listAllOrders();
      return res.json({ orders });
    }

    const ownOrders = await store.listOrdersForCustomer(auth.user.id, auth.user.email);
    return res.json({ orders: ownOrders });
  } catch (err) {
    console.error('[Get Orders Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Failed to retrieve orders.' });
  }
});

app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
  try {
    const orders = await store.listAllOrders();
    return res.json({ orders });
  } catch (err) {
    console.error('[Admin Orders Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Failed to load orders.' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customer, items, paymentMethod, notes, promoCode } = req.body || {};

    const customerValidation = validateOrderInput(customer || {});
    if (!customerValidation.valid) {
      const firstError =
        Object.values(customerValidation.errors)[0] || 'Incomplete customer delivery information.';
      return res.status(400).json({ error: firstError, errors: customerValidation.errors });
    }

    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return res.status(400).json({
        error:
          items && items.length > 50 ? 'Too many line items in a single order.' : 'Cart is empty.',
      });
    }

    if (store.getStatus().mode !== 'firestore') {
      const currentProducts = await store.listProducts();
      const hasMissing = items.some((it: any) => !currentProducts.some((p) => p.id === it.productId));
      if (hasMissing) {
        await syncProductsFromFirestoreRest(true);
      }
    }

    const auth = await getAuthContext(req);
    const method = paymentMethod === 'cod' ? 'cod' : 'card_demo';

    const txResult = await store.createOrderTransaction({
      items,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        city: customer.city.trim(),
        postalCode: customer.postalCode.trim(),
        country: (customer.country || 'United States').trim(),
      },
      userId: auth?.user.id,
      paymentMethod: method,
      promoCode: typeof promoCode === 'string' ? promoCode : undefined,
      notes: typeof notes === 'string' ? notes.trim().slice(0, 1000) : '',
    });

    if (!txResult.order) {
      return res
        .status(txResult.statusCode || 400)
        .json({ error: txResult.error || 'Unable to place order.' });
    }

    return res.status(201).json(txResult.order);
  } catch (err) {
    console.error('[Create Order Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Order transaction failed.' });
  }
});

app.put('/api/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, trackingNumber } = req.body || {};
    const allowedStatuses = ['Confirmed', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status.' });
    }

    const updated = await store.updateOrderStatus(req.params.id, {
      status,
      trackingNumber:
        typeof trackingNumber === 'string' && trackingNumber.trim()
          ? trackingNumber.trim()
          : undefined,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.json(updated);
  } catch (err) {
    console.error('[Update Order Status Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// --- NEWSLETTER & INQUIRY API ---
app.post('/api/newsletter', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !isValidEmail(String(email))) {
      return res.status(400).json({ error: 'Valid email address required.' });
    }
    await store.addSubscriber(String(email));
    return res.json({ success: true, message: 'Welcome to the RGD LUXE Private Gazette.' });
  } catch (err) {
    console.error('[Newsletter Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Subscription could not be saved.' });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !isValidEmail(String(email || '')) || !message) {
      return res.status(400).json({ error: 'Valid name, email, and message are required.' });
    }
    await store.addContactMessage({
      id: 'msg_' + Date.now() + '_' + crypto.randomBytes(2).toString('hex'),
      name: String(name).trim().slice(0, 120),
      email: String(email).trim().toLowerCase().slice(0, 180),
      subject: String(subject || 'General Concierge Inquiry').trim().slice(0, 200),
      message: String(message).trim().slice(0, 4000),
      createdAt: new Date().toISOString(),
    });
    return res.json({
      success: true,
      message: 'Your concierge inquiry has been securely delivered.',
    });
  } catch (err) {
    console.error('[Contact Error]', (err as Error)?.message || err);
    return res.status(500).json({ error: 'Failed to record concierge inquiry.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    brand: 'RGD LUXE',
    timestamp: new Date().toISOString(),
  });
});

// --- VITE & STATIC SERVING ---
async function startServer() {
  const initStatus = await store.init();
  if (initStatus.mode !== 'firestore') {
    await syncProductsFromFirestoreRest(true);
  }

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
