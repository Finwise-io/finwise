// T19: the top-level `FileSystem.readAsStringAsync` is deprecated in expo-file-system (SDK 56) and now
// THROWS at runtime — that was the real cause of "We couldn't read that file" (not encoding). The
// supported path is `expo-file-system/legacy` (per Expo's own deprecation message) or the new File API.
// ONE wrapper so the deprecation is handled in a single place and a future migration is one edit.
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

/* ─ MK-XS-F-059 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * readFileString
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     read as string async(uri, { encoding: encoding = 'base64' ? encoding type.base64 : encoding type.UTF8 })
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-059
 * Changed ..... 2026-06-24 (1941797)
 */
export async function readFileString(uri: string, encoding: 'utf8' | 'base64' = 'utf8'): Promise<string> {
  return readAsStringAsync(uri, { encoding: encoding === 'base64' ? EncodingType.Base64 : EncodingType.UTF8 });
}
