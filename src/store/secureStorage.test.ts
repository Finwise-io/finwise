jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return { getItemAsync: async (k: string) => store[k] ?? null, setItemAsync: async (k: string, v: string) => { store[k] = v; } };
});
jest.mock('@react-native-async-storage/async-storage', () => {
  const s: Record<string, string> = {};
  return { getItem: async (k: string) => s[k] ?? null, setItem: async (k: string, v: string) => { s[k] = v; }, removeItem: async (k: string) => { delete s[k]; } };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from './secureStorage';

const KEY = 'finwise-storage-v3';

describe('secureStorage (encrypted at rest)', () => {
  test('encrypts on write, decrypts on read (round-trip)', async () => {
    const payload = JSON.stringify({ state: { user: { email: 'a@b.com' }, net: 123456 }, version: 0 });
    await secureStorage.setItem(KEY, payload);
    const onDisk = await AsyncStorage.getItem(KEY);
    expect(onDisk).toBeTruthy();
    expect(onDisk!.startsWith('enc:')).toBe(true);          // tagged ciphertext
    expect(onDisk).not.toContain('a@b.com');                // plaintext not present on disk
    expect(await secureStorage.getItem(KEY)).toBe(payload); // decrypts back to original
  });

  test('migrates legacy plaintext (no prefix) by returning it as-is', async () => {
    const legacy = JSON.stringify({ state: { x: 1 }, version: 0 });
    await AsyncStorage.setItem(KEY, legacy);                 // simulate old plaintext blob
    expect(await secureStorage.getItem(KEY)).toBe(legacy);
  });

  test('removeItem clears it', async () => {
    await secureStorage.setItem(KEY, 'x');
    await secureStorage.removeItem(KEY);
    expect(await secureStorage.getItem(KEY)).toBeNull();
  });
});
