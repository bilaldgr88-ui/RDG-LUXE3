import crypto from 'crypto';
import fs from 'fs';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { INITIAL_ORDERS, INITIAL_PRODUCTS } from '../data/seedData.ts';
import type { Order, OrderItem, Product } from '../types/index.ts';
import {
  ADMIN_SESSION_TTL_MS,
  CUSTOMER_SESSION_TTL_MS,
  consumeResetGrant,
  generateSessionToken,
  hashPassword,
  verifyOtpAttempt,
  type OtpRecord,
} from '../utils/authSecurity.ts';
import { calculateCartTotals, getEffectivePrice } from '../utils/pricing.ts';
import { sanitizeAndClampProductForStorage, sortCatalogProducts, type ProductWithSort } from '../utils/productCatalog.ts';
import { getFirebaseAdminContext } from './firebaseAdmin.ts';
import {
  migrateDbJsonToFirestore,
  normalizeLegacyProduct,
  subscriberDocId,
  type ContactMessageRecord,
  type LegacyDbJsonShape,
  type SessionRecord,
  type StoredUserRecord,
} from './migrateDbToFirestore.ts';

export type PersistenceMode = 'firestore' | 'json_fallback';

export interface OrderLineInput {
  productId: string;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  name?: string;
}

export class StoreRepository {
  private dbFilePath: string;
  private firestore: Firestore | null = null;
  private mode: PersistenceMode = 'json_fallback';
  private projectId?: string;
  private databaseId = '(default)';
  private fallbackState: Required<LegacyDbJsonShape>;

  constructor(dbFilePath: string) {
    this.dbFilePath = dbFilePath;
    this.fallbackState = this.loadLocalJsonState();
  }

  private loadLocalJsonState(): Required<LegacyDbJsonShape> {
    let loaded: LegacyDbJsonShape | null = null;
    if (fs.existsSync(this.dbFilePath)) {
      try {
        loaded = JSON.parse(fs.readFileSync(this.dbFilePath, 'utf8')) as LegacyDbJsonShape;
      } catch {
        loaded = null;
      }
    }

    let dirty = !loaded;
    const now = Date.now();

    const products = (
      Array.isArray(loaded?.products) && loaded!.products.length > 0
        ? loaded!.products
        : INITIAL_PRODUCTS
    ).map((p, idx) => normalizeLegacyProduct(p, (p as ProductWithSort).sortOrder ?? 1_000_000 - idx));

    const orders: Order[] = (Array.isArray(loaded?.orders) ? loaded!.orders : INITIAL_ORDERS).map((o) => {
      if (o.paymentMethod === 'card_demo' && o.paymentStatus === ('paid' as unknown as string)) {
        dirty = true;
        return { ...o, paymentStatus: 'demo_unpaid' as const };
      }
      return o;
    });

    let users: StoredUserRecord[] = Array.isArray(loaded?.users) ? [...loaded!.users] : [];
    const beforeLen = users.length;
    users = users.filter((u) => u.email.toLowerCase() !== 'admin@rgdluxe.com');
    if (users.length !== beforeLen) dirty = true;

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

    const sessions: SessionRecord[] = Array.isArray(loaded?.sessions)
      ? loaded!.sessions.filter((s) => s.expiresAt > now)
      : [];

    const passwordResetOtps: OtpRecord[] = Array.isArray(loaded?.passwordResetOtps)
      ? loaded!.passwordResetOtps.filter((o) => now - o.createdAt < 24 * 60 * 60 * 1000)
      : [];

    const state: Required<LegacyDbJsonShape> = {
      products,
      orders,
      users,
      sessions,
      passwordResetOtps,
      subscribers: Array.isArray(loaded?.subscribers) ? loaded!.subscribers : [],
      contactMessages: Array.isArray(loaded?.contactMessages) ? loaded!.contactMessages : [],
    };

    if (dirty || !fs.existsSync(this.dbFilePath)) {
      this.saveLocalJsonState(state);
    }

    return state;
  }

