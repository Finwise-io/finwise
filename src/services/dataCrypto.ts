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
 * Reaches ..... 25 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-233 commitAssetRecord · MK-XS-F-277 createInviteWithKeyCode
 *               MK-XS-F-258 currentKeyId · MK-XS-F-055 decryptFromSync
 *               MK-XS-F-259 decryptFromSyncWithId · MK-XS-F-072 deleteAccount
 *               MK-XS-F-054 encryptForSync · MK-XS-F-260 encryptForSyncWithId
 *               MK-XS-F-042 getDataKey · MK-XS-F-173 getOrCreateKey
 *               MK-XS-F-279 leaveReturnCode · MK-XS-F-223 loadAssetRecordPart
 *               MK-XS-F-239 loadCloudRecord · MK-XS-F-275 loadMinAppVersion
 *               MK-XS-F-074 loadUserData · MK-XS-F-079 loadUserRoot
 *               MK-XS-F-285 mergeQuestions · MK-XS-F-272 openWithId
 *               … and 7 more — the full list is on functions_from_code
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
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-041 cacheDataKey · MK-XS-F-173 getOrCreateKey
 *               MK-XS-F-278 joinHouseholdWithKeyCode · MK-XS-F-066 loginUser
 *               MK-XS-F-060 registerUser · MK-XS-F-280 restoreOwnerWithReturnCode
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
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-043 clearDataKey · MK-XS-F-072 deleteAccount
 *               MK-XS-F-275 loadMinAppVersion · MK-XS-F-069 logoutUser
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
 *               MK-XS-F-067 restoreWithRecoveryCode · MK-XS-F-278 joinHouseholdWithKeyCode
 *               MK-XS-F-280 restoreOwnerWithReturnCode
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-278 joinHouseholdWithKeyCode · MK-XS-F-066 loginUser
 *               MK-XS-F-060 registerUser · MK-XS-F-280 restoreOwnerWithReturnCode
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
 *               MK-XS-F-068 regenerateRecoveryCode · MK-XS-F-073 saveUserData
 *               MK-XS-F-258 currentKeyId · MK-XS-F-259 decryptFromSyncWithId
 *               MK-XS-F-260 encryptForSyncWithId · MK-XS-F-272 openWithId
 *               MK-XS-F-273 sealWithId · MK-XS-F-274 syncAssetRecordQuestions
 *               MK-XS-F-277 createInviteWithKeyCode · MK-XS-F-279 leaveReturnCode
 *
 * Reaches ..... 23 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-233 commitAssetRecord · MK-XS-F-277 createInviteWithKeyCode
 *               MK-XS-F-258 currentKeyId · MK-XS-F-055 decryptFromSync
 *               MK-XS-F-259 decryptFromSyncWithId · MK-XS-F-072 deleteAccount
 *               MK-XS-F-054 encryptForSync · MK-XS-F-260 encryptForSyncWithId
 *               MK-XS-F-279 leaveReturnCode · MK-XS-F-223 loadAssetRecordPart
 *               MK-XS-F-239 loadCloudRecord · MK-XS-F-275 loadMinAppVersion
 *               MK-XS-F-074 loadUserData · MK-XS-F-079 loadUserRoot
 *               MK-XS-F-285 mergeQuestions · MK-XS-F-272 openWithId
 *               MK-XS-F-242 readUserProfile · MK-XS-F-068 regenerateRecoveryCode
 *               … and 5 more — the full list is on functions_from_code
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
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-072 deleteAccount · MK-XS-F-275 loadMinAppVersion
 *               MK-XS-F-069 logoutUser
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
 *               MK-XS-F-068 regenerateRecoveryCode · MK-XS-F-264 generateKeyCode
 *               MK-XS-F-279 leaveReturnCode · MK-XS-F-280 restoreOwnerWithReturnCode
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-277 createInviteWithKeyCode · MK-XS-F-264 generateKeyCode
 *               MK-XS-F-279 leaveReturnCode · MK-XS-F-066 loginUser
 *               MK-XS-F-068 regenerateRecoveryCode · MK-XS-F-060 registerUser
 *               MK-XS-F-280 restoreOwnerWithReturnCode
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
 *               MK-XS-F-139 wrapWithSecret · MK-XS-F-268 wrapWithKeyCode
 *               MK-XS-F-269 unwrapWithKeyCode · MK-XS-F-270 wrapWithReturnCode
 *               MK-XS-F-271 unwrapWithReturnCode
 *
 * Reaches ..... 18 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-277 createInviteWithKeyCode · MK-XS-F-278 joinHouseholdWithKeyCode
 *               MK-XS-F-279 leaveReturnCode · MK-XS-F-066 loginUser
 *               MK-XS-F-046 makeEnvelope · MK-XS-F-068 regenerateRecoveryCode
 *               MK-XS-F-060 registerUser · MK-XS-F-280 restoreOwnerWithReturnCode
 *               MK-XS-F-067 restoreWithRecoveryCode · MK-XS-F-049 rewrapPassword
 *               MK-XS-F-050 rewrapRecovery · MK-XS-F-269 unwrapWithKeyCode
 *               MK-XS-F-047 unwrapWithPassword · MK-XS-F-048 unwrapWithRecovery
 *               MK-XS-F-271 unwrapWithReturnCode · MK-XS-F-268 wrapWithKeyCode
 *               MK-XS-F-270 wrapWithReturnCode · MK-XS-F-139 wrapWithSecret
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
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-278 joinHouseholdWithKeyCode · MK-XS-F-066 loginUser
 *               MK-XS-F-046 makeEnvelope · MK-XS-F-068 regenerateRecoveryCode
 *               MK-XS-F-060 registerUser · MK-XS-F-280 restoreOwnerWithReturnCode
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
 *               MK-XS-F-278 joinHouseholdWithKeyCode · MK-XS-F-280 restoreOwnerWithReturnCode
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-278 joinHouseholdWithKeyCode · MK-XS-F-066 loginUser
 *               MK-XS-F-060 registerUser · MK-XS-F-280 restoreOwnerWithReturnCode
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
 *               MK-XS-F-259 decryptFromSyncWithId
 *
 * Reaches ..... 21 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-055 decryptFromSync · MK-XS-F-259 decryptFromSyncWithId
 *               MK-XS-F-053 decryptWithKey · MK-XS-F-072 deleteAccount
 *               MK-XS-F-278 joinHouseholdWithKeyCode · MK-XS-F-223 loadAssetRecordPart
 *               MK-XS-F-275 loadMinAppVersion · MK-XS-F-074 loadUserData
 *               MK-XS-F-079 loadUserRoot · MK-XS-F-066 loginUser
 *               MK-XS-F-272 openWithId · MK-XS-F-242 readUserProfile
 *               MK-XS-F-280 restoreOwnerWithReturnCode · MK-XS-F-067 restoreWithRecoveryCode
 *               MK-XS-F-073 saveUserData · MK-XS-F-077 setUserHousehold
 *               MK-XS-F-274 syncAssetRecordQuestions · MK-XS-F-269 unwrapWithKeyCode
 *               … and 3 more — the full list is on functions_from_code
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
 *               MK-XS-F-260 encryptForSyncWithId · MK-XS-F-268 wrapWithKeyCode
 *               MK-XS-F-270 wrapWithReturnCode
 *
 * Reaches ..... 23 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-233 commitAssetRecord · MK-XS-F-277 createInviteWithKeyCode
 *               MK-XS-F-054 encryptForSync · MK-XS-F-260 encryptForSyncWithId
 *               MK-XS-F-278 joinHouseholdWithKeyCode · MK-XS-F-279 leaveReturnCode
 *               MK-XS-F-239 loadCloudRecord · MK-XS-F-066 loginUser
 *               MK-XS-F-046 makeEnvelope · MK-XS-F-285 mergeQuestions
 *               MK-XS-F-068 regenerateRecoveryCode · MK-XS-F-060 registerUser
 *               MK-XS-F-280 restoreOwnerWithReturnCode · MK-XS-F-067 restoreWithRecoveryCode
 *               MK-XS-F-049 rewrapPassword · MK-XS-F-050 rewrapRecovery
 *               MK-XS-F-222 saveAssetRecordPart · MK-XS-F-073 saveUserData
 *               … and 5 more — the full list is on functions_from_code
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
 *               MK-XS-F-055 decryptFromSync · MK-XS-F-259 decryptFromSyncWithId
 *               MK-XS-F-269 unwrapWithKeyCode · MK-XS-F-271 unwrapWithReturnCode
 *
 * Reaches ..... 20 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-055 decryptFromSync · MK-XS-F-259 decryptFromSyncWithId
 *               MK-XS-F-072 deleteAccount · MK-XS-F-278 joinHouseholdWithKeyCode
 *               MK-XS-F-223 loadAssetRecordPart · MK-XS-F-275 loadMinAppVersion
 *               MK-XS-F-074 loadUserData · MK-XS-F-079 loadUserRoot
 *               MK-XS-F-066 loginUser · MK-XS-F-272 openWithId
 *               MK-XS-F-242 readUserProfile · MK-XS-F-280 restoreOwnerWithReturnCode
 *               MK-XS-F-067 restoreWithRecoveryCode · MK-XS-F-073 saveUserData
 *               MK-XS-F-077 setUserHousehold · MK-XS-F-274 syncAssetRecordQuestions
 *               MK-XS-F-269 unwrapWithKeyCode · MK-XS-F-047 unwrapWithPassword
 *               … and 2 more — the full list is on functions_from_code
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
 * Called by ... MK-XS-F-073 saveUserData · MK-XS-F-273 sealWithId
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-233 commitAssetRecord · MK-XS-F-239 loadCloudRecord
 *               MK-XS-F-285 mergeQuestions · MK-XS-F-222 saveAssetRecordPart
 *               MK-XS-F-073 saveUserData · MK-XS-F-273 sealWithId
 *               MK-XS-F-274 syncAssetRecordQuestions
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
 * Called by ... MK-XS-F-073 saveUserData · MK-XS-F-272 openWithId
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-072 deleteAccount · MK-XS-F-223 loadAssetRecordPart
 *               MK-XS-F-275 loadMinAppVersion · MK-XS-F-074 loadUserData
 *               MK-XS-F-079 loadUserRoot · MK-XS-F-272 openWithId
 *               MK-XS-F-242 readUserProfile · MK-XS-F-073 saveUserData
 *               MK-XS-F-077 setUserHousehold · MK-XS-F-274 syncAssetRecordQuestions
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

