---
tags:
  - architecture/database/model
---
# Model: CartItem

## Fields
- **uid**: Int
- **cartId**: Int
- **productId**: Int
- **quantity**: Int
- **productVariantId**: Int?
- **cart**: Cart
- **product**: Product
- **productVariant**: ProductVariant?

## Relationships
- [[Model - Cart]]
- [[Model - Product]]
- [[Model - ProductVariant]]
