import { describe, it, expect, beforeEach } from 'vitest';
import { getCsrfToken } from './csrf';

describe('getCsrfToken', () => {
  beforeEach(() => {
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('returns empty string when cookie absent', () => {
    expect(getCsrfToken()).toBe('');
  });

  it('reads csrf_token cookie value', () => {
    document.cookie = 'csrf_token=abc123; path=/';
    expect(getCsrfToken()).toBe('abc123');
  });
});
