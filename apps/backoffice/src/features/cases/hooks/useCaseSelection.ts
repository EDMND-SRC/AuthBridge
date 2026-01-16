import { useState, useCallback } from 'react';

export const useCaseSelection = () => {
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());

  const toggleCase = useCallback((caseId: string) => {
    setSelectedCaseIds(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((caseIds: string[]) => {
    setSelectedCaseIds(new Set(caseIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCaseIds(new Set());
  }, []);

  const isSelected = useCallback((caseId: string) => {
    return selectedCaseIds.has(caseId);
  }, [selectedCaseIds]);

  return {
    selectedCaseIds: Array.from(selectedCaseIds),
    selectedCount: selectedCaseIds.size,
    toggleCase,
    selectAll,
    clearSelection,
    isSelected
  };
};
