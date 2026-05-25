import { create } from 'zustand';

export interface PresenceUser {
  userId: string;
  fullName?: string;
  avatarUrl?: string | null;
  projectId: string;
  joinedAt: number;
}

interface PresenceState {
  /** Map of projectId → set of present user IDs */
  presence: Map<string, Set<string>>;
  /** Map of userId → user info */
  users: Map<string, Omit<PresenceUser, 'projectId'>>;

  setUserPresent: (user: PresenceUser) => void;
  setUserGone: (userId: string, projectId: string) => void;
  getUsersForProject: (projectId: string) => PresenceUser[];
  clearProject: (projectId: string) => void;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  presence: new Map(),
  users: new Map(),

  setUserPresent: (user) => {
    set((state) => {
      const presence = new Map(state.presence);
      const users = new Map(state.users);

      if (!presence.has(user.projectId)) {
        presence.set(user.projectId, new Set());
      }
      presence.get(user.projectId)!.add(user.userId);

      users.set(user.userId, {
        userId: user.userId,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        joinedAt: user.joinedAt,
      });

      return { presence, users };
    });
  },

  setUserGone: (userId, projectId) => {
    set((state) => {
      const presence = new Map(state.presence);
      presence.get(projectId)?.delete(userId);
      return { presence };
    });
  },

  getUsersForProject: (projectId) => {
    const { presence, users } = get();
    const ids = presence.get(projectId) ?? new Set();
    return Array.from(ids)
      .map((id) => {
        const u = users.get(id);
        return u ? { ...u, projectId } : null;
      })
      .filter(Boolean) as PresenceUser[];
  },

  clearProject: (projectId) => {
    set((state) => {
      const presence = new Map(state.presence);
      presence.delete(projectId);
      return { presence };
    });
  },
}));
