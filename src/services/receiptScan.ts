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

/** Heuristic parse of receipt text → total amount + merchant.
 *  BUILD-44 FIX (founder receipt test, 2026-07-19): the old fallback took the LARGEST number on
 *  the receipt — which is usually the CASH TENDERED line ($100 handed over), not the bill. Rules:
 *  1. amounts on payment-mechanics lines (cash/tendered/change/card/…) are NEVER candidates;
 *  2. the LAST explicit total-style line wins (totals print at the bottom; grand total beats a
 *     mid-receipt total); 3. else subtotal; 4. else the largest amount on a NON-payment line. */
export function parseReceipt(text: string): { amount?: number; merchant?: string } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const merchant = lines.find((l) => /[A-Za-z]{3,}/.test(l));   // first word-y line ≈ store name
  const amtRe = /(\d{1,3}(?:,\d{3})*\.\d{2})/;
  const toNum = (s: string) => parseFloat(s.replace(/,/g, ''));
  const PAYMENT = /\b(cash|tender|tendered|change|paid|payment|visa|mastercard|amex|discover|debit|credit|card|auth|approval|account)\b/i;
  const TOTAL = /\b(grand\s*total|amount\s*due|balance\s*due|total\s*due|total)\b/i;
  const SUB = /\bsub\s*-?\s*total\b/i;
  let amount: number | undefined;
  let subtotal: number | undefined;
  let largestSafe: number | undefined;
  for (const l of lines) {
    if (PAYMENT.test(l)) continue;                             // cash / change / card lines never count
    const m = l.match(amtRe);
    if (!m) continue;
    const v = toNum(m[1]);
    if (!(v > 0 && v < 10000)) continue;
    if (TOTAL.test(l) && !SUB.test(l)) amount = v;             // last explicit total wins
    else if (SUB.test(l)) subtotal = v;
    if (largestSafe == null || v > largestSafe) largestSafe = v;
  }
  return { amount: amount ?? subtotal ?? largestSafe, merchant };
}

export async function ocrReceipt(uri: string): Promise<{ amount?: number; merchant?: string; raw: string }> {
  if (!ocrAvailable()) return { raw: '' };
  try {
    const res = await MLKit.recognize(uri);
    const text: string = res?.text ?? '';
    return { ...parseReceipt(text), raw: text };
  } catch { return { raw: '' }; }
}
