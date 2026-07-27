---
tags:
  - architecture/database/model
---
# Model: ProductOptionValue

## Fields
- **uid**: Int
- **optionId**: Int
- **value**: String
- **imageUrl**: String?
- **option**: ProductOption
- **variants**: ProductVariant[]

## Relationships
- [[Model - ProductOption]]
- [[Model - ProductVariant]]
