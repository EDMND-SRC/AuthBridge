import { useState, useCallback, useRef } from 'react';
import { Box, Title, Group, Pagination, Text, Stack, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { CaseListTable, SearchInput, FilterBar, BulkActionBar, RejectReasonModal } from '../components';
import { useCases, useCaseFilters, useCaseSelection, useBulkApprove, useBulkReject } from '../hooks';

export function CaseListPage() {
  const [page, setPage] = useState(1);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  // Track cursors for each page to enable backward navigation
  const cursorHistory = useRef<Map<number, string | undefined>>(new Map([[1, undefined]]));
  const { filters, updateFilter, updateFilters, resetFilters, hasActiveFilters } = useCaseFilters();

  // Bulk selection state
  const {
    selectedCaseIds,
    selectedCount,
    toggleCase,
    selectAll,
    clearSelection,
    isSelected
  } = useCaseSelection();

  // Bulk action mutations
  const bulkApprove = useBulkApprove();
  const bulkReject = useBulkReject();

  const currentCursor = cursorHistory.current.get(page);
  const { data, isLoading, isError, error } = useCases(filters, currentCursor);

  const handleSearch = useCallback((value: string) => {
    updateFilter('search', value || undefined);
    cursorHistory.current = new Map([[1, undefined]]);
    setPage(1);
    clearSelection(); // Clear selection when filters change
  }, [updateFilter, clearSelection]);

  const handleFilterChange = useCallback((newFilters: Parameters<typeof updateFilters>[0]) => {
    updateFilters(newFilters);
    cursorHistory.current = new Map([[1, undefined]]);
    setPage(1);
    clearSelection(); // Clear selection when filters change
  }, [updateFilters, clearSelection]);

  const handleReset = useCallback(() => {
    resetFilters();
    cursorHistory.current = new Map([[1, undefined]]);
    setPage(1);
    clearSelection(); // Clear selection when filters change
  }, [resetFilters, clearSelection]);

  const handlePageChange = useCallback((newPage: number) => {
    // Store cursor for next page when moving forward
    if (newPage > page && data?.meta.pagination.cursor) {
      cursorHistory.current.set(newPage, data.meta.pagination.cursor);
    }
    setPage(newPage);
    clearSelection(); // Clear selection when page changes
  }, [data, page, clearSelection]);

  const handleBulkApprove = async () => {
    if (selectedCount > 50) {
      notifications.show({
        title: 'Error',
        message: 'Maximum 50 cases per bulk operation',
        color: 'red'
      });
      return;
    }

    await bulkApprove.mutateAsync({ caseIds: selectedCaseIds });
    clearSelection();
  };

  const handleBulkReject = () => {
    if (selectedCount > 50) {
      notifications.show({
        title: 'Error',
        message: 'Maximum 50 cases per bulk operation',
        color: 'red'
      });
      return;
    }

    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async (reason: string, notes?: string) => {
    await bulkReject.mutateAsync({
      caseIds: selectedCaseIds,
      reason,
      notes
    });
    clearSelection();
    setRejectModalOpen(false);
  };

  const cases = data?.data || [];
  const totalPages = data?.meta.pagination.total
    ? Math.ceil(data.meta.pagination.total / 20)
    : 1;

  return (
    <Box p="md">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Title order={2}>Cases</Title>
          <Text size="sm" c="dimmed">
            {data?.meta.pagination.total ?? 0} total cases
          </Text>
        </Group>

        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <SearchInput onSearch={handleSearch} initialValue={filters.search} />
          <FilterBar
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
            hasActiveFilters={hasActiveFilters}
          />
        </Group>

        {isError && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error loading cases" color="red">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </Alert>
        )}

        <BulkActionBar
          selectedCount={selectedCount}
          onApprove={handleBulkApprove}
          onReject={handleBulkReject}
          onClear={clearSelection}
          isLoading={bulkApprove.isPending || bulkReject.isPending}
        />

        <CaseListTable
          cases={cases}
          isLoading={isLoading}
          hasFilters={hasActiveFilters || !!filters.search}
          searchTerm={filters.search}
          selectedCaseIds={selectedCaseIds}
          onToggleCase={toggleCase}
          onSelectAll={() => selectAll(cases.map(c => c.caseId))}
          onClearSelection={clearSelection}
        />

        {totalPages > 1 && (
          <Group justify="flex-end">
            <Pagination
              total={totalPages}
              value={page}
              onChange={handlePageChange}
              withEdges
            />
          </Group>
        )}

        <RejectReasonModal
          opened={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          bulkMode={true}
          caseCount={selectedCount}
          onBulkConfirm={handleRejectConfirm}
          isLoading={bulkReject.isPending}
        />
      </Stack>
    </Box>
  );
}
