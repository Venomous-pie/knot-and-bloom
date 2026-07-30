---
tags:
  - architecture/database/model
---
# Model: OrderShipment

## Fields
- **uid**: Int
- **orderId**: Int
- **sellerId**: Int
- **fulfillmentType**: ShipmentType
- **zoneTier**: Int
- **shippingFee**: Decimal
- **computedFuelCost**: Decimal
- **meetUpSnapshot**: String?
- **status**: ShipmentStatus
- **createdAt**: DateTime
- **updatedAt**: DateTime
- **order**: Order
- **seller**: Seller

## Relationships
- [[Model - ShipmentType]]
- [[Model - ShipmentStatus]]
- [[Model - Order]]
- [[Model - Seller]]
