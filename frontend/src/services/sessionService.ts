import { authTokenStorage } from '@/integrations/api/client';
import { ApiUser, authService } from '@/services/authService';

let cachedUser: ApiUser | null = null;
let refreshPromise: Promise<ApiUser | null> | null = null;

const USER_STORAGE_KEY = 'tasarini_current_user';

const readStoredUser = (): ApiUser | null => {
  if (cachedUser) return cachedUser;
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    cachedUser = JSON.parse(raw) as ApiUser;
    return cachedUser;
  } catch {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

const writeStoredUser = (user: ApiUser | null) => {
  if (typeof window === 'undefined') return;
  if (user) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }
};

export const sessionService = {
  setUser(user: ApiUser | null) {
    cachedUser = user;
    writeStoredUser(user);
  },
  getUserSync(): ApiUser | null {
    return readStoredUser();
  },
  async ensureUser(forceRefresh = false): Promise<ApiUser | null> {
    if (!forceRefresh) {
      const existing = readStoredUser();
      if (existing) {
        return existing;
      }
    }

    if (!authTokenStorage.getAccessToken()) {
      this.setUser(null);
      return null;
    }

    if (!refreshPromise) {
      refreshPromise = authService
        .getCurrentUser()
        .then((user) => {
          this.setUser(user);
          return user;
        })
        .catch(() => {
          this.setUser(null);
          return null;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    return refreshPromise;
  },
  clear() {
    cachedUser = null;
    writeStoredUser(null);
  },
};

authTokenStorage.onClear(() => {
  cachedUser = null;
  writeStoredUser(null);
});
