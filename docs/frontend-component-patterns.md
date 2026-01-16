# Frontend Component Patterns

## Overview

Patterns and best practices for React components in the AuthBridge backoffice application.

## Architecture

### Component Hierarchy
```
pages/           → Route-level components
├── features/    → Feature-specific logic
├── organisms/   → Complex composed components
├── molecules/   → Simple composed components
└── atoms/       → Basic UI primitives
```

### Data Flow
```
Page → useQuery hooks → Feature components → UI components
                ↓
         Server State (React Query)
                ↓
         Local State (useState/useReducer)
```

## Patterns

### 1. Container/Presenter Pattern

Separate data fetching from presentation.

```tsx
// Container (handles data)
export function CaseListContainer() {
  const { data, isLoading, error } = useCasesQuery();
  const { mutate: approve } = useApproveMutation();

  if (isLoading) return <CaseListSkeleton />;
  if (error) return <ErrorState error={error} />;

  return (
    <CaseList
      cases={data}
      onApprove={approve}
      testId="case-list"
    />
  );
}

// Presenter (pure UI)
interface CaseListProps {
  cases: Case[];
  onApprove: (id: string) => void;
  testId?: string;
}

export function CaseList({ cases, onApprove, testId }: CaseListProps) {
  return (
    <Table data-testid={testId}>
      {cases.map(case => (
        <CaseRow
          key={case.id}
          case={case}
          onApprove={() => onApprove(case.id)}
          testId={`case-row-${case.id}`}
        />
      ))}
    </Table>
  );
}
```

### 2. Compound Components

For complex components with shared state.

```tsx
// Usage
<DataTable data={cases}>
  <DataTable.Header>
    <DataTable.Column field="id">ID</DataTable.Column>
    <DataTable.Column field="status">Status</DataTable.Column>
  </DataTable.Header>
  <DataTable.Body>
    {(row) => (
      <DataTable.Row key={row.id} testId={`row-${row.id}`}>
        <DataTable.Cell>{row.id}</DataTable.Cell>
        <DataTable.Cell>
          <StatusBadge status={row.status} />
        </DataTable.Cell>
      </DataTable.Row>
    )}
  </DataTable.Body>
</DataTable>

// Implementation
const DataTableContext = createContext<DataTableContextValue | null>(null);

export function DataTable({ data, children }: DataTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  return (
    <DataTableContext.Provider value={{ data, sortConfig, setSortConfig }}>
      <table data-testid="data-table">{children}</table>
    </DataTableContext.Provider>
  );
}

DataTable.Header = DataTableHeader;
DataTable.Body = DataTableBody;
DataTable.Row = DataTableRow;
DataTable.Cell = DataTableCell;
DataTable.Column = DataTableColumn;
```

### 3. Render Props

For flexible rendering logic.

```tsx
interface FilterableListProps<T> {
  items: T[];
  filterFn: (item: T, query: string) => boolean;
  children: (filteredItems: T[]) => React.ReactNode;
  testId?: string;
}

export function FilterableList<T>({
  items,
  filterFn,
  children,
  testId,
}: FilterableListProps<T>) {
  const [query, setQuery] = useState('');
  const filtered = items.filter(item => filterFn(item, query));

  return (
    <div data-testid={testId}>
      <SearchInput
        value={query}
        onChange={setQuery}
        testId={`${testId}-search`}
      />
      {children(filtered)}
    </div>
  );
}

// Usage
<FilterableList
  items={cases}
  filterFn={(case, q) => case.name.includes(q)}
  testId="case-filter"
>
  {(filtered) => <CaseList cases={filtered} />}
</FilterableList>
```

### 4. Custom Hooks

Extract reusable logic.

```tsx
// hooks/useBulkSelection.ts
export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(i => i.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);
  const selectedItems = items.filter(i => selectedIds.has(i.id));
  const allSelected = selectedIds.size === items.length && items.length > 0;

  return {
    selectedIds,
    selectedItems,
    isSelected,
    toggleItem,
    selectAll,
    clearSelection,
    allSelected,
  };
}

// Usage
function CaseTable({ cases }: { cases: Case[] }) {
  const {
    selectedItems,
    isSelected,
    toggleItem,
    selectAll,
    clearSelection,
    allSelected,
  } = useBulkSelection(cases);

  return (
    <>
      <BulkActions
        selectedCount={selectedItems.length}
        onClear={clearSelection}
        testId="bulk-actions"
      />
      <Table>
        <TableHeader>
          <Checkbox
            checked={allSelected}
            onChange={allSelected ? clearSelection : selectAll}
            testId="select-all"
          />
        </TableHeader>
        {cases.map(case => (
          <TableRow key={case.id}>
            <Checkbox
              checked={isSelected(case.id)}
              onChange={() => toggleItem(case.id)}
              testId={`select-${case.id}`}
            />
          </TableRow>
        ))}
      </Table>
    </>
  );
}
```

## State Management

### Server State (React Query)
```tsx
// queries/cases.ts
export function useCasesQuery(filters: CaseFilters) {
  return useQuery({
    queryKey: ['cases', filters],
    queryFn: () => fetchCases(filters),
    staleTime: 30_000,
  });
}

export function useApproveCaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}
```

### Local UI State
```tsx
// For simple state
const [isOpen, setIsOpen] = useState(false);

// For complex state
const [state, dispatch] = useReducer(filterReducer, initialState);
```

### Form State (React Hook Form)
```tsx
const { register, handleSubmit, formState } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

## Error Handling

### Error Boundaries
```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <CaseDetails />
</ErrorBoundary>
```

### Query Errors
```tsx
function CaseList() {
  const { data, error, isError } = useCasesQuery();

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return <Table data={data} />;
}
```

## Performance

### Memoization
```tsx
// Memoize expensive computations
const sortedCases = useMemo(
  () => cases.sort((a, b) => a.createdAt - b.createdAt),
  [cases]
);

// Memoize callbacks passed to children
const handleApprove = useCallback(
  (id: string) => approveMutation.mutate(id),
  [approveMutation]
);

// Memoize components that receive objects/arrays
const MemoizedRow = memo(CaseRow);
```

### Virtualization
```tsx
// For long lists
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
            }}
          >
            <ListItem item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Testing

### Component Tests
```tsx
describe('CaseRow', () => {
  it('renders case data', () => {
    render(<CaseRow case={mockCase} testId="case-row" />);

    expect(screen.getByTestId('case-row')).toBeInTheDocument();
    expect(screen.getByText(mockCase.name)).toBeInTheDocument();
  });

  it('calls onApprove when approve button clicked', async () => {
    const onApprove = vi.fn();
    render(<CaseRow case={mockCase} onApprove={onApprove} />);

    await userEvent.click(screen.getByTestId('approve-btn'));

    expect(onApprove).toHaveBeenCalledWith(mockCase.id);
  });
});
```

### Hook Tests
```tsx
describe('useBulkSelection', () => {
  it('toggles item selection', () => {
    const { result } = renderHook(() =>
      useBulkSelection([{ id: '1' }, { id: '2' }])
    );

    act(() => result.current.toggleItem('1'));

    expect(result.current.isSelected('1')).toBe(true);
    expect(result.current.isSelected('2')).toBe(false);
  });
});
```
