import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OTP_EXPIRY_MS,
  OtpRecord,
  consumeResetGrant,
  createOtpRecord,
  generateSessionToken,
  hashPassword,
  hashToken,
  isValidEmail,
  validateStrongPassword,
  verifyOtpAttempt,
  verifyPassword,
} from './authSecurity';

test('hashPassword and verifyPassword securely hash and verify passwords', () => {
  const hash1 = hashPassword('Vault#Test2026$');
  const hash2 = hashPassword('Vault#Test2026$');
  assert.notEqual(hash1, 'Vault#Test2026$');
  assert.notEqual(hash1, hash2); // unique random salt per hash
  assert.equal(verifyPassword('Vault#Test2026$', hash1), true);
  assert.equal(verifyPassword('WrongPass1!', hash1), false);
  assert.equal(verifyPassword('Vault#Test2026$', 'plaintext_no_colon'), false);
});

test('validateStrongPassword and isValidEmail enforce security rules', () => {
  assert.equal(isValidEmail('director@example.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);

  assert.equal(validateStrongPassword('12345').valid, false);
  assert.equal(validateStrongPassword('abcdefgh').valid, false); // needs number or symbol
  assert.equal(validateStrongPassword('Vault#Test2026$').valid, true);
});

test('generateSessionToken produces unique tokens whose SHA-256 hash matches hashToken', () => {
  const { token, tokenHash } = generateSessionToken();
  assert.equal(token.length, 64);
  assert.equal(hashToken(token), tokenHash);
});

test('OTP generation, verification, 5-minute expiry, and single-use consumption', () => {
  const t0 = 1_700_000_000_000;
  const { otp, record } = createOtpRecord('usr_admin', 'director@example.com', t0);
  assert.match(otp, /^\d{6}$/);
  assert.notEqual(record.otpHash, otp);

  const records: OtpRecord[] = [record];

  // Wrong OTP rejected
  const wrong = verifyOtpAttempt(records, 'director@example.com', '000000', t0 + 1000);
  assert.equal(wrong.success, false);

  // Valid OTP within 5 minutes succeeds and issues resetGrantToken
  const ok = verifyOtpAttempt(records, 'director@example.com', otp, t0 + 60_000);
  assert.equal(ok.success, true);
  assert.ok(ok.resetGrantToken);
  assert.equal(record.used, true);

  // Reusing the same OTP fails
  const replay = verifyOtpAttempt(records, 'director@example.com', otp, t0 + 65_000);
  assert.equal(replay.success, false);

  // Reset grant token works once and cannot be reused
  const grantOk = consumeResetGrant(records, 'director@example.com', ok.resetGrantToken!, t0 + 70_000);
  assert.equal(grantOk.valid, true);
  assert.equal(grantOk.userId, 'usr_admin');

  const grantReplay = consumeResetGrant(records, 'director@example.com', ok.resetGrantToken!, t0 + 75_000);
  assert.equal(grantReplay.valid, false);
});

test('OTP rejects expired codes and locks out after 5 failed attempts', () => {
  const t0 = 1_700_000_000_000;
  const expired = createOtpRecord('usr_admin', 'admin@example.com', t0);
  const expiredRes = verifyOtpAttempt([expired.record], 'admin@example.com', expired.otp, t0 + OTP_EXPIRY_MS + 1);
  assert.equal(expiredRes.success, false);
  assert.match(expiredRes.error || '', /expired/i);

  const brute = createOtpRecord('usr_admin', 'admin@example.com', t0);
  const list = [brute.record];
  for (let i = 0; i < 5; i++) {
    const attempt = verifyOtpAttempt(list, 'admin@example.com', '999999', t0 + 1000);
    assert.equal(attempt.success, false);
  }
  // 6th attempt even with real OTP is locked out because code was invalidated
  const locked = verifyOtpAttempt(list, 'admin@example.com', brute.otp, t0 + 2000);
  assert.equal(locked.success, false);
});
