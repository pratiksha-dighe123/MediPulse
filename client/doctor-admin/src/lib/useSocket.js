import { useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSession } from './auth';

const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? 'https://medipulse-1sje.onrender.com'
  : 'http://localhost:5000';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');

let socketInstance = null;

export const useSocket = () => {
  const socket = useRef(null);
  const session = getSession();

  useEffect(() => {
    if (!session?.token) return;

    // Create socket connection if not exists
    if (!socketInstance) {
      socketInstance = io(API_BASE_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        auth: {
          token: session.token,
        },
      });

      // Connection event
      socketInstance.on('connect', () => {
        console.log('✅ Admin connected to real-time server:', socketInstance.id);

        // Register admin user after connection
        socketInstance.emit('user:register', {
          userId: session.id,
          role: session.role,
        });
      });

      // Disconnection event
      socketInstance.on('disconnect', () => {
        console.log('❌ Disconnected from real-time server');
      });

      // Reconnection event
      socketInstance.on('reconnect', () => {
        console.log('🔄 Reconnected to real-time server');
        socketInstance.emit('user:register', {
          userId: session.id,
          role: session.role,
        });
      });

      // Error handling
      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });
    }

    socket.current = socketInstance;

    return () => {
      // Don't disconnect here - keep connection alive
      // connection persists across component remounts
    };
  }, [session]);

  // Subscribe to an event
  const on = useCallback((event, callback) => {
    if (socketInstance) {
      socketInstance.on(event, callback);

      // Cleanup function
      return () => {
        socketInstance.off(event, callback);
      };
    }
  }, []);

  // Emit an event
  const emit = useCallback((event, data) => {
    if (socketInstance) {
      socketInstance.emit(event, data);
    }
  }, []);

  // Join a room (for targeted updates)
  const joinRoom = useCallback((room) => {
    if (socketInstance) {
      socketInstance.emit('user:joinRoom', { room });
    }
  }, []);

  // Leave a room
  const leaveRoom = useCallback((room) => {
    if (socketInstance) {
      socketInstance.emit('user:leaveRoom', { room });
    }
  }, []);

  return {
    socket: socketInstance,
    on,
    emit,
    joinRoom,
    leaveRoom,
    isConnected: socketInstance?.connected || false,
  };
};

// Export socket instance for use outside React components
export const getSocketInstance = () => socketInstance;
