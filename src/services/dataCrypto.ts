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

/* ─ MK-XS-F-135 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * secureGet
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     It reaches outside the app for data and hands back what came back — no arithmetic of its own.
 *
 * Called by ... MK-XS-F-042 getDataKey · MK-XS-F-173 getOrCreateKey
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-055 decryptFromSync · MK-XS-F-072 deleteAccount
 *               MK-XS-F-054 encryptForSync · MK-XS-F-042 getDataKey
 *               MK-XS-F-173 getOrCreateKey · MK-XS-F-074 loadUserData
 *               MK-XS-F-079 loadUserRoot · MK-XS-F-068 regenerateRecoveryCode
 *               MK-XS-F-073 saveUserData · MK-XS-F-077 setUserHousehold
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-135
 * Changed ..... not in git yet (—)
 */
export async function secureGet(name: string): Promise<string | null> {
  try { return await SecureStore.getItemAsync(name); }
  catch { return await AsyncStorage.getItem(`__fallback_${name}`); }
}
/* ─ MK-XS-F-136 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * secureSet
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     It reaches outside the app for data and hands back what came back — no arithmetic of its own.
 *
 * Called by ... MK-XS-F-041 cacheDataKey · MK-XS-F-173 getOrCreateKey
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-041 cacheDataKey · MK-XS-F-173 getOrCreateKey
 *               MK-XS-F-066 loginUser · MK-XS-F-060 registerUser
 *               MK-XS-F-067 restoreWithRecoveryCode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-136
 * Changed ..... not in git yet (—)
 */
export async function secureSet(name: string, value: string): Promise<void> {
  try { await SecureStore.setItemAsync(name, value); }
  catch { await AsyncStorage.setItem(`__fallback_${name}`, value); }
}
/* ─ MK-XS-F-137 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * secureDelete
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     It reaches outside the app for data and hands back what came back — no arithmetic of its own.
 *
 * Called by ... MK-XS-F-043 clearDataKey
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-043 clearDataKey · MK-XS-F-072 deleteAccount
 *               MK-XS-F-069 logoutUser
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-137
 * Changed ..... not in git yet (—)
 */
async function secureDelete(name: string): Promise<void> {
  try { await SecureStore.deleteItemAsync(name); } catch { /* ignore */ }
  try { await AsyncStorage.removeItem(`__fallback_${name}`); } catch { /* ignore */ }
}

// ── DEK lifecycle (the cached, unwrapped key the sync layer uses) ─────
/** Cache the unwrapped DEK (memory + keychain). */
/* ─ MK-XS-F-041 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * cacheDataKey
 *
 * Answers ..... ── DEK lifecycle (the cached, unwrapped key the sync layer uses) ───── Cache the unwrapped DEK (memory + keychain).
 *
 * Formula .....
 *     keeps the data-encryption key in memory and in the device's secure store
 *
 * Called by ... MK-XS-F-060 registerUser · MK-XS-F-066 loginUser
 *               MK-XS-F-067 restoreWithRecoveryCode
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-066 loginUser · MK-XS-F-060 registerUser
 *               MK-XS-F-067 restoreWithRecoveryCode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-041
 * Changed ..... 2026-06-20 (8652b08)
 */
export async function cacheDataKey(dek: string): Promise<void> {
  cachedKey = dek;
  await secureSet(KEY_NAME, dek);
}
/** The cached DEK (memory → keychain), or null if it hasn't been unwrapped on this install yet. */
/* ─ MK-XS-F-042 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * getDataKey
 *
 * Answers ..... The cached DEK (memory → keychain), or null if it hasn't been unwrapped on this install yet.
 *
 * Formula .....
 *     cached key   when cached key
 *     cached key
 *
 * Called by ... MK-XS-F-054 encryptForSync · MK-XS-F-055 decryptFromSync
 *               MK-XS-F-068 regenerateRecoveryCode
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-055 decryptFromSync · MK-XS-F-072 deleteAccount
 *               MK-XS-F-054 encryptForSync · MK-XS-F-074 loadUserData
 *               MK-XS-F-079 loadUserRoot · MK-XS-F-068 regenerateRecoveryCode
 *               MK-XS-F-073 saveUserData · MK-XS-F-077 setUserHousehold
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-042
 * Changed ..... 2026-06-20 (8652b08)
 */
