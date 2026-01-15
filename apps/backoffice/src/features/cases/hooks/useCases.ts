import { useQuery } from '@tanstack/react-query';
import { api } from 'lib/api';
import type { CaseFilters, CaseListResponse } from '../types';

export function useCases(filters: CaseFilters, cursor?: string) {
  return useQuery({
    queryKey: ['cases', filters, cursor],
    queryFn: async (): Promise<CaseListResponse> => {
      const params: Record<string, string | number | boolean | undefined> = {
        ...filters,
        limit: 20,
        cursor,
      };

      const response = await api.get<CaseListResponse['data']>('/api/v1/cases', params);
      return response as unknown as CaseListResponse;
    },
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (previousData) => previousData, // TanStack Query v5: replaces keepPreviousData
  });
}
