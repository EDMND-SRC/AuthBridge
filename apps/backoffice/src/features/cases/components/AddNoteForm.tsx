import { Textarea, Button, Group, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAddNote } from '../hooks/useAddNote';

interface AddNoteFormProps {
  caseId: string;
}

export const AddNoteForm = ({ caseId }: AddNoteFormProps) => {
  const addNote = useAddNote(caseId);

  const form = useForm({
    initialValues: {
      content: ''
    },
    validate: {
      content: (value) => {
        if (!value.trim()) return 'Note cannot be empty';
        if (value.length > 2000) return 'Note must be 2000 characters or less';
        return null;
      }
    }
  });

  const handleSubmit = async (values: { content: string }) => {
    await addNote.mutateAsync({ content: values.content });
    form.reset();
  };

  const charCount = form.values.content.length;
  const charLimit = 2000;
  const charCountColor = charCount > charLimit ? 'red' : charCount > charLimit * 0.9 ? 'orange' : 'dimmed';

  return (
    <form onSubmit={form.onSubmit(handleSubmit)} data-testid="add-note-form">
      <Textarea
        {...form.getInputProps('content')}
        placeholder="Add a note about this case..."
        minRows={3}
        maxRows={6}
        autosize
        data-testid="note-content-input"
      />
      <Group justify="space-between" mt="sm">
        <Text size="sm" c={charCountColor}>
          {charCount} / {charLimit} characters
        </Text>
        <Button
          type="submit"
          loading={addNote.isPending}
          disabled={!form.values.content.trim() || charCount > charLimit}
          data-testid="submit-note-button"
        >
          Add Note
        </Button>
      </Group>
    </form>
  );
};
