import { useForm } from '@mantine/form';
import { useOne, useUpdate, useNavigation } from '@refinedev/core';
import { useParams } from 'react-router-dom';
import { Box, TextInput, Button, Group, Select, Stack, Title, LoadingOverlay } from '@mantine/core';
import { useEffect } from 'react';

interface IUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'pending';
}

export const UsersEdit = () => {
  const { id } = useParams<{ id: string }>();
  const { list } = useNavigation();
  const { data, isLoading: isLoadingUser } = useOne<IUser>({
    resource: 'users',
    id: id ?? '',
  });
  const { mutate: updateUser, isLoading: isUpdating } = useUpdate();

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

  useEffect(() => {
    if (data?.data) {
      form.setValues({
        first_name: data.data.first_name,
        last_name: data.data.last_name,
        email: data.data.email,
        phone: data.data.phone || '',
        status: data.data.status,
      });
    }
  }, [data]);

  const handleSubmit = form.onSubmit((values) => {
    if (!id) return;

    updateUser(
      {
        resource: 'users',
        id,
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
    <Box p="md" maw={600} pos="relative">
      <LoadingOverlay visible={isLoadingUser} />

      <Title order={2} mb="lg">Edit User</Title>

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
            <Button type="submit" loading={isUpdating}>Save Changes</Button>
          </Group>
        </Stack>
      </form>
    </Box>
  );
};