export async function getDataKey(): Promise<string | null> {
  if (cachedKey) return cachedKey;
  cachedKey = await secureGet(KEY_NAME);
  return cachedKey;
}
/** Forget the DEK (on logout / account deletion). */
/* ─ MK-XS-F-043 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * clearDataKey
 *
 * Answers ..... Forget the DEK (on logout / account deletion).
 *
 * Formula .....
 *     forgets the data-encryption key in memory and in the secure store
 *
 * Called by ... MK-XS-F-069 logoutUser · MK-XS-F-072 deleteAccount
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-072 deleteAccount · MK-XS-F-069 logoutUser
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-043
 * Changed ..... 2026-06-20 (8652b08)
 */
export async function clearDataKey(): Promise<void> {
  cachedKey = null;
  await secureDelete(KEY_NAME);
}

// ── Key generation ───────────────────────────────────────────────────
/** A fresh random 256-bit data key (hex). */
/* ─ MK-XS-F-044 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * generateDataKey
 *
 * Answers ..... ── Key generation ─────────────────────────────────────────────────── A fresh random 256-bit data key (hex).
 *
 * Formula .....
 *     crypto js.lib.word array.random(32).to string(crypto js.enc.hex)
 *
 * Called by ... MK-XS-F-060 registerUser · MK-XS-F-066 loginUser
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-066 loginUser · MK-XS-F-060 registerUser
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-044
 * Changed ..... 2026-06-20 (8652b08)
 */
export function generateDataKey(): string {
  return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
}
/** A human-friendly recovery code, e.g. "K7Q2-9FBR-..." (5 groups of 4, ~100 bits). */
/* ─ MK-XS-F-045 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * generateRecoveryCode
 *
 * Answers ..... A human-friendly recovery code, e.g.
 *
 * Formula .....
 *     bytes = crypto js.lib.word array.random(20)
 *     words = bytes.words
 *     out = ''
 *     byte = (words[i >>> 2] >>> (24 − (i % 4) × 8)) & 0xff
 *     the answer = (out.match( ÷ .{1,4} ÷ g) as string[]).join('-')
 *
 * Called by ... MK-XS-F-060 registerUser · MK-XS-F-066 loginUser
 *               MK-XS-F-068 regenerateRecoveryCode
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-066 loginUser · MK-XS-F-068 regenerateRecoveryCode
 *               MK-XS-F-060 registerUser
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-045
 * Changed ..... 2026-06-20 (8652b08)
 */
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
/* ─ MK-XS-F-138 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * deriveKeyFromSecret
 *
 * Answers ..... ── Wrapping (lock/unlock the DEK with a password or recovery code) ───
 *
 * Formula .....
 *     crypto js.PBKDF2(secret.trim(), uid, { key size: 256 ÷ 32, iterations: PBKDF2_ITERS }).to string(crypto js.enc.hex)
 *
 * Called by ... MK-XS-F-047 unwrapWithPassword · MK-XS-F-048 unwrapWithRecovery
 *               MK-XS-F-139 wrapWithSecret
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-066 loginUser · MK-XS-F-046 makeEnvelope
 *               MK-XS-F-068 regenerateRecoveryCode · MK-XS-F-060 registerUser
 *               MK-XS-F-067 restoreWithRecoveryCode · MK-XS-F-049 rewrapPassword
 *               MK-XS-F-050 rewrapRecovery · MK-XS-F-047 unwrapWithPassword
 *               MK-XS-F-048 unwrapWithRecovery · MK-XS-F-139 wrapWithSecret
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-138
 * Changed ..... not in git yet (—)
 */
function deriveKeyFromSecret(secret: string, uid: string): string {
  return CryptoJS.PBKDF2(secret.trim(), uid, { keySize: 256 / 32, iterations: PBKDF2_ITERS }).toString(CryptoJS.enc.Hex);
}
/* ─ MK-XS-F-139 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * wrapWithSecret
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     encrypt with key(dek, derive key from secret(secret, uid))
 *
 * Called by ... MK-XS-F-046 makeEnvelope · MK-XS-F-049 rewrapPassword
 *               MK-XS-F-050 rewrapRecovery
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-066 loginUser · MK-XS-F-046 makeEnvelope
 *               MK-XS-F-068 regenerateRecoveryCode · MK-XS-F-060 registerUser
 *               MK-XS-F-067 restoreWithRecoveryCode · MK-XS-F-049 rewrapPassword
 *               MK-XS-F-050 rewrapRecovery
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-139
 * Changed ..... not in git yet (—)
 */
