---
tags:
  - architecture/security
  - architecture/auth
---
# Service - Authentication Flow

**Role:** Securely identifying customers and sellers across the Expo App and API.
**Libraries:** `passport`, `jsonwebtoken`, `bcrypt`, `passport-google-oauth20`

## Core Flow

1. **Local Authentication:**
   - User inputs email and password on the frontend.
   - Backend looks up `Customer` record.
   - Compares password using `bcrypt.compare`.
   - On success, generates a **JSON Web Token (JWT)**.

2. **OAuth (Google):**
   - User clicks "Sign in with Google".
   - App redirects to Express backend route `/auth/google`.
   - Passport strategy handles the OAuth dance with Google.
   - Finds or creates a `Customer` using the returned `googleId` and email.
   - Issues a JWT.

3. **Session Management (JWT Strategy):**
   - The JWT is returned to the client and stored (likely in `AsyncStorage` or `SecureStore` in React Native).
   - Subsequent requests include the token in the `Authorization: Bearer <token>` header.
   - Express middleware verifies the JWT. If valid, attaches the `userId` to `req.user`.

4. **Refresh Tokens (Optional but Recommended):**
   - The schema includes a `RefreshToken` model, suggesting short-lived JWTs paired with long-lived refresh tokens stored in the database for better security and UX (so users don't have to keep logging in).

## Security Considerations
- **Secret Keys:** Ensure `JWT_SECRET` is strong and securely injected via environment variables.
- **Token Expiry:** JWTs should have a short lifespan (e.g., 15-60 minutes).
- **Revocation:** If a token is compromised, since JWTs are stateless, you cannot revoke them easily unless you implement a token blocklist or rely heavily on the `RefreshToken` check.
