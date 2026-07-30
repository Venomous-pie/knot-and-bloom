---
tags:
  - architecture/database/model
---
# Model: WithdrawalRequest

## Fields
- **uid**: Int
- **sellerId**: Int
- **amount**: Decimal
- **status**: WithdrawalStatus
- **method**: String
- **details**: String?
- **adminNote**: String?
- **createdAt**: DateTime
- **updatedAt**: DateTime
- **seller**: Seller

## Relationships
- [[Model - WithdrawalStatus]]
- [[Model - Seller]]
