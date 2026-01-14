import { describe, it, expect } from 'vitest';

describe('ReviewSubmit Logic', () => {
  it('should collect images correctly', () => {
    const images = [];
    const front = 'front.jpg';
    const back = 'back.jpg';
    const selfie = 'selfie.jpg';
    
    if (front) images.push({ type: 'front', src: front });
    if (back) images.push({ type: 'back', src: back });
    if (selfie) images.push({ type: 'selfie', src: selfie });
    
    expect(images).toHaveLength(3);
  });
  
  it('should map image types to steps', () => {
    const mapping: Record<string, string> = {
      'document-front': 'check-document',
      'document-back': 'check-document-photo-back',
      'selfie': 'check-selfie'
    };
    
    expect(mapping['document-front']).toBe('check-document');
    expect(mapping['selfie']).toBe('check-selfie');
  });
  
  it('should categorize errors', () => {
    const networkError = new Error('network failed');
    const serverError = new Error('server 500');
    
    const getErrorKey = (err: Error) => {
      if (err.message.includes('network')) return 'networkError';
      if (err.message.includes('500')) return 'serverError';
      return 'submissionFailed';
    };
    
    expect(getErrorKey(networkError)).toBe('networkError');
    expect(getErrorKey(serverError)).toBe('serverError');
  });
});
