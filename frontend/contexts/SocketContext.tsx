import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/client';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('🚨 CRITICAL: Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Realtime will not work.');
}

// Singleton Supabase client for Realtime
const supabase = createClient(
    SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY ?? '',
    {
        realtime: {
            params: { eventsPerSecond: 10 },
        },
    }
);

// ─── Types ────────────────────────────────────────────────────────────────────

/** The event names broadcast from Postgres triggers */
export type RealtimeEventName =
    | 'notification_created'
    | 'notification_updated'
    | 'order_timeline_created';

export type RealtimeEventCallback = (payload: any) => void;

/** Topic names that match the RLS policies on realtime.messages */
export type RealtimeTopic = `user:${number}:notifications` | `user:${number}:orders`;

interface RealtimeContextType {
    isConnected: boolean;
    /** Subscribe to a typed broadcast event. Returns an unsubscribe function. */
    on: (event: RealtimeEventName, callback: RealtimeEventCallback) => () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const RealtimeContext = createContext<RealtimeContextType>({
    isConnected: false,
    on: () => () => { },
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SocketProvider({ children }: { children: ReactNode }) {
    const { user, token: expressToken } = useAuth();
    const channelsRef = useRef<RealtimeChannel[]>([]);
    const listenersRef = useRef<Map<RealtimeEventName, Set<RealtimeEventCallback>>>(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const supabaseTokenRef = useRef<string | null>(null);

    /** Dispatch a received broadcast payload to all listeners for that event */
    const dispatch = useCallback((event: RealtimeEventName, payload: any) => {
        listenersRef.current.get(event)?.forEach(cb => cb(payload));
    }, []);

    /** Fetch a short-lived Supabase JWT from our backend */
    const fetchSupabaseToken = useCallback(async (): Promise<string | null> => {
        try {
            const response = await api.get<{ token: string }>('/realtime/token');
            return response.data.token;
        } catch (err) {
            console.error('[Realtime] Failed to fetch Supabase token:', err);
            return null;
        }
    }, []);

    /** Subscribe to a single private channel and wire up broadcast listeners */
    const subscribeChannel = useCallback((topic: RealtimeTopic): RealtimeChannel => {
        const channel = supabase.channel(topic, { config: { private: true } });

        // Wire all broadcast events through the dispatcher
        const events: RealtimeEventName[] = [
            'notification_created',
            'notification_updated',
            'order_timeline_created',
        ];

        events.forEach(event => {
            channel.on('broadcast', { event }, (payload) => {
                dispatch(event, payload.payload ?? payload);
            });
        });

        channel.subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                setIsConnected(true);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.error(`[Realtime] ${topic} subscription failed:`, status, err);
            }
        });

        return channel;
    }, [dispatch]);

    /** Tear down all active channels */
    const teardown = useCallback(() => {
        channelsRef.current.forEach(ch => supabase.removeChannel(ch));
        channelsRef.current = [];
        setIsConnected(false);
    }, []);

    /** Main effect: authenticate and subscribe whenever the user logs in/out */
    useEffect(() => {
        if (!user?.uid || !expressToken) {
            // User logged out — remove all subscriptions
            teardown();
            supabase.realtime.setAuth(null);
            supabaseTokenRef.current = null;
            return;
        }

        let cancelled = false;

        async function connect() {
            const supabaseToken = await fetchSupabaseToken();
            if (cancelled || !supabaseToken) return;

            supabaseTokenRef.current = supabaseToken;

            // Authenticate the Supabase Realtime connection with our custom JWT
            await supabase.realtime.setAuth(supabaseToken);

            // Subscribe to the two user-scoped private channels
            const notificationsChannel = subscribeChannel(`user:${user!.uid}:notifications`);
            const ordersChannel = subscribeChannel(`user:${user!.uid}:orders`);

            channelsRef.current = [notificationsChannel, ordersChannel];
        }

        connect();

        return () => {
            cancelled = true;
            teardown();
        };
    }, [user?.uid, expressToken, fetchSupabaseToken, subscribeChannel, teardown]);

    /** Public subscribe API — returns an unsubscribe cleanup fn */
    const on = useCallback((event: RealtimeEventName, callback: RealtimeEventCallback): (() => void) => {
        if (!listenersRef.current.has(event)) {
            listenersRef.current.set(event, new Set());
        }
        listenersRef.current.get(event)!.add(callback);

        return () => {
            listenersRef.current.get(event)?.delete(callback);
        };
    }, []);

    return (
        <RealtimeContext.Provider value={{ isConnected, on }}>
            {children}
        </RealtimeContext.Provider>
    );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Access realtime connection state and subscribe to events */
export function useRealtime() {
    return useContext(RealtimeContext);
}

/**
 * @deprecated Use useRealtime() instead.
 * Kept for backward compatibility — returns a minimal socket-like shim.
 */
export function useSocketContext() {
    const { isConnected, on } = useRealtime();
    return { isConnected, on, socket: null };
}
