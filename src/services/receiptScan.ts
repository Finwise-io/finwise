// Receipt capture + OCR. Capture/pick works today (camera on device, photo library in the
// Simulator). On-device OCR via ML Kit activates after a dev-client rebuild (`npx expo run:ios`);
// until then ocrReceipt() returns empty and the user fills the amount manually.
import * as ImagePicker from 'expo-image-picker';

let MLKit: any = null;
try { MLKit = require('@react-native-ml-kit/text-recognition').default; } catch { MLKit = null; }

export function ocrAvailable(): boolean {
  try { return !!MLKit && typeof MLKit.recognize === 'function'; } catch { return false; }
}

/** Capture (camera) or pick (library) a receipt image; returns its uri or null if cancelled/denied. */
export async function pickReceipt(source: 'camera' | 'library'): Promise<string | null> {
  if (source === 'camera') {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) return null;
    const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    return r.canceled ? null : (r.assets?.[0]?.uri ?? null);
  }
  const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!p.granted) return null;
  const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
  return r.canceled ? null : (r.assets?.[0]?.uri ?? null);
}

/** Heuristic parse of receipt text → total amount + merchant. */
export function parseReceipt(text: string): { amount?: number; merchant?: string } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const merchant = lines.find((l) => /[A-Za-z]{3,}/.test(l));   // first word-y line ≈ store name
  const amtRe = /(\d{1,3}(?:,\d{3})*\.\d{2})/;
  const toNum = (s: string) => parseFloat(s.replace(/,/g, ''));
  let amount: number | undefined;
  // prefer a line that says "total" (but not "subtotal")
  const totalLine = lines.find((l) => /\btotal\b/i.test(l) && !/sub-?total/i.test(l) && amtRe.test(l));
  if (totalLine) amount = toNum(totalLine.match(amtRe)![1]);
  if (amount == null) {                                          // else the largest money figure
    const all = lines.flatMap((l) => (l.match(new RegExp(amtRe, 'g')) ?? []).map(toNum));
    if (all.length) amount = Math.max(...all);
  }
  return { amount, merchant };
}

export async function ocrReceipt(uri: string): Promise<{ amount?: number; merchant?: string; raw: string }> {
  if (!ocrAvailable()) return { raw: '' };
  try {
    const res = await MLKit.recognize(uri);
    const text: string = res?.text ?? '';
    return { ...parseReceipt(text), raw: text };
  } catch { return { raw: '' }; }
}
