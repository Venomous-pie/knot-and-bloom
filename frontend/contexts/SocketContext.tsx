import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/app/auth';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3030';

interface SocketContextType {
    socket: Socket | null;
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
    const { user } = useAuth();
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Only connect if user is authenticated
        if (!user) {
            if (socketRef.current) {
                console.log('[SocketProvider] User logged out, disconnecting socket');
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        // Prevent multiple connections
        if (socketRef.current?.connected) {
            return;
        }

        console.log('[SocketProvider] Creating new socket connection');
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[SocketProvider] Connected:', socket.id);
            setIsConnected(true);

            if (user?.uid) {
                socket.emit('join', `user_${user.uid}`);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('[SocketProvider] Disconnected:', reason);
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('[SocketProvider] Connection error:', error.message);
        });

        return () => {
            console.log('[SocketProvider] Cleanup - disconnecting socket');
            socket.removeAllListeners();
            socket.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        };
    }, [user?.uid]);

    const joinRoom = useCallback((room: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('join', room);
        }
    }, []);

    const leaveRoom = useCallback((room: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('leave', room);
        }
    }, []);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected, joinRoom, leaveRoom }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocketContext() {
    return useContext(SocketContext);
}