// ── THE CLOUD COPY OF THE MASTER RECORD, design v02 (2026-11-12) ─────────────────────────────────────────────────────

/** R12: the fingerprint of a key — a salted one-way hash (HMAC-SHA-256 under a fixed label), its first 12 hex letters. It
 *  names which key locked a document and cannot reveal the key. */
/* ─ MK-XS-F-257 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * keyIdOf
 *
 * Answers ..... R12: the fingerprint of a key — a salted one-way hash (HMAC-SHA-256 under a fixed label), its first 12 hex letters.
 *
 * Formula .....
 *     the first 12 of crypto js.hmac sha256('moneykeel − key − fingerprint − v1', key hex).to string(crypto js.enc.hex)
 *
 * Called by ... MK-XS-F-073 saveUserData · MK-XS-F-258 currentKeyId
 *               MK-XS-F-259 decryptFromSyncWithId · MK-XS-F-260 encryptForSyncWithId
 *               MK-XS-F-272 openWithId · MK-XS-F-273 sealWithId
 *
 * Reaches ..... 18 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-233 commitAssetRecord · MK-XS-F-258 currentKeyId
 *               MK-XS-F-259 decryptFromSyncWithId · MK-XS-F-072 deleteAccount
 *               MK-XS-F-260 encryptForSyncWithId · MK-XS-F-223 loadAssetRecordPart
 *               MK-XS-F-239 loadCloudRecord · MK-XS-F-275 loadMinAppVersion
 *               MK-XS-F-074 loadUserData · MK-XS-F-079 loadUserRoot
 *               MK-XS-F-285 mergeQuestions · MK-XS-F-272 openWithId
 *               MK-XS-F-242 readUserProfile · MK-XS-F-222 saveAssetRecordPart
 *               MK-XS-F-073 saveUserData · MK-XS-F-273 sealWithId
 *               MK-XS-F-077 setUserHousehold · MK-XS-F-274 syncAssetRecordQuestions
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-257
 * Changed ..... not in git yet (—)
 */
