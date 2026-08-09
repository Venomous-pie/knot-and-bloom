# Backend Documentation — Knot & Bloom API

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ES Modules) |
| Framework | Express 5.x |
| ORM | Prisma 7.x |
| Database | PostgreSQL (hosted on Supabase) |
| Auth | Custom JWT (jsonwebtoken) + Refresh Token rotation |
| OAuth | Google OAuth 2.0 via Passport.js |
| Validation | Zod 4.x |
| AI Services | Google Gemini (@google/generative-ai) |
| Email | Nodemailer (Gmail SMTP) |
| Image Uploads | ImageKit (client-side upload, server-signed auth) |
| Security | Helmet, express-rate-limit, XSS sanitization |
| Testing | Jest 30.x |

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18 or newer
- **PostgreSQL**: Connects to the shared Supabase instance (no local DB needed)

### 2. Installation
```bash
cd knot-and-bloom/backend
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env
```
Open `.env` and fill in the required keys. Ask your team lead for:
- `DATABASE_URL`, `DIRECT_URL` — Supabase connection strings
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase project keys
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `IMAGEKIT_PRIVATE_KEY` — ImageKit private key
- `GEMINI_API_KEY` — Google AI Studio key
- `SMTP_PASS` — Gmail app password for email OTPs

### 4. Generate Prisma Client
```bash
npx prisma generate
```

> Migrations are handled by the team lead. If you need to run them locally: `npx prisma migrate dev`

### 5. Start the Dev Server
```bash
npm run dev
```
Server starts at **`http://localhost:3030`** with hot-reload via `nodemon` + `tsx`.

---

## Architecture Overview

```
backend/
├── src/
│   ├── controllers/       # Business logic (17 controllers)
│   ├── routes/            # API route definitions (19 route files)
│   ├── services/          # Shared services (AI, payments, cron, OTP, etc.)
│   ├── middleware/        # Auth, rate limiting, sanitization, logging
│   ├── validators/        # Zod schemas
│   ├── utils/             # Helper functions (Prisma client, platform config, etc.)
│   ├── types/             # TypeScript types
│   ├── config/            # Passport.js config
│   ├── error/             # Custom error classes
│   └── index.ts           # Server entry point
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
└── generated/prisma/      # Prisma client (auto-generated)
```

**Pattern**: MVC (Model-View-Controller)

---

## Authentication

### JWT Flow (Credentials)
1. `POST /api/users/register` or `POST /api/users/login`
2. Returns `{ token, refreshToken, data: user }`
3. Send JWT in `Authorization: Bearer <token>` header on protected routes
4. Use `POST /api/auth/refresh` to rotate tokens before expiry

### Google OAuth Flow
1. `GET /auth/google` — Redirects to Google
2. `GET /auth/google/callback` — Google redirects back; server generates a one-time `code` and redirects frontend to `/auth/success?code=<code>`
3. `POST /auth/exchange-code` — Frontend exchanges the code for `{ token, refreshToken }` (code is single-use, 60s TTL)

### Refresh Token Rotation
- Access token: 7-day JWT
- Refresh token: stored in DB, rotated on every use
- `POST /auth/refresh` — returns new access + refresh token pair
- `POST /auth/logout` — revokes the refresh token

### User Roles

| Role | Description |
|------|-------------|
| `USER` | Default customer |
| `SELLER` | Approved seller with storefront |
| `ADMIN` | Platform administrator |

---

## API Endpoints

### Auth (`/auth` and `/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/auth/google` | Public | Redirect to Google OAuth |
| `GET` | `/auth/google/callback` | Public | Google OAuth callback |
| `POST` | `/auth/exchange-code` | Public | Exchange one-time code for JWT |
| `POST` | `/auth/send-otp` | Public | Send email OTP for registration |
| `POST` | `/auth/refresh` | Public | Rotate access + refresh tokens |
| `POST` | `/auth/logout` | Public | Revoke refresh token |

---

### Users (`/api/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register` | Public | Register new user |
| `POST` | `/login` | Public | Login with credentials |
| `POST` | `/login/google` | Public | Login via Google ID token |
| `GET` | `/profile` | Required | Get own profile |
| `PUT` | `/profile` | Required | Update own profile |

---

