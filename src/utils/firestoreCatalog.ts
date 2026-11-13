import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import type { Product } from '../types';
import {
  sanitizeAndClampProductForStorage,
  sortCatalogProducts,
  validateImagePayloadBudget,
  type ProductWithSort,
} from './productCatalog';

export async function isAuthorizedCloudAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  try {
    const tokenResult = await user.getIdTokenResult();
    if (tokenResult.claims?.admin === true) {
      return true;
    }
  } catch {
    // Fall back to server-managed admins RBAC lookup
  }
  try {
    const adminSnap = await getDoc(doc(db, 'admins', user.uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

export async function connectAdminGoogleCloudSync(): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const user = cred.user;

    // Ask authenticated Express admin session to grant server-verified /admins/{uid} & custom claim
    try {
      const idToken = await user.getIdToken();
      await fetch('/api/admin/cloud-sync-claim', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      await user.getIdToken(true);
    } catch {
      // Fall back to existing claim/RBAC verification
    }

    const allowed = await isAuthorizedCloudAdmin(user);
    if (!allowed) {
      await signOut(auth);
      return {
        success: false,
        error: `Google account "${user.email || 'unknown'}" is not authorized with administrator claims in Firestore.`,
      };
    }

    return { success: true, user };
  } catch (err: any) {
    const message = err?.message || 'Google Cloud Sync sign-in was cancelled or failed.';
    return { success: false, error: message };
  }
}

export async function disconnectAdminGoogleCloudSync(): Promise<void> {
  await signOut(auth);
}

function toFirestoreCreateDoc(product: ProductWithSort) {
  const safe = sanitizeAndClampProductForStorage(product);
  return {
    id: safe.id,
    name: safe.name,
    subtitle: safe.subtitle,
    category: safe.category,
    categoryLabel: safe.categoryLabel,
    price: safe.price,
    originalPrice: safe.originalPrice ?? safe.price,
    discountEnabled: Boolean(safe.discountEnabled),
    discountPercentage: safe.discountPercentage ?? 0,
    rating: safe.rating,
    reviewsCount: safe.reviewsCount,
    image: safe.image,
    images: safe.images || [safe.image],
    description: safe.description,
    details: safe.details,
    composition: safe.composition,
    sizes: safe.sizes,
    colors: safe.colors,
    inStock: safe.inStock,
    stockCount: safe.stockCount,
    isNewArrival: Boolean(safe.isNewArrival),
    isBestSeller: Boolean(safe.isBestSeller),
    isSpecialOffer: Boolean(safe.isSpecialOffer),
    sku: safe.sku,
    isDemo: Boolean(safe.isDemo),
    sortOrder: safe.sortOrder ?? Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function toFirestoreUpdateDoc(product: ProductWithSort) {
  const safe = sanitizeAndClampProductForStorage(product);
  return {
    name: safe.name,
    subtitle: safe.subtitle,
    category: safe.category,
    categoryLabel: safe.categoryLabel,
    price: safe.price,
    originalPrice: safe.originalPrice ?? safe.price,
    discountEnabled: Boolean(safe.discountEnabled),
    discountPercentage: safe.discountPercentage ?? 0,
    rating: safe.rating,
    reviewsCount: safe.reviewsCount,
    image: safe.image,
    images: safe.images || [safe.image],
    description: safe.description,
    details: safe.details,
    composition: safe.composition,
    sizes: safe.sizes,
    colors: safe.colors,
    inStock: safe.inStock,
    stockCount: safe.stockCount,
    isNewArrival: Boolean(safe.isNewArrival),
    isBestSeller: Boolean(safe.isBestSeller),
    isSpecialOffer: Boolean(safe.isSpecialOffer),
    sku: safe.sku,
    isDemo: Boolean(safe.isDemo),
    sortOrder: safe.sortOrder ?? Date.now(),
    updatedAt: serverTimestamp(),
  };
}

async function markCatalogSeededIfNeeded(): Promise<void> {
  const metaRef = doc(db, 'catalog_meta', 'state');
  try {
    const snap = await getDoc(metaRef);
    if (!snap.exists()) {
      await setDoc(metaRef, { seeded: true, updatedAt: serverTimestamp() });
    } else if (!snap.data()?.seeded) {
      await updateDoc(metaRef, { seeded: true, updatedAt: serverTimestamp() });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'catalog_meta/state');
  }
}

export async function saveProductToFirestore(product: ProductWithSort): Promise<void> {
  const safe = sanitizeAndClampProductForStorage(product);
  const budget = validateImagePayloadBudget(safe.images || [safe.image]);
  if (!budget.valid) {
    throw new Error(budget.error || 'Product image gallery exceeds cloud storage budget.');
  }

  const productPath = `products/${safe.id}`;
  const ref = doc(db, 'products', safe.id);

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, toFirestoreCreateDoc(safe));
    } else {
      const existingSort = existingSnap.data()?.sortOrder;
      await updateDoc(
        ref,
        toFirestoreUpdateDoc({
          ...safe,
          sortOrder: typeof product.sortOrder === 'number' ? product.sortOrder : existingSort,
        })
      );
    }
    await markCatalogSeededIfNeeded();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, productPath);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const productPath = `products/${productId}`;
  try {
    await markCatalogSeededIfNeeded();
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, productPath);
  }
}

