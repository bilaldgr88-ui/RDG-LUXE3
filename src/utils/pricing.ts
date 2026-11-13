import type { CartItem, Product } from '../types/index.ts';

export function formatPrice(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

export function getNormalizedGallery(product: Pick<Product, 'image' | 'images' | 'additionalImages'>): string[] {
  const rawList: string[] = [];
  if (product.image && typeof product.image === 'string') {
    rawList.push(product.image.trim());
  }
  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      if (typeof img === 'string' && img.trim()) {
        rawList.push(img.trim());
      }
    }
  }
  if (Array.isArray(product.additionalImages)) {
    for (const img of product.additionalImages) {
      if (typeof img === 'string' && img.trim()) {
        rawList.push(img.trim());
      }
    }
  }
  return Array.from(new Set(rawList.filter(Boolean)));
}

export function hasActiveDiscount(
  product: Pick<Product, 'price' | 'originalPrice' | 'discountEnabled'>
): boolean {
  if (product.discountEnabled === false) return false;
  if (typeof product.originalPrice !== 'number' || !Number.isFinite(product.originalPrice) || product.originalPrice <= 0) {
    return false;
  }
  const effective = getEffectivePrice(product);
  return effective > 0 && effective < product.originalPrice;
}

export function getEffectivePrice(
  product: Pick<Product, 'price' | 'originalPrice' | 'discountEnabled' | 'discountPercentage'>
): number {
  const original = typeof product.originalPrice === 'number' && Number.isFinite(product.originalPrice)
    ? Math.max(0, Math.round(product.originalPrice))
    : 0;
  const rawPrice = typeof product.price === 'number' && Number.isFinite(product.price)
    ? Math.max(0, Math.round(product.price))
    : 0;

  if (product.discountEnabled === false) {
    return original > 0 ? original : rawPrice;
  }

  if (original > 0) {
    if (rawPrice > 0 && rawPrice < original) {
      return rawPrice;
    }
    if (
      typeof product.discountPercentage === 'number' &&
      Number.isFinite(product.discountPercentage) &&
      product.discountPercentage > 0 &&
      product.discountPercentage < 100
    ) {
      return Math.max(1, Math.round(original * (1 - product.discountPercentage / 100)));
    }
    return rawPrice > 0 ? rawPrice : original;
  }

  return rawPrice;
}

export function getDiscountPercentage(
  product: Pick<Product, 'price' | 'originalPrice' | 'discountEnabled' | 'discountPercentage'>
): number {
  if (!hasActiveDiscount(product)) return 0;
  const original = product.originalPrice!;
  const effective = getEffectivePrice(product);
  const pct = Math.round(((original - effective) / original) * 100);
  return Math.max(1, Math.min(99, pct));
}

export function calculateDiscountedPriceFromPercent(originalPrice: number, percentage: number): number {
  if (!Number.isFinite(originalPrice) || originalPrice <= 0) return 0;
  const clampedPct = Math.max(0, Math.min(99, Math.round(percentage)));
  if (clampedPct === 0) return Math.round(originalPrice);
  return Math.max(1, Math.round(originalPrice * (1 - clampedPct / 100)));
}

export function calculatePercentFromPrices(originalPrice: number, discountedPrice: number): number {
  if (!Number.isFinite(originalPrice) || originalPrice <= 0) return 0;
  if (!Number.isFinite(discountedPrice) || discountedPrice <= 0 || discountedPrice >= originalPrice) return 0;
  return Math.max(1, Math.min(99, Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)));
}

