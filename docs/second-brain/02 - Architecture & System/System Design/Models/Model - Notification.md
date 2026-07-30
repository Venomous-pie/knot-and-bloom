---
tags:
  - architecture/database/model
---
# Model: Notification

## Fields
- **uid**: Int
- **customerId**: Int
- **title**: String
- **message**: String
- **type**: String
- **isRead**: Boolean
- **data**: String?
- **createdAt**: DateTime
- **customer**: Customer

## Relationships
- [[Model - Customer]]
