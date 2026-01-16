import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/authbridge/providers/AuthProvider';
import type { AddNoteRequest, AddNoteResponse } from '../types/note';

export const useAddNote = (caseId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (request: AddNoteRequest) => {
      const response = await api.post<AddNoteResponse>(
        `/api/v1/cases/${caseId}/notes`,
        request
      );
      return response.data;
    },
    onMutate: async (request) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['case-notes', caseId] });

      // Snapshot previous value
      const previousNotes = queryClient.getQueryData(['case-notes', caseId]);

      // Optimistically add note with actual user data
      queryClient.setQueryData(['case-notes', caseId], (old: any) => ({
        ...old,
        data: [
          {
            noteId: 'temp-' + Date.now(),
            caseId,
            content: request.content,
            author: {
              userId: user?.id || 'current-user',
              userName: user?.name || 'You',
              role: user?.role || 'analyst'
            },
            timestamp: new Date().toISOString()
          },
          ...(old?.data || [])
        ]
      }));

      return { previousNotes };
    },
    onError: (error, _request, context) => {
      // Log error for debugging
      console.error('Failed to add note:', error);

      // Rollback on error
      queryClient.setQueryData(['case-notes', caseId], context?.previousNotes);

      notifications.show({
        title: 'Error',
        message: 'Failed to add note. Please try again.',
        color: 'red'
      });
    },
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['case-notes', caseId] });
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });

      notifications.show({
        title: 'Success',
        message: 'Note added successfully',
        color: 'green'
      });
    }
  });
};