  private saveLocalJsonState(state: Required<LegacyDbJsonShape>) {
    const tmpFile = `${this.dbFilePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2));
    fs.renameSync(tmpFile, this.dbFilePath);
  }

  async init(): Promise<{ mode: PersistenceMode; projectId?: string; databaseId: string }> {
    const ctx = getFirebaseAdminContext();
    if (!ctx.configured || !ctx.db) {
      this.mode = 'json_fallback';
      this.firestore = null;
      this.databaseId = ctx.databaseId;
      console.warn(`[RGD LUXE] Running in local JSON fallback mode: ${ctx.reason}`);
      return { mode: this.mode, databaseId: this.databaseId };
    }

    try {
      // Probe connectivity and run idempotent initial migration from data/db.json if not yet completed
      await migrateDbJsonToFirestore({
        db: ctx.db,
        dbFilePath: this.dbFilePath,
        envAdmin: {
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD,
          recoveryEmail: process.env.ADMIN_RECOVERY_EMAIL,
        },
        forceCheckAllCollections: false,
      });

      this.firestore = ctx.db;
      this.mode = 'firestore';
      this.projectId = ctx.projectId;
      this.databaseId = ctx.databaseId;
      console.log(
        `[RGD LUXE] Firestore Admin persistence active (project=${this.projectId}, db=${this.databaseId})`
      );
      return {
        mode: this.mode,
        projectId: this.projectId,
        databaseId: this.databaseId,
      };
    } catch (err: any) {
      this.mode = 'json_fallback';
      this.firestore = null;
      console.error(
        `[RGD LUXE] Firestore initialization failed, staying in JSON fallback mode: ${err?.message || err}`
      );
      return { mode: this.mode, databaseId: this.databaseId };
    }
  }

  getStatus() {
    return {
      mode: this.mode,
      projectId: this.projectId,
      databaseId: this.databaseId,
    };
  }

  // --- PRODUCTS ---
  async listProducts(): Promise<Product[]> {
    if (this.mode === 'firestore' && this.firestore) {
      const snap = await this.firestore.collection('products').get();
      const items = snap.docs.map((d) => {
        const raw = d.data() as ProductWithSort;
        return sanitizeAndClampProductForStorage({ ...raw, id: raw.id || d.id });
      });
      return sortCatalogProducts(items);
    }
    return sortCatalogProducts(this.fallbackState.products);
  }

  async getProductById(id: string): Promise<Product | null> {
    if (this.mode === 'firestore' && this.firestore) {
      const snap = await this.firestore.collection('products').doc(id).get();
      if (!snap.exists) return null;
      const raw = snap.data() as ProductWithSort;
      return sanitizeAndClampProductForStorage({ ...raw, id: raw.id || snap.id });
    }
    return this.fallbackState.products.find((p) => p.id === id) || null;
  }

  async hasProductId(id: string): Promise<boolean> {
    if (this.mode === 'firestore' && this.firestore) {
      const snap = await this.firestore.collection('products').doc(id).get();
      return snap.exists;
    }
    return this.fallbackState.products.some((p) => p.id === id);
  }

  async createProduct(product: ProductWithSort): Promise<ProductWithSort> {
    const safe = sanitizeAndClampProductForStorage(product, product.sortOrder ?? Date.now());
    if (this.mode === 'firestore' && this.firestore) {
      const batch = this.firestore.batch();
      batch.set(this.firestore.collection('products').doc(safe.id), {
        ...safe,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.set(
        this.firestore.collection('catalog_meta').doc('state'),
        { seeded: true, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      await batch.commit();
      return safe;
    }

    this.fallbackState.products.unshift(safe);
    this.saveLocalJsonState(this.fallbackState);
    return safe;
  }

  async updateProduct(id: string, product: ProductWithSort): Promise<ProductWithSort | null> {
    if (this.mode === 'firestore' && this.firestore) {
      const ref = this.firestore.collection('products').doc(id);
      const existingSnap = await ref.get();
      if (!existingSnap.exists) return null;
      const existingData = existingSnap.data() as ProductWithSort & { createdAt?: any };
      const safe = sanitizeAndClampProductForStorage(
        { ...product, id },
        typeof product.sortOrder === 'number' ? product.sortOrder : existingData?.sortOrder
      );
      await ref.set(
        {
          ...safe,
          createdAt: existingData?.createdAt || FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: false }
      );
      return safe;
    }

    const idx = this.fallbackState.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const prevSort = (this.fallbackState.products[idx] as ProductWithSort).sortOrder;
    const safe = sanitizeAndClampProductForStorage({ ...product, id }, prevSort);
    this.fallbackState.products[idx] = safe;
    this.saveLocalJsonState(this.fallbackState);
    return safe;
  }

  async deleteProduct(id: string): Promise<boolean> {
    if (this.mode === 'firestore' && this.firestore) {
      const ref = this.firestore.collection('products').doc(id);
      const snap = await ref.get();
      if (!snap.exists) return false;
      const batch = this.firestore.batch();
      batch.set(
        this.firestore.collection('catalog_meta').doc('state'),
        { seeded: true, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      batch.delete(ref);
      await batch.commit();
      return true;
    }

    const initialLen = this.fallbackState.products.length;
    this.fallbackState.products = this.fallbackState.products.filter((p) => p.id !== id);
    if (this.fallbackState.products.length === initialLen) return false;
    this.saveLocalJsonState(this.fallbackState);
    return true;
  }

  async replaceProductsFromRestFallback(products: Product[]): Promise<void> {
    if (this.mode === 'firestore') return;
    this.fallbackState.products = sortCatalogProducts(
      products.map((p, idx) => normalizeLegacyProduct(p, (p as ProductWithSort).sortOrder ?? 1_000_000 - idx))
    );
    this.saveLocalJsonState(this.fallbackState);
  }

  // --- USERS & SESSIONS ---
  async findUserByEmail(email: string): Promise<StoredUserRecord | null> {
    const clean = email.trim().toLowerCase();
    if (this.mode === 'firestore' && this.firestore) {
      const snap = await this.firestore.collection('users').where('email', '==', clean).limit(1).get();
      if (snap.empty) return null;
      return snap.docs[0].data() as StoredUserRecord;
    }
    return this.fallbackState.users.find((u) => u.email.toLowerCase() === clean) || null;
  }

  async findUserById(id: string): Promise<StoredUserRecord | null> {
    if (this.mode === 'firestore' && this.firestore) {
      const snap = await this.firestore.collection('users').doc(id).get();
      if (!snap.exists) return null;
      return snap.data() as StoredUserRecord;
    }
    return this.fallbackState.users.find((u) => u.id === id) || null;
  }

  async findAdminByEmail(email: string): Promise<StoredUserRecord | null> {
    const user = await this.findUserByEmail(email);
    if (!user || user.role !== 'admin') return null;
    return user;
  }

  async createUser(user: StoredUserRecord): Promise<StoredUserRecord> {
    const clean: StoredUserRecord = {
      ...user,
      email: user.email.trim().toLowerCase(),
      recoveryEmail: user.recoveryEmail ? user.recoveryEmail.trim().toLowerCase() : undefined,
    };
    if (this.mode === 'firestore' && this.firestore) {
      await this.firestore.collection('users').doc(clean.id).create(clean);
      return clean;
    }
    this.fallbackState.users.push(clean);
    this.saveLocalJsonState(this.fallbackState);
    return clean;
  }

  async createSession(user: StoredUserRecord): Promise<{ rawToken: string; ttlMs: number }> {
    const now = Date.now();
    const ttlMs = user.role === 'admin' ? ADMIN_SESSION_TTL_MS : CUSTOMER_SESSION_TTL_MS;
    const { token, tokenHash } = generateSessionToken();
    const record: SessionRecord = {
      id: 'sess_' + crypto.randomBytes(8).toString('hex'),
      userId: user.id,
      tokenHash,
      role: user.role,
      createdAt: now,
      expiresAt: now + ttlMs,
    };

    if (this.mode === 'firestore' && this.firestore) {
      await this.firestore.collection('sessions').doc(record.id).set(record);
      return { rawToken: token, ttlMs };
    }

    this.fallbackState.sessions = this.fallbackState.sessions.filter((s) => s.expiresAt > now);
    this.fallbackState.sessions.push(record);
    this.saveLocalJsonState(this.fallbackState);
    return { rawToken: token, ttlMs };
  }

  async getAuthContextByTokenHash(
    tokenHash: string
  ): Promise<{ user: StoredUserRecord; session: SessionRecord } | null> {
    const now = Date.now();
    if (this.mode === 'firestore' && this.firestore) {
      const snap = await this.firestore
        .collection('sessions')
        .where('tokenHash', '==', tokenHash)
        .limit(1)
        .get();
      if (snap.empty) return null;
      const session = snap.docs[0].data() as SessionRecord;
      if (session.expiresAt <= now) {
        await snap.docs[0].ref.delete().catch(() => {});
        return null;
      }
      const user = await this.findUserById(session.userId);
      if (!user) return null;
      return { user, session };
    }

    const session = this.fallbackState.sessions.find(
      (s) => s.tokenHash === tokenHash && s.expiresAt > now
    );
    if (!session) return null;
    const user = this.fallbackState.users.find((u) => u.id === session.userId);
    if (!user) return null;
    return { user, session };
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<void> {
    if (this.mode === 'firestore' && this.firestore) {
      const snap = await this.firestore
        .collection('sessions')
        .where('tokenHash', '==', tokenHash)
        .get();
      if (!snap.empty) {
        const batch = this.firestore.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      return;
    }

    this.fallbackState.sessions = this.fallbackState.sessions.filter((s) => s.tokenHash !== tokenHash);
    this.saveLocalJsonState(this.fallbackState);
  }

  async updateAdminProfileAndRotateSession(params: {
    user: StoredUserRecord;
    patch: Partial<StoredUserRecord>;
  }): Promise<{ updatedUser: StoredUserRecord; rawToken: string; ttlMs: number }> {
    const now = Date.now();
    const ttlMs = params.user.role === 'admin' ? ADMIN_SESSION_TTL_MS : CUSTOMER_SESSION_TTL_MS;
    const { token, tokenHash } = generateSessionToken();
    const newSession: SessionRecord = {
      id: 'sess_' + crypto.randomBytes(8).toString('hex'),
      userId: params.user.id,
      tokenHash,
      role: params.user.role,
      createdAt: now,
      expiresAt: now + ttlMs,
    };

    const updatedUser: StoredUserRecord = {
      ...params.user,
      ...params.patch,
    };

    if (this.mode === 'firestore' && this.firestore) {
      const db = this.firestore;
      const oldSessionsSnap = await db
        .collection('sessions')
        .where('userId', '==', params.user.id)
        .get();
      const batch = db.batch();
      batch.set(db.collection('users').doc(params.user.id), updatedUser, { merge: true });
      oldSessionsSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.set(db.collection('sessions').doc(newSession.id), newSession);
      batch.set(
        db.collection('app_settings').doc('security'),
        {
          adminUserId: updatedUser.id,
          hasPrivateRecoveryEmail: Boolean(updatedUser.recoveryEmail || process.env.ADMIN_RECOVERY_EMAIL),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      await batch.commit();
      return { updatedUser, rawToken: token, ttlMs };
    }

    const idx = this.fallbackState.users.findIndex((u) => u.id === params.user.id);
    if (idx !== -1) {
      this.fallbackState.users[idx] = updatedUser;
    }
    this.fallbackState.sessions = this.fallbackState.sessions.filter(
      (s) => s.userId !== params.user.id && s.expiresAt > now
    );
    this.fallbackState.sessions.push(newSession);
    this.saveLocalJsonState(this.fallbackState);
    return { updatedUser, rawToken: token, ttlMs };
  }

  async updateAdminRecoveryEmail(userId: string, cleanRecovery: string): Promise<void> {
    if (this.mode === 'firestore' && this.firestore) {
      const batch = this.firestore.batch();
      batch.set(
        this.firestore.collection('users').doc(userId),
        { recoveryEmail: cleanRecovery },
        { merge: true }
      );
      batch.set(
        this.firestore.collection('app_settings').doc('security'),
        { hasPrivateRecoveryEmail: true, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      await batch.commit();
      return;
    }

    const target = this.fallbackState.users.find((u) => u.id === userId);
    if (target) {
      target.recoveryEmail = cleanRecovery;
      this.saveLocalJsonState(this.fallbackState);
    }
  }

  // --- OTP RECOVERY ---
  async replaceActiveOtpsForUser(userId: string, newRecord: OtpRecord): Promise<void> {
    if (this.mode === 'firestore' && this.firestore) {
      const db = this.firestore;
      const existingSnap = await db
        .collection('password_reset_otps')
        .where('userId', '==', userId)
        .get();
      const batch = db.batch();
      existingSnap.docs.forEach((d) => {
        if (!d.data()?.used) {
          batch.update(d.ref, { used: true });
        }
      });
      batch.set(db.collection('password_reset_otps').doc(newRecord.id), newRecord);
      await batch.commit();
      return;
    }

    this.fallbackState.passwordResetOtps = this.fallbackState.passwordResetOtps.map((o) =>
      o.userId === userId && !o.used ? { ...o, used: true } : o
    );
    this.fallbackState.passwordResetOtps.push(newRecord);
    this.saveLocalJsonState(this.fallbackState);
  }

  async markOtpUsed(otpId: string): Promise<void> {
    if (this.mode === 'firestore' && this.firestore) {
      await this.firestore.collection('password_reset_otps').doc(otpId).set({ used: true }, { merge: true });
      return;
    }
    const target = this.fallbackState.passwordResetOtps.find((o) => o.id === otpId);
    if (target) {
      target.used = true;
      this.saveLocalJsonState(this.fallbackState);
    }
  }

  async verifyOtp(
    email: string,
    otpInput: string
  ): Promise<{ success: boolean; error?: string; resetGrantToken?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const now = Date.now();

    if (this.mode === 'firestore' && this.firestore) {
      const db = this.firestore;
      return await db.runTransaction(async (tx) => {
        const snap = await tx.get(
          db.collection('password_reset_otps').where('email', '==', cleanEmail)
        );
        const records = snap.docs
          .map((d) => d.data() as OtpRecord)
          .sort((a, b) => a.createdAt - b.createdAt);

        const result = verifyOtpAttempt(records, cleanEmail, otpInput, now);
        for (const rec of records) {
          const origDoc = snap.docs.find((d) => d.id === rec.id);
          if (origDoc) {
            tx.set(origDoc.ref, rec, { merge: true });
          }
        }
        return result;
      });
    }

    const result = verifyOtpAttempt(this.fallbackState.passwordResetOtps, cleanEmail, otpInput, now);
    this.saveLocalJsonState(this.fallbackState);
    return result;
  }

  async consumeResetGrantAndUpdateAdminPassword(params: {
    email: string;
    resetGrantToken: string;
    newPasswordHash: string;
  }): Promise<{ valid: boolean; error?: string }> {
    const cleanEmail = params.email.trim().toLowerCase();
    const now = Date.now();

    if (this.mode === 'firestore' && this.firestore) {
      const db = this.firestore;
      return await db.runTransaction(async (tx) => {
        const otpSnap = await tx.get(
          db.collection('password_reset_otps').where('email', '==', cleanEmail)
        );
        const records = otpSnap.docs.map((d) => ({ ...(d.data() as OtpRecord) }));
        const grant = consumeResetGrant(records, cleanEmail, params.resetGrantToken, now);

        if (!grant.valid || !grant.userId) {
          for (const rec of records) {
            const origDoc = otpSnap.docs.find((d) => d.id === rec.id);
            if (origDoc) {
              tx.set(origDoc.ref, { used: rec.used }, { merge: true });
            }
          }
          return { valid: false, error: grant.error };
        }

        const userRef = db.collection('users').doc(grant.userId);
        const userSnap = await tx.get(userRef);
        const userData = userSnap.exists ? (userSnap.data() as StoredUserRecord) : null;
        if (!userData || userData.role !== 'admin') {
          return { valid: false, error: 'Account could not be updated.' };
        }

        const sessionsSnap = await tx.get(
          db.collection('sessions').where('userId', '==', grant.userId)
        );

        tx.update(userRef, { passwordHash: params.newPasswordHash });
        sessionsSnap.docs.forEach((s) => tx.delete(s.ref));
        otpSnap.docs.forEach((o) => {
          tx.set(
            o.ref,
            {
              used: true,
              resetGrantTokenHash: FieldValue.delete(),
              resetGrantExpiresAt: FieldValue.delete(),
            },
            { merge: true }
          );
        });
        return { valid: true };
      });
    }

    const grant = consumeResetGrant(
      this.fallbackState.passwordResetOtps,
      cleanEmail,
      params.resetGrantToken,
      now
    );
    if (!grant.valid || !grant.userId) {
      this.saveLocalJsonState(this.fallbackState);
      return { valid: false, error: grant.error };
    }
    const admin = this.fallbackState.users.find(
      (u) => u.id === grant.userId && u.role === 'admin'
    );
    if (!admin) {
      this.saveLocalJsonState(this.fallbackState);
      return { valid: false, error: 'Account could not be updated.' };
    }
    admin.passwordHash = params.newPasswordHash;
    this.fallbackState.sessions = this.fallbackState.sessions.filter(
      (s) => s.userId !== admin.id
    );
    this.fallbackState.passwordResetOtps = this.fallbackState.passwordResetOtps.filter(
      (o) => o.userId !== admin.id
    );
    this.saveLocalJsonState(this.fallbackState);
    return { valid: true };
  }

  // --- ORDERS (WITH FIRESTORE TRANSACTIONS) ---
  private sortOrdersNewestFirst(list: Order[]): Order[] {
    return [...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  async listAllOrders(): Promise<Order[]> {
    if (this.mode === 'firestore' && this.firestore) {
      const snap = await this.firestore.collection('orders').get();
      return this.sortOrdersNewestFirst(snap.docs.map((d) => d.data() as Order));
    }
    return this.sortOrdersNewestFirst(this.fallbackState.orders);
  }

  async listOrdersForCustomer(userId: string, email: string): Promise<Order[]> {
    const cleanEmail = email.trim().toLowerCase();
    if (this.mode === 'firestore' && this.firestore) {
      const [byUidSnap, byEmailSnap] = await Promise.all([
        this.firestore.collection('orders').where('userId', '==', userId).get(),
        this.firestore.collection('orders').where('customer.email', '==', cleanEmail).get(),
      ]);
      const merged = new Map<string, Order>();
      byUidSnap.docs.forEach((d) => merged.set(d.id, d.data() as Order));
      byEmailSnap.docs.forEach((d) => merged.set(d.id, d.data() as Order));
      return this.sortOrdersNewestFirst(Array.from(merged.values()));
    }

    const own = this.fallbackState.orders.filter(
      (o) =>
        (o.userId && o.userId === userId) ||
        o.customer.email.toLowerCase() === cleanEmail
    );
    return this.sortOrdersNewestFirst(own);
  }

  async createOrderTransaction(params: {
    items: OrderLineInput[];
    customer: Order['customer'];
    userId?: string;
    paymentMethod: 'cod' | 'card_demo';
    promoCode?: string;
    notes?: string;
  }): Promise<{ order?: Order; error?: string; statusCode?: number }> {
    const orderNum =
      'RGD-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);
    const trackNum = 'RGD-EXP-' + Math.floor(10000000 + Math.random() * 90000000);
    const orderId = 'ord_' + Date.now() + '_' + crypto.randomBytes(2).toString('hex');

    if (this.mode === 'firestore' && this.firestore) {
      const db = this.firestore;
      return await db.runTransaction(async (tx) => {
        const distinctIds = Array.from(new Set(params.items.map((it) => String(it.productId))));
        const prodRefs = distinctIds.map((id) => db.collection('products').doc(id));
        const prodSnaps = await Promise.all(prodRefs.map((ref) => tx.get(ref)));

        const productMap = new Map<string, Product>();
        for (let i = 0; i < distinctIds.length; i++) {
          const snap = prodSnaps[i];
          if (snap.exists) {
            productMap.set(
              distinctIds[i],
              sanitizeAndClampProductForStorage({ ...(snap.data() as ProductWithSort), id: snap.id })
            );
          }
        }

        const requestedByProduct = new Map<string, number>();
        const resolvedCartItems: Array<{
          product: Product;
          quantity: number;
          selectedSize?: string;
          selectedColor?: string;
        }> = [];

        for (const item of params.items) {
          const qty = Number(item.quantity);
          if (!Number.isInteger(qty) || qty <= 0) {
            return { error: 'Invalid item quantity.', statusCode: 400 };
          }
          const prod = productMap.get(String(item.productId));
          if (!prod) {
            return {
              error: `Product "${item.name || item.productId}" no longer exists.`,
              statusCode: 400,
            };
          }
          const nextTotalQty = (requestedByProduct.get(prod.id) || 0) + qty;
          if (prod.stockCount < nextTotalQty) {
            return {
              error: `Insufficient inventory for "${prod.name}". Only ${prod.stockCount} available.`,
              statusCode: 400,
            };
          }
          requestedByProduct.set(prod.id, nextTotalQty);
          resolvedCartItems.push({
            product: prod,
            quantity: qty,
            selectedSize: typeof item.selectedSize === 'string' ? item.selectedSize : undefined,
            selectedColor: typeof item.selectedColor === 'string' ? item.selectedColor : undefined,
          });
        }

        const totals = calculateCartTotals(resolvedCartItems, params.promoCode);
        const authoritativeItems: OrderItem[] = resolvedCartItems.map((resolved) => ({
          productId: resolved.product.id,
          name: resolved.product.name,
          price: getEffectivePrice(resolved.product),
          originalPrice: resolved.product.originalPrice,
          quantity: resolved.quantity,
          selectedSize: resolved.selectedSize,
          selectedColor: resolved.selectedColor,
          image: resolved.product.image,
        }));

        for (const [prodId, qtySum] of requestedByProduct.entries()) {
          const prod = productMap.get(prodId)!;
          const nextStock = Math.max(0, prod.stockCount - qtySum);
          tx.update(db.collection('products').doc(prodId), {
            stockCount: nextStock,
            inStock: nextStock > 0,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        const newOrder: Order = {
          id: orderId,
          orderNumber: orderNum,
          createdAt: new Date().toISOString(),
          userId: params.userId,
          customer: params.customer,
          items: authoritativeItems,
          subtotal: totals.subtotal,
          shippingFee: totals.shippingFee,
          tax: totals.tax,
          discount: totals.discount,
          total: totals.total,
          paymentMethod: params.paymentMethod,
          paymentStatus: params.paymentMethod === 'cod' ? 'pending' : 'demo_unpaid',
          orderStatus: 'Confirmed',
          trackingNumber: trackNum,
          notes: params.notes || '',
        };

        tx.set(db.collection('orders').doc(newOrder.id), newOrder);
        return { order: newOrder };
      });
    }

    // Local JSON fallback
    const requestedByProduct = new Map<string, number>();
    const resolvedCartItems: Array<{
      product: Product;
      quantity: number;
      selectedSize?: string;
      selectedColor?: string;
    }> = [];

    for (const item of params.items) {
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        return { error: 'Invalid item quantity.', statusCode: 400 };
      }
      const prod = this.fallbackState.products.find((p) => p.id === item.productId);
      if (!prod) {
        return {
          error: `Product "${item.name || item.productId}" no longer exists.`,
          statusCode: 400,
        };
      }
      const nextTotalQty = (requestedByProduct.get(prod.id) || 0) + qty;
      if (prod.stockCount < nextTotalQty) {
        return {
          error: `Insufficient inventory for "${prod.name}". Only ${prod.stockCount} available.`,
          statusCode: 400,
        };
      }
      requestedByProduct.set(prod.id, nextTotalQty);
      resolvedCartItems.push({
        product: prod,
        quantity: qty,
        selectedSize: typeof item.selectedSize === 'string' ? item.selectedSize : undefined,
        selectedColor: typeof item.selectedColor === 'string' ? item.selectedColor : undefined,
      });
    }

    const totals = calculateCartTotals(resolvedCartItems, params.promoCode);
    for (const [prodId, qtySum] of requestedByProduct.entries()) {
      const prod = this.fallbackState.products.find((p) => p.id === prodId)!;
      prod.stockCount = Math.max(0, prod.stockCount - qtySum);
      prod.inStock = prod.stockCount > 0;
    }

    const authoritativeItems: OrderItem[] = resolvedCartItems.map((resolved) => ({
      productId: resolved.product.id,
      name: resolved.product.name,
      price: getEffectivePrice(resolved.product),
      originalPrice: resolved.product.originalPrice,
      quantity: resolved.quantity,
      selectedSize: resolved.selectedSize,
      selectedColor: resolved.selectedColor,
      image: resolved.product.image,
    }));

    const newOrder: Order = {
      id: orderId,
      orderNumber: orderNum,
      createdAt: new Date().toISOString(),
      userId: params.userId,
      customer: params.customer,
      items: authoritativeItems,
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      tax: totals.tax,
      discount: totals.discount,
      total: totals.total,
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentMethod === 'cod' ? 'pending' : 'demo_unpaid',
      orderStatus: 'Confirmed',
      trackingNumber: trackNum,
      notes: params.notes || '',
    };

    this.fallbackState.orders.unshift(newOrder);
    this.saveLocalJsonState(this.fallbackState);
    return { order: newOrder };
  }

  async updateOrderStatus(
    orderId: string,
    patch: { status?: Order['orderStatus']; trackingNumber?: string }
  ): Promise<Order | null> {
    if (this.mode === 'firestore' && this.firestore) {
      const ref = this.firestore.collection('orders').doc(orderId);
      const snap = await ref.get();
      if (!snap.exists) return null;
      const updates: Partial<Order> = {};
      if (patch.status) updates.orderStatus = patch.status;
      if (patch.trackingNumber) updates.trackingNumber = patch.trackingNumber;
      await ref.set(updates, { merge: true });
      return { ...(snap.data() as Order), ...updates };
    }

    const order = this.fallbackState.orders.find((o) => o.id === orderId);
    if (!order) return null;
    if (patch.status) order.orderStatus = patch.status;
    if (patch.trackingNumber) order.trackingNumber = patch.trackingNumber;
    this.saveLocalJsonState(this.fallbackState);
    return order;
  }

  // --- NEWSLETTER, CONTACT & ADMIN CLAIMS ---
  async addSubscriber(email: string): Promise<void> {
    const clean = email.trim().toLowerCase();
    if (this.mode === 'firestore' && this.firestore) {
      const id = subscriberDocId(clean);
      await this.firestore.collection('subscribers').doc(id).set(
        {
          id,
          email: clean,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return;
    }

    if (!this.fallbackState.subscribers.includes(clean)) {
      this.fallbackState.subscribers.push(clean);
      this.saveLocalJsonState(this.fallbackState);
    }
  }

  async addContactMessage(msg: ContactMessageRecord): Promise<void> {
    if (this.mode === 'firestore' && this.firestore) {
      await this.firestore.collection('contact_messages').doc(msg.id).set(msg);
      return;
    }
    this.fallbackState.contactMessages.push(msg);
    this.saveLocalJsonState(this.fallbackState);
  }

  async grantAdminCloudAccess(uid: string, email: string): Promise<{ customClaimSet: boolean }> {
    const ctx = getFirebaseAdminContext();
    if (!ctx.configured || !ctx.db) {
      return { customClaimSet: false };
    }

    await ctx.db.collection('admins').doc(uid).set(
      {
        email: email.trim().toLowerCase(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (ctx.auth) {
      try {
        const userRecord = await ctx.auth.getUser(uid);
        const existingClaims = userRecord.customClaims || {};
        await ctx.auth.setCustomUserClaims(uid, { ...existingClaims, admin: true });
        return { customClaimSet: true };
      } catch {
        // Firestore /admins/{uid} RBAC still succeeds even if Firebase Auth Admin IAM isn't granted
        return { customClaimSet: false };
      }
    }

    return { customClaimSet: false };
  }
}
