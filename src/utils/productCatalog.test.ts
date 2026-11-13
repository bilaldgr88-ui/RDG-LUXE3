import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeFirestoreDocument,
  mergeCatalogSources,
  sanitizeAndClampProductForStorage,
  sortCatalogProducts,
  validateImagePayloadBudget,
} from './productCatalog';
import type { Product } from '../types';

const sampleBase: Product = {
  id: 'rgd-w-001',
  name: 'RGD Royal Chronograph 18K',
  subtitle: 'Octagonal 18K Rose Gold Masterpiece',
  category: 'watches',
  categoryLabel: 'Luxury Watches',
  price: 4850,
  originalPrice: 5400,
  discountEnabled: true,
  discountPercentage: 10,
  rating: 4.9,
  reviewsCount: 42,
  image: '/src/assets/images/watch_rose_gold_1794494079347.jpg',
  images: ['/src/assets/images/watch_rose_gold_1794494079347.jpg'],
  description: 'Haute horlogerie chronograph.',
  details: ['Self-winding'],
  composition: '18K Rose Gold',
  sizes: ['41mm'],
  colors: [{ name: 'Rose Gold', hex: '#B76E79' }],
  inStock: true,
  stockCount: 6,
  isNewArrival: true,
  isBestSeller: true,
  isSpecialOffer: true,
  sku: 'RGD-WT-18K-01',
  isDemo: false,
};

test('mergeCatalogSources prefers Firestore when seeded even if products list is empty (all deleted)', () => {
  const merged = mergeCatalogSources({
    firestoreProducts: [],
    firestoreSeeded: true,
    apiProducts: [sampleBase],
  });
  assert.equal(merged.length, 0);
});

test('mergeCatalogSources falls back to apiProducts only when Firestore has never been seeded', () => {
  const merged = mergeCatalogSources({
    firestoreProducts: [],
    firestoreSeeded: false,
    apiProducts: [sampleBase],
  });
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'rgd-w-001');
});

test('sortCatalogProducts places newly created higher sortOrder products first', () => {
  const older = sanitizeAndClampProductForStorage({ ...sampleBase, id: 'old-1', sortOrder: 100 });
  const newer = sanitizeAndClampProductForStorage({ ...sampleBase, id: 'new-2', name: 'New Piece', sortOrder: 500 });
  const sorted = sortCatalogProducts([older, newer]);
  assert.equal(sorted[0].id, 'new-2');
  assert.equal(sorted[1].id, 'old-1');
});

test('validateImagePayloadBudget blocks oversized or >6 image galleries', () => {
  const tooMany = Array.from({ length: 7 }, (_, i) => `https://example.com/${i}.jpg`);
  assert.equal(validateImagePayloadBudget(tooMany).valid, false);

  const oversized = ['data:image/jpeg;base64,' + 'A'.repeat(270_000)];
  assert.equal(validateImagePayloadBudget(oversized).valid, false);

  const validGallery = [
    '/src/assets/images/watch_rose_gold_1794494079347.jpg',
    'data:image/jpeg;base64,' + 'A'.repeat(80_000),
  ];
  assert.equal(validateImagePayloadBudget(validGallery).valid, true);
});

test('decodeFirestoreDocument parses Firestore REST JSON fields accurately', () => {
  const decoded = decodeFirestoreDocument({
    name: 'projects/p/databases/d/documents/products/rgd-cust-999',
    fields: {
      id: { stringValue: 'rgd-cust-999' },
      name: { stringValue: 'Royal Obsidian' },
      price: { integerValue: '3200' },
      originalPrice: { doubleValue: 4000 },
      discountEnabled: { booleanValue: true },
      images: {
        arrayValue: {
          values: [{ stringValue: 'https://cdn.example.com/1.jpg' }],
        },
      },
      colors: {
        arrayValue: {
          values: [
            {
              mapValue: {
                fields: {
                  name: { stringValue: 'Gold' },
                  hex: { stringValue: '#D4AF37' },
                },
              },
            },
          ],
        },
      },
    },
  });

  assert.ok(decoded);
  assert.equal(decoded!.id, 'rgd-cust-999');
  assert.equal(decoded!.price, 3200);
  assert.equal(decoded!.originalPrice, 4000);
  assert.equal(decoded!.discountEnabled, true);
  assert.deepEqual(decoded!.images, ['https://cdn.example.com/1.jpg']);
  assert.deepEqual(decoded!.colors, [{ name: 'Gold', hex: '#D4AF37' }]);
});
