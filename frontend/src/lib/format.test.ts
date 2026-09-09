import { describe, expect, it } from 'vitest';
import { formatMoney, shortOrderId } from './format';

describe('formatMoney', () => {
  it('interpreta el importe como centavos, no como una cantidad decimal', () => {
    const formatted = formatMoney(12345, 'USD');
    expect(formatted).toContain('123,45');
  });
});

describe('shortOrderId', () => {
  it('muestra una referencia corta y en mayúsculas', () => {
    expect(shortOrderId('order_1234567890abcdef')).toBe('90ABCDEF');
  });
});
