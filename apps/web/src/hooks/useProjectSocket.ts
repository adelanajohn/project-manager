import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { usePresenceStore } from '@/stores/presence.store';
import { queryKeys } from '@/lib/queryKeys';

export function useProjectSocket(projectId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  const { setUserPresent, setUserGone, clearProject } = usePresenceStore();

  useEffect(() => {
    if (!projectId || !accessToken) return;

    const wsUrl = (import.meta as any).env?.VITE_WS_URL ?? 'http://localhost:3000';

    const socket = io(wsUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:project', projectId);
    });

    socket.on('disconnect', () => {
      clearProject(projectId);
    });

    // ── Issue events ──────────────────────────────────────────────
    socket.on('issue.created', () => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.board(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.backlog(projectId) });
    });

    socket.on('issue.updated', (data: { issueId: string }) => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.board(projectId) });
      if (data?.issueId) {
        qc.invalidateQueries({ queryKey: queryKeys.issues.detail(data.issueId) });
      }
    });

    socket.on('issue.deleted', () => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.board(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.backlog(projectId) });
    });

    // ── Comment events ────────────────────────────────────────────
    socket.on('comment.created', (data: { issueId: string }) => {
      if (data?.issueId) {
        qc.invalidateQueries({ queryKey: queryKeys.issues.comments(data.issueId) });
      }
    });

    // ── Sprint events ─────────────────────────────────────────────
    socket.on('sprint.updated', () => {
      qc.invalidateQueries({ queryKey: queryKeys.sprints.list(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.projects.board(projectId) });
    });

    // ── Presence events ───────────────────────────────────────────
    socket.on('presence:join', (data: { userId: string; fullName?: string; avatarUrl?: string }) => {
      setUserPresent({ ...data, projectId, joinedAt: Date.now() });
    });

    socket.on('presence:leave', (data: { userId: string }) => {
      setUserGone(data.userId, projectId);
    });

    // ── Error handling ─────────────────────────────────────────────
    socket.on('connect_error', (err) => {
      console.warn('[Socket] connect error:', err.message);
    });

    return () => {
      socket.emit('leave:project', projectId);
      socket.disconnect();
      clearProject(projectId);
    };
  }, [projectId, accessToken]);

  return socketRef.current;
}
