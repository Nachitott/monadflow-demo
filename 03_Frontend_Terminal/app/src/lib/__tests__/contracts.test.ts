import { describe, expect, it } from 'vitest';
import { CURRENCY_TYPE, DECIMALS, fromUnits, toUnits } from '../contracts';

describe('units — CURRENCY_TYPE y decimales', () => {
  it('CurrencyType on-chain: ARS=0, USD=1', () => {
    expect(CURRENCY_TYPE.ARS).toBe(0);
    expect(CURRENCY_TYPE.USD).toBe(1);
    expect(DECIMALS.ARS).toBe(18);
    expect(DECIMALS.USD).toBe(6);
  });

  it('toUnits respeta decimales por moneda', () => {
    expect(toUnits(1, 'ARS')).toBe(BigInt('1000000000000000000'));
    expect(toUnits(1, 'USD')).toBe(BigInt(1e6));
    expect(toUnits(100, 'ARS')).toBe(BigInt('100000000000000000000'));
    expect(toUnits(100, 'USD')).toBe(BigInt(100e6));
  });

  it('fromUnits es el inverso de toUnits', () => {
    expect(fromUnits(toUnits(1234.56, 'ARS'), 'ARS')).toBeCloseTo(1234.56);
    expect(fromUnits(toUnits(99.99, 'USD'), 'USD')).toBeCloseTo(99.99);
    expect(fromUnits(BigInt(0), 'ARS')).toBe(0);
  });
});
