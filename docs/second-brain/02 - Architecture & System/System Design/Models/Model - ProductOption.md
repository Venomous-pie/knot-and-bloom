---
tags:
  - architecture/database/model
---
# Model: ProductOption

## Fields
- **uid**: Int
- **productId**: Int
- **name**: String
- **position**: Int
- **product**: Product
- **values**: ProductOptionValue[]

## Relationships
- [[Model - Product]]
- [[Model - ProductOptionValue]]
