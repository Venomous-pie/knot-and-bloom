# Knot & Bloom: The Final Business Model

## 1. The Core Vision
Knot & Bloom is a B2C2C multi-vendor marketplace exclusively for micro-creators—students, single parents, and local handcrafters in the Philippines. It is a heavily curated sanctuary from mass-produced imports, providing these artisans with professional tools without the steep fees or business registration hurdles of enterprise e-commerce.

## 2. Revenue & Economics (The Survival Engine)
To ensure the platform generates immediate cash flow while remaining hyper-affordable for sellers, the revenue model relies on three pillars:
- **Platform Sustainability Fee (Seller Side):** A flat 2% deducted immediately from every successful sale. The seller keeps 98%.
- **Order Routing Fee (Buyer Side):** A flat ₱15 fee charged to the buyer per unique maker in their cart.
- **Premium Aesthetic Upgrades (High Margin):** Sellers can purchase bespoke digital assets—custom avatar frames, unique storefront layout materials, and dynamic clothing overlays for their profile portraits—to make their shop visually pop.

## 3. The Payment & Escrow Architecture
Because you must collect your 2% immediately, the platform acts as a central secure escrow rather than relying on direct peer-to-peer transfers.
- **The Collection:** The buyer pays the grand total (Item + 2% Gateway Processing Fee + ₱15 Routing Fee) directly to Knot & Bloom's central GCash or PayMongo account.
- **The Immediate Cut:** The system instantly skims the ₱15 routing fee and the 2% seller fee into your operational budget.
- **The Escrow:** The remaining 98% of the item's price is credited to the seller's Pending Balance.
- **The Payout:** Once the courier delivers the item, the funds move to the seller's Available Balance. The seller requests a withdrawal, which you process to their personal GCash or bank account.