export function sanitizeProductPricing(input: {
  originalPrice?: number;
  price?: number;
  discountPercentage?: number;
  discountEnabled?: boolean;
}): {
  valid: boolean;
  error?: string;
  price: number;
  originalPrice: number;
  discountEnabled: boolean;
  discountPercentage: number;
} {
  const orig = Number(input.originalPrice);
  const rawPrice = input.price !== undefined ? Number(input.price) : orig;
  const enabled = Boolean(input.discountEnabled);

  if (!Number.isFinite(orig) || orig <= 0) {
    return {
      valid: false,
      error: 'Original price must be greater than $0.',
      price: 0,
      originalPrice: 0,
      discountEnabled: false,
      discountPercentage: 0,
    };
  }

  const cleanOriginal = Math.round(orig);

  if (!enabled) {
    return {
      valid: true,
      price: cleanOriginal,
      originalPrice: cleanOriginal,
      discountEnabled: false,
      discountPercentage: 0,
    };
  }

  // Discount is enabled
  let sellingPrice = Number.isFinite(rawPrice) ? Math.round(rawPrice) : 0;
  const pctInput = input.discountPercentage !== undefined ? Number(input.discountPercentage) : NaN;

  if ((sellingPrice <= 0 || sellingPrice >= cleanOriginal) && Number.isFinite(pctInput) && pctInput > 0 && pctInput < 100) {
    sellingPrice = calculateDiscountedPriceFromPercent(cleanOriginal, pctInput);
  }

  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    return {
      valid: false,
      error: 'Discounted selling price must be greater than $0.',
      price: cleanOriginal,
      originalPrice: cleanOriginal,
      discountEnabled: true,
      discountPercentage: 0,
    };
  }

  if (sellingPrice >= cleanOriginal) {
    return {
      valid: false,
      error: 'Discounted selling price must be strictly less than the original price when discount is active.',
      price: sellingPrice,
      originalPrice: cleanOriginal,
      discountEnabled: true,
      discountPercentage: 0,
    };
  }

  const pct = calculatePercentFromPrices(cleanOriginal, sellingPrice);
  if (pct <= 0 || pct >= 100) {
    return {
      valid: false,
      error: 'Discount percentage must be between 1% and 99%.',
      price: sellingPrice,
      originalPrice: cleanOriginal,
      discountEnabled: true,
      discountPercentage: 0,
    };
  }

  return {
    valid: true,
    price: sellingPrice,
    originalPrice: cleanOriginal,
    discountEnabled: true,
    discountPercentage: pct,
  };
}

export interface PricingTotals {
  itemCount: number;
  subtotal: number;
  productSavings: number;
  shippingFee: number;
  tax: number;
  discount: number;
  total: number;
}

export function calculateCartTotals(items: CartItem[], promoCode?: string): PricingTotals {
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce(
    (acc, item) => acc + getEffectivePrice(item.product) * item.quantity,
    0
  );
  const productSavings = items.reduce((acc, item) => {
    if (!hasActiveDiscount(item.product)) return acc;
    const orig = item.product.originalPrice || 0;
    const eff = getEffectivePrice(item.product);
    return acc + Math.max(0, orig - eff) * item.quantity;
  }, 0);

  // Complimentary luxury white-glove shipping on orders over $1,000, otherwise $50
  const shippingFee = subtotal === 0 ? 0 : subtotal >= 1000 ? 0 : 50;

  // Estimated luxury excise & import tax (7.5%)
  const tax = Math.round(subtotal * 0.075);

  let discount = 0;
  if (promoCode) {
    const cleaned = promoCode.trim().toUpperCase();
    if (cleaned === 'RGD10') {
      discount = Math.round(subtotal * 0.1);
    } else if (cleaned === 'LUXE20') {
      discount = Math.round(subtotal * 0.2);
    } else if (cleaned === 'VIP100') {
      discount = Math.min(100, subtotal);
    }
  }

  const total = Math.max(0, subtotal - discount + shippingFee + tax);

  return {
    itemCount,
    subtotal,
    productSavings,
    shippingFee,
    tax,
    discount,
    total,
  };
}

export function validateOrderInput(customer: {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!customer.name || customer.name.trim().length < 2) {
    errors.name = 'Full name is required';
  }
  if (!customer.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
    errors.email = 'Valid email address is required';
  }
  if (!customer.phone || customer.phone.trim().length < 7) {
    errors.phone = 'Valid contact number is required for dispatch verification';
  }
  if (!customer.address || customer.address.trim().length < 5) {
    errors.address = 'Complete delivery street address is required';
  }
  if (!customer.city || customer.city.trim().length < 2) {
    errors.city = 'City is required';
  }
  if (!customer.postalCode || customer.postalCode.trim().length < 3) {
    errors.postalCode = 'Postal code is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
