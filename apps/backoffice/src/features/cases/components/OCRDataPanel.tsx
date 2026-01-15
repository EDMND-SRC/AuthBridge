import { Stack, Text, Group, Badge, Paper, Button } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';

interface OCRDataPanelProps {
  extractedData: {
    fullName: string;
    idNumber: string;
    dateOfBirth: string;
    placeOfBirth?: string;
    issueDate?: string;
    expiryDate?: string;
    confidence: Record<string, number>;
  };
}

export const OCRDataPanel = ({ extractedData }: OCRDataPanelProps) => {
  const fields = [
    { label: 'Full Name', value: extractedData.fullName, key: 'fullName' },
    { label: 'ID Number', value: extractedData.idNumber, key: 'idNumber' },
    { label: 'Date of Birth', value: extractedData.dateOfBirth, key: 'dateOfBirth' },
    { label: 'Place of Birth', value: extractedData.placeOfBirth, key: 'placeOfBirth' },
    { label: 'Issue Date', value: extractedData.issueDate, key: 'issueDate' },
    { label: 'Expiry Date', value: extractedData.expiryDate, key: 'expiryDate' },
  ];

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={600} size="lg">
          OCR Extracted Data
        </Text>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconEdit size={14} />}
          disabled
          title="Edit functionality available in Story 3.3"
        >
          Edit Extracted
        </Button>
      </Group>

      {fields.map((field) => {
        if (!field.value) return null;

        const confidence = extractedData.confidence[field.key] || 0;
        const isLowConfidence = confidence < 80;

        return (
          <Paper
            key={field.key}
            p="sm"
            withBorder
            style={{
              borderColor: isLowConfidence ? 'var(--mantine-color-yellow-6)' : undefined,
              backgroundColor: isLowConfidence ? 'var(--mantine-color-yellow-0)' : undefined,
            }}
          >
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">
                {field.label}
              </Text>
              <Badge
                color={confidence >= 90 ? 'green' : confidence >= 80 ? 'blue' : 'yellow'}
                variant="light"
                size="sm"
              >
                {confidence}% confidence
              </Badge>
            </Group>
            <Text size="sm" fw={500}>
              {field.value}
            </Text>
            {isLowConfidence && (
              <Text size="xs" c="yellow.7" mt="xs">
                ⚠️ Low confidence - please verify manually
              </Text>
            )}
          </Paper>
        );
      })}
    </Stack>
  );
};
