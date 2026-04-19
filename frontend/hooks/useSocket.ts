'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function useSocket(userId: number | null, onNotification: (data: unknown) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    const socket = io(BACKEND_URL, {
      query: { userId: String(userId) },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[socket] Connected as user', userId);
    });

    socket.on('notification', (data: unknown) => {
      onNotification(data);
    });

    socket.on('disconnect', () => {
      console.log('[socket] Disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, onNotification]);

  return socketRef;
}
