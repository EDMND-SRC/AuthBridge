import { useTable } from '@refinedev/react-table';
import { ColumnDef, flexRender } from '@tanstack/react-table';
import { Table, ScrollArea, Group, TextInput, Pagination, Box, Badge, Text } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';

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

export const UsersList = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const columns = useMemo<ColumnDef<IUser>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorFn: (row) => `${row.first_name} ${row.last_name}`,
        cell: ({ getValue }) => (
          <Text fw={500}>{getValue<string>()}</Text>
        ),
      },
      {
        id: 'email',
        header: 'Email',
        accessorKey: 'email',
      },
      {
        id: 'phone',
        header: 'Phone',
        accessorKey: 'phone',
        cell: ({ getValue }) => getValue<string>() || '-',
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => {
          const status = getValue<string>();
          return (
            <Badge color={statusColors[status] || 'gray'} variant="light">
              {status}
            </Badge>
          );
        },
      },
      {
        id: 'created_at',
        header: 'Created',
        accessorKey: 'created_at',
        cell: ({ getValue }) => {
          const date = getValue<string>();
          return date ? new Date(date).toLocaleDateString('en-GB') : '-';
        },
      },
    ],
    []
  );

  const {
    getHeaderGroups,
    getRowModel,
    getState,
    setPageIndex,
    getPageCount,
  } = useTable({
    columns,
    refineCoreProps: {
      filters: {
        permanent: debouncedSearch
          ? [{ field: 'q', operator: 'contains', value: debouncedSearch }]
          : [],
      },
    },
  });

  return (
    <Box p="md">
      <Group justify="space-between" mb="md">
        <TextInput
          placeholder="Search users..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ width: 300 }}
        />
      </Group>

      <ScrollArea>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            {getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {getRowModel().rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Text ta="center" c="dimmed" py="xl">
                    No users found
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              getRowModel().rows.map((row) => (
                <Table.Tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Group justify="flex-end" mt="md">
        <Pagination
          total={getPageCount()}
          value={getState().pagination.pageIndex + 1}
          onChange={(page) => setPageIndex(page - 1)}
        />
      </Group>
    </Box>
  );
};
