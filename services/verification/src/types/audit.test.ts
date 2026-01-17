import { describe, it, expect } from 'vitest';
import type { AuditAction } from './audit';

describe('AuditAction Type - Data Request Actions', () => {
  it('should include DATA_EXPORT_REQUESTED action', () => {
    const action: AuditAction = 'DATA_EXPORT_REQUESTED';
    expect(action).toBe('DATA_EXPORT_REQUESTED');
  });

  it('should include DATA_EXPORT_COMPLETED action', () => {
    const action: AuditAction = 'DATA_EXPORT_COMPLETED';
    expect(action).toBe('DATA_EXPORT_COMPLETED');
  });

  it('should include DATA_EXPORT_FAILED action', () => {
    const action: AuditAction = 'DATA_EXPORT_FAILED';
    expect(action).toBe('DATA_EXPORT_FAILED');
  });

  it('should include DATA_DELETION_REQUESTED action', () => {
    const action: AuditAction = 'DATA_DELETION_REQUESTED';
    expect(action).toBe('DATA_DELETION_REQUESTED');
  });

  it('should include DATA_DELETION_COMPLETED action', () => {
    const action: AuditAction = 'DATA_DELETION_COMPLETED';
    expect(action).toBe('DATA_DELETION_COMPLETED');
  });

  it('should include DATA_DELETION_FAILED action', () => {
    const action: AuditAction = 'DATA_DELETION_FAILED';
    expect(action).toBe('DATA_DELETION_FAILED');
  });

  it('should include DATA_HARD_DELETION_COMPLETED action', () => {
    const action: AuditAction = 'DATA_HARD_DELETION_COMPLETED';
    expect(action).toBe('DATA_HARD_DELETION_COMPLETED');
  });

  it('should include DATA_HARD_DELETION_FAILED action', () => {
    const action: AuditAction = 'DATA_HARD_DELETION_FAILED';
    expect(action).toBe('DATA_HARD_DELETION_FAILED');
  });

  it('should allow data request actions in audit entry', () => {
    const actions: AuditAction[] = [
      'DATA_EXPORT_REQUESTED',
      'DATA_EXPORT_COMPLETED',
      'DATA_EXPORT_FAILED',
      'DATA_DELETION_REQUESTED',
      'DATA_DELETION_COMPLETED',
      'DATA_DELETION_FAILED',
      'DATA_HARD_DELETION_COMPLETED',
      'DATA_HARD_DELETION_FAILED',
    ];

    actions.forEach(action => {
      expect(typeof action).toBe('string');
      expect(action).toMatch(/^DATA_(EXPORT|DELETION|HARD_DELETION)_(REQUESTED|COMPLETED|FAILED)$/);
    });
  });
});
