import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useBulkReject } from './useBulkReject';
import { api } from '@/lib/api';
import type { ReactNode } from 'react';

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn()
  }
}));

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn()
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useBulkReject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call API with correct payload including reason', async () => {
    const mockResponse = {
      data: {
        data: {
          results: [
            { caseId: 'case-1', success: true },
            { caseId: 'case-2', success: true }
          ],
          summary: { total: 2, succeeded: 2, failed: 0 }
        },
        meta: { requestId: 'req-123', timestamp: '2026-01-16T00:00:00Z', bulkOperationId: 'bulk-123' }
      }
    };
    vi.mocked(api.post).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useBulkReject(), { wrapper: createWrapper() });

    result.current.mutate({
      caseIds: ['case-1', 'case-2'],
      reason: 'Blurry Image',
      notes: 'Document not readable'
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.post).toHaveBeenCalledWith('/api/v1/cases/bulk-reject', {
      caseIds: ['case-1', 'case-2'],
      reason: 'Blurry Image',
      notes: 'Document not readable'
    });
  });

  it('should show success notification when all cases rejected', async () => {
    const mockResponse = {
      data: {
        data: {
          results: [
            { caseId: 'case-1', success: true },
            { caseId: 'case-2', success: true },
            { caseId: 'case-3', success: true }
          ],
          summary: { total: 3, succeeded: 3, failed: 0 }
        },
        meta: { requestId: 'req-123', timestamp: '2026-01-16T00:00:00Z', bulkOperationId: 'bulk-123' }
      }
    };
    vi.mocked(api.post).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useBulkReject(), { wrapper: createWrapper() });

    result.current.mutate({ caseIds: ['case-1', 'case-2', 'case-3'], reason: 'Blurry Image' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(notifications.show).toHaveBeenCalledWith({
      title: 'Success',
      message: '3 cases rejected successfully',
      color: 'green'
    });
  });

  it('should show singular "case" when only one case rejected', async () => {
    const mockResponse = {
      data: {
        data: {
          results: [{ caseId: 'case-1', success: true }],
          summary: { total: 1, succeeded: 1, failed: 0 }
        },
        meta: { requestId: 'req-123', timestamp: '2026-01-16T00:00:00Z', bulkOperationId: 'bulk-123' }
      }
    };
    vi.mocked(api.post).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useBulkReject(), { wrapper: createWrapper() });

    result.current.mutate({ caseIds: ['case-1'], reason: 'Blurry Image' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(notifications.show).toHaveBeenCalledWith({
      title: 'Success',
      message: '1 case rejected successfully',
      color: 'green'
    });
  });

  it('should show partial success notification when some cases fail', async () => {
    const mockResponse = {
      data: {
        data: {
          results: [
            { caseId: 'case-1', success: true },
            { caseId: 'case-2', success: false, error: 'Case not in valid status' },
            { caseId: 'case-3', success: true }
          ],
          summary: { total: 3, succeeded: 2, failed: 1 }
        },
        meta: { requestId: 'req-123', timestamp: '2026-01-16T00:00:00Z', bulkOperationId: 'bulk-123' }
      }
    };
    vi.mocked(api.post).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useBulkReject(), { wrapper: createWrapper() });

    result.current.mutate({ caseIds: ['case-1', 'case-2', 'case-3'], reason: 'Blurry Image' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(notifications.show).toHaveBeenCalledWith({
      title: 'Partial Success',
      message: '2 cases rejected, 1 failed',
      color: 'yellow'
    });
  });

  it('should show error notification when all cases fail', async () => {
    const mockResponse = {
      data: {
        data: {
          results: [
            { caseId: 'case-1', success: false, error: 'Case not in valid status' },
            { caseId: 'case-2', success: false, error: 'Case not in valid status' }
          ],
          summary: { total: 2, succeeded: 0, failed: 2 }
        },
        meta: { requestId: 'req-123', timestamp: '2026-01-16T00:00:00Z', bulkOperationId: 'bulk-123' }
      }
    };
    vi.mocked(api.post).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useBulkReject(), { wrapper: createWrapper() });

    result.current.mutate({ caseIds: ['case-1', 'case-2'], reason: 'Blurry Image' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(notifications.show).toHaveBeenCalledWith({
      title: 'Error',
      message: 'All cases failed to reject',
      color: 'red'
    });
  });

  it('should show error notification on API error', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useBulkReject(), { wrapper: createWrapper() });

    result.current.mutate({ caseIds: ['case-1'], reason: 'Blurry Image' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(notifications.show).toHaveBeenCalledWith({
      title: 'Error',
      message: 'Failed to reject cases. Please try again.',
      color: 'red'
    });
  });

  it('should handle request without notes', async () => {
    const mockResponse = {
      data: {
        data: {
          results: [{ caseId: 'case-1', success: true }],
          summary: { total: 1, succeeded: 1, failed: 0 }
        },
        meta: { requestId: 'req-123', timestamp: '2026-01-16T00:00:00Z', bulkOperationId: 'bulk-123' }
      }
    };
    vi.mocked(api.post).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useBulkReject(), { wrapper: createWrapper() });

    result.current.mutate({ caseIds: ['case-1'], reason: 'Blurry Image' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.post).toHaveBeenCalledWith('/api/v1/cases/bulk-reject', {
      caseIds: ['case-1'],
      reason: 'Blurry Image'
    });
  });
});
