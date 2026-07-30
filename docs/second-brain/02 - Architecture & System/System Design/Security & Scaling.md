---
tags:
  - architecture/security
  - architecture/scaling
---
# Security & Scaling constraints

Tracking the core security measures and scaling constraints for Knot & Bloom.

## Security Posture

### 1. HTTP Security (`helmet`)
Helmet is implemented in the Express backend to automatically set secure HTTP headers, protecting against common vulnerabilities like clickjacking and MIME-type sniffing.

### 2. Input Sanitization (`xss`)
To prevent Cross-Site Scripting, the backend uses `xss` to sanitize user inputs, especially for text-heavy fields like Product Descriptions and Review comments.

### 3. DDoS Protection (`express-rate-limit`)
API endpoints are protected by rate limiting. Currently, this likely runs in-memory per Node instance.
**Scaling Risk:** If you deploy multiple Node.js instances behind a load balancer, in-memory rate limiting becomes ineffective. You will need to attach `express-rate-limit` to a centralized Redis store.

### 4. Data Privacy
- Passwords are never stored in plaintext (hashed via `bcrypt`).
- API keys (Supabase, Groq, Google AI) must remain in `.env` and never be hardcoded or leaked to the frontend client.

## Scaling Architecture

### Horizontal vs Vertical Scaling
The Express application is stateless (thanks to JWTs instead of session cookies). This means you can scale **horizontally** simply by spinning up more instances (e.g., via PM2 cluster mode or Kubernetes) behind a load balancer.

### Database Constraints
PostgreSQL handles concurrent connections, but Prisma creates a connection pool per Node instance.
- **Risk:** 10 Node instances with a pool size of 10 = 100 connections to Postgres.
- **Solution:** As traffic grows, deploy **PgBouncer** in front of Postgres to pool connections efficiently, or use Prisma Accelerate.

### Media & Storage
Images and static assets should never be served from the Node backend. They should be offloaded to the **Supabase Storage Bucket** (which acts as the CDN). Ensure all `imageUrl` fields in the database point to the CDN rather than local server paths.
