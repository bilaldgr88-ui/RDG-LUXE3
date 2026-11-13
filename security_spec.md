# RGD LUXE Firestore Security Specification

## 1. Data Invariants
1. **Strict Admin-Only Writes on Catalog**: Only an authenticated, email-verified administrator (`request.auth.token.admin == true` custom claim or server-managed `/admins/{uid}` record) may create, update, or delete `/products/{productId}` or `/catalog_meta/{metaId}` documents. Customers and unauthenticated visitors have zero write permissions.
2. **Valid Product Pricing & Discount Integrity**: `price > 0`, `originalPrice >= price`, `discountPercentage` bounded `0..99`, `stockCount >= 0`, `category` restricted to `['men', 'women', 'watches']`, and `images` bounded to `1..6` items.
3. **Immutable Creation Timestamp**: `createdAt` on `/products/{productId}` must equal `request.time` on `create` and must remain unchanged (`incoming().createdAt == existing().createdAt`) on `update`; `updatedAt` must always equal `request.time`.
4. **No PII Exposure in Public Collections**: `/products` and `/catalog_meta` contain zero customer PII. `/admins/{adminUid}` is strictly locked down from all client writes (`allow create, update, delete: if false`) and readable only by the matching verified user or an authorized admin.
5. **Path ID Poisoning Guard**: Document IDs in single-doc rules (`products`, `catalog_meta`, `admins`) must satisfy `isValidId(id)` (`size <= 128`, regex `^[a-zA-Z0-9_-]+$`).

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Product Create**: `request.auth == null` -> `CREATE /products/rgd-test-1`.
2. **Customer / Non-Admin Product Create**: Verified non-admin Google user (`email: 'random@gmail.com'`, no `admin` claim) -> `CREATE /products/rgd-test-2`.
3. **Unverified Admin Claim Spoof**: `request.auth.token.admin == true` with `email_verified: false` -> `CREATE /products/rgd-test-3`.
4. **Shadow Field Injection on Product Create**: Admin creates product with extra unknown field `isFeaturedHack: true` (`hasOnly` rejects).
5. **Negative / Zero Price Manipulation**: Admin creates product with `price: -100` or `price: 0`.
6. **Invalid Discount Inversion**: Admin creates product with `originalPrice: 500`, `price: 900` (`price > originalPrice`).
7. **Unbounded Gallery Array Poisoning**: Admin creates product with `images` array of 12 elements (`size <= 6` rejects) or empty `[]`.
8. **Invalid Category Injection**: Admin creates product with `category: 'electronics'`.
9. **Immutable Timestamp Tampering**: Admin updates `/products/rgd-w-001` modifying `createdAt` or `id`.
10. **Forged Timestamp Spoof**: Admin creates `/products/rgd-test-4` with backdated `createdAt: '2020-01-01T00:00:00Z'` instead of `request.time`.
11. **Path ID Poisoning**: Request targeting `/products/` with ID > 128 chars or containing invalid characters (`../../admin`).
12. **Self-Assigned Admin Escalation**: Non-admin authenticated user attempts `CREATE /admins/{theirUid}` with `{ email: 'attacker@example.com', createdAt: request.time }`.
