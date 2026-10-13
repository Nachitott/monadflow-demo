import { describe, expect, it } from 'vitest';
import { formatAmount } from '../useExchangeRate';

describe('formatAmount — formato es-AR', () => {
  it('miles con punto, decimales con coma', () => {
    expect(formatAmount(84300, 'ARS')).toContain('84.300');
    expect(formatAmount(1234.56, 'ARS')).toContain('1.234,56');
  });

  it('USD formatea en dólares', () => {
    expect(formatAmount(10.5, 'USD')).toContain('10,50');
  });

  it('cero y montos chicos', () => {
    expect(formatAmount(0, 'ARS')).toContain('0,00');
    expect(formatAmount(0.5, 'ARS')).toContain('0,50');
  });

  it('nunca emite jerga cripto ni hex', () => {
    const out = formatAmount(1234.56, 'USD');
    expect(out).not.toMatch(/0x|wei|token/i);
  });
});
