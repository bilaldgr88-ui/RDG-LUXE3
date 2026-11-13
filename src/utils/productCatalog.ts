import type { Product, ProductCategory } from '../types/index.ts';
import { getNormalizedGallery, sanitizeProductPricing } from './pricing.ts';

export const MAX_PRODUCT_GALLERY_IMAGES = 6;
export const MAX_IMAGE_STRING_LENGTH = 260_000;
export const MAX_TOTAL_GALLERY_CHARS = 780_000;

export type ProductWithSort = Product & {
  sortOrder?: number;
};

export function getCategoryLabel(category: ProductCategory): string {
  if (category === 'watches') return 'Luxury Watches';
  if (category === 'men') return "Men's Clothing";
  return "Women's Clothing";
}

export function sanitizeProductId(rawId?: string): string {
  const cleaned = typeof rawId === 'string' ? rawId.trim().replace(/[^a-zA-Z0-9_-]/g, '-') : '';
  if (cleaned.length >= 2 && cleaned.length <= 128) {
    return cleaned;
  }
  return `rgd-cust-${Date.now()}`;
}

export function validateImagePayloadBudget(images: string[]): { valid: boolean; error?: string } {
  if (!Array.isArray(images) || images.length === 0) {
    return { valid: false, error: 'At least one product image is required.' };
  }
  if (images.length > MAX_PRODUCT_GALLERY_IMAGES) {
    return {
      valid: false,
      error: `Maximum ${MAX_PRODUCT_GALLERY_IMAGES} images allowed per product for cloud persistence.`,
    };
  }

  let totalLength = 0;
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (typeof img !== 'string' || img.trim().length === 0) {
      return { valid: false, error: 'Invalid empty image entry.' };
    }
    if (img.length > MAX_IMAGE_STRING_LENGTH) {
      return {
        valid: false,
        error: `Image #${i + 1} is too large for cloud persistence. Please upload a smaller image or compress it.`,
      };
    }
    totalLength += img.length;
  }

  if (totalLength > MAX_TOTAL_GALLERY_CHARS) {
    return {
      valid: false,
      error: 'Combined gallery size exceeds cloud document storage budget. Remove or compress one image.',
    };
  }

  return { valid: true };
}