### Products (`/api/products`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/get-product` | Public | List active products (paginated, filterable) |
| `GET` | `/search-product` | Public | Search products by term |
| `GET` | `/category-counts` | Public | Get product counts per category |
| `GET` | `/recommendations` | Optional | Personalized recommendations |
| `GET` | `/:id/similar` | Public | Similar products |
| `GET` | `/:id` | Public | Get product details |
| `POST` | `/post-product` | Required | Create product |
| `PUT` | `/:id` | Required | Update product |
| `DELETE` | `/:id` | Required | Soft delete product |
| `GET` | `/admin` | Admin | List all products (incl. PENDING) |
| `PATCH` | `/admin/:id/status` | Admin | Approve/reject product |
| `POST` | `/generate-description` | Required | AI-generate product description |
| `POST` | `/generate-sku` | Required | AI-generate product SKU |
| `POST` | `/generate-variant-sku` | Required | AI-generate variant SKU |
| `POST` | `/generate-option-values` | Required | AI-suggest option values |

---

### Sellers (`/api/sellers`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/active` | Public | List all active sellers |
| `GET` | `/:slug` | Public | Get seller public profile |
| `POST` | `/` | Required | Register as a new seller |
| `POST` | `/onboard` | Required | Upgrade existing user to seller |
| `DELETE` | `/me/application` | Required | Cancel pending seller application |
| `GET` | `/` | Admin | List all sellers |
| `PUT` | `/:id` | Seller/Admin | Update seller profile |
| `GET` | `/me/dashboard-stats` | Seller/Admin | Seller dashboard statistics |
| `GET` | `/me/sidebar-stats` | Seller/Admin | Sidebar stat counts |
| `GET` | `/admin/sidebar-stats` | Admin | Admin sidebar stats |
| `GET` | `/me/products` | Required | Get own products |
| `PATCH` | `/me/welcome-seen` | Required | Mark welcome modal as seen |
| `GET` | `/:id/orders` | Seller/Admin | List seller orders |
| `PATCH` | `/me/shipping-settings` | Seller/Admin | Update shipping configuration |
| `GET` | `/me/shipping-preview` | Seller/Admin | Preview shipping fee calculation |

---

### Cart (`/api/cart`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/:userId` | Required | Get cart contents |
| `POST` | `/add` | Required | Add item to cart |
| `PATCH` | `/item/:itemId` | Required | Update item quantity |
| `DELETE` | `/item/:itemId` | Required | Remove item from cart |
| `POST` | `/checkout` | Required | Legacy cart checkout |

---

### Checkout (`/api/checkout`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/initiate` | Required | Start a new checkout session |
| `GET` | `/:sessionId` | Required | Get session details |
| `POST` | `/:sessionId/validate` | Required | Validate cart before payment |
| `POST` | `/:sessionId/estimate-shipping` | Required | Estimate shipping cost |
| `POST` | `/:sessionId/pay` | Required | Process payment (20% deposit) |
| `POST` | `/:sessionId/complete` | Required | Finalize and create order |
| `DELETE` | `/:sessionId` | Required | Cancel checkout session |
| `GET` | `/methods/available` | Required | Available payment methods |

**Checkout Flow:**
1. `POST /initiate` — validates cart, creates session
2. `POST /:sessionId/estimate-shipping` — calculates shipping based on seller location and distance
3. `POST /:sessionId/validate` — final pre-payment check
4. `POST /:sessionId/pay` — processes 20% deposit (via payment method)
5. `POST /:sessionId/complete` — creates order, clears cart, notifies parties

---

### Orders (`/api/orders`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | Required | List user orders |
| `GET` | `/:id` | Required | Get order details |
| `PUT` | `/:id/status` | Required | Update order status |
| `PUT` | `/items/:itemId/status` | Seller/Admin | Update individual order item status |
| `POST` | `/:id/extend-guarantee` | Required | Extend buyer guarantee period |
| `POST` | `/:id/dispute` | Required | Raise a dispute |
| `POST` | `/:id/dispute-message` | Required | Add evidence to a dispute |

---

### Addresses (`/api/addresses`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/me` | Required | List saved addresses |
| `POST` | `/me` | Required | Create address |
| `PUT` | `/me/:id` | Required | Update address |
| `DELETE` | `/me/:id` | Required | Delete address |
| `PATCH` | `/me/:id/default` | Required | Set default address |

---

### Notifications (`/api/notifications`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | Required | Get notifications (filterable) |
| `GET` | `/settings` | Required | Get notification preferences |
| `PUT` | `/settings` | Required | Update notification preferences |
| `PATCH` | `/:id/read` | Required | Mark notification as read |
| `PATCH` | `/read-all` | Required | Mark all as read |
| `DELETE` | `/:id` | Required | Delete notification |

---

