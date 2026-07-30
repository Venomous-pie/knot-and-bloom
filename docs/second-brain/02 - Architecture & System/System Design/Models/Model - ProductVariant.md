---
tags:
  - architecture/database/model
---
# Model: ProductVariant

## Fields
- **uid**: Int
- **productId**: Int
- **name**: String
- **sku**: String
- **stock**: Int
- **price**: Decimal?
- **discountPercentage**: Int?
- **discountedPrice**: Decimal?
- **soldCount**: Int
- **images**: String[]
- **reservedStock**: Int
- **isEnabled**: Boolean
- **cartItems**: CartItem[]
- **product**: Product
- **optionValues**: ProductOptionValue[]

## Relationships
- [[Model - CartItem]]
- [[Model - Product]]
- [[Model - ProductOptionValue]]