export function sanitizeAndClampProductForStorage(
  raw: ProductWithSort,
  fallbackSortOrder?: number
): ProductWithSort {
  const id = sanitizeProductId(raw.id);
  const category: ProductCategory =
    raw.category === 'men' || raw.category === 'women' || raw.category === 'watches'
      ? raw.category
      : 'watches';
  const categoryLabel = (raw.categoryLabel || getCategoryLabel(category)).trim().slice(0, 60) || getCategoryLabel(category);

  const normalizedGallery = getNormalizedGallery(raw)
    .filter((img) => img.length > 0 && img.length <= MAX_IMAGE_STRING_LENGTH)
    .slice(0, MAX_PRODUCT_GALLERY_IMAGES);

  const safeImages =
    normalizedGallery.length > 0
      ? normalizedGallery
      : ['/src/assets/images/watch_rose_gold_1794494079347.jpg'];

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

  const stockCount = Math.max(0, Math.round(Number(raw.stockCount ?? 0)));
  const ratingRaw = Number(raw.rating ?? 5);
  const rating = Number.isFinite(ratingRaw) ? Math.max(0, Math.min(5, ratingRaw)) : 5;
  const reviewsCount = Math.max(0, Math.round(Number(raw.reviewsCount ?? 0)));

  const details = Array.isArray(raw.details)
    ? raw.details.map((d) => String(d).trim()).filter(Boolean).slice(0, 20)
    : ['Bespoke Luxury Release'];

  const rawSizes = Array.isArray(raw.sizes)
    ? raw.sizes.map((s) => String(s).trim().slice(0, 60)).filter(Boolean).slice(0, 20)
    : [];
  const sizes = rawSizes.length > 0 ? rawSizes : ['One Size'];

  const rawColors = Array.isArray(raw.colors)
    ? raw.colors
        .map((c) => ({
          name: String(c?.name || 'Classic').trim().slice(0, 60) || 'Classic',
          hex: String(c?.hex || '#D4AF37').trim().slice(0, 20) || '#D4AF37',
        }))
        .slice(0, 15)
    : [];
  const colors = rawColors.length > 0 ? rawColors : [{ name: 'Obsidian & Gold', hex: '#C6A45B' }];

  const sortOrder =
    typeof raw.sortOrder === 'number' && Number.isFinite(raw.sortOrder)
      ? raw.sortOrder
      : typeof fallbackSortOrder === 'number' && Number.isFinite(fallbackSortOrder)
      ? fallbackSortOrder
      : Date.now();

  return {
    id,
    name: String(raw.name || 'Untitled Creation').trim().slice(0, 180) || 'Untitled Creation',
    subtitle: String(raw.subtitle || '').trim().slice(0, 240),
    category,
    categoryLabel,
    price: pricing.valid ? pricing.price : Math.max(1, Math.round(Number(raw.price) || 1)),
    originalPrice: pricing.valid
      ? pricing.originalPrice
      : Math.max(1, Math.round(Number(raw.originalPrice || raw.price) || 1)),
    discountEnabled: pricing.valid ? pricing.discountEnabled : false,
    discountPercentage: pricing.valid ? pricing.discountPercentage : 0,
    rating,
    reviewsCount,
    image: safeImages[0],
    images: safeImages,
    description: String(raw.description || '').trim().slice(0, 4000),
    details,
    composition: String(raw.composition || '100% Bespoke Materials').trim().slice(0, 500),
    sizes,
    colors,
    inStock: stockCount > 0,
    stockCount,
    isNewArrival: raw.isNewArrival !== undefined ? Boolean(raw.isNewArrival) : true,
    isBestSeller: Boolean(raw.isBestSeller),
    isSpecialOffer: raw.isSpecialOffer !== undefined ? Boolean(raw.isSpecialOffer) : pricing.discountEnabled,
    sku: String(raw.sku || `RGD-${id.slice(-6).toUpperCase()}`).trim().slice(0, 80) || 'RGD-SKU-01',
    isDemo: Boolean(raw.isDemo),
    sortOrder,
  };
}

export function sortCatalogProducts(items: ProductWithSort[]): Product[] {
  return [...items].sort((a, b) => {
    const sa = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
    const sb = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
    if (sb !== sa) return sb - sa;
    return a.id.localeCompare(b.id);
  });
}

export function mergeCatalogSources(params: {
  firestoreProducts: ProductWithSort[];
  firestoreSeeded: boolean;
  apiProducts: ProductWithSort[];
}): Product[] {
  const { firestoreProducts, firestoreSeeded, apiProducts } = params;
  if (firestoreSeeded || firestoreProducts.length > 0) {
    return sortCatalogProducts(firestoreProducts.map((p) => sanitizeAndClampProductForStorage(p)));
  }
  return apiProducts.map((p, idx) =>
    sanitizeAndClampProductForStorage(p, 1_000_000 - idx)
  );
}

// --- FIRESTORE REST DECODER FOR SERVER-SIDE READ SYNC ---
export function decodeFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return String(val.stringValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return String(val.timestampValue);
  if ('arrayValue' in val) {
    const arr = Array.isArray(val.arrayValue?.values) ? val.arrayValue.values : [];
    return arr.map(decodeFirestoreValue);
  }
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

export function decodeFirestoreDocument(doc: any): Record<string, any> | null {
  if (!doc || !doc.fields || typeof doc.fields !== 'object') return null;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    out[k] = decodeFirestoreValue(v);
  }
  if (!out.id && typeof doc.name === 'string') {
    const parts = doc.name.split('/');
    out.id = parts[parts.length - 1];
  }
  return out;
}
