---
tags:
  - architecture/database/model
---
# Model: RefreshToken

## Fields
- **uid**: Int
- **token**: String
- **userId**: Int
- **email**: String?
- **role**: String
- **sellerId**: Int?
- **sellerStatus**: String?
- **expiresAt**: DateTime
- **createdAt**: DateTime
- **customer**: Customer

## Relationships
- [[Model - Customer]]
