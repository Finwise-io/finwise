// Zero-knowledge encryption for the data we sync to the cloud (Firestore), with a recovery code.
//
// A random **data key** (DEK) encrypts the user's financial data. The DEK itself is stored only in
// "wrapped" (encrypted) form, in two copies — one openable by a key derived from the PASSWORD, one by
// a key derived from the RECOVERY CODE. Neither the password nor the recovery code is ever stored or
// sent to the server, so Firestore holds only ciphertext + two locked copies of the DEK that are
// useless without one of those two secrets. The unwrapped DEK is cached in the OS keychain so
// background sync works without re-entering anything.
//
// Forgot the password? Unlock the DEK with the recovery code, then re-wrap it under a new password.
// Lose BOTH password and recovery code? The data is unrecoverable (that's the zero-knowledge promise).
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';   // single module — submodule default-exports are unreliable under Hermes

const KEY_NAME = 'finwise-data-key';   // cached, unwrapped DEK (keychain-protected)
const PREFIX = 'enc:';
const PBKDF2_ITERS = 100000;           // deliberately slow — done once per login
// Recovery-code alphabet: 32 chars, no ambiguous 0/O/1/I so it's safe to read & type.
const RC_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface KeyEnvelope { p: string; r: string; }   // DEK wrapped by {p}assword and {r}ecovery code

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

// ── DEK lifecycle (the cached, unwrapped key the sync layer uses) ─────
/** Cache the unwrapped DEK (memory + keychain). */
export async function cacheDataKey(dek: string): Promise<void> {
  cachedKey = dek;
  await secureSet(KEY_NAME, dek);
}
/** The cached DEK (memory → keychain), or null if it hasn't been unwrapped on this install yet. */
export async function getDataKey(): Promise<string | null> {
  if (cachedKey) return cachedKey;
  cachedKey = await secureGet(KEY_NAME);
  return cachedKey;
}
/** Forget the DEK (on logout / account deletion). */
export async function clearDataKey(): Promise<void> {
  cachedKey = null;
  await secureDelete(KEY_NAME);
}

// ── Key generation ───────────────────────────────────────────────────
/** A fresh random 256-bit data key (hex). */
export function generateDataKey(): string {
  return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
}
/** A human-friendly recovery code, e.g. "K7Q2-9FBR-..." (5 groups of 4, ~100 bits). */
export function generateRecoveryCode(): string {
  const bytes = CryptoJS.lib.WordArray.random(20);
  const words = bytes.words;
  let out = '';
  for (let i = 0; i < 20; i++) {
    const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    out += RC_ALPHABET[byte % 32];
  }
  return (out.match(/.{1,4}/g) as string[]).join('-');
}

// ── Wrapping (lock/unlock the DEK with a password or recovery code) ───
function deriveKeyFromSecret(secret: string, uid: string): string {
  return CryptoJS.PBKDF2(secret.trim(), uid, { keySize: 256 / 32, iterations: PBKDF2_ITERS }).toString(CryptoJS.enc.Hex);
}
function wrapWithSecret(dek: string, uid: string, secret: string): string {
  return encryptWithKey(dek, deriveKeyFromSecret(secret, uid));
}
/** Build the stored envelope: the DEK locked by both the password and the recovery code. */
export function makeEnvelope(dek: string, uid: string, password: string, recoveryCode: string): KeyEnvelope {
  return { p: wrapWithSecret(dek, uid, password), r: wrapWithSecret(dek, uid, recoveryCode) };
}
/** Unlock the DEK with the password (null if the password is wrong / was reset). */
export function unwrapWithPassword(env: KeyEnvelope, uid: string, password: string): string | null {
  return env?.p ? decryptWithKey(env.p, deriveKeyFromSecret(password, uid)) : null;
}
/** Unlock the DEK with the recovery code (null if the code is wrong). */
export function unwrapWithRecovery(env: KeyEnvelope, uid: string, recoveryCode: string): string | null {
  return env?.r ? decryptWithKey(env.r, deriveKeyFromSecret(recoveryCode, uid)) : null;
}
/** Re-lock an existing envelope's password copy under a new password (after a recovery-code restore). */
export function rewrapPassword(env: KeyEnvelope, dek: string, uid: string, newPassword: string): KeyEnvelope {
  return { ...env, p: wrapWithSecret(dek, uid, newPassword) };
}
/** Replace an envelope's recovery copy with a new recovery code (rotate the code). */
export function rewrapRecovery(env: KeyEnvelope, dek: string, uid: string, recoveryCode: string): KeyEnvelope {
  return { ...env, r: wrapWithSecret(dek, uid, recoveryCode) };
}

// ── Low-level AES helpers (also used to wrap the DEK) ─────────────────
export function isEncrypted(v: unknown): boolean {
  return typeof v === 'string' && (v as string).startsWith(PREFIX);
}
export function encryptWithKey(obj: unknown, keyHex: string): string {
  return PREFIX + CryptoJS.AES.encrypt(JSON.stringify(obj), keyHex).toString();
}
/** Decrypt an 'enc:'-tagged blob. Returns null on wrong key / corrupt data. */
export function decryptWithKey(blob: string, keyHex: string): any | null {
  if (!isEncrypted(blob)) return null;
  try {
    const plain = CryptoJS.AES.decrypt(blob.slice(PREFIX.length), keyHex).toString(CryptoJS.enc.Utf8);
    return plain ? JSON.parse(plain) : null;
  } catch {
    return null;
  }
}

// ── The sync layer's interface (operates on the cached DEK) ───────────
/** Encrypt a payload with the cached DEK. Returns null if there's NO key — callers must then skip the
 *  cloud write entirely (never fall back to plaintext). The local copy stays safe regardless. */
export async function encryptForSync(obj: unknown): Promise<string | null> {
  const key = await getDataKey();
  return key ? encryptWithKey(obj, key) : null;
}
/** Decrypt a synced value: ciphertext → object; legacy plaintext object → returned as-is; null if it's
 *  ciphertext we can't decrypt (no key). */
export async function decryptFromSync(value: unknown): Promise<any | null> {
  if (value == null) return null;
  if (!isEncrypted(value)) return value;   // legacy plaintext object
  const key = await getDataKey();
  return key ? decryptWithKey(value as string, key) : null;
}
