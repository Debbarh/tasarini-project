import { useQuery } from '@tanstack/react-query';
import { adminService, AdminDashboardStats } from '@/services/adminService';

export type { AdminDashboardStats };

export const useAdminDashboard = (timeRangeDays: number = 30) => {
  return useQuery({
    queryKey: ['admin-dashboard', timeRangeDays],
    queryFn: () => adminService.getDashboardStats(timeRangeDays),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (React Query v5)
    refetchOnWindowFocus: false,
  });
};
