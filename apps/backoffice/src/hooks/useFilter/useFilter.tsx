import { useCallback, useState } from 'react';

/**
 * Filter state type - maps record keys to arrays of filter values
 * TD-005: Added proper typing to remove @ts-ignore
 */
type FilterState<TRecord> = Partial<Record<keyof TRecord, string[]>>;

/**
 * @description A hook to easily filter an array of objects by key using fuzzy search.
 * @param props
 * @param props.data - The data to filter.
 * @param props.initialState - The initial filter - defaults to empty string.
 * @param props.filterBy - The object keys to filter by.
 */
export const useFilter = <TRecord extends Record<string, unknown>>({
  data,
  initialState,
}: {
  data: Array<TRecord>;
  initialState?: FilterState<TRecord>;
}) => {
  const [filter, setFilter] = useState<FilterState<TRecord> | undefined>(initialState);

  const onFilter = useCallback(
    (value: FilterState<TRecord>) => {
      setFilter(prevState => ({
        ...prevState,
        ...value,
      }));
    },
    [setFilter],
  );

  const filtered = (() => {
    // Avoid errors stemming from calling array methods on non-arrays.
    if (!Array.isArray(data)) {
      return [];
    }

    // Don't filter when not needed.
    if (!filter || !data?.length) {
      return data;
    }

    // Get filter keys
    const filterKeys = Object.keys(filter) as Array<keyof TRecord>;

    if (!filterKeys.length) {
      return data;
    }

    // Filter with proper typing
    return data.filter(item => {
      return filterKeys.every(key => {
        const filterValues = filter[key];

        // No filter values for this key - pass through
        if (!filterValues?.length) return true;

        // Get item value and check if it matches any filter value
        const itemValue = item[key];
        if (typeof itemValue !== 'string') return true;

        return filterValues.some(filterValue => itemValue.includes(filterValue));
      });
    });
  })();

  return {
    filtered,
    filter,
    onFilter,
  };
};
