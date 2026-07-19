import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://aws-1-ap-south-1.pooler.supabase.com';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key';

// Create a singleton client for the frontend
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    const { user, token } = useAuth();
    const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
    const eventListenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
    const [isConnected, setIsConnected] = useState(false);

    // Mock socket object that mimics socket.io behavior
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
            console.log(`[Supabase Mock Socket] emit called for ${event}, but Supabase client-side broadcast requires channel context. Backend will handle most emits.`);
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
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true);
                    socketRef.current.connected = true;
                }
            });

        channelsRef.current.set(roomName, channel);
    }, []);

    const leaveRoom = useCallback((roomName: string) => {
        const channel = channelsRef.current.get(roomName);
        if (channel) {
            supabase.removeChannel(channel);
            channelsRef.current.delete(roomName);
        }
    }, []);

    useEffect(() => {
        // Only connect if user is authenticated and we have a token
        if (!user || !token) {
            socketRef.current.disconnect();
            setIsConnected(false);
            return;
        }

        // Auto-join user's personal room on login
        if (user.uid) {
            joinRoom(`user_${user.uid}`);
        }

        return () => {
            socketRef.current.disconnect();
            setIsConnected(false);
        };
    }, [user?.uid, token, joinRoom]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected, joinRoom, leaveRoom }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocketContext() {
    return useContext(SocketContext);
}
