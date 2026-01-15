import { Box, Text, Center, Stack } from '@mantine/core';
import { IconHammer } from '@tabler/icons-react';

export const CommingSoon = () => {
  return (
    <Center h="100%">
      <Stack align="center" gap="md">
        <IconHammer size={64} stroke={1.5} color="gray" />
        <Text size="xl" fw={500} c="dimmed">
          Coming Soon
        </Text>
        <Text size="sm" c="dimmed">
          This feature is under development
        </Text>
      </Stack>
    </Center>
  );
};
