import { Paper, Group, Avatar, Text, Stack, Tooltip } from '@mantine/core';
import { formatDistanceToNow } from 'date-fns';
import type { Note } from '../types/note';

interface NoteItemProps {
  note: Note;
}

export const NoteItem = ({ note }: NoteItemProps) => {
  const relativeTime = formatDistanceToNow(new Date(note.timestamp), { addSuffix: true });
  const fullDate = new Date(note.timestamp).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'red';
      case 'analyst':
        return 'blue';
      case 'reviewer':
        return 'green';
      default:
        return 'gray';
    }
  };

  return (
    <Paper p="md" withBorder data-testid="note-item">
      <Group align="flex-start" gap="sm">
        <Avatar color={getRoleColor(note.author.role)} radius="xl">
          {getInitials(note.author.userName)}
        </Avatar>
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group gap="xs">
            <Text fw={500} size="sm">
              {note.author.userName}
            </Text>
            <Text size="xs" c="dimmed">
              •
            </Text>
            <Tooltip label={fullDate} position="top">
              <Text size="xs" c="dimmed" style={{ cursor: 'help' }}>
                {relativeTime}
              </Text>
            </Tooltip>
          </Group>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {note.content}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
};
