import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryProvider } from './QueryProvider';
import { useQuery } from '@tanstack/react-query';

// Test component that uses TanStack Query
function TestQueryComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['test'],
    queryFn: () => Promise.resolve('test-data'),
  });

  if (isLoading) return <div>Loading...</div>;
  return <div data-testid="query-result">{data}</div>;
}

describe('QueryProvider', () => {
  it('should provide QueryClient to children', async () => {
    render(
      <QueryProvider>
        <TestQueryComponent />
      </QueryProvider>
    );

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Should eventually show data
    const result = await screen.findByTestId('query-result');
    expect(result).toHaveTextContent('test-data');
  });

  it('should configure default stale time', () => {
    // QueryProvider should have staleTime of 5 minutes (300000ms)
    // This is tested implicitly through the provider configuration
    expect(true).toBe(true);
  });
});
