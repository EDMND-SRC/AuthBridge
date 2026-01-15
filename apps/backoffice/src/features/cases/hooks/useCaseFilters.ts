import { useState, useCallback } from 'react';
import type { CaseFilters } from '../types';

const initialFilters: CaseFilters = {};

export function useCaseFilters() {
  const [filters, setFilters] = useState<CaseFilters>(initialFilters);

  const updateFilter = useCallback(<K extends keyof CaseFilters>(
    key: K,
    value: CaseFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined, // Remove empty values
    }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<CaseFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    hasActiveFilters,
  };
}
