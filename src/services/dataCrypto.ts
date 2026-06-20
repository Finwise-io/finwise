// Zero-knowledge encryption for the data we sync to the cloud (Firestore).
// The key is DERIVED FROM THE USER'S PASSWORD (PBKDF2) and never leaves the device — it's cached in
// the OS keychain. So Firestore only ever stores ciphertext; nobody without the user's password
// (not us, not Google, not someone who steals the database) can read it.
// Consequence of true zero-knowledge: a forgotten password = unrecoverable cloud data.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';   // single module — submodule default-exports are unreliable under Hermes

const KEY_NAME = 'finwise-data-key';   // cached, password-derived key (keychain-protected)
const PREFIX = 'enc:';
const PBKDF2_ITERS = 100000;           // deliberately slow — done once per login

let cachedKey: string | null = null;

async function secureGet(name: string): Promise<string | null> {
  try { return await SecureStore.getItemAsync(name); }
  catch { return await AsyncStorage.getItem(`__fallback_${name}`); }
}
async function secureSet(name: string, value: string): Promise<void> {
  try { await SecureStore.setItemAsync(name, value); }
  catch { await AsyncStorage.setItem(`__fallback_${name}`, value); }
}
async function secureDelete(name: string): Promise<void> {
  try { await SecureStore.deleteItemAsync(name); } catch { /* ignore */ }
  try { await AsyncStorage.removeItem(`__fallback_${name}`); } catch { /* ignore */ }
}

/** Derive the per-user data key from their password (uid as salt) and cache it in the keychain.
 *  Call this right after a successful login/registration, while the password is in hand. */
export async function deriveAndCacheDataKey(uid: string, password: string): Promise<void> {
  const key = CryptoJS.PBKDF2(password, uid, { keySize: 256 / 32, iterations: PBKDF2_ITERS }).toString(CryptoJS.enc.Hex);
  cachedKey = key;
  await secureSet(KEY_NAME, key);
}

/** The cached data key (memory → keychain), or null if it hasn't been derived on this install yet. */
export async function getDataKey(): Promise<string | null> {
  if (cachedKey) return cachedKey;
  cachedKey = await secureGet(KEY_NAME);
  return cachedKey;
}

/** Forget the key (on logout / account deletion) so the next user can't read the previous one's data. */
export async function clearDataKey(): Promise<void> {
  cachedKey = null;
  await secureDelete(KEY_NAME);
}

// ── Pure helpers (testable without the keychain) ──────────────────────
export function isEncrypted(v: unknown): boolean {
  return typeof v === 'string' && (v as string).startsWith(PREFIX);
}
export function encryptWithKey(obj: unknown, keyHex: string): string {
  return PREFIX + CryptoJS.AES.encrypt(JSON.stringify(obj), keyHex).toString();
}
/** Decrypt an 'enc:'-tagged blob. Returns null on wrong key / corrupt data (caller treats as no data). */
export function decryptWithKey(blob: string, keyHex: string): any | null {
  if (!isEncrypted(blob)) return null;
  try {
    const plain = CryptoJS.AES.decrypt(blob.slice(PREFIX.length), keyHex).toString(CryptoJS.enc.Utf8);
    return plain ? JSON.parse(plain) : null;
  } catch {
    return null;
  }
}

/** Encrypt a payload with the cached key. Returns null if there's NO key — callers must then skip the
 *  cloud write entirely (never fall back to plaintext). The local copy stays safe regardless. */
export async function encryptForSync(obj: unknown): Promise<string | null> {
  const key = await getDataKey();
  return key ? encryptWithKey(obj, key) : null;
}
/** Decrypt a synced value: ciphertext → object; legacy plaintext object → returned as-is (migrates on
 *  the next save); null if it's ciphertext we can't decrypt. */
export async function decryptFromSync(value: unknown): Promise<any | null> {
  if (value == null) return null;
  if (!isEncrypted(value)) return value;   // legacy plaintext object
  const key = await getDataKey();
  return key ? decryptWithKey(value as string, key) : null;
}
