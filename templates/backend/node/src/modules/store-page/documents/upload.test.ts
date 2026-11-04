import { describe, expect, it } from 'vitest';
import { detectMime } from './upload.js';

describe('detectMime', () => {
  it('reconhece PDF, JPG e PNG pelos primeiros bytes', () => {
    expect(detectMime(Buffer.from('%PDF-1.4\n'))).toBe('application/pdf');
    expect(detectMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe('image/png');
  });

  it('recusa outro conteúdo mesmo com nome .pdf', () => {
    expect(detectMime(Buffer.from('MZ\x90\x00'))).toBeNull();
  });
});
