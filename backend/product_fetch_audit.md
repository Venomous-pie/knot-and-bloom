# Product Fetching Flow — Bug & Oversight Audit

## Flow Summary

```
GET /api/products/get-product  →  getProducts()
GET /api/products/search-product → searchProducts()
GET /api/products/category-counts → getCategoryCounts()
GET /api/products/:id          →  getProductById()
GET /api/products/admin        →  getAdminProducts()  (Admin only)
```

---

## 🐛 Bugs & Oversights Found

### 1. `getProducts` — `category` and `categories` filters silently conflict
**Severity: Medium | File: `ProductController.ts` L297–306**

If a caller passes both `category` and `categories` query params, the `categories` filter **overwrites** `whereClause.categories` set by `category`. One of them is silently ignored.

```ts
// BUG: second assignment overwrites the first
if (category) {
    whereClause.categories = { has: category };        // ← set here
}
if (categories) {
    whereClause.categories = { hasSome: cats };        // ← overwritten here
}
```
**Fix:** Merge them, or prefer one explicitly, or reject when both are provided.

---

### 2. `getProducts` — `searchTerm` filter bypasses tag and price filters
**Severity: Medium | File: `ProductController.ts` L321–334**

When `searchTerm` is present, the seller condition is placed inside `whereClause.AND`. But the top-level `whereClause.tags` / `whereClause.basePrice` / `whereClause.categories` filters that were built *before* this block still work fine **only if** no `AND` array conflicts with them. However, when there is no `searchTerm`, the seller OR condition is applied via `whereClause.OR = sellerCondition.OR`.

This is a structural inconsistency: with `searchTerm`, `AND` is used for seller; without it, `OR` is used at the top-level. This means:

- **Without searchTerm** → `whereClause.OR` = seller condition. If `tags` or `categories` were also set, they run correctly at the top level alongside `OR`.
- **With searchTerm** → `whereClause.AND` wraps both `OR: searchOR` and the seller condition. The existing top-level `whereClause.categories`/`tags`/`basePrice` still apply correctly *because they are separate top-level keys.*

This is **structurally confusing but technically correct** today. The real risk is that a future developer adds a top-level OR condition and accidentally blows away the seller OR. Consider refactoring to always use `AND[]` for clarity.

---

### 3. `getProductById` — Returns suspended/pending products to the public
**Severity: High | File: `ProductController.ts` L576–589**

`getProductById` fetches by `uid` and only checks `deletedAt`. It **does not check** `status === ACTIVE` or whether the seller is active. A customer who knows a product's ID can view `PENDING`, `SUSPENDED`, or `DRAFT` products directly.

```ts
// BUG: no status or seller status filter
const product = await prisma.product.findUnique({
    where: { uid: parsedId },
    ...
});
if (!product || product.deletedAt) { throw NotFoundError; }
// ← MISSING: check product.status === ACTIVE and seller.status === ACTIVE
```

**Fix:**
```ts
if (
    !product ||
    product.deletedAt ||
    product.status !== ProductStatus.ACTIVE ||
    (product.seller && product.seller.status !== SellerStatus.ACTIVE)
) {
    throw new ErrorHandler.NotFoundError('Product', productId);
}
```

---

### 4. `getProducts` — `newArrival` filter AND `sort` interact unexpectedly
**Severity: Low | File: `ProductController.ts` L336–353**

If `newArrival=true` is passed alongside `sort=bestselling`, the query filters to products from the last 7 days *and* sorts by `soldCount`. This is likely fine for most cases, but new arrivals almost always have `soldCount = 0`, making the bestselling sort meaningless. There is no guard or note on this behavior.

---

### 5. `getAdminProducts` — No seller status validation in the status filter
**Severity: Low | File: `ProductController.ts` L426–461**

The `status` param passed from the route is cast directly as a `ProductStatus` enum string without validation:

```ts
if (status) {
    whereClause.status = status; // ← raw string, never validated
}
```

An admin passing `status=INVALID_VALUE` will get an empty result set silently instead of a 400 error. The route handler doesn't validate it either.

**Fix:** Validate `status` against `Object.values(ProductStatus)` before applying.

---

### 6. Route order bug — `/:id` catches `/get-product`, `/search-product`, `/category-counts`
**Severity: High | File: `productRoutes.ts`**

Express matches routes top-to-bottom. In the route file, `/:id` is registered **after** the named routes (`/get-product`, `/search-product`, `/category-counts`), so they are correctly matched first. This is **currently fine**, but it is fragile. If someone adds a new named route *after* `/:id`, it will never be reached. 

> [!WARNING]
> The route `/:id` is at line 320, and `DELETE /:id` / `PUT /:id` are after it. Any new named GET route added below line 320 (e.g., `/related`) would be shadowed by `/:id`.

**Fix:** Move all named routes above `/:id`. They already are — just add a comment warning future developers not to add named routes below `/:id`.

---

### 7. `searchProducts` — `limit` is not capped and not validated
**Severity: Low | File: `ProductController.ts` L500 / `productRoutes.ts` L278**

`limit` in the search route is parsed with `parseInt` but never capped. A caller could pass `limit=99999` and force a massive DB scan. The `getProducts` function uses Zod validation via `getProductsQuerySchema` which likely has a max. But `searchProducts` is called directly with raw `parsedLimit`.

```ts
const parsedLimit = limit ? parseInt(limit as string) : 20;
// ← no cap, no NaN check
const products = await searchProducts(searchTerm as string || '', parsedLimit);
```

If `limit=NaN` (e.g., `?limit=abc`), Prisma's `take: NaN` will throw an unhandled error.

**Fix:**
```ts
const parsedLimit = Math.min(Math.max(1, parseInt(limit as string) || 20), 100);
```

---

## ✅ Things Done Well

- Cache invalidation on `postProduct`, `updateProduct`, `deleteProduct`, and `updateProductStatus` is thorough (`cache.deletePattern('product:')`).
- Seller condition (ACTIVE + not deleted) is consistently applied across `getProducts`, `searchProducts`, and `getCategoryCounts`.
- Optimistic locking via `version` field on `updateProduct` is a solid pattern.
- Soft deletes are consistently checked via `deletedAt`.
- SKU collision retry logic (up to 3 attempts) is a good defensive pattern.

---

## Priority Fix Order

| # | Issue | Severity | Where |
|---|-------|----------|-------|
| 1 | `getProductById` exposes non-ACTIVE products | 🔴 High | `ProductController.ts:576` |
| 2 | `category` + `categories` conflict | 🟡 Medium | `ProductController.ts:297` |
| 3 | `searchProducts` limit not capped/validated | 🟡 Medium | `productRoutes.ts:278` |
| 4 | `getAdminProducts` status not validated | 🟢 Low | `ProductController.ts:434` |
| 5 | Route order fragility for `/:id` | 🟢 Low | `productRoutes.ts:320` |
| 6 | `newArrival` + `bestselling` sort conflict | 🟢 Low | `ProductController.ts:336` |
