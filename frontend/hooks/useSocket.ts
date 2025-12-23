import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/app/auth';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3030';

interface UseSocketReturn {
    socket: Socket | null;
    isConnected: boolean;
    joinRoom: (room: string) => void;
    leaveRoom: (room: string) => void;
}

export function useSocket(): UseSocketReturn {
    const { user } = useAuth();
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Only connect if user is authenticated
        if (!user) {
            // Disconnect if user logs out
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

        // Create socket connection
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket.id);
            setIsConnected(true);

            // Auto-join user's room
            if (user?.uid) {
                socket.emit('join', `user_${user.uid}`);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error.message);
        });

        // Cleanup function - THIS IS CRITICAL
        return () => {
            console.log('[Socket] Cleaning up connection');
            if (socket) {
                socket.removeAllListeners();
                socket.disconnect();
            }
            socketRef.current = null;
            setIsConnected(false);
        };
    }, [user?.uid]); // Only re-run if user ID changes

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

    return {
        socket: socketRef.current,
        isConnected,
        joinRoom,
        leaveRoom,
    };
}

export default useSocket;
