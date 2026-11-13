import crypto from 'crypto';

export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_OTP_ATTEMPTS = 5;
export const ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
export const CUSTOMER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface OtpRecord {
  id: string;
  userId: string;
  email: string;
  otpSalt: string;
  otpHash: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  used: boolean;
  resetGrantTokenHash?: string;
  resetGrantExpiresAt?: number;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

export function validateStrongPassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must include letters and at least one number or special symbol.' };
  }
  return { valid: true };
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token) };
}

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtpCode(otp: string, existingSalt?: string): { salt: string; hash: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(otp.trim()).digest('hex');
  return { salt, hash };
}

export function verifyOtpHash(otp: string, salt: string, expectedHash: string): boolean {
  if (!otp || !salt || !expectedHash) return false;
  try {
    const { hash } = hashOtpCode(otp, salt);
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function createOtpRecord(
  userId: string,
  email: string,
  now = Date.now()
): { otp: string; record: OtpRecord } {
  const otp = generateOtpCode();
  const { salt, hash } = hashOtpCode(otp);
  const record: OtpRecord = {
    id: 'otp_' + crypto.randomBytes(8).toString('hex'),
    userId,
    email: email.trim().toLowerCase(),
    otpSalt: salt,
    otpHash: hash,
    createdAt: now,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
    used: false,
  };
  return { otp, record };
}

export function verifyOtpAttempt(
  records: OtpRecord[],
  email: string,
  otpInput: string,
  now = Date.now()
): {
  success: boolean;
  error?: string;
  resetGrantToken?: string;
} {
  const cleanEmail = (email || '').trim().toLowerCase();
  const active = [...records]
    .reverse()
    .find((r) => r.email === cleanEmail && !r.used);

  if (!active) {
    return { success: false, error: 'Invalid or expired verification code.' };
  }

  if (now > active.expiresAt) {
    active.used = true;
    return { success: false, error: 'Verification code has expired. Please request a new code.' };
  }

  if (active.attempts >= MAX_OTP_ATTEMPTS) {
    active.used = true;
    return { success: false, error: 'Maximum verification attempts exceeded. Please request a new code.' };
  }

  active.attempts += 1;

  const matches = verifyOtpHash((otpInput || '').trim(), active.otpSalt, active.otpHash);
  if (!matches) {
    if (active.attempts >= MAX_OTP_ATTEMPTS) {
      active.used = true;
      return { success: false, error: 'Maximum verification attempts exceeded. Code invalidated.' };
    }
    return { success: false, error: 'Invalid verification code.' };
  }

  // Valid OTP! Mark OTP consumed so it can never be reused, and issue single-use reset grant token.
  active.used = true;
  const grant = generateSessionToken();
  active.resetGrantTokenHash = grant.tokenHash;
  active.resetGrantExpiresAt = now + OTP_EXPIRY_MS;

  return { success: true, resetGrantToken: grant.token };
}

export function consumeResetGrant(
  records: OtpRecord[],
  email: string,
  resetGrantToken: string,
  now = Date.now()
): { valid: boolean; userId?: string; error?: string } {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!resetGrantToken) {
    return { valid: false, error: 'Verified recovery session is required.' };
  }

  const incomingHash = hashToken(resetGrantToken);
  const matching = records.find(
    (r) =>
      r.email === cleanEmail &&
      r.resetGrantTokenHash &&
      r.resetGrantExpiresAt &&
      now <= r.resetGrantExpiresAt
  );

  if (!matching || !matching.resetGrantTokenHash) {
    return { valid: false, error: 'Recovery session expired or invalid. Please request a new code.' };
  }

  try {
    const a = Buffer.from(incomingHash, 'hex');
    const b = Buffer.from(matching.resetGrantTokenHash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, error: 'Recovery verification token is invalid.' };
    }
  } catch {
    return { valid: false, error: 'Recovery verification token is invalid.' };
  }

  // Single-use: destroy the reset grant immediately
  delete matching.resetGrantTokenHash;
  delete matching.resetGrantExpiresAt;
  matching.used = true;

  return { valid: true, userId: matching.userId };
}
