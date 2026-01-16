import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import type { RejectCaseParams, CaseDecisionResponse } from '../types/decision';

interface MutationContext {
  previousCase: unknown;
}

export const useRejectCase = () => {
  const queryClient = useQueryClient();

  return useMutation<CaseDecisionResponse, Error, RejectCaseParams, MutationContext>({
    mutationFn: async ({ caseId, reason, notes }: RejectCaseParams): Promise<CaseDecisionResponse> => {
      const response = await api.post<CaseDecisionResponse>(`/api/v1/cases/${caseId}/reject`, {
        reason,
        notes
      });
      return response.data as CaseDecisionResponse;
    },
    onMutate: async ({ caseId }): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: ['case', caseId] });
      const previousCase = queryClient.getQueryData(['case', caseId]);

      queryClient.setQueryData(['case', caseId], (old: any) => ({
        ...old,
        status: 'rejected',
        updatedAt: new Date().toISOString()
      }));

      return { previousCase };
    },
    onError: (_error, { caseId }, context) => {
      if (context?.previousCase) {
        queryClient.setQueryData(['case', caseId], context.previousCase);
      }

      notifications.show({
        title: 'Error',
        message: 'Failed to reject case. Please try again.',
        color: 'red'
      });
    },
    onSuccess: (_data, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });

      notifications.show({
        title: 'Success',
        message: 'Case rejected successfully',
        color: 'green'
      });
    }
  });
};
