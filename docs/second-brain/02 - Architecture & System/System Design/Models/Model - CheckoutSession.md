---
tags:
  - architecture/database/model
---
# Model: CheckoutSession

## Fields
- **uid**: Int
- **customerId**: Int
- **cartSnapshot**: String
- **lockedPrices**: String
- **totalAmount**: Decimal
- **status**: CheckoutStatus
- **expiresAt**: DateTime
- **idempotencyKey**: String
- **createdAt**: DateTime
- **updatedAt**: DateTime
- **customer**: Customer
- **payments**: Payment[]

## Relationships
- [[Model - CheckoutStatus]]
- [[Model - Customer]]
- [[Model - Payment]]
