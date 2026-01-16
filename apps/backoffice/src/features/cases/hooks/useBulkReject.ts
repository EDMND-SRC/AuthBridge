import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import type { BulkRejectRequest, BulkOperationResponse } from '../types/bulk-action';

/**
 * TanStack Query mutation hook for bulk rejecting multiple cases with a reason.
 *
 * @returns Mutation object with mutate/mutateAsync functions and status flags.
 *
 * @example
 * ```tsx
 * const bulkReject = useBulkReject();
 *
 * const handleReject = async () => {
 *   await bulkReject.mutateAsync({
 *     caseIds: ['case-1', 'case-2'],
 *     reason: 'Blurry Image',
 *     notes: 'Document not readable'
 *   });
 * };
 * ```
 *
 * Features:
 * - Automatically invalidates case list cache on success
 * - Shows toast notifications for success, partial success, and error states
 * - Handles partial success scenarios (some cases succeed, some fail)
 * - Requires a rejection reason (applied to all selected cases)
 */
export const useBulkReject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BulkRejectRequest) => {
      const response = await api.post<BulkOperationResponse>(
        '/api/v1/cases/bulk-reject',
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
          message: `${succeeded} case${succeeded > 1 ? 's' : ''} rejected successfully`,
          color: 'green'
        });
      } else if (succeeded > 0 && failed > 0) {
        notifications.show({
          title: 'Partial Success',
          message: `${succeeded} case${succeeded > 1 ? 's' : ''} rejected, ${failed} failed`,
          color: 'yellow'
        });
      } else {
        notifications.show({
          title: 'Error',
          message: 'All cases failed to reject',
          color: 'red'
        });
      }
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to reject cases. Please try again.',
        color: 'red'
      });
    }
  });
};
