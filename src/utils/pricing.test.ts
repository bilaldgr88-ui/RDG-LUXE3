import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCartTotals,
  calculateDiscountedPriceFromPercent,
  calculatePercentFromPrices,
  formatPrice,
  getDiscountPercentage,
  getEffectivePrice,
  getNormalizedGallery,
  hasActiveDiscount,
  sanitizeProductPricing,
  validateOrderInput,
} from './pricing';
import { CartItem, Product } from '../types';

const mockProduct: Product = {
  id: 'prod_1',
  name: 'RGD Imperial Chronograph',
  subtitle: '18K Rose Gold Masterpiece',
  category: 'watches',
  categoryLabel: 'Luxury Watches',
  price: 2450,
  originalPrice: 2450,
  discountEnabled: false,
  discountPercentage: 0,
  rating: 4.9,
  reviewsCount: 38,
  image: '/src/assets/images/watch_rose_gold_1794494079347.jpg',
  images: [
    '/src/assets/images/watch_rose_gold_1794494079347.jpg',
    '/uploads/products/side-view.jpg',
  ],
  description: 'Precision mechanical engineering',
  details: ['Swiss automatic movement', 'Sapphire crystal'],
  composition: '18K Rose Gold, Alligator Leather',
  sizes: ['41mm'],
  colors: [{ name: 'Rose Gold', hex: '#B76E79' }],
  inStock: true,
  stockCount: 5,
  sku: 'RGD-W-001',
};

test('formatPrice formats USD correctly', () => {
  assert.equal(formatPrice(2450), '$2,450');
  assert.equal(formatPrice(10000), '$10,000');
});

test('getNormalizedGallery merges main image and images deduplicated without placeholders', () => {
  const gallery = getNormalizedGallery({
    image: '/a.jpg',
    images: ['/a.jpg', '/b.jpg', '  ', '/c.jpg'],
    additionalImages: ['/b.jpg', '/d.jpg'],
  });
  assert.deepEqual(gallery, ['/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg']);
});

test('hasActiveDiscount, getEffectivePrice, and getDiscountPercentage handle disabled vs active discounts', () => {
  assert.equal(hasActiveDiscount(mockProduct), false);
  assert.equal(getEffectivePrice(mockProduct), 2450);
  assert.equal(getDiscountPercentage(mockProduct), 0);

  const discounted: Product = {
    ...mockProduct,
    originalPrice: 3000,
    price: 2400,
    discountEnabled: true,
  };
  assert.equal(hasActiveDiscount(discounted), true);
  assert.equal(getEffectivePrice(discounted), 2400);
  assert.equal(getDiscountPercentage(discounted), 20);

  // Disabled discount restores original price as effective price
  const disabled: Product = {
    ...discounted,
    discountEnabled: false,
  };
  assert.equal(hasActiveDiscount(disabled), false);
  assert.equal(getEffectivePrice(disabled), 3000);
  assert.equal(getDiscountPercentage(disabled), 0);
});

test('bidirectional discount helpers calculate prices and percentages cleanly', () => {
  assert.equal(calculateDiscountedPriceFromPercent(5000, 25), 3750);
  assert.equal(calculatePercentFromPrices(5000, 3750), 25);
});

test('sanitizeProductPricing enforces strict validation rules', () => {
  const invalidZero = sanitizeProductPricing({ originalPrice: 0, discountEnabled: false });
  assert.equal(invalidZero.valid, false);

  const invalidHigher = sanitizeProductPricing({
    originalPrice: 1000,
    price: 1200,
    discountEnabled: true,
  });
  assert.equal(invalidHigher.valid, false);

  const validDiscount = sanitizeProductPricing({
    originalPrice: 5000,
    price: 4000,
    discountEnabled: true,
  });
  assert.equal(validDiscount.valid, true);
  assert.equal(validDiscount.price, 4000);
  assert.equal(validDiscount.originalPrice, 5000);
  assert.equal(validDiscount.discountPercentage, 20);

  const disabledDiscount = sanitizeProductPricing({
    originalPrice: 5000,
    price: 4000,
    discountEnabled: false,
  });
  assert.equal(disabledDiscount.valid, true);
  assert.equal(disabledDiscount.price, 5000);
  assert.equal(disabledDiscount.discountPercentage, 0);
});

test('calculateCartTotals computes effective discounted prices, productSavings, shipping, and promo code', () => {
  const discountedItem: Product = {
    ...mockProduct,
    originalPrice: 3000,
    price: 2400,
    discountEnabled: true,
  };
  const items: CartItem[] = [{ product: discountedItem, quantity: 1 }];

  const totals = calculateCartTotals(items, 'RGD10');
  assert.equal(totals.itemCount, 1);
  assert.equal(totals.subtotal, 2400);
  assert.equal(totals.productSavings, 600);
  assert.equal(totals.shippingFee, 0);
  assert.equal(totals.discount, 240);
  assert.equal(totals.tax, Math.round(2400 * 0.075));
  assert.equal(totals.total, 2400 - 240 + 0 + totals.tax);
});

test('calculateCartTotals charges $50 shipping for subtotal below $1000', () => {
  const lowItem: CartItem = {
    product: { ...mockProduct, price: 400, originalPrice: 400, discountEnabled: false },
    quantity: 1,
  };
  const totals = calculateCartTotals([lowItem]);
  assert.equal(totals.shippingFee, 50);
});

test('validateOrderInput returns valid true for complete details', () => {
  const result = validateOrderInput({
    name: 'Alexander Vance',
    email: 'alexander@rgdluxe.com',
    phone: '+1 212 555 0199',
    address: '740 Park Avenue, Penthouse B',
    city: 'New York',
    postalCode: '10021',
  });
  assert.equal(result.valid, true);
  assert.equal(Object.keys(result.errors).length, 0);
});

test('validateOrderInput catches missing fields', () => {
  const result = validateOrderInput({
    name: '',
    email: 'invalid-email',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.name);
  assert.ok(result.errors.email);
  assert.ok(result.errors.phone);
});
