import { Stack, Text, Group, Progress, Badge, ThemeIcon, Paper } from '@mantine/core';
import { IconCheck, IconX, IconAlertTriangle } from '@tabler/icons-react';

interface VerificationChecksProps {
  checks: {
    faceMatch: { score: number; status: 'pass' | 'fail' | 'review' };
    liveness: { status: 'pass' | 'fail'; confidence: number };
    documentAuthenticity: { score: number; status: 'pass' | 'fail' };
    omangFormat: { valid: boolean; errors?: string[] };
    duplicateCheck: { found: boolean; caseIds?: string[]; riskLevel?: string };
    expiryCheck: { valid: boolean; daysUntilExpiry?: number };
  };
}

export const VerificationChecks = ({ checks }: VerificationChecksProps) => {
  return (
    <Stack gap="md">
      <Text fw={600} size="lg">
        Verification Checks
      </Text>

      <CheckItem
        label="Face Match"
        status={checks.faceMatch.status}
        value={`${checks.faceMatch.score}%`}
        progress={checks.faceMatch.score}
      />

      <CheckItem
        label="Liveness Detection"
        status={checks.liveness.status}
        value={checks.liveness.status === 'pass' ? 'Pass' : 'Fail'}
      />

      <CheckItem
        label="Document Authenticity"
        status={checks.documentAuthenticity.status}
        value={`${checks.documentAuthenticity.score}%`}
        progress={checks.documentAuthenticity.score}
      />

      <CheckItem
        label="Omang Format Valid"
        status={checks.omangFormat.valid ? 'pass' : 'fail'}
        value={checks.omangFormat.valid ? 'Valid' : 'Invalid'}
        details={checks.omangFormat.errors?.join(', ')}
      />

      <CheckItem
        label="Duplicate Check"
        status={checks.duplicateCheck.found ? 'review' : 'pass'}
        value={
          checks.duplicateCheck.found
            ? `Found (${checks.duplicateCheck.riskLevel})`
            : 'Clear'
        }
        details={checks.duplicateCheck.caseIds?.join(', ')}
      />

      <CheckItem
        label="Expiry Check"
        status={checks.expiryCheck.valid ? 'pass' : 'review'}
        value={
          checks.expiryCheck.valid
            ? 'Valid'
            : `Expires in ${checks.expiryCheck.daysUntilExpiry} days`
        }
      />
    </Stack>
  );
};

const CheckItem = ({
  label,
  status,
  value,
  progress,
  details,
}: {
  label: string;
  status: 'pass' | 'fail' | 'review';
  value: string;
  progress?: number;
  details?: string;
}) => {
  const statusConfig = {
    pass: { color: 'green', icon: IconCheck },
    fail: { color: 'red', icon: IconX },
    review: { color: 'yellow', icon: IconAlertTriangle },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Paper p="sm" withBorder>
      <Group justify="space-between" mb={progress ? 'xs' : 0}>
        <Group gap="sm">
          <ThemeIcon color={config.color} size="sm" variant="light">
            <Icon size={14} />
          </ThemeIcon>
          <Text size="sm">{label}</Text>
        </Group>
        <Badge color={config.color} variant="light">
          {value}
        </Badge>
      </Group>
      {progress !== undefined && <Progress value={progress} color={config.color} size="sm" />}
      {details && (
        <Text size="xs" c="dimmed" mt="xs">
          {details}
        </Text>
      )}
    </Paper>
  );
};
