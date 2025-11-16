import { ApiError, API_BASE_URL, apiClient } from '@/integrations/api/client';

const API_ROOT_URL = API_BASE_URL.replace(/\/v1\/?$/, '/');

const authFetch = async <T>(path: string, body: Record<string, unknown>) => {
  const response = await fetch(new URL(path, API_ROOT_URL).toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.statusText || 'API Error', response.status, payload);
  }
  return payload as T;
};

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: 'user' | 'partner';
  // RGPD fields
  date_of_birth?: string;
  terms_accepted?: boolean;
  privacy_policy_accepted?: boolean;
  privacy_policy_version?: string;
  marketing_consent?: boolean;
}

export interface ApiUser {
  id: number;
  public_id: string;
  username: string;
  email: string;
  display_name: string;
  role: string;
  roles: string[];
  preferred_language: string;
  onboarding_completed: boolean;
  profile?: ApiUserProfile;
  role_assignments_detail?: Array<{
    id: number;
    user: number;
    user_id: string;
    role: string;
    created_at: string;
  }>;
}

export interface ApiUserProfile {
  id: number;
  user: number;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  avatar_url?: string;
  bio?: string;
  preferences: Record<string, unknown>;
  behavior_profile?: Record<string, unknown>;
  segments?: string[];
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export const authService = {
  login(email: string, password: string) {
    return authFetch<TokenPair>('token/', { email: email.toLowerCase(), password });
  },
  refresh(refresh: string) {
    return authFetch<TokenPair>('token/refresh/', { refresh });
  },
  register(payload: RegisterPayload) {
    return authFetch<{ user: ApiUser; tokens: TokenPair }>('auth/register/', payload as unknown as Record<string, unknown>);
  },
  async getCurrentUser() {
    return apiClient.get<ApiUser>('users/me/');
  },
  async getMyProfile() {
    return apiClient.get<ApiUserProfile>('accounts/profiles/me/');
  },
  async updateProfile(profileId: number | string, payload: Partial<ApiUserProfile>) {
    return apiClient.patch<ApiUserProfile>(`accounts/profiles/${profileId}/`, payload);
  },
};
