# Knot & Bloom
### *a knot tied with care, a bloom grown with time*

> A trusted, curated marketplace for Filipino micro-creators — students, single parents, hobbyists, and local handcrafters.

---

## What We Do

Knot & Bloom is a B2C2C e-commerce platform built for an underserved market: individual Filipino artisans who are too small for enterprise marketplaces like Shopee and Lazada, but too serious to keep running a business through Instagram DMs and manual GCash tracking.

We provide them with the infrastructure of a professional storefront — product management, secure checkout, order tracking, and dispute resolution — without the business registration requirements or steep fees that shut them out of mainstream platforms.

Buyers, in turn, get something the major platforms cannot offer: a fully curated catalog where every product is authentic, every seller is verified, and every transaction is protected.

---

## The Problem

**For sellers**, the current reality is a frustrating middle ground:

- Major platforms (Shopee, Lazada) require business documents and commercial-scale setup — a wall, not a door, for a student selling handmade goods between classes.
- Social media (Facebook, Instagram, TikTok) was never built for commerce. Managing orders through DMs, manually reconciling GCash payments, and absorbing the cost of refused COD deliveries is an unsustainable operational burden for a solo creator.

**For buyers**, neither option is trustworthy:

- Major platforms are flooded with factory-made imports posing as handmade.
- Buying through social media means sending money to a stranger and hoping the item ships.

---

## Our Solution

| Problem | What Knot & Bloom Does |
|---|---|
| Exclusion from big platforms | Seller onboarding for individuals — no business registration required, just verified identity and genuine handcrafted goods |
| Bogus COD buyers | 20% upfront COD deposit protects sellers from refused deliveries before materials are spent |
| Operational overload | Unified order management, AI-assisted listings, and automated tracking replace the DM/spreadsheet grind |
| Inauthentic catalog | Every product goes through a manual admin approval process — only genuine, handcrafted items go live |
| Unsafe social payments | Secure escrow-backed checkout with order tracking and a structured dispute resolution process |

---

## Business Model

Revenue comes from three streams:

**1. Transaction Commission (Split Fee)**
The 12% platform revenue is shared between both sides to keep the burden on creators low:
- **Seller side:** 5% deducted from the final sale value on completion
- **Buyer side:** 7% "Platform & Trust Fee" added at checkout

**2. Seller Subscriptions** *(Phase 2)*
Optional tiers that lower commission rates in exchange for a monthly fee. Deferred until real transaction volume makes the tiers meaningful.

| Tier | Price | Benefit |
|---|---|---|
| Free | ₱0 / mo | Baseline commission, basic analytics |
| Growth | ₱149 / mo | Reduced commission, minor discovery boost |
| Studio | ₱249 / mo | Lowest commission, full analytics, fastest payout |

**3. Promotion Boosts**
₱49 for a 3-day homepage/category boost — a low-commitment, impulse-friendly option at launch.

---

## How Payments Work

1. Buyer places an order and pays a **20% deposit** through the platform's payment partner (PayMongo). Funds are held in escrow.
2. The remaining **80% is paid cash-on-delivery**, directly between buyer and seller — this portion never touches the platform.
3. On order completion, the **5% seller commission** is deducted from the held deposit, and the remainder is released to the seller.

> The 20% deposit rate is a hard floor — seller commission may never be set higher than the prevailing deposit rate, or there is no held balance to deduct from.

---

## Rollout Strategy

**Phase 1 — Launch (~80 active sellers)**
- Free tier only. No subscription complexity.
- ₱49 / 3-day boost as the only paid promotion option.
- Founder runs all operations (verification, disputes, support) personally.
- Monthly burn: ~₱1,000–₱3,000 (hosting only). Zero paid marketing.

**Phase 2 — Unlock Growth/Studio tiers**
- Triggered when: **100+ active sellers AND 2+ average sales/seller/month** (both conditions, not either alone).
- Introduce tiered subscriptions, revisit promotion packages, evaluate operational help.

---

## Key Risks

| Risk | Note |
|---|---|
| Founder as single point of failure | Curation, disputes, and development currently depend on one person |
| Commission vs. deposit ceiling | Commission rate must stay below 20% or the payout mechanism breaks |
| Payment partner dependency | PayMongo downtime directly halts transactions — no current fallback |
| Buyer protection limits | The cash-COD portion (80%) is peer-to-peer; the platform's enforcement there is reputational, not financial — disclosed plainly at checkout |

---

## Guiding Principle

> *Every feature we build must answer one question: "Does this make it meaningfully easier for a Filipino student, single parent, hobbyist, or small hancrafter to sell what they make?" If the answer is no, we don't build it.*

---

## Documentation

- [`docs/Vision.md`](./docs/Vision.md) — North Star vision and the five core problems we solve
- [`docs/Knot_and_Bloom_Business_Model.md`](./docs/Knot_and_Bloom_Business_Model.md) — Full business model canvas, transaction flow, and risk register
- [`docs/How_Shipping_Works.md`](./docs/How_Shipping_Works.md) — Dynamic shipping fee calculation and local pickup policy
- [`frontend/README.md`](./frontend/README.md) — Frontend developer documentation
- [`backend/README.md`](./backend/README.md) — Backend API reference and architecture
