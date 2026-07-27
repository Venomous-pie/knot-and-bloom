---
tags:
  - architecture/database/model
---
# Model: WishlistItem

## Fields
- **uid**: Int
- **wishlistId**: Int
- **productId**: Int
- **createdAt**: DateTime
- **product**: Product
- **wishlist**: Wishlist

## Relationships
- [[Model - Product]]
- [[Model - Wishlist]]
