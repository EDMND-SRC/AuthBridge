import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { BulkActionBar } from './BulkActionBar';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('BulkActionBar', () => {
  it('should not render when selectedCount is 0', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const onClear = vi.fn();

    renderWithProviders(
      <BulkActionBar
        selectedCount={0}
        onApprove={onApprove}
        onReject={onReject}
        onClear={onClear}
      />
    );

    expect(screen.queryByTestId('bulk-action-bar')).toBeNull();
  });

  it('should render when selectedCount > 0', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const onClear = vi.fn();

    renderWithProviders(
      <BulkActionBar
        selectedCount={3}
        onApprove={onApprove}
        onReject={onReject}
        onClear={onClear}
      />
    );

    expect(screen.getByTestId('bulk-action-bar')).toBeTruthy();
    expect(screen.getByText('3 cases selected')).toBeTruthy();
  });

  it('should show singular "case" when selectedCount is 1', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const onClear = vi.fn();

    renderWithProviders(
      <BulkActionBar
        selectedCount={1}
        onApprove={onApprove}
        onReject={onReject}
        onClear={onClear}
      />
    );

    expect(screen.getByText('1 case selected')).toBeTruthy();
  });

  it('should call onApprove when Approve Selected button clicked', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const onClear = vi.fn();

    renderWithProviders(
      <BulkActionBar
        selectedCount={2}
        onApprove={onApprove}
        onReject={onReject}
        onClear={onClear}
      />
    );

    const approveButton = screen.getByTestId('bulk-approve-button');
    await user.click(approveButton);

    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('should call onReject when Reject Selected button clicked', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const onClear = vi.fn();

    renderWithProviders(
      <BulkActionBar
        selectedCount={2}
        onApprove={onApprove}
        onReject={onReject}
        onClear={onClear}
      />
    );

    const rejectButton = screen.getByTestId('bulk-reject-button');
    await user.click(rejectButton);

    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('should call onClear when Clear Selection button clicked', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const onClear = vi.fn();

    renderWithProviders(
      <BulkActionBar
        selectedCount={2}
        onApprove={onApprove}
        onReject={onReject}
        onClear={onClear}
      />
    );

    const clearButton = screen.getByTestId('clear-selection-button');
    await user.click(clearButton);

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('should show loading state on buttons when isLoading is true', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const onClear = vi.fn();

    renderWithProviders(
      <BulkActionBar
        selectedCount={2}
        onApprove={onApprove}
        onReject={onReject}
        onClear={onClear}
        isLoading={true}
      />
    );

    const approveButton = screen.getByTestId('bulk-approve-button');
    const rejectButton = screen.getByTestId('bulk-reject-button');

    expect(approveButton.getAttribute('data-loading')).toBe('true');
    expect(rejectButton.getAttribute('data-loading')).toBe('true');
  });
});