export async function syncInitialCatalogToFirestore(
  localProducts: Product[],
  onlyCustomUnsynced = false
): Promise<number> {
  try {
    const metaRef = doc(db, 'catalog_meta', 'state');
    const metaSnap = await getDoc(metaRef);
    const alreadySeeded = Boolean(metaSnap.exists() && metaSnap.data()?.seeded);

    const existingSnap = await getDocs(collection(db, 'products'));
    const existingIds = new Set(existingSnap.docs.map((d) => d.id));

    const candidates = localProducts.filter((p) => {
      if (existingIds.has(p.id)) return false;
      if (alreadySeeded || onlyCustomUnsynced) {
        return p.id.startsWith('rgd-cust-');
      }
      return true;
    });

    if (candidates.length > 0) {
      const batch = writeBatch(db);
      candidates.forEach((p, idx) => {
        const weight = p.id.startsWith('rgd-cust-') ? Date.now() - idx : 1_000_000 - idx;
        const safe = sanitizeAndClampProductForStorage(p, weight);
        batch.set(doc(db, 'products', safe.id), toFirestoreCreateDoc(safe));
      });
      if (!metaSnap.exists()) {
        batch.set(metaRef, { seeded: true, updatedAt: serverTimestamp() });
      } else if (!alreadySeeded) {
        batch.update(metaRef, { seeded: true, updatedAt: serverTimestamp() });
      }
      await batch.commit();
    } else if (!alreadySeeded) {
      await markCatalogSeededIfNeeded();
    }

    return candidates.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'products');
  }
}

export function subscribeToFirestoreCatalog(
  onUpdate: (payload: { products: Product[]; seeded: boolean }) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let latestProducts: ProductWithSort[] = [];
  let latestSeeded = false;
  let productsLoaded = false;
  let metaLoaded = false;

  const emitIfReady = () => {
    if (!productsLoaded && !metaLoaded) return;
    const normalized = sortCatalogProducts(
      latestProducts.map((p) => sanitizeAndClampProductForStorage(p))
    );
    onUpdate({ products: normalized, seeded: latestSeeded });
  };

  const unsubProducts = onSnapshot(
    collection(db, 'products'),
    (snap) => {
      productsLoaded = true;
      latestProducts = snap.docs.map((d) => {
        const data = d.data() as ProductWithSort;
        return { ...data, id: data.id || d.id };
      });
      emitIfReady();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'products');
      } catch (wrapped) {
        onError?.(wrapped as Error);
      }
    }
  );

  const unsubMeta = onSnapshot(
    doc(db, 'catalog_meta', 'state'),
    (snap) => {
      metaLoaded = true;
      latestSeeded = Boolean(snap.exists() && snap.data()?.seeded);
      emitIfReady();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'catalog_meta/state');
      } catch (wrapped) {
        onError?.(wrapped as Error);
      }
    }
  );

  return () => {
    unsubProducts();
    unsubMeta();
  };
}
