---
tags:
  - architecture/database/model
---
# Model: OrderTimeline

## Fields
- **uid**: Int
- **orderId**: Int
- **status**: OrderStatus
- **title**: String
- **message**: String?
- **photos**: String[]
- **createdBy**: Role?
- **createdAt**: DateTime
- **order**: Order

## Relationships
- [[Model - OrderStatus]]
- [[Model - Role]]
- [[Model - Order]]
