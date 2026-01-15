import { writable } from 'svelte/store';
import { Languages } from './types';
import { texts } from '../../utils/configuration-manager';

export const currentLanguage = writable<Languages>('en');

let language: string;

currentLanguage.subscribe(lang => {
  language = lang;
});

export const t = (namespace: string, key: string): string => {
  let path = `${language}.${namespace}.${key}`;

  let text = get(texts, path);
  if (!text) {
    const namespacePath = namespace.split('.');
    namespacePath.pop(); // Remove last key for fallback
    path = `${language}.${namespacePath.join('.')}.${key}`;
    text = get(texts, path);
    // TD-009: Removed console.log - missing translations are handled gracefully
  }
  return text || 'Missing translation: ' + path;
};

/**
 * Safely traverse nested object by dot-separated path
 * TD-005: Added proper typing to remove @ts-ignore
 */
const get = (obj: Record<string, unknown>, path: string): string => {
  const result = path.split('.').reduce<unknown>((res, key) => {
    if (res && typeof res === 'object' && key in res) {
      return (res as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof result === 'string' ? result : '';
};
