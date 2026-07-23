export type ToastType = 'SUCCESS' | 'ERROR' | 'INFO';

export interface ToastPayload {
    message: string;
    type?: ToastType;
    duration?: number;
}

type ToastEventListener = (payload: ToastPayload) => void;

class ToastEventEmitter {
    private listeners: Set<ToastEventListener> = new Set();

    emit(payload: ToastPayload) {
        this.listeners.forEach(listener => listener(payload));
    }

    subscribe(listener: ToastEventListener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
}

export const toastEvents = new ToastEventEmitter();