export function keyIdOf(keyHex: string): string {
  return CryptoJS.HmacSHA256('moneykeel-key-fingerprint-v1', keyHex).toString(CryptoJS.enc.Hex).slice(0, 12);
}
/** The fingerprint of the key on this phone, or null where there is none yet. */
/* ─ MK-XS-F-258 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * currentKeyId
 *
 * Answers ..... The fingerprint of the key on this phone, or null where there is none yet.
 *
 * Formula .....
 *     key = await get data key()
 *     the answer:
 *     key id of(key)   if key
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-258
 * Changed ..... not in git yet (—)
 */
export async function currentKeyId(): Promise<string | null> {
  const key = await getDataKey();
  return key ? keyIdOf(key) : null;
}
/** R12 + R18: open a synced value carrying a fingerprint. A fingerprint that is not this phone's key's: unreadable (null),
 *  never tried. No fingerprint (written before this change): the key is tried — it opens, it is this key's. */
/* ─ MK-XS-F-259 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * decryptFromSyncWithId
 *
 * Answers ..... R12 + R18: open a synced value carrying a fingerprint.
 *
 * Formula .....
 *     nothing   when value = nothing
 *     value   when !is encrypted(value)
 *     key = await get data key()
 *     nothing   when key is missing
 *     nothing   when key id and key id of(key) ! = key id
 *     the answer = decrypt with key(value as string, key)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-259
 * Changed ..... not in git yet (—)
 */
