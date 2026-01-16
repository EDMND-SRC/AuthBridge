import { Modal, Select, Textarea, Button, Group, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useRejectCase } from '../hooks/useRejectCase';
import { REJECT_REASONS, type RejectReasonValue } from '../types/decision';

interface RejectReasonModalProps {
  opened: boolean;
  onClose: () => void;
  caseId?: string;
  bulkMode?: boolean;
  caseCount?: number;
  onBulkConfirm?: (reason: string, notes?: string) => void;
  isLoading?: boolean;
}

interface RejectFormValues {
  reason: RejectReasonValue | '';
  notes: string;
}

export const RejectReasonModal = ({
  opened,
  onClose,
  caseId,
  bulkMode = false,
  caseCount = 0,
  onBulkConfirm,
  isLoading = false
}: RejectReasonModalProps) => {
  const rejectCase = useRejectCase();

  const form = useForm<RejectFormValues>({
    initialValues: {
      reason: '',
      notes: ''
    },
    validate: {
      reason: (value) => (value ? null : 'Reason is required'),
      notes: (value) => (value.length > 500 ? 'Notes must be 500 characters or less' : null)
    }
  });

  const handleSubmit = (values: RejectFormValues) => {
    if (!values.reason) return;

    if (bulkMode && onBulkConfirm) {
      // Bulk mode: call the bulk confirm handler
      onBulkConfirm(values.reason, values.notes || undefined);
      form.reset();
    } else if (caseId) {
      // Single mode: use the existing mutation
      rejectCase.mutate(
        {
          caseId,
          reason: values.reason,
          notes: values.notes || undefined
        },
        {
          onSuccess: () => {
            form.reset();
            onClose();
          }
        }
      );
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const modalTitle = bulkMode ? `Reject ${caseCount} Cases` : 'Reject Case';
  const submitButtonText = bulkMode ? `Reject ${caseCount} Cases` : 'Reject Case';
  const isPending = bulkMode ? isLoading : rejectCase.isPending;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={modalTitle}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {bulkMode && (
            <Text size="sm" c="dimmed">
              This reason will be applied to all {caseCount} selected cases.
            </Text>
          )}

          <Select
            label="Reason for Rejection"
            placeholder="Select a reason"
            data={REJECT_REASONS.map(r => ({ value: r.value, label: r.label }))}
            required
            data-testid="reject-reason-select"
            {...form.getInputProps('reason')}
          />

          <Textarea
            label="Additional Notes (Optional)"
            placeholder="Provide additional details..."
            minRows={3}
            maxRows={6}
            maxLength={500}
            data-testid="reject-notes-textarea"
            {...form.getInputProps('notes')}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="red"
              loading={isPending}
              data-testid="confirm-reject-button"
            >
              {submitButtonText}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
