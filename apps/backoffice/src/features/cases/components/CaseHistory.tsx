import { Stack, Text, Timeline, ThemeIcon, Badge, Group } from '@mantine/core';
import { IconRobot, IconUser } from '@tabler/icons-react';
import { formatDateTime } from '../utils/date-formatters';

interface HistoryItem {
  timestamp: string;
  type: 'system' | 'user';
  action: string;
  userId?: string;
  userName?: string;
  details?: string;
}

export const CaseHistory = ({ history }: { history: HistoryItem[] }) => {
  return (
    <Stack gap="md">
      <Text fw={600} size="lg">
        Case History
      </Text>

      <Timeline active={history.length - 1} bulletSize={24} lineWidth={2}>
        {history.map((item, index) => (
          <Timeline.Item
            key={index}
            bullet={
              <ThemeIcon
                size={24}
                variant="light"
                color={item.type === 'system' ? 'blue' : 'green'}
              >
                {item.type === 'system' ? <IconRobot size={14} /> : <IconUser size={14} />}
              </ThemeIcon>
            }
            title={
              <Group gap="xs">
                <Text size="sm" fw={500}>
                  {item.action}
                </Text>
                {item.userName && (
                  <Badge size="xs" variant="light">
                    {item.userName}
                  </Badge>
                )}
              </Group>
            }
          >
            {item.details && (
              <Text size="xs" c="dimmed" mt={4}>
                {item.details}
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>
              {formatDateTime(item.timestamp)}
            </Text>
          </Timeline.Item>
        ))}
      </Timeline>
    </Stack>
  );
};
