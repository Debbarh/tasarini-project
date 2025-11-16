const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;
const API_ROOT_URL = API_BASE_URL.replace(/\/v1\/?$/, '/');
let tokenRefreshPromise: Promise<boolean> | null = null;

if (!API_BASE_URL) {
  throw new Error('Missing VITE_API_BASE_URL environment variable.');
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  headers?: HeadersInit;
  body?: unknown;
  searchParams?: Record<string, string | number | boolean | undefined>;
};

const buildUrl = (endpoint: string, searchParams?: RequestOptions['searchParams']) => {
  const url = new URL(endpoint.replace(/^\//, ''), API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url;
};

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('tasarini_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const requestNewTokens = async (): Promise<boolean> => {
  const refresh = authTokenStorage.getRefreshToken();
  if (!refresh) {
    return false;
  }

  try {
    const response = await fetch(new URL('token/refresh/', API_ROOT_URL).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) {
      throw new Error('Unable to refresh token');
    }

    const payload = await response.json();
    if (!payload?.access) {
      throw new Error('Invalid refresh response');
    }

    authTokenStorage.setTokens(payload);
    return true;
  } catch (error) {
    authTokenStorage.clear();
    return false;
  }
};

export class ApiError extends Error {
  status: number;
  payload?: unknown;
  errorCode?: string;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    // Extract error_code if present
    if (payload && typeof payload === 'object' && 'error_code' in payload) {
      this.errorCode = (payload as any).error_code;
    }
  }

  isEmailNotVerified(): boolean {
    return this.status === 403 && this.errorCode === 'EMAIL_NOT_VERIFIED';
  }
}

export class ApiClient {
  async request<T>(endpoint: string, options: RequestOptions = {}, attempt = 0): Promise<T> {
    const { method = 'GET', headers, body, searchParams } = options;
    const url = buildUrl(endpoint, searchParams);
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseBody = await this.parseBody(response);

    if (!response.ok) {
      if (response.status === 401 && attempt === 0) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          return this.request<T>(endpoint, options, attempt + 1);
        }
      }
      throw new ApiError(response.statusText || 'API Error', response.status, responseBody);
    }

    return responseBody as T;
  }

  private async parseBody(response: Response) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  get<T>(endpoint: string, searchParams?: RequestOptions['searchParams']) {
    return this.request<T>(endpoint, { method: 'GET', searchParams });
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (!tokenRefreshPromise) {
      tokenRefreshPromise = requestNewTokens().finally(() => {
        tokenRefreshPromise = null;
      });
    }
    return tokenRefreshPromise;
  }
}

export const apiClient = new ApiClient();

const clearListeners = new Set<() => void>();

export const authTokenStorage = {
  setTokens(tokens: { access: string; refresh?: string }) {
    localStorage.setItem('tasarini_access_token', tokens.access);
    if (tokens.refresh) {
      localStorage.setItem('tasarini_refresh_token', tokens.refresh);
    } else {
      localStorage.removeItem('tasarini_refresh_token');
    }
  },
  getAccessToken() {
    return localStorage.getItem('tasarini_access_token');
  },
  getRefreshToken() {
    return localStorage.getItem('tasarini_refresh_token');
  },
  clear() {
    localStorage.removeItem('tasarini_access_token');
    localStorage.removeItem('tasarini_refresh_token');
    clearListeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('authTokenStorage listener error', error);
      }
    });
  },
  onClear(callback: () => void) {
    clearListeners.add(callback);
    return () => clearListeners.delete(callback);
  },
};