function wrapWithSecret(dek: string, uid: string, secret: string): string {
  return encryptWithKey(dek, deriveKeyFromSecret(secret, uid));
}
/** Build the stored envelope: the DEK locked by both the password and the recovery code. */
/* ─ MK-XS-F-046 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * makeEnvelope
 *
 * Answers ..... Build the stored envelope: the DEK locked by both the password and the recovery code.
 *
 * Formula .....
 *     p = wrap with secret(dek, uid, password)
 *     r = wrap with secret(dek, uid, recovery code)
 *
 * Called by ... MK-XS-F-060 registerUser · MK-XS-F-066 loginUser
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-066 loginUser · MK-XS-F-060 registerUser
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-046
 * Changed ..... 2026-06-20 (8652b08)
 */
export function makeEnvelope(dek: string, uid: string, password: string, recoveryCode: string): KeyEnvelope {
  return { p: wrapWithSecret(dek, uid, password), r: wrapWithSecret(dek, uid, recoveryCode) };
}
/** Unlock the DEK with the password (null if the password is wrong / was reset). */
/* ─ MK-XS-F-047 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * unwrapWithPassword
 *
 * Answers ..... Unlock the DEK with the password (null if the password is wrong / was reset).
 *
 * Formula .....
 *     decrypt with key(env.p, derive key from secret(password, uid))   if env.p
 *     nothing   otherwise
 *
 * Called by ... MK-XS-F-066 loginUser
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-066 loginUser
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-047
 * Changed ..... 2026-06-20 (8652b08)
 */
export function unwrapWithPassword(env: KeyEnvelope, uid: string, password: string): string | null {
  return env?.p ? decryptWithKey(env.p, deriveKeyFromSecret(password, uid)) : null;
}
/** Unlock the DEK with the recovery code (null if the code is wrong). */
/* ─ MK-XS-F-048 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * unwrapWithRecovery
 *
 * Answers ..... Unlock the DEK with the recovery code (null if the code is wrong).
 *
 * Formula .....
 *     decrypt with key(env.r, derive key from secret(recovery code, uid))   if env.r
 *     nothing   otherwise
 *
 * Called by ... MK-XS-F-067 restoreWithRecoveryCode
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-067 restoreWithRecoveryCode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-048
 * Changed ..... 2026-06-20 (8652b08)
 */
export function unwrapWithRecovery(env: KeyEnvelope, uid: string, recoveryCode: string): string | null {
  return env?.r ? decryptWithKey(env.r, deriveKeyFromSecret(recoveryCode, uid)) : null;
}
/** Re-lock an existing envelope's password copy under a new password (after a recovery-code restore). */
/* ─ MK-XS-F-049 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rewrapPassword
 *
 * Answers ..... Re-lock an existing envelope's password copy under a new password (after a recovery-code restore).
 *
 * Formula .....
 *     ...env = ...env
 *     p = wrap with secret(dek, uid, new password)
 *
 * Called by ... MK-XS-F-067 restoreWithRecoveryCode
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-067 restoreWithRecoveryCode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-049
 * Changed ..... 2026-06-20 (8652b08)
 */
export function rewrapPassword(env: KeyEnvelope, dek: string, uid: string, newPassword: string): KeyEnvelope {
  return { ...env, p: wrapWithSecret(dek, uid, newPassword) };
}
/** Replace an envelope's recovery copy with a new recovery code (rotate the code). */
/* ─ MK-XS-F-050 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rewrapRecovery
 *
 * Answers ..... Replace an envelope's recovery copy with a new recovery code (rotate the code).
 *
 * Formula .....
 *     ...env = ...env
 *     r = wrap with secret(dek, uid, recovery code)
 *
 * Called by ... MK-XS-F-068 regenerateRecoveryCode
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-068 regenerateRecoveryCode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-050
 * Changed ..... 2026-06-20 (8652b08)
 */
export function rewrapRecovery(env: KeyEnvelope, dek: string, uid: string, recoveryCode: string): KeyEnvelope {
  return { ...env, r: wrapWithSecret(dek, uid, recoveryCode) };
}

// ── Low-level AES helpers (also used to wrap the DEK) ─────────────────
/* ─ MK-XS-F-051 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * isEncrypted
 *
 * Answers ..... ── Low-level AES helpers (also used to wrap the DEK) ─────────────────
 *
 * Formula .....
 *     typeof v = 'string' and (v as string).starts with(PREFIX)
 *
 * Called by ... MK-XS-F-053 decryptWithKey · MK-XS-F-055 decryptFromSync
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-055 decryptFromSync · MK-XS-F-053 decryptWithKey
 *               MK-XS-F-072 deleteAccount · MK-XS-F-074 loadUserData
 *               MK-XS-F-079 loadUserRoot · MK-XS-F-066 loginUser
 *               MK-XS-F-067 restoreWithRecoveryCode · MK-XS-F-077 setUserHousehold
 *               MK-XS-F-047 unwrapWithPassword · MK-XS-F-048 unwrapWithRecovery
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-051
 * Changed ..... 2026-06-20 (8652b08)
 */
