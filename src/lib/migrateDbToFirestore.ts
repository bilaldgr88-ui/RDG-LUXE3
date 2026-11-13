import crypto from 'crypto';
import fs from 'fs';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { INITIAL_ORDERS, INITIAL_PRODUCTS } from '../data/seedData.ts';
import type { Order, Product } from '../types/index.ts';
import { hashPassword, type OtpRecord } from '../utils/authSecurity.ts';
import { getNormalizedGallery, sanitizeProductPricing } from '../utils/pricing.ts';
import { sanitizeAndClampProductForStorage, type ProductWithSort } from '../utils/productCatalog.ts';

export interface StoredUserRecord {
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

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  role: 'admin' | 'customer';
  createdAt: number;
  expiresAt: number;
}

export interface ContactMessageRecord {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface LegacyDbJsonShape {
  products?: Product[];
  orders?: Order[];
  users?: StoredUserRecord[];
  sessions?: SessionRecord[];
  passwordResetOtps?: OtpRecord[];
  subscribers?: string[];
  contactMessages?: ContactMessageRecord[];
}

export interface MigrationReport {
  skippedAlreadyMigrated: boolean;
  productsCreated: number;
  usersCreated: number;
  ordersCreated: number;
  sessionsCreated: number;
  otpsCreated: number;
  subscribersCreated: number;
  contactMessagesCreated: number;
  adminBootstrapped: boolean;
  totalsInSource: {
    products: number;
    users: number;
    orders: number;
    sessions: number;
    otps: number;
    subscribers: number;
    contactMessages: number;
  };
}

export function subscriberDocId(email: string): string {
  const clean = email.trim().toLowerCase();
  return 'sub_' + crypto.createHash('sha256').update(clean).digest('hex').slice(0, 24);
}

export function normalizeLegacyProduct(raw: Product, sortOrder: number): ProductWithSort {
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

  return sanitizeAndClampProductForStorage(
    {
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
    },
    sortOrder
  );
}

async function createIfMissing(
  ref: FirebaseFirestore.DocumentReference,
  data: Record<string, any>
): Promise<boolean> {
  try {
    await ref.create(data);
    return true;
  } catch (err: any) {
    // gRPC ALREADY_EXISTS = 6
    if (err?.code === 6 || /ALREADY_EXISTS/i.test(String(err?.message || ''))) {
      return false;
    }
    throw err;
  }
}

export async function migrateDbJsonToFirestore(params: {
  db: Firestore;
  dbFilePath: string;
  envAdmin?: {
    email?: string;
    password?: string;
    recoveryEmail?: string;
  };
  forceCheckAllCollections?: boolean;
}): Promise<MigrationReport> {
  const { db, dbFilePath, envAdmin, forceCheckAllCollections = false } = params;

  const migrationMarkerRef = db.collection('app_settings').doc('migration_v1');
  if (!forceCheckAllCollections) {
    const markerSnap = await migrationMarkerRef.get();
    if (markerSnap.exists && markerSnap.data()?.completed === true) {
      const existingData = markerSnap.data() || {};
      return {
        skippedAlreadyMigrated: true,
        productsCreated: 0,
        usersCreated: 0,
        ordersCreated: 0,
        sessionsCreated: 0,
        otpsCreated: 0,
        subscribersCreated: 0,
        contactMessagesCreated: 0,
        adminBootstrapped: false,
        totalsInSource: existingData.totalsInSource || {
          products: 0,
          users: 0,
          orders: 0,
          sessions: 0,
          otps: 0,
          subscribers: 0,
          contactMessages: 0,
        },
      };
    }
  }

  let loaded: LegacyDbJsonShape = {};
  if (fs.existsSync(dbFilePath)) {
    const raw = fs.readFileSync(dbFilePath, 'utf8');
    loaded = JSON.parse(raw) as LegacyDbJsonShape;
  }

  const now = Date.now();

  const sourceProducts =
    Array.isArray(loaded.products) && loaded.products.length > 0
      ? loaded.products
      : INITIAL_PRODUCTS;

  const sourceOrders = Array.isArray(loaded.orders) ? loaded.orders : INITIAL_ORDERS;

  let sourceUsers: StoredUserRecord[] = Array.isArray(loaded.users)
    ? loaded.users.filter((u) => u.email.toLowerCase() !== 'admin@rgdluxe.com')
    : [];

  sourceUsers = sourceUsers.map((u) => ({
    ...u,
    email: u.email.trim().toLowerCase(),
    recoveryEmail: u.recoveryEmail ? u.recoveryEmail.trim().toLowerCase() : undefined,
    passwordHash:
      u.passwordHash && u.passwordHash.includes(':')
        ? u.passwordHash
        : hashPassword(u.passwordHash || crypto.randomBytes(16).toString('hex')),
  }));

  const sourceSessions = Array.isArray(loaded.sessions)
    ? loaded.sessions.filter((s) => s.expiresAt > now)
    : [];

  const sourceOtps = Array.isArray(loaded.passwordResetOtps)
    ? loaded.passwordResetOtps.filter((o) => now - o.createdAt < 24 * 60 * 60 * 1000)
    : [];

  const sourceSubscribers = Array.isArray(loaded.subscribers)
    ? Array.from(new Set(loaded.subscribers.map((s) => String(s).trim().toLowerCase()).filter(Boolean)))
    : [];

  const sourceMessages = Array.isArray(loaded.contactMessages) ? loaded.contactMessages : [];

  let productsCreated = 0;
  for (let i = 0; i < sourceProducts.length; i++) {
    const p = sourceProducts[i];
    const weight =
      typeof (p as ProductWithSort).sortOrder === 'number'
        ? (p as ProductWithSort).sortOrder!
        : p.id.startsWith('rgd-cust-')
        ? now - i
        : 1_000_000 - i;
    const normalized = normalizeLegacyProduct(p, weight);
    const created = await createIfMissing(db.collection('products').doc(normalized.id), {
      ...normalized,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (created) productsCreated++;
  }

  await db
    .collection('catalog_meta')
    .doc('state')
    .set(
      {
        seeded: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  let usersCreated = 0;
  for (const u of sourceUsers) {
    const created = await createIfMissing(db.collection('users').doc(u.id), {
      ...u,
      migratedAt: FieldValue.serverTimestamp(),
    });
    if (created) usersCreated++;
  }

  let adminBootstrapped = false;
  const adminSnap = await db.collection('users').where('role', '==', 'admin').limit(1).get();
  if (adminSnap.empty) {
    const cleanEmail = (envAdmin?.email || '').trim().toLowerCase();
    const rawPw = envAdmin?.password || '';
    const cleanRecovery = (envAdmin?.recoveryEmail || '').trim().toLowerCase();
    if (cleanEmail && rawPw) {
      await createIfMissing(db.collection('users').doc('usr_admin'), {
        id: 'usr_admin',
        email: cleanEmail,
        name: 'Maison RGD Director',
        passwordHash: hashPassword(rawPw),
        role: 'admin',
        recoveryEmail: cleanRecovery || undefined,
        city: 'New York',
        country: 'United States',
        createdAt: FieldValue.serverTimestamp(),
      });
      adminBootstrapped = true;
    }
  }

  let ordersCreated = 0;
  for (const o of sourceOrders) {
    const normalizedOrder: Order =
      o.paymentMethod === 'card_demo' && o.paymentStatus === ('paid' as unknown as string)
        ? { ...o, paymentStatus: 'demo_unpaid' }
        : o;
    const created = await createIfMissing(db.collection('orders').doc(normalizedOrder.id), {
      ...normalizedOrder,
      migratedAt: FieldValue.serverTimestamp(),
    });
    if (created) ordersCreated++;
  }

  let sessionsCreated = 0;
  for (const s of sourceSessions) {
    const created = await createIfMissing(db.collection('sessions').doc(s.id), s);
    if (created) sessionsCreated++;
  }

  let otpsCreated = 0;
  for (const otp of sourceOtps) {
    const created = await createIfMissing(db.collection('password_reset_otps').doc(otp.id), otp);
    if (created) otpsCreated++;
  }

  let subscribersCreated = 0;
  for (const email of sourceSubscribers) {
    const docId = subscriberDocId(email);
    const created = await createIfMissing(db.collection('subscribers').doc(docId), {
      id: docId,
      email,
      createdAt: Timestamp.now().toDate().toISOString(),
    });
    if (created) subscribersCreated++;
  }

  let contactMessagesCreated = 0;
  for (const msg of sourceMessages) {
    const created = await createIfMissing(db.collection('contact_messages').doc(msg.id), msg);
    if (created) contactMessagesCreated++;
  }

  const adminUserDoc = (await db.collection('users').where('role', '==', 'admin').limit(1).get()).docs[0]?.data();
  await db
    .collection('app_settings')
    .doc('security')
    .set(
      {
        adminUserId: adminUserDoc?.id || 'usr_admin',
        hasPrivateRecoveryEmail: Boolean(adminUserDoc?.recoveryEmail || envAdmin?.recoveryEmail),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  const totalsInSource = {
    products: sourceProducts.length,
    users: sourceUsers.length,
    orders: sourceOrders.length,
    sessions: sourceSessions.length,
    otps: sourceOtps.length,
    subscribers: sourceSubscribers.length,
    contactMessages: sourceMessages.length,
  };

  await migrationMarkerRef.set(
    {
      completed: true,
      migratedAt: FieldValue.serverTimestamp(),
      totalsInSource,
      lastRunCreated: {
        productsCreated,
        usersCreated,
        ordersCreated,
        sessionsCreated,
        otpsCreated,
        subscribersCreated,
        contactMessagesCreated,
      },
    },
    { merge: true }
  );

  return {
    skippedAlreadyMigrated: false,
    productsCreated,
    usersCreated,
    ordersCreated,
    sessionsCreated,
    otpsCreated,
    subscribersCreated,
    contactMessagesCreated,
    adminBootstrapped,
    totalsInSource,
  };
}
