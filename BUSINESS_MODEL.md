# Knot & Bloom - Business Model Analysis

## Platform Overview

**Knot & Bloom** is a B2C2C multi-vendor marketplace for **handcrafted goods**, connecting independent artisans (sellers) with buyers (customers) through a unified mobile and web experience.

---

## 💰 Revenue Model

| Revenue Stream         | Status         | Details                                              |
| ---------------------- | -------------- | ---------------------------------------------------- |
| **Commission Fee**     | ✅ Implemented | Default **5%** per seller (configurable by admin)    |
| **COD Deposit**        | ✅ Implemented | **20% deposit** required for Cash-on-Delivery orders |
| **Payment Processing** | 📋 Planned     | ~2-3% when integrated (Stripe/PayMongo)              |

### Market Comparison

| Platform         | Commission | Payment Fee | Other          |
| ---------------- | ---------- | ----------- | -------------- |
| **Knot & Bloom** | **5%**     | TBD (~2-3%) | None           |
| Etsy             | 6.5%       | 3-4%        | $0.20/listing  |
| Shopee/Lazada PH | 2-5%       | 2%          | Various promos |

> **Philosophy**: Low barrier for students, hobbyists, and small artisans to start selling their handcrafted goods.

---

## 👥 User Types

| Role         | Description                                                               |
| ------------ | ------------------------------------------------------------------------- |
| **Customer** | Browse products, manage cart, place orders, track shipments               |
| **Seller**   | Onboarded customer who manages products, fulfills orders, tracks earnings |
| **Admin**    | Platform oversight: approves sellers/products, manages global settings    |

---

## 🔄 User Lifecycle

```
Visitor → Customer → Seller Application (PENDING) → Admin Approval → Active Seller
```

### Seller Onboarding Flow

1. **Register** - User signs up as Customer
2. **Apply** - Submit Seller Application (business name, details) → Status: `PENDING`
3. **Approval** - Admin reviews application → Status: `ACTIVE`
4. **Selling** - Access Seller Dashboard, post products

### Product Approval Flow

1. **Draft** - Seller saves work-in-progress
2. **Pending** - Seller publishes, visible to admin only
3. **Active** - Admin approves, appears in marketplace

---

## 📦 Order & Payment Flow

1. **Cart → Checkout Session** (15 min expiry with price locking)
2. **Stock Validation** (re-verified before payment)
3. **Payment Processing**
   - COD: 20% deposit upfront, balance on delivery
   - Card/Wallet: Full payment processed
4. **Order Split by Seller** - Multi-seller cart creates separate orders per seller
5. **Inventory Deduction** (atomic transaction with optimistic locking)
6. **Seller Notification** (real-time via WebSocket)

### Payment Methods

- `MOCK_CARD` - Simulated card payment
- `MOCK_WALLET` - Simulated e-wallet (GCash, PayMaya planned)
- `COD` - Cash on Delivery (with 20% deposit requirement)

---

## 🏪 Seller Economics

| Metric              | Description                        |
| ------------------- | ---------------------------------- |
| **Commission Rate** | 5% default (adjustable per seller) |
| **Total Sales**     | Tracked per seller                 |
| **Total Orders**    | Count of fulfilled orders          |
| **Rating**          | Seller reputation score            |
| **Performance**     | Avg ship time, success rate        |

### Seller Status Lifecycle

```
PENDING → ACTIVE → SUSPENDED/BANNED
         ↓
      REJECTED (can re-apply)
```

---

## 🔒 Quality Control

| Mechanism              | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| **Product Approval**   | All products require admin review before going live    |
| **Seller Approval**    | All seller applications reviewed by admin              |
| **Idempotency Keys**   | Prevent duplicate orders/payments                      |
| **Session Expiry**     | 15-minute checkout sessions prevent stale transactions |
| **Optimistic Locking** | Ensures stock accuracy under concurrent purchases      |

---

## 📊 Order Lifecycle

```
PENDING → CONFIRMED → IN_PRODUCTION → READY_TO_SHIP → SHIPPED → DELIVERED → COMPLETED
                                                                    ↓
                                                              CANCELLED/REFUNDED/DISPUTED
```

---

## 🛠️ Technical Implementation

### Key Database Models

- **Product** - Items with SKU, pricing, discount, seller reference
- **ProductVariant** - Size/color options with individual stock
- **Order** - Transaction with seller split, payment tracking
- **OrderItem** - Line items linked to seller for fulfillment
- **Seller** - Vendor profile with commission rate, metrics

### Key Services

- **CheckoutController** - Multi-phase checkout with price locking
- **PaymentService** - Mock gateway (Stripe/PayMongo planned)
- **SellerService** - Performance metrics calculation

---

## 💡 Future Revenue Opportunities

- [ ] Featured/Promoted Listings
- [ ] Premium Seller Subscriptions
- [ ] In-Platform Advertising
- [ ] Integrated Shipping Label Services
- [ ] Payment Processing Fee Markup

---

## 📈 Platform Metrics Tracked

| Metric        | Level                         |
| ------------- | ----------------------------- |
| Sold Count    | Product & Variant             |
| Total Sales   | Seller                        |
| Total Orders  | Seller                        |
| Avg Ship Time | Seller (via SellerService)    |
| Success Rate  | Seller (non-cancelled orders) |
| Rating        | Seller                        |

---

_Last Updated: January 2026_