## 4. The 20% COD Trust System
Cash on Delivery is the lifeblood of Philippine e-commerce, but it carries high risks. Knot & Bloom eliminates this risk for artisans.
- **The Deposit:** If a buyer selects COD, they must pay a 20% deposit upfront via the central platform gateway.
- **The Fulfillment:** The artisan crafts the item with peace of mind. The courier collects the remaining 80% upon delivery. 
  - *If using Platform-Integrated 3PL (e.g., GoGoXpress API):* The courier remits the 80% to Knot & Bloom's corporate account, which is then added to the seller's Available Balance for withdrawal.
  - *If using Independent Courier (e.g., Seller's local LBC):* The courier remits the 80% directly to the seller's bank account, bypassing the platform completely (since Knot & Bloom already took its fees from the 20% upfront deposit).
- **The Safety Net:** If the buyer refuses the package, the artisan keeps the 20% deposit to cover their materials, and the buyer's Customer Trust Score plummets, banning them from future COD purchases.

## 5. Lean Tech Stack & Infrastructure
The architecture is stripped down to maximize your profit as a solo developer by leveraging free tiers and client-side processing.
- **Backend & Database:** Supabase handles all PostgreSQL data storage and JWT authentication for free.
- **Real-Time Events:** Supabase Realtime (Broadcast) replaces Socket.IO to handle live cart updates and order notifications statelessly.
- **Media Hosting:** Supabase Storage replaces ImageKit. Product photos are aggressively compressed client-side via the browser's Canvas API before uploading to keep storage costs at zero.
- **Frontend (Buyers, Sellers, Admin):** React Native (Expo) with Expo Router for a unified, seamless mobile and web experience across all dashboards, allowing you to iterate rapidly on a single codebase.

## 6. Trust-Tiered Product Governance
To prevent the admin panel from bottlenecking ahead of next month's launch, quality control is community-driven.
- **Auto-Approval:** Once a seller completes their basic KYC identity check, their first 5 products bypass manual review and go live instantly.
- **Proof of Work:** To block dropshippers, every product listing requires a "Work in Progress" (WIP) photo or workspace snapshot, proudly displayed to the buyer as proof of authenticity.
- **Crowdsourced Moderation:** Buyers can use a "Report Listing" button to flag mass-produced goods, which sends the item directly to your admin dashboard for review.

---

## User Lifecycle

```
Visitor → Register → OTP Verification → Customer → Seller Application (PENDING) → Admin Approval (APPROVED) → Onboarding Completion → Active Seller
```

### Authentication & Onboarding

| Feature                   | Status         | Details                                           |
| ------------------------- | -------------- | ------------------------------------------------- |
| **Email/Password Signup** | ✅ Implemented | With password policy enforcement                  |
| **Phone Signup**          | ✅ Implemented | Phone number as alternative identifier            |
| **Google OAuth**          | ✅ Implemented | One-tap Google sign-in via Passport.js            |
| **OTP Verification**      | ✅ Implemented | Required for all new registrations (email & phone)|
| **JWT Auth**              | ✅ Implemented | Access Token (1h) + Refresh Token (7d)            |
| **Password Reset**        | ✅ Implemented | OTP-based password reset flow                     |

### Seller Onboarding Flow

1. **Register** – User signs up as Customer (OTP verified)
2. **Apply** – Submit Seller Application with:
   - Business name, type, and description
   - Product categories and handmade declaration
   - Prior selling experience
   - Social media / portfolio link
3. **KYC** – Provide identity verification:
   - Legal name, business address
   - Government ID type and number
4. **Terms** – Accept seller terms and conditions
5. **Admin Review** – Status: `PENDING` → `APPROVED`
6. **Onboarding** – Complete profile setup (logo, banner) → Status: `ACTIVE`
7. **Welcome** – Seller sees welcome modal on first dashboard visit
8. **Selling** – Full access to Seller Dashboard

### Seller Status Lifecycle

```
PENDING → APPROVED → ACTIVE → SUSPENDED/BANNED
   ↓
REJECTED (can re-apply)
```

### Product Approval Flow

1. **Draft** – Seller saves work-in-progress via form wizard
2. **Pending** – Seller publishes; visible to admin only
3. **Active** – Admin approves; appears in marketplace
4. **Suspended** – Admin can suspend problematic listings

---

## Order & Payment Flow

1. **Cart → Checkout Session** (15 min expiry with price locking)
2. **Stock Validation** (re-verified before payment via optimistic locking)
3. **Payment Processing**
   - COD: 20% deposit upfront, balance on delivery
   - Card/Wallet: Full payment processed
4. **Order Split by Seller** – Multi-seller cart creates separate orders per seller
5. **Fee Calculation** – 2% Sustainability Fee, ₱15 Routing Fee, and shipping fee computed
6. **Inventory Deduction** (atomic transaction with optimistic locking)
7. **Seller Notification** (Supabase Realtime Broadcast)
8. **Order Timeline** – Full event history with photos and audit trail

### Payment Methods

| Method          | Status         | Details                                    |
| --------------- | -------------- | ------------------------------------------ |
| `MOCK_CARD`     | ✅ Implemented | Simulated card payment                     |
| `MOCK_WALLET`   | ✅ Implemented | Simulated e-wallet                         |
| `COD`           | ✅ Implemented | Cash on Delivery (20% deposit via central escrow)|
| `GCASH`         | 📋 Planned     | Via Central Escrow (PayMongo integration)  |
| `PAYMAYA`       | 📋 Planned     | Via Central Escrow (PayMongo integration)  |
| `BANK`          | 📋 Planned     | Bank transfer support                      |

### COD Trust System

| Mechanism                 | Details                                        |
| ------------------------- | ---------------------------------------------- |
| **Trust Score**           | 0–100, starts at 100, drops on cancellations   |
| **Cancellation Counter**  | Tracks bad COD behavior per customer           |
| **COD Eligibility**       | Seller can toggle per product (₱200+ minimum)  |

---

## Seller Economics

| Metric              | Status         | Description                                 |
| ------------------- | -------------- | ------------------------------------------- |
| **Sustainability Fee**| ✅ Implemented | 2% flat deduction per successful sale       |
| **Routing Fee**     | ✅ Implemented | ₱15 flat charge to buyer per unique maker   |
| **Seller Earnings** | ✅ Implemented | Per-order net earnings (98% of subtotal)    |
| **Pending Balance** | ✅ Implemented | Earnings awaiting clearance                 |
| **Available Balance**| ✅ Implemented | Earnings available for withdrawal           |
| **Total Withdrawn** | ✅ Implemented | Cumulative withdrawn amount                 |
| **Total Sales**     | ✅ Implemented | Tracked per seller                          |
| **Total Orders**    | ✅ Implemented | Count of fulfilled orders                   |
| **Rating**          | ✅ Implemented | Seller reputation score                     |
| **Performance**     | ✅ Implemented | Avg ship time, success rate via SellerService|

### Withdrawal System

| Feature                | Status         | Details                                    |
| ---------------------- | -------------- | ------------------------------------------ |
| **Withdrawal Requests**| ✅ Implemented | Sellers request payouts from available balance |
| **Admin Approval**     | ✅ Implemented | Admin reviews and approves/rejects withdrawals |
| **Payout Methods**     | ✅ Implemented | GCash, Bank Transfer supported             |
| **Status Tracking**    | ✅ Implemented | PENDING → APPROVED → PROCESSED / REJECTED |

---

## Customer Features

| Feature                  | Status         | Details                                      |
| ------------------------ | -------------- | -------------------------------------------- |
| **Product Browsing**     | ✅ Implemented | Categories, search, maker/seller pages       |
| **Product Variants**     | ✅ Implemented | Size/color with individual stock & pricing   |
| **Shopping Cart**        | ✅ Implemented | Persistent cart with variant support          |
| **Wishlist**             | ✅ Implemented | Save products for later, synced with backend |
| **Checkout**             | ✅ Implemented | Multi-phase state machine with price locking |
| **Order Tracking**       | ✅ Implemented | Full timeline with status progression        |
| **Address Management**   | ✅ Implemented | Multiple addresses with Philippine regions   |
| **Payment Methods**      | ✅ Implemented | Save GCash, PayMaya, Bank accounts           |
| **Notifications**        | ✅ Implemented | Real-time via WebSocket + in-app notification center |
| **Notification Settings**| ✅ Implemented | Toggle order updates, promotions, system messages |
| **Account Deletion**     | ✅ Implemented | Scheduled soft-delete with grace period      |
| **Maker Profiles**       | ✅ Implemented | Browse and view seller/artisan storefronts   |

---

## Seller Dashboard

| Feature                   | Status         | Details                                        |
| ------------------------- | -------------- | ---------------------------------------------- |
| **Analytics Overview**    | ✅ Implemented | Revenue trends, order pipeline, performance KPIs |
| **Product Management**    | ✅ Implemented | Multi-step form wizard with live preview       |
| **Product SEO**           | ✅ Implemented | Meta title, description, tags for discoverability |
| **AI-Generated Content**  | ✅ Implemented | Auto-generate descriptions, SKUs, and SEO tags |
| **Variant Editor**        | ✅ Implemented | Visual variant management with color picker    |
| **Image Upload**          | ✅ Implemented | Multi-image upload with client-side Canvas compression via Supabase Storage |
| **Order Management**      | ✅ Implemented | View, confirm, ship, and track all orders      |
| **Earnings Dashboard**    | ✅ Implemented | Balance overview, withdrawal requests          |
| **Notifications**         | ✅ Implemented | Seller-specific notification feed              |
| **Settings**              | ✅ Implemented | Shop profile, commission visibility            |
| **Sidebar Navigation**    | ✅ Implemented | Dedicated dashboard layout with sidebar        |

---

## Admin Panel

| Feature                    | Status         | Details                                    |
| -------------------------- | -------------- | ------------------------------------------ |
| **Dashboard Overview**     | ✅ Implemented | Platform-wide metrics and stats            |
| **Seller Management**      | ✅ Implemented | Review applications, approve/reject/ban    |
| **Product Moderation**     | ✅ Implemented | Review, approve, reject, suspend listings  |
| **Real-time Notifications**| ✅ Implemented | Instant alerts for new applications/products|

---

## Order Lifecycle

```
PENDING → CONFIRMED → IN_PRODUCTION → READY_TO_SHIP → SHIPPED → DELIVERED → COMPLETED
                                                                    ↓
                                                              CANCELLED/REFUNDED/DISPUTED
```

### Order Features

| Feature                     | Status         | Details                                   |
| --------------------------- | -------------- | ----------------------------------------- |
| **Order Timeline**          | ✅ Implemented | Full event history with photos & role tracking |
| **Proof Photos**            | ✅ Implemented | Sellers can attach shipping proof images   |
| **Shipping Tracking**       | ✅ Implemented | Tracking number, courier name, timestamps  |
| **Auto-Confirmation**       | ✅ Implemented | Orders auto-complete after delivery period  |
| **Dispute System**          | ✅ Implemented | Dispute flow with timer pausing            |
| **Address Snapshot**         | ✅ Implemented | Delivery address frozen at order time      |
| **Reference Numbers**       | ✅ Implemented | Unique human-readable order references     |
| **Idempotency Keys**        | ✅ Implemented | Prevent duplicate order/payment creation   |
| **Shipping Methods**        | ✅ Implemented | Tracked vs untracked options               |

---

## Quality Control & Security

| Mechanism                | Status         | Purpose                                              |
| ------------------------ | -------------- | ---------------------------------------------------- |
| **Product Approval**     | ✅ Implemented | First 5 products auto-approved, subsequent require review or community moderation |
| **Seller KYC**           | ✅ Implemented | Identity verification during application              |
| **Seller Approval**      | ✅ Implemented | All seller applications reviewed by admin             |
| **OTP Verification**     | ✅ Implemented | Email/phone verification for all registrations        |
| **JWT + Refresh Tokens** | ✅ Implemented | Stateless auth with token rotation                    |
| **RBAC Middleware**       | ✅ Implemented | Role-based route protection (USER/SELLER/ADMIN)       |
| **Rate Limiting**         | ✅ Implemented | Global (100/min) + login-specific rate limits         |
| **Helmet Headers**        | ✅ Implemented | Security headers (HSTS, X-Frame, etc.)                |
| **Input Sanitization**    | ✅ Implemented | Strip HTML/script tags from all input                 |
| **Idempotency Keys**     | ✅ Implemented | Prevent duplicate orders/payments                     |
| **Session Expiry**        | ✅ Implemented | 15-minute checkout sessions prevent stale transactions|
| **Optimistic Locking**    | ✅ Implemented | Product versioning ensures stock accuracy             |
| **Soft Deletes**          | ✅ Implemented | Products & accounts preserve order history            |
| **Audit Logging**         | ✅ Implemented | AuditService tracks critical operations               |
| **Login Rate Limiter**    | ✅ Implemented | Brute-force protection for auth endpoints             |

---

## Technical Stack

### Backend

| Technology       | Purpose                                      |
| ---------------- | -------------------------------------------- |
| **Express.js**   | REST API server                              |
| **Prisma ORM**   | Type-safe database access                    |
| **PostgreSQL**   | Relational data persistence (via Supabase)   |
| **Supabase**     | Real-time events, Storage, JWT Auth          |
| **Passport.js**  | Google OAuth integration                     |
| **node-cron**    | Scheduled jobs (session cleanup, auto-confirm)|

### Frontend

| Technology          | Purpose                                    |
| ------------------- | ------------------------------------------ |
| **React Native**    | Cross-platform mobile + web UI             |
| **Expo (Router)**   | File-based routing, build toolchain        |
| **Axios**           | HTTP client with JWT interceptors          |
| **Supabase JS**     | Real-time event subscriptions              |
| **AsyncStorage**    | Token persistence                          |

### Key Database Models

| Model                 | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| **Product**           | Items with SKU, pricing, discount, SEO fields  |
| **ProductVariant**    | Size/color options with individual stock        |
| **Customer**          | User accounts with trust scoring               |
| **Seller**            | Vendor profiles with KYC, commission, balances  |
| **Order**             | Transactions with seller split, commission calc |
| **OrderItem**         | Line items linked to seller for fulfillment     |
| **OrderTimeline**     | Audit trail of order status changes             |
| **CheckoutSession**   | Price-locked checkout with expiry               |
| **Payment**           | Payment attempts with idempotency              |
| **Cart / CartItem**   | Persistent shopping cart                       |
| **Wishlist / Item**   | Saved products per customer                    |
| **Address**           | Philippine-formatted shipping addresses         |
| **PaymentMethod**     | Saved payout methods (GCash, Bank)             |
| **Notification**      | In-app notification with read tracking          |
| **NotificationSettings** | Per-user notification preferences           |
| **Verification**      | OTP codes for registration & password reset     |
| **WithdrawalRequest** | Seller payout requests with admin approval      |

### Key Services

| Service                  | Purpose                                      |
| ------------------------ | -------------------------------------------- |
| **CheckoutController**   | Multi-phase checkout with price locking      |
| **PaymentService**       | Mock gateway (Stripe/PayMongo planned)       |
| **SellerService**        | Performance metrics calculation              |
| **SellerEarningsController** | Balance management & withdrawal processing |
| **SupabaseService**      | Realtime channel management & event broadcasting|
| **OtpService**           | OTP generation, validation, and expiry       |
| **CronService**          | Scheduled cleanup & auto-confirmation jobs   |
| **AuditService**         | Operation logging and audit trails           |
| **NotificationService**  | Push notification creation & delivery        |
| **RefreshTokenService**  | JWT refresh token rotation                   |
| **LoginRateLimiter**     | Brute-force auth protection                  |

---

## Communication & Email Routing

To maintain a professional outward appearance and automate triage as a solo developer, all incoming platform communications are routed through Gmail aliases (`+` syntax) to the main `knotandbloom.shop@gmail.com` inbox.

| Alias / Email | Purpose & Routing |
| ------------- | ----------------- |
| **`...shop+support@`** | General buyer inquiries, order issues. |
| **`...shop+apply@`** | Automated notifications when a new seller KYC application is submitted. |
| **`...shop+payouts@`** | Automated alerts when a seller requests a GCash/Bank withdrawal. |
| **`...shop+sellers@`** | Direct communication channel exclusively for active sellers. |
| **`...shop+report@`** | Urgent moderation alerts when a buyer flags a listing as a mass-produced/dropshipped item. |
| **`...shop+payments@`** | Inbound receipts and webhooks from the central escrow/PayMongo gateway. |
| **`...shop+partners@`** | B2B inquiries, marketing collaborations, or sponsorships. |

> **Operational Hack:** These aliases allow you to set up automated Gmail filters. For example, any email sent to `+report` gets labeled as "URGENT - MODERATION" and triggers a push notification to your phone. Later on, these aliases can be plugged into Webhooks (e.g., via SendGrid or Postmark) to automatically trigger backend functions without you ever opening your inbox.

---

## Future Revenue Opportunities

- [ ] Featured/Promoted Listings
- [ ] Premium Seller Subscriptions
- [ ] In-Platform Advertising
- [ ] Integrated Shipping Label Services
- [ ] Payment Processing Fee Markup (Stripe/PayMongo)
- [ ] Real payment gateway integration (GCash, PayMaya, Bank)

---

## Platform Metrics Tracked

| Metric                  | Level                           |
| ----------------------- | ------------------------------- |
| Sold Count              | Product & Variant               |
| Total Sales (Revenue)   | Seller                          |
| Total Orders            | Seller                          |
| Avg Ship Time           | Seller (via SellerService)      |
| Success Rate            | Seller (non-cancelled orders)   |
| Rating                  | Seller                          |
| Platform Fee Collected  | Per Order                       |
| Pending/Available Balance | Seller                        |
| Trust Score             | Customer (COD behavior)         |
| COD Cancellation Count  | Customer                        |

---

## Frontend Route Map

| Route                     | Access    | Description                           |
| ------------------------- | --------- | ------------------------------------- |
| `/`                       | Public    | Homepage / product discovery          |
| `/products`               | Public    | Product catalog with categories       |
| `/product/[id]`           | Public    | Product detail page                   |
| `/search`                 | Public    | Search results                        |
| `/makers`                 | Public    | Artisan/seller directory              |
| `/seller/[slug]`          | Public    | Individual seller storefront          |
| `/auth/*`                 | Public    | Login, register, reset password       |
| `/cart`                   | Auth      | Shopping cart                         |
| `/checkout`               | Auth      | Checkout flow                         |
| `/wishlist`               | Auth      | Saved products                        |
| `/profile/*`              | Auth      | Account, addresses, payment methods, orders |
| `/customer-service/*`     | Auth      | AI chat, help center                  |
| `/seller/apply`           | Auth      | Seller application form               |
| `/seller-dashboard/*`     | Seller    | Analytics, products, orders, earnings, settings |
| `/admin/*`                | Admin     | Dashboard, seller management, product moderation |

---

## Component Architecture

```
components/
├── auth/           # BespokeAuthForm, GoogleAuthButton, AuthToast
├── cart/            # Cart-related UI
├── checkout/        # Checkout flow components
├── confetti/        # Celebration animations
├── dashboard/       # DashboardSidebar
├── home/            # Homepage sections
├── layout/          # GlobalHeaderUI, MenuSideBar, GlobalAIChat, NavLinks
├── product/         # ProductCard, ProductPage, MakerCard
├── profile/         # Profile-related components
├── seller/          # ProductFormWizard, VariantEditor, ImageUploader, etc.
└── ui/              # Shared primitives (Tooltip, DropdownMenu, InfoBox, etc.)
```

---

_Last Updated: May 2026_