### Payment Methods (`/api/payment-methods`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/me` | Required | List payment methods |
| `POST` | `/me` | Required | Add payment method |
| `PUT` | `/me/:id` | Required | Update payment method |
| `DELETE` | `/me/:id` | Required | Delete payment method |
| `PATCH` | `/me/:id/default` | Required | Set default payment method |

---

### Earnings (`/api/earnings`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/seller` | Required | Get seller earnings |
| `POST` | `/withdraw` | Required | Request withdrawal |
| `GET` | `/admin/stats` | Admin | Platform-wide earnings stats |
| `POST` | `/admin/withdraw/:id/process` | Admin | Process a withdrawal request |

---

### Wishlist (`/api/wishlist`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/:userId` | Required | Get wishlist |
| `POST` | `/:userId/toggle` | Required | Add/remove product from wishlist |

---

### Reviews (`/api/reviews`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/seller/:slug` | Public | Get reviews for a seller |
| `GET` | `/product/:id` | Public | Get reviews for a product |

---

### Chat (`/api/chat`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/send` | Required | Send a chat message |
| `POST` | `/ai` | Optional | Send message to AI assistant (Gemini) |

---

### ImageKit (`/api/imagekit`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/auth` | Required | Generate client-side upload auth params |

---

### Locations (`/api/locations`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/regions` | Public | All PH regions |
| `GET` | `/provinces/:regCode` | Public | Provinces for a region |
| `GET` | `/cities/:provCode` | Public | Cities/municipalities for a province |
| `GET` | `/barangays/:citymunCode` | Public | Barangays for a city |

---

### Account (`/api/account`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/delete-request` | Required | Request account deletion (7-day grace) |
| `DELETE` | `/delete-request` | Required | Cancel deletion request |
| `GET` | `/delete-status` | Required | Get deletion request status |
| `POST` | `/process-deletions` | Admin | Trigger scheduled deletions (cron) |

---

### Admin (`/api/admin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/platform-config` | Admin | Get all platform config values |
| `PATCH` | `/platform-config` | Admin | Update platform config values |
| `GET` | `/dashboard-stats` | Admin | Revenue, seller and product counts |
| `GET` | `/orders` | Admin | All platform orders (paginated) |
| `POST` | `/orders/:id/resolve-dispute` | Admin | Resolve a disputed order |

---

## Services

| Service | Purpose |
|---------|---------|
| `GenerateService` | AI-powered product description, SKU, and option value generation via Google Gemini |
| `PaymentService` | Payment processing logic (20% deposit model) |
| `AuditService` | Structured audit logging for auth, account, and product events |
| `NotificationService` | In-app notification dispatch |
| `OtpService` | Email OTP generation and verification via Nodemailer |
| `RefreshTokenService` | Refresh token issuance, validation, rotation, and revocation |
| `SellerService` | Seller onboarding helpers |
| `SupabaseService` | Supabase admin client wrapper |
| `LoginRateLimiter` | Per-IP login attempt tracking with automatic lockout |
| `cronService` | Scheduled jobs (order status transitions, account deletions, etc.) |
| `fuelService` | Dynamic fuel-cost-based shipping fee calculation |
| `kycService` | KYC document verification helpers |

---

## Middleware

| Middleware | Purpose |
|-----------|---------|
| `authMiddleware` | `authenticate` (JWT decode to req.user), `authorize` (role check), `optionalAuthenticate` |
| `rateLimiter` | Global: 100 req/min per IP via `PrismaRateLimitStore` |
| `sanitize` | Strips HTML/XSS from all incoming request body fields |
| `requestLogger` | Structured JSON request logging |
| `errorHandlingMiddleware` | Centralised Express error handler |
| `helmet` | Sets HTTP security headers |

---

## Database Schema

### Key Models

**Product**
- Pricing: `basePrice`, `discountedPrice`
- Status: `PENDING` to `ACTIVE` (requires admin approval)
- Soft delete via `deletedAt` timestamp
- Variant and multi-category support

**Customer**
- Roles: `USER`, `SELLER`, `ADMIN`
- 1-to-1 Cart, multiple Orders, saved Addresses
- Account deletion with 7-day grace period

**Order**
- Multi-vendor: split by seller at checkout
- Status: `PENDING` to `PROCESSING` to `SHIPPED` to `DELIVERED`
- Dispute system with evidence submission
- Buyer guarantee extension

**Seller**
- Status: `PENDING` to `ACTIVE`
- Linked 1-to-1 with Customer
- Configurable shipping settings (free pickup vs. variable delivery)
- Earnings and withdrawal tracking

