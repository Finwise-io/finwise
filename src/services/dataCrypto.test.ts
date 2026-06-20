// Zero-knowledge cloud encryption — the pure crypto helpers (no keychain needed).
import { encryptWithKey, decryptWithKey, isEncrypted } from './dataCrypto';

const KEY = 'a'.repeat(64);          // 256-bit hex key
const OTHER = 'b'.repeat(64);

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