export async function decryptFromSyncWithId(value: unknown, keyId: string | null | undefined): Promise<any | null> {
  if (value == null) return null;
  if (!isEncrypted(value)) return value;
  const key = await getDataKey();
  if (!key) return null;
  if (keyId && keyIdOf(key) !== keyId) return null;
  return decryptWithKey(value as string, key);
}
/** Encrypt with the phone's key and name the key: { enc, keyId }, or null where the phone has no key yet. */
/* ─ MK-XS-F-260 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * encryptForSyncWithId
 *
 * Answers ..... Encrypt with the phone's key and name the key: { enc, keyId }, or null where the phone has no key yet.
 *
 * Formula .....
 *     key = await get data key()
 *     the answer:
 *     enc = encrypt with key(obj, key)
 *     key id = key id of(key)   if key
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-260
 * Changed ..... not in git yet (—)
 */
export async function encryptForSyncWithId(obj: unknown): Promise<{ enc: string; keyId: string } | null> {
  const key = await getDataKey();
  return key ? { enc: encryptWithKey(obj, key), keyId: keyIdOf(key) } : null;
}

/** R1: 12 letters from the secure random source the data key comes from (a–z and 0–9). */
/* ─ MK-XS-F-261 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * generateDeviceTag
 *
 * Answers ..... R1: 12 letters from the secure random source the data key comes from (a–z and 0–9).
 *
 * Formula .....
 *     a = 'abcdefghijklmnopqrstuvwxyz0123456789'
 *     w = crypto js.lib.word array.random(12).words
 *     out = ''
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-XS-F-262 getDeviceTag
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-262 getDeviceTag · MK-XS-F-309 mergeNaming
 *               MK-XS-F-310 questionsAfterMerge · MK-XS-F-263 renewDeviceTag
 *               MK-XS-F-308 startRowTag
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-261
 * Changed ..... not in git yet (—)
 */
export function generateDeviceTag(): string {
  const A = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const w = CryptoJS.lib.WordArray.random(12).words;
  let out = '';
  for (let i = 0; i < 12; i++) out += A[((w[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff) % A.length];
  return out;
}
const DEVICE_TAG = 'moneykeel-row-tag';
let deviceTagCache: string | null = null;
/** R1: this phone's row tag, kept in the keychain with the "this device only" setting, so a backup restored on another phone
 *  has none and makes its own. Where the keychain cannot keep it, it lives in memory only (never in backed-up storage): a new
 *  tag next launch, which is safe — names stay unique. */
/* ─ MK-XS-F-262 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * getDeviceTag
 *
 * Answers ..... R1: this phone's row tag, kept in the keychain with the "this device only" setting, so a backup restored on another phone has none and makes its own.
 *
 * Formula .....
 *     device tag cache   when device tag cache
 *     tag = nothing
 *     the answer = tag
 *
 * Called by ... MK-XS-F-263 renewDeviceTag · MK-XS-F-308 startRowTag
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-309 mergeNaming · MK-XS-F-310 questionsAfterMerge
 *               MK-XS-F-263 renewDeviceTag · MK-XS-F-308 startRowTag
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-262
 * Changed ..... not in git yet (—)
 */
export async function getDeviceTag(): Promise<string> {
  if (deviceTagCache) return deviceTagCache;
  let tag: string | null = null;
  try { tag = await SecureStore.getItemAsync(DEVICE_TAG, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY } as any); } catch { tag = null; }
  if (!tag) {
    tag = generateDeviceTag();
    try { await SecureStore.setItemAsync(DEVICE_TAG, tag, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY } as any); } catch { /* memory only */ }
  }
  deviceTagCache = tag;
  return tag;
}
/** R1: a phone that finds its tag on rows it did not write takes a new one (the caller decides; part B wires it). */
/* ─ MK-XS-F-263 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * renewDeviceTag
 *
 * Answers ..... R1: a phone that finds its tag on rows it did not write takes a new one (the caller decides; part B wires it).
 *
 * Formula .....
 *     get device tag()
 *
 * Called by ... MK-XS-F-310 questionsAfterMerge
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-310 questionsAfterMerge
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-263
 * Changed ..... not in git yet (—)
 */
