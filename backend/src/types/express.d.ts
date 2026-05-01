import { AuthPayload } from './authTypes';

declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
}
