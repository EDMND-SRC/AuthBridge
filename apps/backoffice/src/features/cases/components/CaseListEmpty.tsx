import { Center, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconFileSearch } from '@tabler/icons-react';

interface CaseListEmptyProps {
  hasFilters?: boolean;
}

export function CaseListEmpty({ hasFilters = false }: CaseListEmptyProps) {
  return (
    <Center py="xl">
      <Stack align="center" gap="md">
        <ThemeIcon size={64} variant="light" color="gray" radius="xl">
          <IconFileSearch size={32} />
        </ThemeIcon>
        <Text size="lg" fw={500} c="dimmed">
          {hasFilters ? 'No cases match your filters' : 'No cases yet'}
        </Text>
        <Text size="sm" c="dimmed" ta="center" maw={300}>
          {hasFilters
            ? 'Try adjusting your filters or search criteria'
            : 'Cases will appear here once verification requests are submitted'}
        </Text>
      </Stack>
    </Center>
  );
}