export async function renewDeviceTag(): Promise<string> {
  deviceTagCache = null;
  try { await SecureStore.deleteItemAsync(DEVICE_TAG, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY } as any); } catch { /* ignore */ }
  return getDeviceTag();
}

/** R13: the one-time key code the owner's phone shows beside the invite code — 20 letters from the recovery-code alphabet. */
/* ─ MK-XS-F-264 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * generateKeyCode
 *
 * Answers ..... R13: the one-time key code the owner's phone shows beside the invite code — 20 letters from the recovery-code alphabet.
 *
 * Formula .....
 *     generate recovery code().replace( ÷ - ÷ g, '')
 *
 * Called by ... MK-XS-F-277 createInviteWithKeyCode
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-277 createInviteWithKeyCode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-264
 * Changed ..... not in git yet (—)
 */
export function generateKeyCode(): string {
  return generateRecoveryCode().replace(/-/g, '');
}
/** Writes a typed code one way: spaces and dashes taken out, letters in capitals, so a code typed with or without them opens the same lock. */
/* ─ MK-XS-F-265 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * normCode
 *
 * Answers ..... Writes a typed code one way: spaces and dashes taken out, letters in capitals, so a code typed with or without them opens the same lock.
 *
 * Formula .....
 *     replace( ÷ [\s-] ÷ g, '').to upper case()
 *
 * Called by ... MK-XS-F-266 keyCodeProof · MK-XS-F-268 wrapWithKeyCode
 *               MK-XS-F-269 unwrapWithKeyCode · MK-XS-F-270 wrapWithReturnCode
 *               MK-XS-F-271 unwrapWithReturnCode
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-277 createInviteWithKeyCode · MK-XS-F-278 joinHouseholdWithKeyCode
 *               MK-XS-F-267 keyCodeCheck · MK-XS-F-266 keyCodeProof
 *               MK-XS-F-279 leaveReturnCode · MK-XS-F-280 restoreOwnerWithReturnCode
 *               MK-XS-F-269 unwrapWithKeyCode · MK-XS-F-271 unwrapWithReturnCode
 *               MK-XS-F-268 wrapWithKeyCode · MK-XS-F-270 wrapWithReturnCode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-265
 * Changed ..... not in git yet (—)
 */
const normCode = (c: string) => c.replace(/[\s-]/g, '').toUpperCase();
/** R13: the proof of a key code, sent when joining (its SHA-256 is the check value the access rules compare). */
/* ─ MK-XS-F-266 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * keyCodeProof
 *
 * Answers ..... R13: the proof of a key code, sent when joining (its SHA-256 is the check value the access rules compare).
 *
 * Formula .....
 *     crypto js.SHA256('moneykeel − key − code − proof:' + norm code(key code)).to string(crypto js.enc.hex)
 *
 * Called by ... MK-XS-F-267 keyCodeCheck · MK-XS-F-278 joinHouseholdWithKeyCode
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-277 createInviteWithKeyCode · MK-XS-F-278 joinHouseholdWithKeyCode
 *               MK-XS-F-267 keyCodeCheck
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-266
 * Changed ..... not in git yet (—)
 */
