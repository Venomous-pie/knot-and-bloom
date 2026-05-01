import type { AuthPayload } from './authTypes.js';

declare global {
    namespace Express {
        // Extend the built-in User interface (used by Passport) with our auth fields
        interface User extends AuthPayload {}
        interface Request {
            user?: AuthPayload;
        }
    }
}

export {};
