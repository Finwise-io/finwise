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
  // B46 finding 10 (founder's ACME receipt): supermarket receipts print the true total as
  // "**** BALANCE"; a bare "Total" also appears INSIDE the savings section ("Total 4.00" of
  // coupons) as a decoy; and when OCR mangles the keywords, the old largest-number fallback
  // grabbed the item's LIST price. Three rules: STRONG totals (balance/amount-due class) beat
  // bare "total"; once a savings/points section starts, bare "total" stops counting; and an
  // amount that ECHOES a payment line (you paid exactly $4.99) beats "largest number".
  const STRONG = /\b(grand\s*total|amount\s*due|balance\s*due|total\s*due|balance)\b/i;
  const WEAK = /\btotal\b/i;
  const SUB = /\bsub\s*-?\s*total\b/i;
  const SAVINGS_HDR = /\b(your\s+savings|total\s+savings|savings\s+value|your\s+points|rewards?|cash\s*off|coupons?)\b/i;
  const NEGATIVE = /-\s*\$?\s*\d/;
  let strong: number | undefined;
  let weak: number | undefined;
  let subtotal: number | undefined;
  let largestSafe: number | undefined;
  const safeAmounts: number[] = [];
  const payAmounts: number[] = [];
  let inSavings = false;
  for (const l of lines) {
    const m = l.match(amtRe);
    const v = m ? toNum(m[1]) : NaN;
    if (SAVINGS_HDR.test(l)) inSavings = true;
    if (PAYMENT.test(l)) {                                     // cash / change / card lines never count…
      if (v > 0 && v < 10000) payAmounts.push(v);              // …but what was PAID validates candidates
      continue;
    }
    if (!(v > 0 && v < 10000) || NEGATIVE.test(l)) continue;   // discounts/credits are not charges
    if (STRONG.test(l) && !SUB.test(l)) strong = v;            // last strong total wins
    else if (WEAK.test(l) && !SUB.test(l)) { if (!inSavings) weak = v; }   // savings-section "Total" is a decoy
    else if (SUB.test(l)) subtotal = v;
    safeAmounts.push(v);
    if (largestSafe == null || v > largestSafe) largestSafe = v;
  }
  const paymentEcho = safeAmounts.find((v) => payAmounts.includes(v));
  return { amount: strong ?? weak ?? paymentEcho ?? subtotal ?? largestSafe, merchant };
}

export async function ocrReceipt(uri: string): Promise<{ amount?: number; merchant?: string; raw: string }> {
  if (!ocrAvailable()) return { raw: '' };
  try {
    const res = await MLKit.recognize(uri);
    const text: string = res?.text ?? '';
    return { ...parseReceipt(text), raw: text };
  } catch { return { raw: '' }; }
}
