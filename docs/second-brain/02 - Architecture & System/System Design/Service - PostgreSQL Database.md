---
tags:
  - architecture/database
---
# Service - PostgreSQL Database

**Role:** The primary source of truth for the Knot & Bloom platform.
**Engine:** PostgreSQL
**ORM:** Prisma Client

## Core Entities & Relationships

From the `schema.prisma` definition, the core architectural domains are:

### 1. Identity & Access
- **`Customer`**: [[Model - Customer]] (Authentication, Role, Trust Score).
- **`Seller`**: [[Model - Seller]] Extends Customer for merchant capabilities. Has a 1:1 relationship with `Customer` (`CustomerSeller`).

### 2. E-Commerce Core
- **`Product`**: [[Model - Product]] The primary item being sold. Belongs to a `Seller`.
- **`ProductVariant`**: [[Model - ProductVariant]] Belongs to `Product`. Holds stock, price overrides, and SKU.
- **`ProductOption` & `ProductOptionValue`**: [[Model - ProductOption]] Defines variations like Size and Color.

### 3. Purchasing Flow
- **`Cart` & `CartItem`**: Transient state for unpurchased items.
- **`Order` & `OrderItem`**: The finalized transaction. Orders track `paymentStatus`, `courierName`, and `fulfillmentType`.
- **`CheckoutSession`**: Tracks the intent to purchase before finalization.

### 4. Supporting Systems
- **`Address`**: Multiple shipping addresses per customer.
- **`Notification` & `NotificationSettings`**: System alerts.
- **`Wishlist`**: Saved items.

## Scaling Constraints & Optimizations
- **Indexes:** Ensure fields frequently queried (like `customerId`, `sellerId`, `sku`) are indexed beyond just the Primary Key. Prisma creates implicit indexes on `@unique`.
- **Migrations:** Managed exclusively via Prisma Migrate (`npx prisma migrate dev`).
- **Connection Pool:** Ensure Prisma's connection limits don't overwhelm the PostgreSQL instance under high traffic.
