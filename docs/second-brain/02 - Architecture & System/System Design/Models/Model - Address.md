---
tags:
  - architecture/database/model
---
# Model: Address

## Fields
- **uid**: Int
- **customerId**: Int
- **label**: String?
- **fullName**: String
- **phone**: String
- **streetAddress**: String
- **aptSuite**: String?
- **city**: String
- **stateProvince**: String?
- **postalCode**: String
- **country**: String
- **isDefault**: Boolean
- **createdAt**: DateTime
- **updatedAt**: DateTime
- **barangay**: String?
- **province**: String?
- **region**: String?
- **landmark**: String?
- **zoneTierOverride**: Int?
- **customer**: Customer

## Relationships
- [[Model - Customer]]
