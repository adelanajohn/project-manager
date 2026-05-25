// Custom hook for WebSocket room subscription per project
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';

export function useProjectSocket(projectId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId || !accessToken) return;

    const socket = io((import.meta as any).env?.VITE_WS_URL ?? 'http://localhost:3000', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;
    socket.emit('join:project', projectId);

    socket.on('issue.created', () => qc.invalidateQueries({ queryKey: ['issues', projectId] }));
    socket.on('issue.updated', () => qc.invalidateQueries({ queryKey: ['issues', projectId] }));
    socket.on('issue.deleted', () => qc.invalidateQueries({ queryKey: ['issues', projectId] }));

    return () => {
      socket.emit('leave:project', projectId);
      socket.disconnect();
    };
  }, [projectId, accessToken]);

  return socketRef.current;
}
