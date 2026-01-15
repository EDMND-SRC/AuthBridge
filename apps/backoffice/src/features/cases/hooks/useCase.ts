import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CaseDetail } from '../types/case';

export const useCase = (caseId: string | undefined) => {
  return useQuery({
    queryKey: ['case', caseId],
    queryFn: async () => {
      if (!caseId) throw new Error('Case ID required');
      const response = await api.get<{ data: CaseDetail }>(`/api/v1/cases/${caseId}`);
      return response.data.data;
    },
    enabled: !!caseId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });
};
