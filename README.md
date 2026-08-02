# Knot & Bloom

> **A B2C2C multi-vendor marketplace exclusively for micro-creators—students, single parents, and local handcrafters in the Philippines.**

Knot & Bloom is built to be a curated sanctuary from mass-produced imports, providing genuine Filipino artisans with professional e-commerce tools without the steep fees or business registration hurdles of enterprise platforms. 

## 📖 Vision & Core Problem

Major e-commerce platforms require business registrations, official documents, and commercial-scale inventory management. Knot & Bloom bridges the gap for **individual or micro-scale operators** by providing:
- **Low-Friction Onboarding:** No business registration required to start, just a verified identity and genuine handcrafted goods.
- **Strict Curation:** A rigorous product and seller vetting process to ensure 100% authentic, handcrafted items.
- **Safe Transactions:** We act as a trusted intermediary, handling secure payments, order tracking, and dispute resolutions.
- **Protective COD Policies:** A 20% Cash-on-Delivery deposit ensures sellers don't absorb costs for refused deliveries.
- **Fair & Localized Shipping:** Dynamic shipping calculations supporting free local pickup or localized courier rates.

---

## 🛠️ Tech Stack

This repository is a monorepo containing both the frontend mobile/web application and the backend API server.

**Frontend (`/frontend`)**
- React Native (Expo) with Expo Router for unified mobile and web
- Component-driven UI with centralized Design System
- Context-based State Management

**Backend (`/backend`)**
- Node.js (ES Modules) with Express 5.x
- Prisma ORM 7.x
- PostgreSQL (hosted on Supabase)
- Custom JWT Authentication
- Zod Validation
- AI Integrations (Hugging Face / Gemini)

---

## 📂 Repository Structure

- [`/frontend`](./frontend/) - The React Native (Expo) application. See [Frontend README](./frontend/README.md) for details.
- [`/backend`](./backend/) - The Express API server. See [Backend README](./backend/README.md) for details.
- [`/docs`](./docs/) - Core product documentation and architectural decisions.
  - [`VISION.md`](./docs/VISION.md) - The North Star vision for the product.
  - [`HOW_SHIPPING_WORKS.md`](./docs/HOW_SHIPPING_WORKS.md) - Detailed explanation of dynamic shipping fees and local pickup.
- [`Knot_and_Bloom_Business_Model.md`](./docs/Knot_and_Bloom_Business_Model.md) - Complete documentation of the platform's revenue model, tech stack choices, and user lifecycles.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18+)
- PostgreSQL (Local or Cloud/Supabase)
- Expo CLI (`npm install -g expo-cli`)

### 1. Backend Setup

```bash
cd backend
npm install
```

Copy the environment template and fill in the required keys (e.g., Supabase/Database URL, JWT Secret, API Keys):
```bash
cp .env.example .env
```

Generate the Prisma client and start the server:
```bash
npx prisma generate
npm run dev
```
The backend server will run at `http://localhost:3030`.

### 2. Frontend Setup

In a new terminal window:
```bash
cd frontend
npm install
```

Start the Expo development server:
```bash
npx expo start
```
From the Expo CLI, you can press `w` to open the web version, or scan the QR code using the Expo Go app on your mobile device.

---

## 🔐 Architecture Overview

### User Roles
- **USER:** Default customer. Browses products, manages cart, places orders.
- **SELLER:** A Customer who has completed the seller onboarding flow and KYC. Manages products, views orders, and tracks earnings.
- **ADMIN:** Platform oversight. Approves new sellers and products, manages global settings.

### Payment & Order Flow
1. **Initiate:** 15-minute checkout session with price locking.
2. **Payment:** 
   - **COD:** 20% deposit upfront via platform gateway, balance on delivery.
   - **Card/Wallet:** Full payment processed upfront.
3. **Fulfillment:** Order is split by seller (Multi-seller cart creates separate orders). Platform retains a 2% sustainability fee + flat routing fee.
