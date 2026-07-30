---
tags:
  - architecture/database/model
---
# Model: Cart

## Fields
- **uid**: Int
- **customerId**: Int
- **updated**: DateTime
- **customer**: Customer
- **items**: CartItem[]

## Relationships
- [[Model - Customer]]
- [[Model - CartItem]]
