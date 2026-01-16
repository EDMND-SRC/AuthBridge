import { Group, Button, Text, Paper } from '@mantine/core';
import { IconCheck, IconX, IconTrash } from '@tabler/icons-react';

interface BulkActionBarProps {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
  isLoading?: boolean;
}

export const BulkActionBar = ({
  selectedCount,
  onApprove,
  onReject,
  onClear,
  isLoading = false
}: BulkActionBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <Paper
      p="md"
      withBorder
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--mantine-color-body)'
      }}
      data-testid="bulk-action-bar"
    >
      <Group justify="space-between">
        <Group gap="sm">
          <Text fw={500} aria-live="polite" role="status">
            {selectedCount} case{selectedCount > 1 ? 's' : ''} selected
          </Text>
          <Button
            variant="subtle"
            size="sm"
            onClick={onClear}
            leftSection={<IconTrash size={16} />}
            data-testid="clear-selection-button"
          >
            Clear Selection
          </Button>
        </Group>
        <Group gap="sm">
          <Button
            color="green"
            onClick={onApprove}
            loading={isLoading}
            leftSection={<IconCheck size={16} />}
            data-testid="bulk-approve-button"
          >
            Approve Selected
          </Button>
          <Button
            color="red"
            onClick={onReject}
            loading={isLoading}
            leftSection={<IconX size={16} />}
            data-testid="bulk-reject-button"
          >
            Reject Selected
          </Button>
        </Group>
      </Group>
    </Paper>
  );
};
