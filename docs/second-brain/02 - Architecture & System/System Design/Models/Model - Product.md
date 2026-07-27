---
tags:
  - architecture/database/model
---
# Model: Product

## Fields
- **uid**: Int
- **name**: String
- **sku**: String
- **basePrice**: Decimal
- **discountedPrice**: Decimal?
- **image**: String?
- **description**: String?
- **uploaded**: DateTime
- **updated**: DateTime
- **discountPercentage**: Int?
- **categories**: String[]
- **sellerId**: Int?
- **soldCount**: Int
- **deletedAt**: DateTime?
- **deletedBy**: Int?
- **status**: ProductStatus
- **version**: Int
- **isCodAllowed**: Boolean
- **materials**: String?
- **metaDescription**: String?
- **metaTitle**: String?
- **rejectionReason**: String?
- **tags**: String[]
- **images**: String[]
- **careInstructions**: String?
- **customOrderInstructions**: String?
- **fulfillmentType**: FulfillmentType
- **isCustomOrderAllowed**: Boolean
- **isLocalPickupAllowed**: Boolean
- **localPickupInstructions**: String?
- **maxOrderQty**: Int?
- **minOrderQty**: Int?
- **processingTime**: String?
- **shippingFeeOverride**: Decimal?
- **videoUrl**: String?
- **bundleQuantity**: Int?
- **isBundle**: Boolean
- **cartItems**: CartItem[]
- **orderItems**: OrderItem[]
- **seller**: Seller?
- **productOptions**: ProductOption[]
- **variants**: ProductVariant[]
- **wishlistItems**: WishlistItem[]

## Relationships
- [[Model - ProductStatus]]
- [[Model - FulfillmentType]]
- [[Model - CartItem]]
- [[Model - OrderItem]]
- [[Model - Seller]]
- [[Model - ProductOption]]
- [[Model - ProductVariant]]
- [[Model - WishlistItem]]