**PlatformConfig**
- Key-value store for runtime-adjustable platform settings (fuel price, labor allowance, floor fees, etc.)

---

## Running the Backend

### Development
```bash
npm install
npx prisma generate   # Generate Prisma client
npm run dev           # Hot-reload dev server on port 3030
```

### Database Migrations
```bash
npx prisma migrate dev --name migration_name
npx prisma studio     # Visual database browser
```

### Testing
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full structure. Key sections:

| Section | Variables |
|---------|-----------|
| Server | `PORT`, `NODE_ENV` |
| Database | `DATABASE_URL` (transaction pooler), `DIRECT_URL` (session pooler for migrations) |
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Authentication | `JWT_SECRET` (min 32 chars), `JWT_EXPIRES_IN` |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| CORS | `CORS_ORIGINS` (comma-separated allowed origins) |
| Frontend | `FRONTEND_URL` (used for OAuth redirect) |
| ImageKit | `IMAGEKIT_PRIVATE_KEY` |
| AI | `GEMINI_API_KEY` |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| Payment Gateway | `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY` |
| Rate Limiting | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Webhooks | `DIDIT_WEBHOOK_SECRET` |

---

## Seeded Accounts

These accounts are created by the seed scripts and can be used during local development and testing. All accounts use the password **`Password123!`**.

> Run `npx tsx src/scripts/seedAdmin.ts` and `npx tsx src/scripts/seedMainStore.ts` to populate the database.

### 👑 Admin

| Name | Email | Role | Notes |
|------|-------|------|-------|
| Knot & Bloom Admin | `admin@knotandbloom.com` | `ADMIN` | Owns the Knot & Bloom Official Store |

---

### 🛍️ Sellers

| Name | Email | Store | Location | Commission |
|------|-------|-------|----------|------------|
| Maria Santos | `maria.santos@knotbloom-seed.com` | Ami ni Maria | Antipolo City, Rizal | 12% |
| Diane Reyes | `diane.reyes@knotbloom-seed.com` | The Crobag Studio | Mandaluyong City, Metro Manila | 12% |
| Lena Cruz | `lena.cruz@knotbloom-seed.com` | Lena's Blooms | Los Baños, Laguna | 12% |
| Luisa Mina | `luisa.mina@knotbloom-seed.com` | Lumina Beads | Pasig City, Metro Manila | 12% |
| Leo Tolentino | `leo.tolentino@knotbloom-seed.com` | Pintura at Likha | Quezon City, Metro Manila | 12% |

**Store highlights:**
- **Ami ni Maria** — Amigurumi plushies and crochet keychains (Free shipping: No)
- **The Crobag Studio** — Handmade crochet bags (Free shipping above ₱800)
- **Lena's Blooms** — Fuzzy wire bouquets and flower arrangements (Free shipping: No)
- **Lumina Beads** — Beaded jewelry and hair ties (Free shipping above ₱1,000)
- **Pintura at Likha** — Canvas paintings and resin door decor (Self-delivery enabled)

---

### 👤 Buyers (Dummy — for seeded reviews only)

| Name | Email | Role |
|------|-------|------|
| Juan Dela Cruz | `buyer0@knotbloom-seed.com` | `USER` |
| Maria Clara | `buyer1@knotbloom-seed.com` | `USER` |
| Andres Bonifacio | `buyer2@knotbloom-seed.com` | `USER` |
| Jose Rizal | `buyer3@knotbloom-seed.com` | `USER` |

> These buyer accounts exist solely to back the seeded product reviews. They are not intended for full checkout testing.

---

## Troubleshooting

### Prisma Error: P1001 (Can't reach database server)

**Problem:**
When running `npx prisma db pull`, `npx prisma migrate dev`, or starting the server you get:
`Error: P1001: Can't reach database server at 'aws-X-ap-south-X.pooler.supabase.com:5432'`

This is common on Philippine consumer ISPs (Globe, PLDT). The cause is either:
1. The ISP blocks outbound ports `5432` / `6543`.
2. Broken DNS64/NAT64 resolves the Supabase pooler to an IPv6 address that the ISP black-holes.

**Solution** (network-level — cannot be fixed in code):
1. **Recommended**: Use [Cloudflare WARP (1.1.1.1)](https://1.1.1.1/) to bypass ISP restrictions.
2. Switch to a mobile hotspot (Smart/Dito tend to work).
3. Confirm **Network Restrictions** are disabled in Supabase Dashboard: Database > Settings > Network restrictions.
