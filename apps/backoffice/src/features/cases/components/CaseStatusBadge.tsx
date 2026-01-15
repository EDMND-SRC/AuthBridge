import { Badge } from '@mantine/core';
import type { CaseStatus } from '../types';

interface CaseStatusBadgeProps {
  status: CaseStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const statusConfig: Record<CaseStatus, { color: string; label: string }> = {
  pending: { color: 'yellow', label: 'Pending' },
  'in-review': { color: 'blue', label: 'In Review' },
  approved: { color: 'green', label: 'Approved' },
  rejected: { color: 'red', label: 'Rejected' },
};

export function CaseStatusBadge({ status, size = 'sm' }: CaseStatusBadgeProps) {
  const config = statusConfig[status] || { color: 'gray', label: status };

  return (
    <Badge color={config.color} variant="light" size={size}>
      {config.label}
    </Badge>
  );
}
