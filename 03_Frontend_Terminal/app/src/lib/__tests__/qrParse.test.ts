import { describe, expect, it } from 'vitest';
import { parseRecipient, universalParse } from '../qrParse';

const ORIGIN = 'https://monadflow.app';

describe('universalParse — escáner universal', () => {
  it('link de comercio → /consumo?m=', () => {
    expect(universalParse(`${ORIGIN}/consumo?m=qr-abc-1`, ORIGIN)).toBe(
      '/consumo?m=qr-abc-1',
    );
  });

  it('link P2P → /enviar?to=', () => {
    expect(universalParse(`${ORIGIN}/enviar?to=nacho.mp`, ORIGIN)).toBe(
      '/enviar?to=nacho.mp',
    );
  });

  it('link de acuerdo → /acuerdo/<id>', () => {
    expect(universalParse(`${ORIGIN}/acuerdo/ag-123`, ORIGIN)).toBe(
      '/acuerdo/ag-123',
    );
  });

  it('fallback: qrId crudo → /consumo', () => {
    expect(universalParse('qr-xyz-42', ORIGIN)).toBe('/consumo?m=qr-xyz-42');
  });

  it('fallback: alias crudo → /enviar', () => {
    expect(universalParse('nacho.mp', ORIGIN)).toBe('/enviar?to=nacho.mp');
  });

  it('rechaza URLs ajenas y basura', () => {
    expect(universalParse('https://google.com', ORIGIN)).toBeNull();
    expect(universalParse('javascript:alert(1)', ORIGIN)).toBeNull();
    expect(universalParse('!!no-es-nada!!', ORIGIN)).toBeNull();
  });
});

describe('parseRecipient — destinatario P2P', () => {
  it('extrae alias de un link /enviar?to=', () => {
    expect(parseRecipient(`${ORIGIN}/enviar?to=nacho.mp`)).toBe('nacho.mp');
  });

  it('acepta alias crudo', () => {
    expect(parseRecipient('NACHO.MP')).toBe('nacho.mp');
    expect(parseRecipient('  juan_p  ')).toBe('juan_p');
  });

  it('rechaza alias inválido', () => {
    expect(parseRecipient('ab')).toBeNull(); // < 3 chars
    expect(parseRecipient('con espacios')).toBeNull();
    expect(parseRecipient('')).toBeNull();
  });
});
