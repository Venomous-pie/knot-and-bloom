---
tags:
  - architecture/database/model
---
# Model: PaymentMethod

## Fields
- **uid**: Int
- **customerId**: Int
- **type**: PaymentMethodType
- **accountName**: String
- **accountNumber**: String
- **bankName**: String?
- **isDefault**: Boolean
- **createdAt**: DateTime
- **updatedAt**: DateTime
- **customer**: Customer

## Relationships
- [[Model - PaymentMethodType]]
- [[Model - Customer]]
