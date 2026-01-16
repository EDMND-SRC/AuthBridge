import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCaseSelection } from './useCaseSelection';

describe('useCaseSelection', () => {
  it('should initialize with empty selection', () => {
    const { result } = renderHook(() => useCaseSelection());

    expect(result.current.selectedCaseIds).toEqual([]);
    expect(result.current.selectedCount).toBe(0);
  });

  it('should toggle case selection', () => {
    const { result } = renderHook(() => useCaseSelection());

    act(() => {
      result.current.toggleCase('case-1');
    });

    expect(result.current.selectedCaseIds).toEqual(['case-1']);
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.isSelected('case-1')).toBe(true);

    act(() => {
      result.current.toggleCase('case-1');
    });

    expect(result.current.selectedCaseIds).toEqual([]);
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isSelected('case-1')).toBe(false);
  });

  it('should select multiple cases', () => {
    const { result } = renderHook(() => useCaseSelection());

    act(() => {
      result.current.toggleCase('case-1');
      result.current.toggleCase('case-2');
      result.current.toggleCase('case-3');
    });

    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isSelected('case-1')).toBe(true);
    expect(result.current.isSelected('case-2')).toBe(true);
    expect(result.current.isSelected('case-3')).toBe(true);
  });

  it('should select all cases', () => {
    const { result } = renderHook(() => useCaseSelection());
    const caseIds = ['case-1', 'case-2', 'case-3', 'case-4'];

    act(() => {
      result.current.selectAll(caseIds);
    });

    expect(result.current.selectedCount).toBe(4);
    expect(result.current.selectedCaseIds).toEqual(expect.arrayContaining(caseIds));
  });

  it('should clear selection', () => {
    const { result } = renderHook(() => useCaseSelection());

    act(() => {
      result.current.toggleCase('case-1');
      result.current.toggleCase('case-2');
    });

    expect(result.current.selectedCount).toBe(2);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedCaseIds).toEqual([]);
  });

  it('should check if case is selected', () => {
    const { result } = renderHook(() => useCaseSelection());

    act(() => {
      result.current.toggleCase('case-1');
    });

    expect(result.current.isSelected('case-1')).toBe(true);
    expect(result.current.isSelected('case-2')).toBe(false);
  });
});
