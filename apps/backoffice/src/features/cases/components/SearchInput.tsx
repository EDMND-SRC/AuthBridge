import { TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useState, useEffect, useCallback } from 'react';

interface SearchInputProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export function SearchInput({
  onSearch,
  placeholder = 'Search by name, Omang (last 4), or email',
  initialValue = '',
}: SearchInputProps) {
  const [value, setValue] = useState(initialValue);
  const [debounced] = useDebouncedValue(value, 500);

  useEffect(() => {
    onSearch(debounced);
  }, [debounced, onSearch]);

  const handleClear = useCallback(() => {
    setValue('');
  }, []);

  return (
    <TextInput
      placeholder={placeholder}
      leftSection={<IconSearch size={16} />}
      rightSection={
        value ? (
          <IconX
            size={16}
            style={{ cursor: 'pointer' }}
            onClick={handleClear}
            aria-label="Clear search"
          />
        ) : null
      }
      value={value}
      onChange={(e) => setValue(e.currentTarget.value)}
      style={{ flex: 1, maxWidth: 400 }}
      aria-label="Search cases"
    />
  );
}
