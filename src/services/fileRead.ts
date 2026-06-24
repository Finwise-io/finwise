// T19: the top-level `FileSystem.readAsStringAsync` is deprecated in expo-file-system (SDK 56) and now
// THROWS at runtime — that was the real cause of "We couldn't read that file" (not encoding). The
// supported path is `expo-file-system/legacy` (per Expo's own deprecation message) or the new File API.
// ONE wrapper so the deprecation is handled in a single place and a future migration is one edit.
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

export async function readFileString(uri: string, encoding: 'utf8' | 'base64' = 'utf8'): Promise<string> {
  return readAsStringAsync(uri, { encoding: encoding === 'base64' ? EncodingType.Base64 : EncodingType.UTF8 });
}
