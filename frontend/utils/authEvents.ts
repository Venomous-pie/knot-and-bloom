type AuthEventType = 'LOGOUT' | 'ERROR';

interface AuthEventPayload {
    message?: string;
}

type AuthEventListener = (type: AuthEventType, payload?: AuthEventPayload) => void;

class AuthEventEmitter {
    private listeners: Set<AuthEventListener> = new Set();

    emit(type: AuthEventType, payload?: AuthEventPayload) {
        this.listeners.forEach(listener => listener(type, payload));
    }

    subscribe(listener: AuthEventListener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
}

export const authEvents = new AuthEventEmitter();
