import { AuthPayload } from './authTypes.ts';

declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
}
