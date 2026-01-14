import { describe, it, expect } from 'vitest';
import type { FacePositioning, LivenessChecks } from './detector';

describe('Liveness Detection Service', () => {
  describe('FacePositioning Type', () => {
    it('should define correct face positioning structure', () => {
      const positioning: FacePositioning = {
        centered: false,
        distance: 'tooFar',
        message: 'Position your face in the oval',
      };

      expect(positioning.centered).toBe(false);
      expect(positioning.distance).toBe('tooFar');
      expect(positioning.message).toBe('Position your face in the oval');
    });

    it('should support all distance states', () => {
      const distances: Array<'optimal' | 'tooClose' | 'tooFar'> = [
        'optimal',
        'tooClose',
        'tooFar',
      ];

      distances.forEach(distance => {
        const positioning: FacePositioning = {
          centered: true,
          distance,
          message: 'test',
        };
        expect(positioning.distance).toBe(distance);
      });
    });
  });

  describe('LivenessChecks Type', () => {
    it('should define correct liveness checks structure', () => {
      const checks: LivenessChecks = {
        blink: { passed: false, attempts: 0 },
        turnLeft: { passed: false, attempts: 0 },
        turnRight: { passed: false, attempts: 0 },
      };

      expect(checks.blink.passed).toBe(false);
      expect(checks.turnLeft.passed).toBe(false);
      expect(checks.turnRight.passed).toBe(false);
    });

    it('should track attempt counts', () => {
      const checks: LivenessChecks = {
        blink: { passed: true, attempts: 2 },
        turnLeft: { passed: true, attempts: 1 },
        turnRight: { passed: false, attempts: 3 },
      };

      expect(checks.blink.attempts).toBe(2);
      expect(checks.turnLeft.attempts).toBe(1);
      expect(checks.turnRight.attempts).toBe(3);
    });
  });

  describe('Liveness Prompt States', () => {
    it('should support all prompt states', () => {
      const prompts: Array<'position' | 'blink' | 'turnLeft' | 'turnRight' | 'complete'> = [
        'position',
        'blink',
        'turnLeft',
        'turnRight',
        'complete',
      ];

      prompts.forEach(prompt => {
        expect(prompts).toContain(prompt);
      });
    });
  });
});
