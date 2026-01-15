import { useShow } from '@refinedev/core';
import { Box, Title, Text, Stack, Badge, Group, Card, LoadingOverlay } from '@mantine/core';

interface IUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
}

const statusColors: Record<string, string> = {
  active: 'green',
  inactive: 'gray',
  pending: 'yellow',
};

export const UsersShow = () => {
  const { queryResult } = useShow<IUser>();
  const { data, isLoading } = queryResult;
  const user = data?.data;

  return (
    <Box p="md" maw={600} pos="relative">
      <LoadingOverlay visible={isLoading} />

      <Title order={2} mb="lg">User Details</Title>

      {user && (
        <Card withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={500}>Name</Text>
              <Text>{user.first_name} {user.last_name}</Text>
            </Group>

            <Group justify="space-between">
              <Text fw={500}>Email</Text>
              <Text>{user.email}</Text>
            </Group>

            <Group justify="space-between">
              <Text fw={500}>Phone</Text>
              <Text>{user.phone || '-'}</Text>
            </Group>

            <Group justify="space-between">
              <Text fw={500}>Status</Text>
              <Badge color={statusColors[user.status] || 'gray'} variant="light">
                {user.status}
              </Badge>
            </Group>

            <Group justify="space-between">
              <Text fw={500}>Created</Text>
              <Text>{new Date(user.created_at).toLocaleDateString('en-GB')}</Text>
            </Group>
          </Stack>
        </Card>
      )}
    </Box>
  );
};