export function keyCodeProof(keyCode: string): string {
  return CryptoJS.SHA256('moneykeel-key-code-proof:' + normCode(keyCode)).toString(CryptoJS.enc.Hex);
}
/** R13: the check value the invite holds: the SHA-256 of the proof. Neither reveals the key code. */
/* ─ MK-XS-F-267 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * keyCodeCheck
 *
 * Answers ..... R13: the check value the invite holds: the SHA-256 of the proof.
 *
 * Formula .....
 *     crypto js.SHA256(key code proof(key code)).to string(crypto js.enc.hex)
 *
 * Called by ... MK-XS-F-277 createInviteWithKeyCode · MK-XS-F-278 joinHouseholdWithKeyCode
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-277 createInviteWithKeyCode · MK-XS-F-278 joinHouseholdWithKeyCode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-267
 * Changed ..... not in git yet (—)
 */
export function keyCodeCheck(keyCode: string): string {
  return CryptoJS.SHA256(keyCodeProof(keyCode)).toString(CryptoJS.enc.Hex);
}
/** R13: the household key locked by the key code (the invite code salts it). */
/* ─ MK-XS-F-268 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * wrapWithKeyCode
 *
 * Answers ..... R13: the household key locked by the key code (the invite code salts it).
 *
 * Formula .....
 *     encrypt with key(dek, derive key from secret(norm code(key code), 'moneykeel − key − code:' + norm code(invite code)))
 *
 * Called by ... MK-XS-F-277 createInviteWithKeyCode
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-277 createInviteWithKeyCode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-268
 * Changed ..... not in git yet (—)
 */
export function wrapWithKeyCode(dek: string, keyCode: string, inviteCode: string): string {
  return encryptWithKey(dek, deriveKeyFromSecret(normCode(keyCode), 'moneykeel-key-code:' + normCode(inviteCode)));
}
/** Opens the household key locked by a key code and the household invite code; nothing when the codes are wrong. */
/* ─ MK-XS-F-269 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * unwrapWithKeyCode
 *
 * Answers ..... Opens the household key locked by a key code and the household invite code; nothing when the codes are wrong.
 *
 * Formula .....
 *     decrypt with key(wrapped, derive key from secret(norm code(key code), 'moneykeel − key − code:' + norm code(invite code)))
 *
 * Called by ... MK-XS-F-278 joinHouseholdWithKeyCode
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-278 joinHouseholdWithKeyCode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-269
 * Changed ..... not in git yet (—)
 */
export function unwrapWithKeyCode(wrapped: string, keyCode: string, inviteCode: string): string | null {
  return decryptWithKey(wrapped, deriveKeyFromSecret(normCode(keyCode), 'moneykeel-key-code:' + normCode(inviteCode)));
}
/** R14: the household key locked by a one-time return code a member gives an owner who lost both codes. */
/* ─ MK-XS-F-270 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * wrapWithReturnCode
 *
 * Answers ..... R14: the household key locked by a one-time return code a member gives an owner who lost both codes.
 *
 * Formula .....
 *     encrypt with key(dek, derive key from secret(norm code(return code), 'moneykeel − return − code:' + owner))
 *
 * Called by ... MK-XS-F-279 leaveReturnCode
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-279 leaveReturnCode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-270
 * Changed ..... not in git yet (—)
 */
export function wrapWithReturnCode(dek: string, returnCode: string, owner: string): string {
  return encryptWithKey(dek, deriveKeyFromSecret(normCode(returnCode), 'moneykeel-return-code:' + owner));
}
/** Opens the household key locked by a one-time return code for its owner; nothing when the code is wrong. */
/* ─ MK-XS-F-271 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * unwrapWithReturnCode
 *
 * Answers ..... Opens the household key locked by a one-time return code for its owner; nothing when the code is wrong.
 *
 * Formula .....
 *     decrypt with key(wrapped, derive key from secret(norm code(return code), 'moneykeel − return − code:' + owner))
 *
 * Called by ... MK-XS-F-280 restoreOwnerWithReturnCode
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-280 restoreOwnerWithReturnCode
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-271
 * Changed ..... not in git yet (—)
 */
export function unwrapWithReturnCode(wrapped: string, returnCode: string, owner: string): string | null {
  return decryptWithKey(wrapped, deriveKeyFromSecret(normCode(returnCode), 'moneykeel-return-code:' + owner));
}
