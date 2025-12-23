# Backend Documentation - Knot & Bloom E-commerce API

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5.x
- **ORM**: Prisma 7.x
- **Database**: PostgreSQL (hosted on Supabase)
- **Auth**: Custom JWT (jsonwebtoken)
- **Validation**: Zod
- **AI Services**: Hugging Face Inference API
- **Testing**: Jest

---

## Architecture Overview

```
backend/
├── src/
│   ├── controllers/       # Business logic (6 controllers)
│   ├── routes/            # API route definitions
│   ├── services/          # Shared business services
│   ├── middleware/        # Auth, validation middleware
│   ├── validators/        # Zod schemas
│   ├── utils/             # Helper functions
│   ├── types/             # TypeScript types
│   └── index.ts           # Server entry point
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
└── generated/prisma/      # Prisma client (auto-generated)
```

**Pattern**: MVC (Model-View-Controller)

- **Models**: Prisma schema → Auto-generated client
- **Controllers**: Business logic
- **Routes**: API endpoints

---

## Authentication

### JWT Flow

1. **Login**: `POST /api/customers/login`
   - Input: `{ email, password }`
   - Output: `{ token, customer }`
2. **Protected Routes**: Send JWT in `Authorization: Bearer <token>` header

3. **Middleware**: `authMiddleware.ts` decodes JWT → `req.user`

### User Roles

- `USER` (default Customer)
- `SELLER` (requires approval)
- `ADMIN` (system administrator)

---

## API Endpoints

### 1. Products (`/api/products`)

| Method   | Endpoint           | Auth     | Description                      |
| -------- | ------------------ | -------- | -------------------------------- |
| `POST`   | `/`                | Required | Create product                   |
| `GET`    | `/`                | Public   | List active products             |
| `GET`    | `/search?term=...` | Public   | Search products                  |
| `GET`    | `/:id`             | Public   | Get product details              |
| `PUT`    | `/:id`             | Required | Update product                   |
| `DELETE` | `/:id`             | Required | Soft delete product              |
| `GET`    | `/admin`           | Admin    | List all products (inc. PENDING) |
| `PATCH`  | `/:id/status`      | Admin    | Approve/reject product           |

**Key Features:**

- AI-generated descriptions (Hugging Face)
- Auto-generated SKUs
- Variant support (size, color)
- Multi-category support
- Seller assignment

### 2. Customers (`/api/customers`)

| Method | Endpoint          | Auth     | Description       |
| ------ | ----------------- | -------- | ----------------- |
| `POST` | `/register`       | Public   | Register new user |
| `POST` | `/login`          | Public   | Login             |
| `GET`  | `/profile`        | Required | Get own profile   |
| `PUT`  | `/profile`        | Required | Update profile    |
| `POST` | `/reset-password` | Required | Reset password    |

### 3. Cart (`/api/cart`)

| Method   | Endpoint     | Auth     | Description     |
| -------- | ------------ | -------- | --------------- |
| `GET`    | `/`          | Required | Get cart        |
| `POST`   | `/items`     | Required | Add item        |
| `PUT`    | `/items/:id` | Required | Update quantity |
| `DELETE` | `/items/:id` | Required | Remove item     |

### 4. Orders (`/api/orders`)

| Method | Endpoint    | Auth         | Description        |
| ------ | ----------- | ------------ | ------------------ |
| `GET`  | `/`         | Required     | List user's orders |
| `GET`  | `/:id`      | Required     | Get order details  |
| `POST` | `/:id/ship` | Seller/Admin | Mark as shipped    |

### 5. Checkout (`/api/checkout`)

| Method | Endpoint   | Auth     | Description                    |
| ------ | ---------- | -------- | ------------------------------ |
| `POST` | `/session` | Required | Create checkout session        |
| `POST` | `/confirm` | Required | Confirm payment & create order |

**Checkout Flow:**

1. Create session (validates cart, calculates total)
2. User enters shipping/payment info
3. Confirm payment (mocked GCash integration)
4. Order created, cart cleared

### 6. Sellers (`/api/sellers`)

| Method  | Endpoint        | Auth     | Description            |
| ------- | --------------- | -------- | ---------------------- |
| `POST`  | `/register`     | Required | Apply to become seller |
| `GET`   | `/profile`      | Seller   | Get seller profile     |
| `GET`   | `/:id/products` | Public   | List seller's products |
| `GET`   | `/:id/orders`   | Seller   | List seller's orders   |
| `PATCH` | `/:id/status`   | Admin    | Approve/reject seller  |

### 7. Addresses (`/api/addresses`)

| Method   | Endpoint | Auth     | Description          |
| -------- | -------- | -------- | -------------------- |
| `GET`    | `/`      | Required | List saved addresses |
| `POST`   | `/`      | Required | Create address       |
| `PUT`    | `/:id`   | Required | Update address       |
| `DELETE` | `/:id`   | Required | Delete address       |

---

## Services

### GenerateService

- **AI Description**: Generates product descriptions via Hugging Face
- **SKU Generation**: Auto-generates unique SKUs

### PaymentService

- **Mock GCash**: Simulates payment processing

### AuditService

- **Logging**: Tracks product/order changes

### NotificationService

- **Placeholder**: Prepared for email/SMS integration

---

## Database Schema

### Key Models

**Product**

- Pricing: `basePrice`, `discountedPrice`
- Status workflow: `PENDING` → `ACTIVE`
- Seller assignment
- Variant support

**Customer**

- Role: `USER`, `SELLER`, `ADMIN`
- 1-to-1 Cart
- Multiple Orders
- Saved Addresses

**Order**

- Multi-vendor support (split by seller)
- Status: `PENDING` → `PROCESSING` → `SHIPPED` → `DELIVERED`
- Tracking number
- OrderItems with seller assignment

**Seller**

- Status: `PENDING` → `ACTIVE`
- Linked to Customer
- Products and Orders

---

## Running the Backend

### Development

```bash
npm install
npx prisma generate  # Generate Prisma client
npm run dev          # Start with hot reload (port 3030)
```

### Database Migrations

```bash
npx prisma migrate dev --name migration_name
npx prisma studio     # Visual database browser
```

### Testing

```bash
npm test
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Hugging Face (AI)
HUGGINGFACE_API_KEY="..."

# Server
PORT=3030
NODE_ENV="development"
```

---

## Security

- **Password Hashing**: bcrypt (10 rounds)
- **JWT Validation**: All protected routes verify token
- **Role-Based Access**: Admin/Seller checks in controllers
- **Input Validation**: Zod schemas
- **SQL Injection**: Prevented by Prisma ORM

---

## Key Features

### Multi-Vendor Order Splitting

Checkout automatically splits orders by seller when cart contains items from multiple sellers.

### Product Approval Workflow

- Sellers create products → `status: PENDING`
- Admin reviews → approves/rejects
- Only `ACTIVE` products appear publicly

### Seller Auto-Creation for Admins

When Admin creates a product, a Seller profile is automatically created.

### Soft Deletes

Products are not permanently deleted - `deletedAt` timestamp used instead.

---

## Error Handling

Custom error classes:

- `NotFoundError` (404)
- `ValidationError` (400)
- `DuplicateProductError` (409)
- `UnauthorizedError` (401)

All routes use try-catch → Express error middleware
