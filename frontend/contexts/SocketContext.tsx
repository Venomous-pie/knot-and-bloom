import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("🚨 CRITICAL: Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Realtime features will silently fail.");
}

// Create a singleton client for the frontend
const supabase = createClient(
    SUPABASE_URL || 'https://aws-1-ap-south-1.pooler.supabase.com', 
    SUPABASE_ANON_KEY || 'dummy_key'
);

// A wrapper to mimic socket.io's .on and .off methods for seamless migration
export interface MockSocket {
    on: (event: string, callback: (data: any) => void) => void;
    off: (event: string, callback?: (data: any) => void) => void;
    emit: (event: string, data?: any) => void;
    disconnect: () => void;
    connected: boolean;
}

interface SocketContextType {
    socket: MockSocket | null;
    isConnected: boolean;
    joinRoom: (room: string) => void;
    leaveRoom: (room: string) => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    joinRoom: () => { },
    leaveRoom: () => { },
});

export function SocketProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth(); // Removed token dependency to avoid dropping rooms on silent refresh
    const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
    const eventListenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
    const [isConnected, setIsConnected] = useState(false);

    // Mock socket object that mimics socket.io behavior
    // Note: socketRef.current is never reassigned to ensure closures like disconnect() remain valid.
    const socketRef = useRef<MockSocket>({
        connected: false,
        on: (event, callback) => {
            if (!eventListenersRef.current.has(event)) {
                eventListenersRef.current.set(event, new Set());
            }
            eventListenersRef.current.get(event)?.add(callback);
        },
        off: (event, callback) => {
            if (callback) {
                eventListenersRef.current.get(event)?.delete(callback);
            } else {
                eventListenersRef.current.delete(event);
            }
        },
        emit: (event, data) => {
            console.warn(`[Supabase Mock Socket] emit called for ${event}. Broadcast requires channel context. Silently ignoring.`);
        },
        disconnect: () => {
            channelsRef.current.forEach(channel => supabase.removeChannel(channel));
            channelsRef.current.clear();
            eventListenersRef.current.clear();
            socketRef.current.connected = false;
        }
    });

    const joinRoom = useCallback((roomName: string) => {
        if (channelsRef.current.has(roomName)) return;

        const channel = supabase.channel(roomName)
            .on('broadcast', { event: '*' }, (payload) => {
                const event = payload.event;
                const listeners = eventListenersRef.current.get(event);
                if (listeners) {
                    listeners.forEach(cb => cb(payload.payload));
                }
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true);
                    socketRef.current.connected = true;
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error(`[SocketContext] Failed to subscribe to ${roomName}:`, status, err);
                    channelsRef.current.delete(roomName); // Remove so it can be retried
                    
                    if (channelsRef.current.size === 0) {
                        setIsConnected(false);
                        socketRef.current.connected = false;
                    }
                } else if (status === 'CLOSED') {
                    channelsRef.current.delete(roomName);
                    if (channelsRef.current.size === 0) {
                        setIsConnected(false);
                        socketRef.current.connected = false;
                    }
                }
            });

        // Set synchronously to prevent rapid join/leave race conditions from spawning duplicate channels
        channelsRef.current.set(roomName, channel);
    }, []);

    const leaveRoom = useCallback((roomName: string) => {
        const channel = channelsRef.current.get(roomName);
        if (channel) {
            supabase.removeChannel(channel);
            channelsRef.current.delete(roomName);
            
            // Re-evaluate global connection state
            if (channelsRef.current.size === 0) {
                setIsConnected(false);
                socketRef.current.connected = false;
            }
        }
    }, []);

    useEffect(() => {
        // Only connect if user is authenticated
        if (!user || !user.uid) {
            socketRef.current.disconnect();
            setIsConnected(false);
            return;
        }

        // Auto-join user's personal room on login
        const personalRoom = `user_${user.uid}`;
        joinRoom(personalRoom);

        return () => {
            // We specifically only leave the personal room on cleanup, rather than calling disconnect(),
            // to ensure other active rooms (e.g. chat) aren't dropped if this effect re-runs.
            leaveRoom(personalRoom);
        };
    }, [user?.uid, joinRoom, leaveRoom]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected, joinRoom, leaveRoom }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocketContext() {
    return useContext(SocketContext);
}
