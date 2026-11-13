import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseServiceAccountInput } from '../lib/firebaseAdmin.ts';
import { subscriberDocId } from '../lib/migrateDbToFirestore.ts';

const ROOT = process.cwd();

describe('RGD LUXE Security & Firestore Rules Audit', () => {
  it('firestore.rules contains no hardcoded admin email and enforces verified custom claim or /admins/{uid} RBAC', () => {
    const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');

    assert.equal(rules.includes('bilaldgr88@gmail.com'), false);
    assert.equal(rules.includes('admin@rgdluxe.com'), false);
    assert.equal(rules.includes('isBootstrappedAdmin'), false);
    assert.ok(rules.includes("rules_version = '2';"));
    assert.ok(rules.includes('allow read, write: if false;'));
    assert.ok(rules.includes('request.auth.token.email_verified == true'));
    assert.ok(rules.includes('request.auth.token.admin == true'));
    assert.ok(rules.includes('exists(/databases/$(database)/documents/admins/$(request.auth.uid))'));
    assert.ok(rules.includes('allow create, update, delete: if false;'));

    for (const privCol of [
      '/users/{userId}',
      '/orders/{orderId}',
      '/sessions/{sessionId}',
      '/password_reset_otps/{otpId}',
      '/subscribers/{subId}',
      '/contact_messages/{msgId}',
      '/app_settings/{settingId}',
    ]) {
      assert.ok(rules.includes(`match ${privCol}`), `Missing explicit private rule for ${privCol}`);
    }
  });

  it('client code contains no hardcoded admin emails or backend secret env keys', () => {
    const firestoreCatalog = fs.readFileSync(path.join(ROOT, 'src/utils/firestoreCatalog.ts'), 'utf8');
    const adminDashboard = fs.readFileSync(path.join(ROOT, 'src/pages/AdminDashboard.tsx'), 'utf8');

    assert.equal(firestoreCatalog.includes('bilaldgr88@gmail.com'), false);
    assert.equal(firestoreCatalog.includes('BOOTSTRAPPED_CLOUD_ADMIN_EMAIL'), false);
    assert.equal(adminDashboard.includes('bilaldgr88@gmail.com'), false);
    assert.equal(adminDashboard.includes('BOOTSTRAPPED_CLOUD_ADMIN_EMAIL'), false);
    assert.equal(adminDashboard.includes('process.env'), false);
    assert.equal(adminDashboard.includes('SESSION_SECRET'), false);
    assert.equal(/\bre_[A-Za-z0-9_]{10,}/.test(adminDashboard), false);
    assert.equal(/\bre_[A-Za-z0-9_]{10,}/.test(firestoreCatalog), false);
  });

  it('.gitignore protects .env files while allowing .env.example', () => {
    const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    assert.ok(gitignore.includes('.env*'));
    assert.ok(gitignore.includes('!.env.example'));
  });

  it('parseServiceAccountInput validates raw JSON and base64 formats safely and rejects malformed inputs', () => {
    const sample = JSON.stringify({
      project_id: 'rgd-luxe3',
      client_email: 'firebase-admin@rgd-luxe3.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\\nTEST\\n-----END PRIVATE KEY-----\\n',
    });
    const parsedRaw = parseServiceAccountInput(sample);
    assert.equal(parsedRaw?.projectId, 'rgd-luxe3');
    assert.ok(parsedRaw?.privateKey.includes('\nTEST\n'));

    const b64 = Buffer.from(sample, 'utf8').toString('base64');
    const parsedB64 = parseServiceAccountInput(b64);
    assert.equal(parsedB64?.projectId, 'rgd-luxe3');

    assert.equal(parseServiceAccountInput('not-valid-json'), null);
    assert.equal(parseServiceAccountInput('{"project_id":"x"}'), null);
  });

  it('subscriberDocId produces deterministic idempotent document IDs regardless of email casing', () => {
    assert.equal(subscriberDocId('Client@Example.com '), subscriberDocId('client@example.com'));
  });
});
