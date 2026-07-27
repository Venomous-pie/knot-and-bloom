---
tags:
  - architecture/backend
---
# Service - Express Backend

**Role:** The core API Gateway and business logic layer for Knot & Bloom.
**Framework:** Node.js, Express.js (v5.x), TypeScript
**Port:** Typically 3030

## Architecture
The backend serves as a RESTful API consumed by the Expo frontend. It connects to the [[Service - PostgreSQL Database]] via Prisma ORM and integrates with external services for [[Service - Authentication Flow]], AI, and storage.

## Core Dependencies
- **Routing/Server:** `express`, `express-session`
- **Security:** `helmet` (HTTP headers), `xss` (Cross-site scripting protection), `express-rate-limit` (DDoS prevention)
- **Auth:** `passport`, `passport-google-oauth20`, `jsonwebtoken`, `bcrypt`
- **Database:** `prisma`, `@prisma/client`, `pg`
- **External:** `@supabase/supabase-js` (Storage), `@google/generative-ai`, `groq-sdk` (AI Features), `nodemailer` (Email)
- **Tasks:** `node-cron` (Scheduled jobs)

## Structure (Conceptual)
1. **Middlewares:** Global middlewares for CORS, JSON parsing, Helmet, and Rate Limiting.
2. **Routes:** Defined per domain (e.g., `/api/users`, `/api/products`).
3. **Controllers:** Business logic extracting parameters and calling database/services.
4. **Services:** External integrations (Supabase uploads, AI generation).

## Scaling Constraints & Bottlenecks
- **Node.js Event Loop:** Heavy CPU tasks (like AI parsing or image processing) should potentially be offloaded to prevent blocking the event loop.
- **Connection Pooling:** Prisma creates its own connection pool, but at scale, PgBouncer might be needed.
- **Rate Limiting:** Currently handled in-memory via `express-rate-limit`. If deployed across multiple server instances (e.g., Kubernetes, PM2 cluster), this needs to be moved to a centralized store like Redis to be effective.
