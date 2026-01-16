import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { CaseListTable } from './CaseListTable';
import type { Case } from '../types';

const mockCases: Case[] = [
  {
    caseId: 'case-1',
    customerName: 'John Doe',
    omangNumber: '***1234',
    status: 'pending',
    documentType: 'omang',
    assignee: 'Alice',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
  {
    caseId: 'case-2',
    customerName: 'Jane Smith',
    omangNumber: '***5678',
    status: 'in-review',
    documentType: 'passport',
    assignee: 'Bob',
    createdAt: '2026-01-15T11:00:00Z',
    updatedAt: '2026-01-15T11:00:00Z',
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MantineProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </MantineProvider>
  );
};

describe('CaseListTable', () => {
  it('should render table without checkboxes when selection props not provided', () => {
    renderWithProviders(<CaseListTable cases={mockCases} />);

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Jane Smith')).toBeTruthy();
    expect(screen.queryByTestId('select-all-checkbox')).toBeNull();
  });

  it('should render checkboxes when selection props provided', () => {
    const onToggleCase = vi.fn();
    const onSelectAll = vi.fn();
    const onClearSelection = vi.fn();

    renderWithProviders(
      <CaseListTable
        cases={mockCases}
        selectedCaseIds={[]}
        onToggleCase={onToggleCase}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
      />
    );

    expect(screen.getByTestId('select-all-checkbox')).toBeTruthy();
    expect(screen.getByTestId('case-checkbox-case-1')).toBeTruthy();
    expect(screen.getByTestId('case-checkbox-case-2')).toBeTruthy();
  });

  it('should call onToggleCase when individual checkbox clicked', async () => {
    const user = userEvent.setup();
    const onToggleCase = vi.fn();
    const onSelectAll = vi.fn();
    const onClearSelection = vi.fn();

    renderWithProviders(
      <CaseListTable
        cases={mockCases}
        selectedCaseIds={[]}
        onToggleCase={onToggleCase}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
      />
    );

    const checkbox = screen.getByTestId('case-checkbox-case-1');
    await user.click(checkbox);

    expect(onToggleCase).toHaveBeenCalledWith('case-1');
  });

  it('should call onSelectAll when select-all checkbox clicked and none selected', async () => {
    const user = userEvent.setup();
    const onToggleCase = vi.fn();
    const onSelectAll = vi.fn();
    const onClearSelection = vi.fn();

    renderWithProviders(
      <CaseListTable
        cases={mockCases}
        selectedCaseIds={[]}
        onToggleCase={onToggleCase}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
      />
    );

    const selectAllCheckbox = screen.getByTestId('select-all-checkbox');
    await user.click(selectAllCheckbox);

    expect(onSelectAll).toHaveBeenCalled();
  });

  it('should call onClearSelection when select-all checkbox clicked and all selected', async () => {
    const user = userEvent.setup();
    const onToggleCase = vi.fn();
    const onSelectAll = vi.fn();
    const onClearSelection = vi.fn();

    renderWithProviders(
      <CaseListTable
        cases={mockCases}
        selectedCaseIds={['case-1', 'case-2']}
        onToggleCase={onToggleCase}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
      />
    );

    const selectAllCheckbox = screen.getByTestId('select-all-checkbox');
    await user.click(selectAllCheckbox);

    expect(onClearSelection).toHaveBeenCalled();
  });

  it('should show indeterminate state when some cases selected', () => {
    const onToggleCase = vi.fn();
    const onSelectAll = vi.fn();
    const onClearSelection = vi.fn();

    renderWithProviders(
      <CaseListTable
        cases={mockCases}
        selectedCaseIds={['case-1']}
        onToggleCase={onToggleCase}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
      />
    );

    const selectAllCheckbox = screen.getByTestId('select-all-checkbox') as HTMLInputElement;
    expect(selectAllCheckbox.indeterminate).toBe(true);
  });

  it('should check individual checkboxes for selected cases', () => {
    const onToggleCase = vi.fn();
    const onSelectAll = vi.fn();
    const onClearSelection = vi.fn();

    renderWithProviders(
      <CaseListTable
        cases={mockCases}
        selectedCaseIds={['case-1']}
        onToggleCase={onToggleCase}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
      />
    );

    const checkbox1 = screen.getByTestId('case-checkbox-case-1') as HTMLInputElement;
    const checkbox2 = screen.getByTestId('case-checkbox-case-2') as HTMLInputElement;

    expect(checkbox1.checked).toBe(true);
    expect(checkbox2.checked).toBe(false);
  });
});
