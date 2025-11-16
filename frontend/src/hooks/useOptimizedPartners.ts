import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import { partnerService, PartnerProfile } from '@/services/partnerService';

export interface OptimizedPartner {
  id: string;
  profile_id: number;
  owner_id: number;
  owner_public_id?: string;
  user_id: string;
  company_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  description: string | null;
  logo_url: string | null;
  status: string;
  subscription_type: string;
  created_at: string;
  updated_at: string;
  is_incomplete: boolean;
  metadata: Record<string, any>;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  poi_count: number;
  poi_approved: number;
  poi_pending: number;
}

export interface PartnerFilters {
  search: string;
  statusFilter: string;
  subscriptionFilter: string;
}

const normalizePartner = (profile: PartnerProfile): OptimizedPartner => {
  const metadata = profile.metadata || {};
  const ownerProfile = profile.owner_detail?.profile;

  const managedPois = profile.managed_pois || [];
  const poiApproved = managedPois.filter((poi) => poi.status_enum === 'approved').length;
  const poiPending = managedPois.filter((poi) => poi.status_enum !== 'approved').length;

  return {
    id: String(profile.id),
    profile_id: Number(profile.id),
    owner_id: profile.owner,
    owner_public_id: profile.owner_detail?.public_id,
    user_id: profile.owner_detail?.public_id ?? String(profile.owner),
    company_name: profile.company_name || '',
    contact_email: metadata.contact_email ?? ownerProfile?.email ?? profile.owner_detail?.email ?? null,
    contact_phone: metadata.contact_phone ?? ownerProfile?.phone_number ?? null,
    website_url: profile.website || metadata.website_url || null,
    description: metadata.description ?? null,
    logo_url: metadata.logo_url ?? null,
    status: profile.status,
    subscription_type: metadata.subscription_type ?? 'basic',
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    is_incomplete: Boolean(metadata.is_incomplete) || !profile.company_name,
    metadata,
    profile: {
      first_name: ownerProfile?.first_name ?? null,
      last_name: ownerProfile?.last_name ?? null,
      email: ownerProfile?.email ?? profile.owner_detail?.email ?? null,
    },
    poi_count: managedPois.length,
    poi_approved: poiApproved,
    poi_pending: poiPending,
  };
};

export const useOptimizedPartners = () => {
  const [filters, setFilters] = useState<PartnerFilters>({
    search: '',
    statusFilter: 'all',
    subscriptionFilter: 'all',
  });

  const debouncedSearch = useDebounce(filters.search, 300);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['partners', debouncedSearch, filters.statusFilter, filters.subscriptionFilter],
    queryFn: async (): Promise<OptimizedPartner[]> => {
      const statusFilterParam =
        filters.statusFilter !== 'all' && filters.statusFilter !== 'incomplete'
          ? filters.statusFilter
          : undefined;
      const subscriptionFilterParam =
        filters.subscriptionFilter !== 'all' ? filters.subscriptionFilter : undefined;

      const response = await partnerService.listProfiles({
        search: debouncedSearch || undefined,
        status: statusFilterParam,
        subscription_type: subscriptionFilterParam,
      });

      return response.map(normalizePartner);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const filteredPartners = useMemo(() => {
    if (!data) {
      return [];
    }

    const searchText = debouncedSearch.trim().toLowerCase();

    return data.filter((partner) => {
      const matchesSearch =
        searchText.length === 0 ||
        partner.company_name.toLowerCase().includes(searchText) ||
        (partner.contact_email || '').toLowerCase().includes(searchText) ||
        `${partner.profile.first_name ?? ''} ${partner.profile.last_name ?? ''}`
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        filters.statusFilter === 'all'
          ? true
          : filters.statusFilter === 'incomplete'
            ? partner.is_incomplete
            : partner.status === filters.statusFilter;

      const matchesSubscription =
        filters.subscriptionFilter === 'all'
          ? true
          : partner.subscription_type === filters.subscriptionFilter;

      return matchesSearch && matchesStatus && matchesSubscription;
    });
  }, [data, debouncedSearch, filters.statusFilter, filters.subscriptionFilter]);

  const updateFilters = (newFilters: Partial<PartnerFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['partners'] });
  };

  return {
    partners: filteredPartners,
    isLoading,
    error,
    filters,
    updateFilters,
    refetch,
    invalidateCache,
    totalPartners: data?.length ?? 0,
  };
};
