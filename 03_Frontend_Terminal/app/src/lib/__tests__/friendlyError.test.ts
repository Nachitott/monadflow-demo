import { describe, expect, it } from 'vitest';
import { errorCode, GENERIC_ERROR, humanError } from '../friendlyError';

describe('errorCode', () => {
  it('pasa códigos snake_case de la app', () => {
    expect(errorCode('alias_not_found')).toBe('alias_not_found');
    expect(errorCode(new Error('no_contract'))).toBe('no_contract');
    expect(errorCode(new Error('session_id_missing'))).toBe('session_id_missing');
  });

  it('detecta rechazo de firma (wagmi/viem/privy)', () => {
    expect(
      errorCode(
        Object.assign(new Error('User rejected the request'), {
          name: 'UserRejectedRequestError',
        }),
      ),
    ).toBe('user_rejected');
    expect(errorCode(new Error('The user denied this request'))).toBe(
      'user_rejected',
    );
  });

  it('detecta insufficient funds y reverts', () => {
    expect(errorCode(new Error('insufficient funds for gas'))).toBe(
      'insufficient_funds',
    );
    expect(
      errorCode(
        Object.assign(new Error('fail'), {
          name: 'ContractFunctionRevertedError',
          shortMessage: 'execution reverted: StageZeroLocked',
        }),
      ),
    ).toBe('reverted');
  });

  it('cae a unknown para valores extraños', () => {
    expect(errorCode(null)).toBe('unknown');
    expect(errorCode(undefined)).toBe('unknown');
    expect(errorCode(42)).toBe('unknown');
    expect(errorCode(new Error('Something with Spaces and 0xABC12'))).toBe(
      'unknown',
    );
  });
});

describe('humanError — Web3 invisible', () => {
  it('user_rejected → copy de cancelación', () => {
    expect(humanError(new Error('User rejected'))).toBe(
      'Cancelaste la operación.',
    );
  });

  it('reverts y errores técnicos → genérico', () => {
    expect(humanError(new Error('execution reverted: NotClient'))).toBe(
      GENERIC_ERROR,
    );
    expect(humanError(new Error('no_contract'))).toBe(GENERIC_ERROR);
    expect(humanError(null)).toBe(GENERIC_ERROR);
  });

  it('nunca devuelve jerga técnica ni hex', () => {
    const nasty = new Error(
      'execution reverted 0x8c06cf7a53071956df93c4902260ac91c9852a96 gas_hash_wallet',
    );
    const out = humanError(nasty);
    expect(out).not.toMatch(/0x|revert|gas|hash|wallet|contract|USDC/i);
  });
});
