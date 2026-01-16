import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import type { BulkApproveRequest, BulkOperationResponse } from '../types/bulk-action';

/**
 * TanStack Query mutation hook for bulk approving multiple cases.
 *
 * @returns Mutation object with mutate/mutateAsync functions and status flags.
 *
 * @example
 * ```tsx
 * const bulkApprove = useBulkApprove();
 *
 * const handleApprove = async () => {
 *   await bulkApprove.mutateAsync({ caseIds: ['case-1', 'case-2'] });
 * };
 * ```
 *
 * Features:
 * - Automatically invalidates case list cache on success
 * - Shows toast notifications for success, partial success, and error states
 * - Handles partial success scenarios (some cases succeed, some fail)
 */
export const useBulkApprove = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BulkApproveRequest) => {
      const response = await api.post<BulkOperationResponse>(
        '/api/v1/cases/bulk-approve',
        request
      );
      return response.data;
    },
    onSuccess: (data) => {
      const { succeeded, failed } = data.data.summary;

      // Invalidate case list to refetch
      queryClient.invalidateQueries({ queryKey: ['cases'] });

      // Show success notification
      if (succeeded > 0 && failed === 0) {
        notifications.show({
          title: 'Success',
          message: `${succeeded} case${succeeded > 1 ? 's' : ''} approved successfully`,
          color: 'green'
        });
      } else if (succeeded > 0 && failed > 0) {
        notifications.show({
          title: 'Partial Success',
          message: `${succeeded} case${succeeded > 1 ? 's' : ''} approved, ${failed} failed`,
          color: 'yellow'
        });
      } else {
        notifications.show({
          title: 'Error',
          message: 'All cases failed to approve',
          color: 'red'
        });
      }
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to approve cases. Please try again.',
        color: 'red'
      });
    }
  });
};
