import { useState, useCallback, useRef } from 'react';
import { Box, Title, Group, Pagination, Text, Stack, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { CaseListTable, SearchInput, FilterBar } from '../components';
import { useCases, useCaseFilters } from '../hooks';

export function CaseListPage() {
  const [page, setPage] = useState(1);
  // Track cursors for each page to enable backward navigation
  const cursorHistory = useRef<Map<number, string | undefined>>(new Map([[1, undefined]]));
  const { filters, updateFilter, updateFilters, resetFilters, hasActiveFilters } = useCaseFilters();

  const currentCursor = cursorHistory.current.get(page);
  const { data, isLoading, isError, error } = useCases(filters, currentCursor);

  const handleSearch = useCallback((value: string) => {
    updateFilter('search', value || undefined);
    cursorHistory.current = new Map([[1, undefined]]);
    setPage(1);
  }, [updateFilter]);

  const handleFilterChange = useCallback((newFilters: Parameters<typeof updateFilters>[0]) => {
    updateFilters(newFilters);
    cursorHistory.current = new Map([[1, undefined]]);
    setPage(1);
  }, [updateFilters]);

  const handleReset = useCallback(() => {
    resetFilters();
    cursorHistory.current = new Map([[1, undefined]]);
    setPage(1);
  }, [resetFilters]);

  const handlePageChange = useCallback((newPage: number) => {
    // Store cursor for next page when moving forward
    if (newPage > page && data?.meta.pagination.cursor) {
      cursorHistory.current.set(newPage, data.meta.pagination.cursor);
    }
    setPage(newPage);
  }, [data, page]);

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

        <CaseListTable
          cases={cases}
          isLoading={isLoading}
          hasFilters={hasActiveFilters || !!filters.search}
          searchTerm={filters.search}
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
      </Stack>
    </Box>
  );
}
