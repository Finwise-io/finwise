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

// B4 (2026-09-12): one declaration — the secure read/write live in services/dataCrypto (MK-XS-F-135 / 136)
import { secureGet, secureSet } from '../services/dataCrypto';

/* ─ MK-XS-F-173 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * getOrCreateKey
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     cached key   when cached key
 *     key = await secure get(KEY_NAME)
 *     the answer = key
 *     raw = await async storage.get item(name)
 *     nothing   when raw = nothing
 *     raw   when !raw.starts with(PREFIX)
 *     key = await get or create key()
 *     plain = crypto js.AES.decrypt(raw.slice(PREFIX.length), key).to string(crypto js.enc.utf8)
 *     key = await get or create key()
 *     cipher = crypto js.AES.encrypt(value, key).to string()
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-173
 * Changed ..... not in git yet (—)
 */
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

// ── ONE PERSON'S DATA, SET ASIDE ON THE PHONE (DEC-10813, his "fix it", 2026-11-12) ─────────────────────────────────
// When a different person signs in on this phone, what the phone held of the last person (activity and daily values live
// only here) is kept, encrypted with the same key as the store, in AsyncStorage (never in SecureStore: its ~2KB limit),
// under its owner's uid. Each set-aside is its own item, so a second one never overwrites the first, and an item this
// phone cannot decrypt is skipped, never written over.
const SET_ASIDE_PREFIX = 'finwise-set-aside:';
/** No owner noted (a phone from before this build): only a person whose accounts share an id with it gets it back. */
export const UNNAMED_OWNER = '~unnamed';

const UNREADABLE_SAID = 'finwise-set-aside-unreadable-said';   // not under the prefix: never read as a set-aside
/** Whose a set-aside is, from its key (a uid holds no colon); null where unnamed. */
/* ─ MK-XS-F-255 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * ownerOfSetAsideKey
 *
 * Answers ..... Whose a set-aside is, from its key (a uid holds no colon); null where unnamed.
 *
 * Formula .....
 *     owner = the first of key.slice(SET_ASIDE_PREFIX.length).split(':')
 *     the answer:
 *     nothing   if owner = UNNAMED_OWNER
 *     owner   otherwise
 *     key = `${SET_ASIDE_PREFIX}${owner ?? UNNAMED_OWNER}:${at}:${math.random().to string(36).slice(2, 8)}`
 *     keys = await async storage.get all keys() (or none when missing) where starts with(SET_ASIDE_PREFIX)
 *     out = []
 *     plain = await secure storage.get item(key)
 *     keys = await async storage.get all keys() (or none when missing) where starts with(SET_ASIDE_PREFIX)
 *     said = []
 *     out = []
 *     plain = await secure storage.get item(key)
 *     ok = false
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-255
 * Changed ..... not in git yet (—)
 */
export function ownerOfSetAsideKey(key: string): string | null {
  const owner = key.slice(SET_ASIDE_PREFIX.length).split(':')[0];
  return owner === UNNAMED_OWNER ? null : owner;
}

export type SetAside = { key: string; owner: string | null; at: string; data: Record<string, any> };

export const setAsideStorage = {
  /** Keep this data aside for its owner (null: unnamed). Resolves only once the item is written. */
  put: async (owner: string | null, at: string, data: Record<string, any>): Promise<string> => {
    const key = `${SET_ASIDE_PREFIX}${owner ?? UNNAMED_OWNER}:${at}:${Math.random().toString(36).slice(2, 8)}`;
    await secureStorage.setItem(key, JSON.stringify({ owner, at, data }));
    return key;
  },
  /** Every set-aside on the phone that can be read, oldest first. */
  list: async (): Promise<SetAside[]> => {
    const keys = ((await AsyncStorage.getAllKeys()) ?? []).filter((k) => k.startsWith(SET_ASIDE_PREFIX));
    const out: SetAside[] = [];
    for (const key of keys) {
      const plain = await secureStorage.getItem(key);
      if (!plain) continue;   // cannot be read on this phone: left where it is
      try { const v = JSON.parse(plain); out.push({ key, owner: v.owner ?? null, at: v.at ?? '', data: v.data ?? {} }); } catch { /* left where it is */ }
    }
    return out.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  },
  remove: async (key: string): Promise<void> => { await AsyncStorage.removeItem(key); },
  /** The set-asides this phone cannot decrypt, for the owners asked about, not yet said: each is said once and kept. */
  unreadableNotYetSaid: async (forOwner: (owner: string | null) => boolean): Promise<string[]> => {
    const keys = ((await AsyncStorage.getAllKeys()) ?? []).filter((k) => k.startsWith(SET_ASIDE_PREFIX));
    let said: string[] = [];
    try { said = JSON.parse((await AsyncStorage.getItem(UNREADABLE_SAID)) ?? '[]'); } catch { said = []; }
    const out: string[] = [];
    for (const key of keys) {
      if (said.includes(key) || !forOwner(ownerOfSetAsideKey(key))) continue;
      const plain = await secureStorage.getItem(key);
      let ok = false;
      if (plain) { try { JSON.parse(plain); ok = true; } catch { ok = false; } }
      if (!ok) out.push(key);
    }
    if (out.length) await AsyncStorage.setItem(UNREADABLE_SAID, JSON.stringify([...said, ...out]));
    return out;
  },
};
