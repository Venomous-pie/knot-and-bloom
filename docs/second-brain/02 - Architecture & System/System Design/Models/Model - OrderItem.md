---
tags:
  - architecture/database/model
---
# Model: OrderItem

## Fields
- **uid**: Int
- **orderId**: Int
- **productId**: Int
- **sellerId**: Int?
- **quantity**: Int
- **price**: Decimal
- **status**: String
- **trackingNumber**: String?
- **shippingProvider**: String?
- **shippedAt**: DateTime?
- **deliveredAt**: DateTime?
- **createdAt**: DateTime
- **updatedAt**: DateTime
- **order**: Order
- **product**: Product
- **seller**: Seller?

## Relationships
- [[Model - Order]]
- [[Model - Product]]
- [[Model - Seller]]
