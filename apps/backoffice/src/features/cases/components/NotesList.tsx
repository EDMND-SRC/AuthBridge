import { Stack, Text, Paper, Group, Skeleton } from '@mantine/core';
import { useCaseNotes } from '../hooks/useCaseNotes';
import { NoteItem } from './NoteItem';

interface NotesListProps {
  caseId: string;
}

export const NotesList = ({ caseId }: NotesListProps) => {
  const { data, isLoading, error } = useCaseNotes(caseId);

  if (isLoading) {
    return (
      <Stack gap="md">
        {[1, 2, 3].map((i) => (
          <Paper key={i} p="md" withBorder>
            <Group gap="sm">
              <Skeleton height={40} circle />
              <div style={{ flex: 1 }}>
                <Skeleton height={12} width="30%" mb="xs" />
                <Skeleton height={8} width="100%" />
                <Skeleton height={8} width="90%" mt="xs" />
              </div>
            </Group>
          </Paper>
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Text c="red" size="sm">
        Failed to load notes. Please try again.
      </Text>
    );
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <Paper p="xl" withBorder>
        <Text c="dimmed" ta="center">
          No notes yet. Add the first note to document observations.
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md" data-testid="notes-list">
      {data.data.map((note) => (
        <NoteItem key={note.noteId} note={note} />
      ))}
    </Stack>
  );
};
