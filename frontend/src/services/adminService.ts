import { apiClient } from '@/integrations/api/client';
import { ApiUser, ApiUserProfile } from '@/services/authService';

export interface AdminDashboardStats {
  partners: {
    total_partners: number;
    pending_partners: number;
    approved_partners: number;
    rejected_partners: number;
    incomplete_partners: number;
    recent_registrations: number;
  };
  users: {
    total_users: number;
    admin_users: number;
    partner_users: number;
    regular_users: number;
    recent_registrations: number;
  };
  pois: {
    total_pois: number;
    pending_pois: number;
    approved_pois: number;
    rejected_pois: number;
    blocked_pois: number;
    verified_pois: number;
    recent_submissions: number;
  };
  bookings: {
    total_bookings: number;
    recent_bookings: number;
  };
  generated_at: string;
}

export interface AdminAuditLogPayload {
  action: string;
  target_type: string;
  target_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export interface AdminSession {
  id: number;
  session_token: string;
  expires_at: string;
  last_activity: string;
  is_active: boolean;
}

export interface AdminAuditLog {
  id: number;
  admin: number;
  admin_detail: ApiUser;
  action: string;
  target_type: string;
  target_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AdminPermissionEntry {
  id: number;
  public_id: string;
  email: string;
  display_name: string;
  primary_role: string;
  roles: string[];
  permissions: {
    can_create: boolean;
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
  };
  last_login: string | null;
}

export interface AdminPermissionRule {
  id: number;
  admin: number;
  permission_type: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

export const adminService = {
  getDashboardStats(days: number = 30) {
    return apiClient.get<AdminDashboardStats>('admin/dashboard/', { days });
  },

  logAuditAction(payload: AdminAuditLogPayload) {
    return apiClient.post('admin/audit-logs/', payload);
  },

  createSession(payload: { ip_address?: string; user_agent?: string; duration_hours?: number }) {
    return apiClient.post<AdminSession>('admin/sessions/', payload);
  },

  validateSession(session_token: string) {
    return apiClient.post<{ valid: boolean; expires_at?: string }>('admin/sessions/validate/', { session_token });
  },

  revokeSession(session_token: string) {
    return apiClient.post<{ revoked: boolean }>('admin/sessions/revoke/', { session_token });
  },

  cleanupSessions() {
    return apiClient.post<{ deactivated: number }>('admin/sessions/cleanup/', {});
  },

  listAuditLogs() {
    return apiClient.get<AdminAuditLog[]>('admin/audit-logs/');
  },

  listAdminSessions() {
    return apiClient.get<AdminSession[]>('admin/sessions/');
  },

  listAdminPermissions() {
    return apiClient.get<AdminPermissionEntry[]>('admin/permissions/');
  },

  checkPermission(payload: { permission_type: string; action: string }) {
    return apiClient.post<{ has_permission: boolean }>('admin/permissions/check/', payload);
  },

  listUsers() {
    return apiClient.get<ApiUser[]>('users/');
  },

  deleteUser(userId: number) {
    return apiClient.delete<void>(`users/${userId}/`);
  },

  updateUserProfile(profileId: number | string, payload: Partial<ApiUserProfile>) {
    return apiClient.patch<ApiUserProfile>(`accounts/profiles/${profileId}/`, payload);
  },

  assignRole(userId: number, role: string) {
    return apiClient.post('accounts/user-roles/', { user: userId, role });
  },

  removeRole(roleAssignmentId: number) {
    return apiClient.delete<void>(`accounts/user-roles/${roleAssignmentId}/`);
  },

  listPermissionRules(adminId?: number) {
    const params = adminId ? { admin: adminId } : undefined;
    return apiClient.get<AdminPermissionRule[]>('admin/permission-rules/', params);
  },

  createPermissionRule(payload: { admin: number; permission_type: string; can_create?: boolean; can_read?: boolean; can_update?: boolean; can_delete?: boolean }) {
    return apiClient.post<AdminPermissionRule>('admin/permission-rules/', payload);
  },

  updatePermissionRule(id: number, payload: Partial<Omit<AdminPermissionRule, 'id' | 'admin' | 'created_at' | 'updated_at'>>) {
    return apiClient.patch<AdminPermissionRule>(`admin/permission-rules/${id}/`, payload);
  },

  deletePermissionRule(id: number) {
    return apiClient.delete<void>(`admin/permission-rules/${id}/`);
  },

  resetUserPassword(userId: number, payload?: { new_password?: string }) {
    return apiClient.post<{ detail: string; temporary_password?: string }>(
      `users/${userId}/reset_password/`,
      payload ?? {},
    );
  },
};
