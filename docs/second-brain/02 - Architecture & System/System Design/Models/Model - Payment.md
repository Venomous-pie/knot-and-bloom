---
tags:
  - architecture/database/model
---
# Model: Payment

## Fields
- **uid**: Int
- **orderId**: Int?
- **checkoutSessionId**: Int
- **amount**: Decimal
- **method**: String
- **status**: PaymentStatus
- **gatewayRef**: String?
- **idempotencyKey**: String
- **errorMessage**: String?
- **attempts**: Int
- **createdAt**: DateTime
- **updatedAt**: DateTime
- **checkoutSession**: CheckoutSession
- **order**: Order?

## Relationships
- [[Model - PaymentStatus]]
- [[Model - CheckoutSession]]
- [[Model - Order]]
