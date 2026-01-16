import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import type { CaseDecisionResponse } from '../types/decision';

export const useApproveCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseId: string): Promise<CaseDecisionResponse> => {
      const response = await api.post(`/api/v1/cases/${caseId}/approve`);
      return response.data;
    },
    onMutate: async (caseId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['case', caseId] });

      // Snapshot previous value
      const previousCase = queryClient.getQueryData(['case', caseId]);

      // Optimistically update
      queryClient.setQueryData(['case', caseId], (old: any) => ({
        ...old,
        status: 'approved',
        updatedAt: new Date().toISOString()
      }));

      return { previousCase };
    },
    onError: (error, caseId, context) => {
      // Rollback on error
      queryClient.setQueryData(['case', caseId], context?.previousCase);

      notifications.show({
        title: 'Error',
        message: 'Failed to approve case. Please try again.',
        color: 'red'
      });
    },
    onSuccess: (data, caseId) => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });

      notifications.show({
        title: 'Success',
        message: 'Case approved successfully',
        color: 'green'
      });
    }
  });
};
