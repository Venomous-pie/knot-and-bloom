---
tags:
  - architecture/database/model
---
# Model: Wishlist

## Fields
- **uid**: Int
- **customerId**: Int
- **updated**: DateTime
- **customer**: Customer
- **items**: WishlistItem[]

## Relationships
- [[Model - Customer]]
- [[Model - WishlistItem]]
