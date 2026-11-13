import fs from 'fs';
import { getApp, getApps, initializeApp, cert, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

export interface ParsedServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  raw: ServiceAccount & Record<string, any>;
}

export interface FirebaseAdminContext {
  configured: boolean;
  projectId?: string;
  databaseId: string;
  app?: App;
  db?: Firestore;
  auth?: Auth;
  reason?: string;
}

export function parseServiceAccountInput(rawInput: string): ParsedServiceAccount | null {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return null;

  let jsonText = trimmed;
  if (!trimmed.startsWith('{')) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim();
      if (decoded.startsWith('{')) {
        jsonText = decoded;
      }
    } catch {
      return null;
    }
  }

  try {
    const parsed = JSON.parse(jsonText) as Record<string, any>;
    const projectId = typeof parsed.project_id === 'string' ? parsed.project_id.trim() : '';
    const clientEmail = typeof parsed.client_email === 'string' ? parsed.client_email.trim() : '';
    let privateKey = typeof parsed.private_key === 'string' ? parsed.private_key : '';
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (!projectId || !clientEmail || !privateKey.includes('BEGIN PRIVATE KEY')) {
      return null;
    }

    return {
      projectId,
      clientEmail,
      privateKey,
      raw: {
        ...parsed,
        projectId,
        clientEmail,
        privateKey,
      },
    };
  } catch {
    return null;
  }
}

let cachedContext: FirebaseAdminContext | null = null;

export function resetFirebaseAdminCacheForTests() {
  cachedContext = null;
}

export function getFirebaseAdminContext(): FirebaseAdminContext {
  if (cachedContext) return cachedContext;

  const databaseId = (process.env.FIREBASE_DATABASE_ID || '(default)').trim() || '(default)';
  const rawSecret = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '';
  const credPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();

  let rawJson = rawSecret;
  if (!rawJson && credPath && fs.existsSync(credPath)) {
    try {
      rawJson = fs.readFileSync(credPath, 'utf8');
    } catch {
      rawJson = '';
    }
  }

  if (!rawJson) {
    cachedContext = {
      configured: false,
      databaseId,
      reason: 'FIREBASE_SERVICE_ACCOUNT_KEY is not configured in backend environment.',
    };
    return cachedContext;
  }

  const parsed = parseServiceAccountInput(rawJson);
  if (!parsed) {
    cachedContext = {
      configured: false,
      databaseId,
      reason: 'FIREBASE_SERVICE_ACCOUNT_KEY is present but invalid JSON/service-account format.',
    };
    return cachedContext;
  }

  try {
    const app =
      getApps().length > 0
        ? getApp()
        : initializeApp({
            credential: cert({
              projectId: parsed.projectId,
              clientEmail: parsed.clientEmail,
              privateKey: parsed.privateKey,
            }),
            projectId: parsed.projectId,
          });

    const db =
      databaseId === '(default)' ? getFirestore(app) : getFirestore(app, databaseId);
    db.settings({ ignoreUndefinedProperties: true });
    const auth = getAuth(app);

    cachedContext = {
      configured: true,
      projectId: parsed.projectId,
      databaseId,
      app,
      db,
      auth,
    };
    return cachedContext;
  } catch (err: any) {
    cachedContext = {
      configured: false,
      databaseId,
      reason: err?.message || 'Failed to initialize Firebase Admin SDK.',
    };
    return cachedContext;
  }
}

export async function verifyFirebaseAdminConnectivity(): Promise<{
  ok: boolean;
  projectId?: string;
  databaseId: string;
  error?: string;
}> {
  const ctx = getFirebaseAdminContext();
  if (!ctx.configured || !ctx.db) {
    return {
      ok: false,
      databaseId: ctx.databaseId,
      error: ctx.reason || 'Firebase Admin is not configured.',
    };
  }

  try {
    await ctx.db.collection('app_settings').doc('connectivity_probe').get();
    return {
      ok: true,
      projectId: ctx.projectId,
      databaseId: ctx.databaseId,
    };
  } catch (err: any) {
    return {
      ok: false,
      projectId: ctx.projectId,
      databaseId: ctx.databaseId,
      error: err?.message || 'Firestore read verification failed.',
    };
  }
}
