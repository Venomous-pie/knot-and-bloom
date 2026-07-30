---
tags:
  - architecture/database/model
---
# Model: NotificationSettings

## Fields
- **uid**: Int
- **customerId**: Int
- **orderUpdates**: Boolean
- **promotions**: Boolean
- **systemMessages**: Boolean
- **createdAt**: DateTime
- **updatedAt**: DateTime
- **customer**: Customer

## Relationships
- [[Model - Customer]]
