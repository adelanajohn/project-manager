import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { generateClientCorrelationId } from '@pm/shared';

export const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token and correlation ID
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  config.headers['X-Correlation-Id'] = generateClientCorrelationId();
  return config;
});

// Handle 401 — attempt token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${(import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000'}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const endpoints = {
  auth: {
    signup: (data: unknown) => api.post('/api/v1/auth/signup', data),
    login: (data: unknown) => api.post('/api/v1/auth/login', data),
    logout: () => api.post('/api/v1/auth/logout'),
    me: () => api.get('/api/v1/auth/me'),
    sessions: () => api.get('/api/v1/auth/sessions'),
    revokeSession: (id: string) => api.delete(`/api/v1/auth/sessions/${id}`),
    forgotPassword: (data: unknown) => api.post('/api/v1/auth/forgot-password', data),
    resetPassword: (data: unknown) => api.post('/api/v1/auth/reset-password', data),
  },
  orgs: {
    list: () => api.get('/api/v1/orgs'),
    create: (data: unknown) => api.post('/api/v1/orgs', data),
    get: (id: string) => api.get(`/api/v1/orgs/${id}`),
    update: (id: string, data: unknown) => api.patch(`/api/v1/orgs/${id}`, data),
    delete: (id: string) => api.delete(`/api/v1/orgs/${id}`),
    members: (id: string, params?: unknown) => api.get(`/api/v1/orgs/${id}/members`, { params }),
    invite: (id: string, data: unknown) => api.post(`/api/v1/orgs/${id}/invites`, data),
    updateMemberRole: (orgId: string, userId: string, data: unknown) =>
      api.patch(`/api/v1/orgs/${orgId}/members/${userId}`, data),
    removeMember: (orgId: string, userId: string) =>
      api.delete(`/api/v1/orgs/${orgId}/members/${userId}`),
    notifications: (orgId: string, params?: unknown) =>
      api.get(`/api/v1/orgs/${orgId}/notifications`, { params }),
    dashboard: (orgId: string) => api.get(`/api/v1/orgs/${orgId}/dashboard`),
  },
  projects: {
    list: (orgId: string) => api.get(`/api/v1/orgs/${orgId}/projects`),
    create: (orgId: string, data: unknown) => api.post(`/api/v1/orgs/${orgId}/projects`, data),
    get: (id: string) => api.get(`/api/v1/projects/${id}`),
    update: (id: string, data: unknown) => api.patch(`/api/v1/projects/${id}`, data),
    delete: (id: string) => api.delete(`/api/v1/projects/${id}`),
    board: (id: string, params?: unknown) => api.get(`/api/v1/projects/${id}/board`, { params }),
    backlog: (id: string) => api.get(`/api/v1/projects/${id}/backlog`),
    analytics: (id: string) => api.get(`/api/v1/projects/${id}/analytics`),
    roadmap: (id: string) => api.get(`/api/v1/projects/${id}/roadmap`),
    createStatus: (id: string, data: unknown) => api.post(`/api/v1/projects/${id}/statuses`, data),
  },
  issues: {
    list: (projectId: string, params?: unknown) =>
      api.get(`/api/v1/projects/${projectId}/issues`, { params }),
    create: (projectId: string, data: unknown) =>
      api.post(`/api/v1/projects/${projectId}/issues`, data),
    get: (id: string) => api.get(`/api/v1/issues/${id}`),
    update: (id: string, data: unknown) => api.patch(`/api/v1/issues/${id}`, data),
    delete: (id: string) => api.delete(`/api/v1/issues/${id}`),
    updateRank: (id: string, data: unknown) => api.patch(`/api/v1/issues/${id}/rank`, data),
    comments: (id: string) => api.get(`/api/v1/issues/${id}/comments`),
    createComment: (id: string, data: unknown) => api.post(`/api/v1/issues/${id}/comments`, data),
    bulk: (projectId: string, data: unknown) =>
      api.post(`/api/v1/projects/${projectId}/issues/bulk`, data),
  },
  sprints: {
    list: (projectId: string) => api.get(`/api/v1/projects/${projectId}/sprints`),
    create: (projectId: string, data: unknown) =>
      api.post(`/api/v1/projects/${projectId}/sprints`, data),
    update: (id: string, data: unknown) => api.patch(`/api/v1/sprints/${id}`, data),
    start: (id: string) => api.post(`/api/v1/sprints/${id}/start`),
    complete: (id: string, data: unknown) => api.post(`/api/v1/sprints/${id}/complete`, data),
    burndown: (id: string) => api.get(`/api/v1/sprints/${id}/burndown`),
  },
  epics: {
    list: (projectId: string) => api.get(`/api/v1/projects/${projectId}/epics`),
    create: (projectId: string, data: unknown) =>
      api.post(`/api/v1/projects/${projectId}/epics`, data),
    update: (id: string, data: unknown) => api.patch(`/api/v1/epics/${id}`, data),
    delete: (id: string) => api.delete(`/api/v1/epics/${id}`),
  },
  search: (params: unknown) => api.get('/api/v1/search', { params }),
  notifications: {
    markRead: (id: string) => api.patch(`/api/v1/notifications/${id}/read`),
    markAllRead: () => api.patch('/api/v1/notifications/read-all'),
  },
};
