// Zero-knowledge cloud encryption — the pure crypto helpers (no keychain needed).
import {
  encryptWithKey, decryptWithKey, isEncrypted,
  generateDataKey, generateRecoveryCode, makeEnvelope,
  unwrapWithPassword, unwrapWithRecovery, rewrapPassword, rewrapRecovery,
} from './dataCrypto';

const KEY = 'a'.repeat(64);          // 256-bit hex key
const OTHER = 'b'.repeat(64);
const UID = 'user-123';

describe('dataCrypto', () => {
  test('round-trips an object and the ciphertext is unreadable', () => {
    const data = { net_worth: 550000, accounts: [{ label: 'Chase', balance: 12345.67 }], email: 'a@b.com' };
    const blob = encryptWithKey(data, KEY);
    expect(isEncrypted(blob)).toBe(true);
    expect(blob).not.toContain('550000');     // no plaintext leaks into the cipher
    expect(blob).not.toContain('Chase');
    expect(decryptWithKey(blob, KEY)).toEqual(data);   // exact round-trip
  });

  test('the wrong key returns null — never throws, never leaks', () => {
    const blob = encryptWithKey({ secret: 42 }, KEY);
    expect(decryptWithKey(blob, OTHER)).toBeNull();
  });

  test('non-encrypted input is recognised and not "decrypted"', () => {
    expect(isEncrypted('plain text')).toBe(false);
    expect(isEncrypted({ a: 1 })).toBe(false);
    expect(decryptWithKey('plain text', KEY)).toBeNull();
  });

  test('two encryptions of the same data differ (random IV) but both decrypt', () => {
    const data = { x: 1 };
    const a = encryptWithKey(data, KEY);
    const b = encryptWithKey(data, KEY);
    expect(a).not.toBe(b);                      // CryptoJS uses a random salt/IV each time
    expect(decryptWithKey(a, KEY)).toEqual(data);
    expect(decryptWithKey(b, KEY)).toEqual(data);
  });
});

describe('recovery-code key envelope', () => {
  test('recovery code is human-friendly: 5 groups of 4, no ambiguous chars', () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){4}$/);
    expect(code).not.toMatch(/[OI01]/);          // omitted to avoid misreads
    expect(generateRecoveryCode()).not.toBe(code);   // random each time
  });

  test('the data key opens with EITHER the password OR the recovery code', () => {
    const dek = generateDataKey();
    const code = generateRecoveryCode();
    const env = makeEnvelope(dek, UID, 'hunter2', code);
    expect(unwrapWithPassword(env, UID, 'hunter2')).toBe(dek);   // password path
    expect(unwrapWithRecovery(env, UID, code)).toBe(dek);        // recovery path
  });

  test('the wrong password / wrong code / wrong uid all return null', () => {
    const dek = generateDataKey();
    const code = generateRecoveryCode();
    const env = makeEnvelope(dek, UID, 'hunter2', code);
    expect(unwrapWithPassword(env, UID, 'wrong')).toBeNull();
    expect(unwrapWithRecovery(env, UID, 'ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ')).toBeNull();
    expect(unwrapWithPassword(env, 'other-uid', 'hunter2')).toBeNull();   // uid is the salt
  });

  test('after a reset, re-wrap under the new password — recovery code still works', () => {
    const dek = generateDataKey();
    const code = generateRecoveryCode();
    let env = makeEnvelope(dek, UID, 'oldpass', code);
    // user forgot 'oldpass', resets Firebase to 'newpass', restores via the recovery code:
    const recovered = unwrapWithRecovery(env, UID, code);
    expect(recovered).toBe(dek);
    env = rewrapPassword(env, recovered as string, UID, 'newpass');
    expect(unwrapWithPassword(env, UID, 'newpass')).toBe(dek);   // new password now opens it
    expect(unwrapWithPassword(env, UID, 'oldpass')).toBeNull();  // old one no longer does
    expect(unwrapWithRecovery(env, UID, code)).toBe(dek);        // recovery code unchanged
  });

  test('rotating the recovery code invalidates the old one, keeps the password', () => {
    const dek = generateDataKey();
    const oldCode = generateRecoveryCode();
    let env = makeEnvelope(dek, UID, 'pw', oldCode);
    const newCode = generateRecoveryCode();
    env = rewrapRecovery(env, dek, UID, newCode);
    expect(unwrapWithRecovery(env, UID, newCode)).toBe(dek);
    expect(unwrapWithRecovery(env, UID, oldCode)).toBeNull();
    expect(unwrapWithPassword(env, UID, 'pw')).toBe(dek);
  });
});
