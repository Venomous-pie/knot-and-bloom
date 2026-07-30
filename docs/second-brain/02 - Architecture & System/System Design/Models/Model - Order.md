---
tags:
  - architecture/database/model
---
# Model: Order

## Fields
- **uid**: Int
- **customerId**: Int
- **products**: String
- **discount**: Decimal?
- **total**: Decimal
- **uploaded**: DateTime
- **updated**: DateTime
- **idempotencyKey**: String?
- **status**: OrderStatus
- **courierName**: String?
- **sellerId**: Int?
- **shippedAt**: DateTime?
- **trackingNumber**: String?
- **autoConfirmAt**: DateTime?
- **cancellationReason**: String?
- **disputeStartedAt**: DateTime?
- **estimatedCompletionDate**: DateTime?
- **estimatedDeliveryDate**: DateTime?
- **extensionCount**: Int
- **paymentMethod**: String?
- **paymentStatus**: PaymentStatus
- **platformFee**: Decimal
- **proofPhotos**: String?
- **referenceNumber**: String?
- **rejectionReason**: String?
- **reminderStage**: Int
- **sellerEarnings**: Decimal
- **shippingAddressSnapshot**: String?
- **shippingFee**: Decimal
- **shippingMethod**: String?
- **subtotal**: Decimal
- **customer**: Customer
- **seller**: Seller?
- **items**: OrderItem[]
- **shipments**: OrderShipment[]
- **timeline**: OrderTimeline[]
- **payments**: Payment[]

## Relationships
- [[Model - OrderStatus]]
- [[Model - PaymentStatus]]
- [[Model - Customer]]
- [[Model - Seller]]
- [[Model - OrderItem]]
- [[Model - OrderShipment]]
- [[Model - OrderTimeline]]
- [[Model - Payment]]
