import { Group, Select, Button } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconFilterOff } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CaseFilters, CaseStatus, DocumentType } from '../types';

interface FilterBarProps {
  filters: CaseFilters;
  onChange: (filters: Partial<CaseFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

interface User {
  userId: string;
  email: string;
  name: string;
  role: string;
}

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in-review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const documentTypeOptions = [
  { value: 'omang', label: 'Omang' },
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_licence', label: "Driver's Licence" },
];

// Fallback assignees when API is unavailable
const fallbackAssigneeOptions = [
  { value: 'analyst1@authbridge.bw', label: 'Analyst 1' },
  { value: 'analyst2@authbridge.bw', label: 'Analyst 2' },
  { value: 'reviewer@authbridge.bw', label: 'Reviewer' },
];

/**
 * Hook to fetch assignees (analysts and reviewers) from API
 */
function useAssignees() {
  return useQuery({
    queryKey: ['users', 'assignees'],
    queryFn: async () => {
      const response = await api.get<User[]>('/api/v1/users', { role: 'analyst,reviewer' });
      return response.data.map(user => ({
        value: user.email,
        label: user.name || user.email,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function FilterBar({ filters, onChange, onReset, hasActiveFilters }: FilterBarProps) {
  const { data: assigneeOptions, isLoading: assigneesLoading } = useAssignees();

  const handleStatusChange = (value: string | null) => {
    onChange({ status: (value as CaseStatus) || undefined });
  };

  const handleDocumentTypeChange = (value: string | null) => {
    onChange({ documentType: (value as DocumentType) || undefined });
  };

  const handleAssigneeChange = (value: string | null) => {
    onChange({ assignee: value || undefined });
  };

  const handleDateRangeChange = (dates: [Date | null, Date | null]) => {
    const [from, to] = dates;
    onChange({
      dateFrom: from?.toISOString(),
      dateTo: to?.toISOString(),
    });
  };

  const dateRange: [Date | null, Date | null] = [
    filters.dateFrom ? new Date(filters.dateFrom) : null,
    filters.dateTo ? new Date(filters.dateTo) : null,
  ];

  // Use fetched assignees or fallback if API unavailable
  const assigneeData = assigneeOptions || fallbackAssigneeOptions;

  return (
    <Group gap="md" wrap="wrap">
      <Select
        placeholder="All statuses"
        data={statusOptions}
        value={filters.status || null}
        onChange={handleStatusChange}
        clearable
        w={150}
        aria-label="Filter by status"
      />

      <DatePickerInput
        type="range"
        placeholder="Select date range"
        value={dateRange}
        onChange={handleDateRangeChange}
        clearable
        w={250}
        aria-label="Filter by date range"
      />

      <Select
        placeholder="All document types"
        data={documentTypeOptions}
        value={filters.documentType || null}
        onChange={handleDocumentTypeChange}
        clearable
        w={180}
        aria-label="Filter by document type"
      />

      <Select
        placeholder={assigneesLoading ? 'Loading...' : 'All assignees'}
        data={assigneeData}
        value={filters.assignee || null}
        onChange={handleAssigneeChange}
        clearable
        w={180}
        aria-label="Filter by assignee"
        disabled={assigneesLoading}
      />

      {hasActiveFilters && (
        <Button
          variant="light"
          leftSection={<IconFilterOff size={16} />}
          onClick={onReset}
          color="gray"
        >
          Clear Filters
        </Button>
      )}
    </Group>
  );
}
