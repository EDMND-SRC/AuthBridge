import { Stack, Text, Timeline, ThemeIcon, Badge, Group } from '@mantine/core';
import { IconRobot, IconUser, IconNote } from '@tabler/icons-react';
import { formatDateTime } from '../utils/date-formatters';

interface HistoryItem {
  timestamp: string;
  type: 'system' | 'user' | 'note';
  action: string;
  userId?: string;
  userName?: string;
  details?: string;
}

const getHistoryIcon = (type: HistoryItem['type']) => {
  switch (type) {
    case 'note':
      return <IconNote size={14} />;
    case 'user':
      return <IconUser size={14} />;
    case 'system':
    default:
      return <IconRobot size={14} />;
  }
};

const getHistoryColor = (type: HistoryItem['type']) => {
  switch (type) {
    case 'note':
      return 'yellow';
    case 'user':
      return 'green';
    case 'system':
    default:
      return 'blue';
  }
};

// Map audit log actions to display-friendly history items
const mapAuditToHistory = (action: string): { displayAction: string; type: HistoryItem['type'] } => {
  switch (action) {
    case 'CASE_NOTE_ADDED':
      return { displayAction: 'Note added', type: 'note' };
    case 'CASE_APPROVED':
      return { displayAction: 'Case approved', type: 'user' };
    case 'CASE_REJECTED':
      return { displayAction: 'Case rejected', type: 'user' };
    case 'CASE_VIEWED':
      return { displayAction: 'Case viewed', type: 'user' };
    default:
      return { displayAction: action, type: 'system' };
  }
};

export const CaseHistory = ({ history }: { history: HistoryItem[] }) => {
  // Process history items to handle note events from audit logs
  const processedHistory = history.map((item) => {
    // If action matches an audit log action, map it to display format
    const mapped = mapAuditToHistory(item.action);
    return {
      ...item,
      action: mapped.displayAction,
      type: item.type || mapped.type
    };
  });

  return (
    <Stack gap="md">
      <Text fw={600} size="lg">
        Case History
      </Text>

      <Timeline active={processedHistory.length - 1} bulletSize={24} lineWidth={2}>
        {processedHistory.map((item, index) => (
          <Timeline.Item
            key={index}
            bullet={
              <ThemeIcon
                size={24}
                variant="light"
                color={getHistoryColor(item.type)}
              >
                {getHistoryIcon(item.type)}
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