export function isEncrypted(v: unknown): boolean {
  return typeof v === 'string' && (v as string).startsWith(PREFIX);
}
/* ─ MK-XS-F-052 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * encryptWithKey
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     PREFIX + crypto js.AES.encrypt(JSON.stringify(obj), key hex).to string()
 *
 * Called by ... MK-XS-F-054 encryptForSync · MK-XS-F-139 wrapWithSecret
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-054 encryptForSync · MK-XS-F-066 loginUser
 *               MK-XS-F-046 makeEnvelope · MK-XS-F-068 regenerateRecoveryCode
 *               MK-XS-F-060 registerUser · MK-XS-F-067 restoreWithRecoveryCode
 *               MK-XS-F-049 rewrapPassword · MK-XS-F-050 rewrapRecovery
 *               MK-XS-F-073 saveUserData · MK-XS-F-139 wrapWithSecret
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-052
 * Changed ..... 2026-06-20 (8652b08)
 */
export function encryptWithKey(obj: unknown, keyHex: string): string {
  return PREFIX + CryptoJS.AES.encrypt(JSON.stringify(obj), keyHex).toString();
}
/** Decrypt an 'enc:'-tagged blob. Returns null on wrong key / corrupt data. */
/* ─ MK-XS-F-053 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * decryptWithKey
 *
 * Answers ..... Decrypt an 'enc:'-tagged blob.
 *
 * Formula .....
 *     nothing   when !is encrypted(blob)
 *     plain = crypto js.AES.decrypt(blob.slice(PREFIX.length), key hex).to string(crypto js.enc.utf8)
 *     the answer:
 *     JSON.parse(plain)   if plain
 *     nothing   otherwise
 *
 * Called by ... MK-XS-F-047 unwrapWithPassword · MK-XS-F-048 unwrapWithRecovery
 *               MK-XS-F-055 decryptFromSync
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-055 decryptFromSync · MK-XS-F-072 deleteAccount
 *               MK-XS-F-074 loadUserData · MK-XS-F-079 loadUserRoot
 *               MK-XS-F-066 loginUser · MK-XS-F-067 restoreWithRecoveryCode
 *               MK-XS-F-077 setUserHousehold · MK-XS-F-047 unwrapWithPassword
 *               MK-XS-F-048 unwrapWithRecovery
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-053
 * Changed ..... 2026-06-20 (8652b08)
 */
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
/* ─ MK-XS-F-054 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * encryptForSync
 *
 * Answers ..... ── The sync layer's interface (operates on the cached DEK) ─────────── Encrypt a payload with the cached DEK.
 *
 * Formula .....
 *     key = await get data key()
 *     the answer:
 *     encrypt with key(obj, key)   if key
 *     nothing   otherwise
 *
 * Called by ... MK-XS-F-073 saveUserData
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-073 saveUserData
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-054
 * Changed ..... 2026-06-20 (8652b08)
 */
export async function encryptForSync(obj: unknown): Promise<string | null> {
  const key = await getDataKey();
  return key ? encryptWithKey(obj, key) : null;
}
/** Decrypt a synced value: ciphertext → object; legacy plaintext object → returned as-is; null if it's
 *  ciphertext we can't decrypt (no key). */
/* ─ MK-XS-F-055 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * decryptFromSync
 *
 * Answers ..... Decrypt a synced value: ciphertext → object; legacy plaintext object → returned as-is; null if it's ciphertext we can't decrypt (no key).
 *
 * Formula .....
 *     nothing   when value = nothing
 *     value   when !is encrypted(value)
 *     key = await get data key()
 *     the answer:
 *     decrypt with key(value as string, key)   if key
 *     nothing   otherwise
 *
 * Called by ... MK-XS-F-074 loadUserData · MK-XS-F-079 loadUserRoot
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-072 deleteAccount · MK-XS-F-074 loadUserData
 *               MK-XS-F-079 loadUserRoot · MK-XS-F-077 setUserHousehold
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-055
 * Changed ..... 2026-06-19 (d42df82)
 */
export async function decryptFromSync(value: unknown): Promise<any | null> {
  if (value == null) return null;
  if (!isEncrypted(value)) return value;   // legacy plaintext object
  const key = await getDataKey();
  return key ? decryptWithKey(value as string, key) : null;
}
