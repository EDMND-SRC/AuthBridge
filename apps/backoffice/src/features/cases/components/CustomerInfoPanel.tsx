import { Stack, Text, Group, Divider, CopyButton, ActionIcon, Tooltip } from '@mantine/core';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import { formatDate, formatDateTime } from '../utils/date-formatters';

interface CustomerInfoPanelProps {
  customer: {
    name: string;
    omangNumber: string;
    dateOfBirth: string;
    gender: string;
    address: string;
  };
  metadata: {
    clientId: string;
    clientName: string;
    reference?: string;
    submittedAt: string;
    assignee?: string;
  };
}

export const CustomerInfoPanel = ({ customer, metadata }: CustomerInfoPanelProps) => {
  return (
    <Stack gap="md">
      <Text fw={600} size="lg">
        Customer Information
      </Text>

      <InfoRow label="Full Name" value={customer.name} />
      <InfoRow label="Omang Number" value={customer.omangNumber} copyable />
      <InfoRow label="Date of Birth" value={formatDate(customer.dateOfBirth)} />
      <InfoRow label="Gender" value={customer.gender} />
      <InfoRow label="Address" value={customer.address} />

      <Divider my="sm" />

      <Text fw={500} size="sm" c="dimmed">
        Submission Details
      </Text>
      <InfoRow label="Submitted" value={formatDateTime(metadata.submittedAt)} />
      <InfoRow label="Client" value={metadata.clientName} />
      {metadata.reference && <InfoRow label="Reference" value={metadata.reference} />}
      {metadata.assignee && <InfoRow label="Assigned To" value={metadata.assignee} />}
    </Stack>
  );
};

const InfoRow = ({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) => (
  <Group justify="space-between">
    <Text size="sm" c="dimmed">
      {label}
    </Text>
    <Group gap="xs">
      <Text size="sm" fw={500}>
        {value}
      </Text>
      {copyable && (
        <CopyButton value={value}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Copied' : 'Copy'}>
              <ActionIcon size="xs" variant="subtle" onClick={copy}>
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      )}
    </Group>
  </Group>
);
