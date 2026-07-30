---
tags:
  - architecture/database/model
---
# Model: Customer

## Fields
- **uid**: Int
- **name**: String
- **email**: String?
- **password**: String?
- **phone**: String?
- **address**: String?
- **uploaded**: DateTime
- **updated**: DateTime
- **passwordResetRequired**: Boolean
- **role**: Role
- **avatar**: String?
- **codCancellationCount**: Int
- **deletedAt**: DateTime?
- **deletionRequestedAt**: DateTime?
- **deletionScheduledFor**: DateTime?
- **googleId**: String?
- **trustScore**: Int
- **addresses**: Address[]
- **cart**: Cart?
- **checkoutSessions**: CheckoutSession[]
- **notifications**: Notification[]
- **notificationSettings**: NotificationSettings?
- **orders**: Order[]
- **paymentMethods**: PaymentMethod[]
- **refreshTokens**: RefreshToken[]
- **sellerProfile**: Seller?
- **wishlist**: Wishlist?

## Relationships
- [[Model - Role]]
- [[Model - Address]]
- [[Model - Cart]]
- [[Model - CheckoutSession]]
- [[Model - Notification]]
- [[Model - NotificationSettings]]
- [[Model - Order]]
- [[Model - PaymentMethod]]
- [[Model - RefreshToken]]
- [[Model - Seller]]
- [[Model - Wishlist]]
