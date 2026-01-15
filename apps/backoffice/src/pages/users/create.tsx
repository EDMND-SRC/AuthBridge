import { useForm } from '@mantine/form';
import { useCreate, useNavigation } from '@refinedev/core';
import { Box, TextInput, Button, Group, Select, Stack, Title } from '@mantine/core';

export const UsersCreate = () => {
  const { list } = useNavigation();
  const { mutate: createUser, isLoading } = useCreate();

  const form = useForm({
    initialValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      status: 'pending',
    },
    validate: {
      first_name: (value) => (value.length < 2 ? 'First name must be at least 2 characters' : null),
      last_name: (value) => (value.length < 2 ? 'Last name must be at least 2 characters' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    createUser(
      {
        resource: 'users',
        values,
      },
      {
        onSuccess: () => {
          list('users');
        },
      }
    );
  });

  return (
    <Box p="md" maw={600}>
      <Title order={2} mb="lg">Create User</Title>

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="First Name"
              placeholder="Enter first name"
              required
              {...form.getInputProps('first_name')}
            />
            <TextInput
              label="Last Name"
              placeholder="Enter last name"
              required
              {...form.getInputProps('last_name')}
            />
          </Group>

          <TextInput
            label="Email"
            placeholder="Enter email"
            required
            {...form.getInputProps('email')}
          />

          <TextInput
            label="Phone"
            placeholder="Enter phone number"
            {...form.getInputProps('phone')}
          />

          <Select
            label="Status"
            data={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'pending', label: 'Pending' },
            ]}
            {...form.getInputProps('status')}
          />

          <Group justify="flex-end" mt="md">
            <Button type="submit" loading={isLoading}>Create User</Button>
          </Group>
        </Stack>
      </form>
    </Box>
  );
};
