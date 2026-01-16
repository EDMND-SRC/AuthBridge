import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GetNotesResponse } from '../types/note';

export const useCaseNotes = (caseId: string | undefined) => {
  return useQuery({
    queryKey: ['case-notes', caseId],
    queryFn: async () => {
      if (!caseId) throw new Error('Case ID required');
      const response = await api.get<GetNotesResponse>(`/api/v1/cases/${caseId}/notes`);
      return response.data;
    },
    enabled: !!caseId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1
  });
};
