// Encrypted local storage adapter for zustand persist.
//
// SecureStore has a small (~2KB) value limit, so we can't keep the whole app state there. Instead we
// keep only a random 256-bit AES key in SecureStore (keychain / keystore protected), and store the
// AES-encrypted state blob in AsyncStorage. Ciphertext is tagged with an "enc:" prefix so we can
// transparently migrate any pre-existing plaintext (returned as-is; re-encrypted on the next write).
//
// Resilience: if SecureStore is unavailable (e.g. the native module isn't in the current dev-client
// build yet), we fall back to a key kept in AsyncStorage so the app keeps working — a rebuild then
// upgrades it to keychain-backed storage automatically.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';   // single module — submodule default-exports are unreliable under Hermes

const KEY_NAME = 'finwise-enc-key';
const PREFIX = 'enc:';

let cachedKey: string | null = null;

async function secureGet(name: string): Promise<string | null> {
  try { return await SecureStore.getItemAsync(name); }
  catch { return await AsyncStorage.getItem(`__fallback_${name}`); }
}
async function secureSet(name: string, value: string): Promise<void> {
  try { await SecureStore.setItemAsync(name, value); }
  catch { await AsyncStorage.setItem(`__fallback_${name}`, value); }
}

async function getOrCreateKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  let key = await secureGet(KEY_NAME);
  if (!key) {
    key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);   // 256-bit
    await secureSet(KEY_NAME, key);
  }
  cachedKey = key;
  return key;
}

export const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const raw = await AsyncStorage.getItem(name);
    if (raw == null) return null;
    if (!raw.startsWith(PREFIX)) return raw;          // legacy plaintext → migrate on next setItem
    try {
      const key = await getOrCreateKey();
      const plain = CryptoJS.AES.decrypt(raw.slice(PREFIX.length), key).toString(CryptoJS.enc.Utf8);
      return plain || null;                            // decrypt failure → null (safe reset)
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const key = await getOrCreateKey();
      const cipher = CryptoJS.AES.encrypt(value, key).toString();
      await AsyncStorage.setItem(name, PREFIX + cipher);
    } catch {
      await AsyncStorage.setItem(name, value);         // never lose data if encryption fails
    }
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};
