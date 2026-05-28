import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

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
    const { user, token } = useAuth();
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Only connect if user is authenticated and we have a token
        if (!user || !token) {
            if (socketRef.current) {

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


        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            auth: { token },
        });

        socketRef.current = socket;

        socket.on('connect', () => {

            setIsConnected(true);

            if (user?.uid) {
                socket.emit('join', `user_${user.uid}`);
            }
        });

        socket.on('disconnect', (reason) => {

            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('[SocketProvider] Connection error:', error.message);
        });

        return () => {

            socket.removeAllListeners();
            socket.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        };
    }, [user?.uid, token]);

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
