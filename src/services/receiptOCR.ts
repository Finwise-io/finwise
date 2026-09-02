import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

export type ParsedReceipt = {
  store: string;
  amount: number;
  date: string;
  category: string;
  items: string[];
  confidence: 'high' | 'medium' | 'low';
};

const GOOGLE_VISION_KEY = Constants.expoConfig?.extra?.GOOGLE_VISION_API_KEY || '';

/**
 * Sends a receipt image to Google Cloud Vision API for OCR,
 * then parses the raw text to extract store, total, date, category.
 *
 * Setup: enable Cloud Vision API in Google Cloud Console,
 * add GOOGLE_VISION_API_KEY to your .env file.
 */
/* ─ MK-XS-F-092 ──────────────────────────────────────────────────────────── 4 · BRINGS DATA IN
 * parseReceiptWithOCR
 *
 * Answers ..... Sends a receipt image to Google Cloud Vision API for OCR, then parses the raw text to extract store, total, date, category.
 *
 * Formula .....
 *     the answer = nothing
 *     json = await response.json()
 *     raw text = json.responses.[0].full text annotation.text (or '' when missing or zero)
 *     nothing   when raw text is missing
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-092
 * Changed ..... 2026-05-21 (e39fbd7)
 */
export async function parseReceiptWithOCR(imageUri: string): Promise<ParsedReceipt | null> {
  if (!GOOGLE_VISION_KEY) {
    console.warn('GOOGLE_VISION_API_KEY not set — falling back to manual entry');
    return null;
  }

  try {
    // Read image as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Call Google Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          }],
        }),
      }
    );

    if (!response.ok) throw new Error('Vision API error: ' + response.status);

    const json = await response.json();
    const rawText: string = json.responses?.[0]?.fullTextAnnotation?.text || '';

    if (!rawText) return null;

    return parseReceiptText(rawText);
  } catch (err) {
    console.error('Receipt OCR failed:', err);
    return null;
  }
}

/**
 * Parses raw OCR text from a receipt into structured data.
 * Handles common receipt formats from US grocery, gas, restaurant receipts.
 */

/** A DATE IS NOT MONEY. "30.04.24" (30 April 2024, the way most of the world writes it) matched the
 *  money pattern as $30.04 and — on a receipt with no TOTAL keyword — beat the real charge because
 *  it was the largest number on the page. Founder's parking receipt, 2026-08-12: read as $30.04
 *  when the fee was $22.45. Times are stripped for the same reason (7:54, 08:30). */
/* ─ MK-XS-F-093 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * stripNonMoney
 *
 * Answers ..... A DATE IS NOT MONEY.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-XS-F-058 parseReceipt · MK-XS-F-094 parseReceiptText
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-097 ocrReceipt · MK-XS-F-058 parseReceipt
 *               MK-XS-F-094 parseReceiptText · MK-XS-F-092 parseReceiptWithOCR
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-093
 * Changed ..... 2026-08-12 (4d85bb3)
 */
export function stripNonMoney(line: string): string {
  return line
    .replace(/\b\d{1,4}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/g, ' ')   // 30.04.24 · 04/30/24 · 2024-04-30
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, ' ');              // 08:30 · 7:54
}

/* ─ MK-XS-F-094 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * parseReceiptText
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     lines = for each of text.split('\n'): trim() where boolean
 *     payment line = ÷ \b(cash|tender|tendered|change|paid|payment|visa|mastercard|amex|discover|debit|credit|card|auth|approval|account)\b ÷ i
 *     strong total = ÷ \b(grand\s × total|amount\s × due|balance\s × due|total\s × due|balance|net)\b ÷ i
 *     weak total = ÷ \b(total|fee)\b ÷ i
 *     subtotal line = ÷ \bsub\s × -?\s × total\b ÷ i
 *     savings hdr = ÷ \b(your\s+savings|total\s+savings|savings\s+value|your\s+points|rewards?|cash\s × off|coupons?)\b ÷ i
 *     negative line = ÷ -\s × \$?\s × \d ÷
 *     amount = ÷ \$?\s × ([\d,]+\.[\d]{2})\b ÷
 *     m = strip non money(l).match(AMOUNT)
 *     v = parse float(m[1].replace( ÷ , ÷ g, ''))   if m
 *     na n   otherwise
 *     the answer:
 *     v   if number.is finite(v) and v > 0 and v < 10000
 *     nothing   otherwise
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-XS-F-092 parseReceiptWithOCR
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-092 parseReceiptWithOCR
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *
 * Decides .....
 *     · Uses a built-in strong t of 0.
 *     · Uses a built-in weak t of 0.
 *     · Uses a built-in subtotal of 0.
 *     · Uses a built-in largest safe of 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Leaves some rows out of the answer — check which.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-094
 * Changed ..... 2026-07-21 (b409e89)
 */
export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // ── Total amount ────────────────────────────────────────────────
  // BUILD-44 FIX (founder receipt test, 2026-07-19): the old "largest number wins" rule captured
  // the CASH TENDERED line ($100 handed over) instead of the total ($56.47) — cash given is
  // usually bigger than the bill. Correct reading order, line by line:
  //   1. NEVER read amounts from payment-mechanics lines (cash / tendered / change / card …).
  //   2. Prefer an explicit TOTAL / AMOUNT DUE / BALANCE DUE line — the LAST one on the receipt
  //      (totals print at the bottom; "grand total" beats a mid-receipt "total").
  //   3. Else fall back to SUBTOTAL, else the largest amount on a non-payment line.
  const PAYMENT_LINE = /\b(cash|tender|tendered|change|paid|payment|visa|mastercard|amex|discover|debit|credit|card|auth|approval|account)\b/i;
  // B46 finding 10 (founder's ACME receipt) — same rules as receiptScan.parseReceipt, always in BOTH
  // parsers: STRONG totals (**** BALANCE / amount due) beat bare "total"; a bare "Total" printed
  // inside the savings/points section is a coupon decoy, never the bill; negative lines (discounts)
  // are not charges; and an amount echoing a payment line beats the largest-number fallback.
  const STRONG_TOTAL = /\b(grand\s*total|amount\s*due|balance\s*due|total\s*due|balance|net)\b/i;
  const WEAK_TOTAL = /\b(total|fee)\b/i;
  const SUBTOTAL_LINE = /\bsub\s*-?\s*total\b/i;
  const SAVINGS_HDR = /\b(your\s+savings|total\s+savings|savings\s+value|your\s+points|rewards?|cash\s*off|coupons?)\b/i;
  const NEGATIVE_LINE = /-\s*\$?\s*\d/;
  const AMOUNT = /\$?\s*([\d,]+\.[\d]{2})\b/;
  const amountOn = (l: string): number | null => {
    const m = stripNonMoney(l).match(AMOUNT);
    const v = m ? parseFloat(m[1].replace(/,/g, '')) : NaN;
    return Number.isFinite(v) && v > 0 && v < 10000 ? v : null;
  };
  let strongT = 0;
  let weakT = 0;
  let subtotal = 0;
  let largestSafe = 0;
  const safeAmounts: number[] = [];
  const payAmounts: number[] = [];
  let inSavings = false;
  for (const l of lines) {
    const v = amountOn(l);
    if (SAVINGS_HDR.test(l)) inSavings = true;
    if (PAYMENT_LINE.test(l)) {                              // rule 1: cash/change/card lines are radioactive…
      if (v != null) payAmounts.push(v);                     // …but what was PAID validates candidates
      continue;
    }
    if (v == null || NEGATIVE_LINE.test(l)) continue;        // discounts/credits are not charges
    if (STRONG_TOTAL.test(l) && !SUBTOTAL_LINE.test(l)) strongT = v;
    else if (WEAK_TOTAL.test(l) && !SUBTOTAL_LINE.test(l)) { if (!inSavings) weakT = v; }
    else if (SUBTOTAL_LINE.test(l)) subtotal = v;
    safeAmounts.push(v);
    if (v > largestSafe) largestSafe = v;
  }
  const paymentEcho = safeAmounts.find((v) => payAmounts.includes(v)) ?? 0;
  const amount = strongT || weakT || paymentEcho || subtotal || largestSafe;

  // ── Store name ───────────────────────────────────────────────────
  // Usually first non-address line, before city/state/zip
  const knownStores = [
    'Walmart', 'Target', 'Costco', 'Kroger', 'Whole Foods', 'Trader Joe',
    'Safeway', 'Publix', 'CVS', 'Walgreens', 'Rite Aid', 'Home Depot',
    'Lowe\'s', 'Best Buy', 'Amazon', 'Starbucks', 'McDonald\'s', 'Subway',
    'Chipotle', 'Shell', 'Chevron', 'BP', 'Exxon', 'Mobil', 'Circle K',
    '7-Eleven', 'Aldi', 'Lidl', 'HEB', 'Meijer', 'Albertsons',
  ];

  let store = '';
  for (const known of knownStores) {
    if (text.toLowerCase().includes(known.toLowerCase())) {
      store = known;
      break;
    }
  }
  // Fallback: use first line that looks like a store name (not all caps address)
  if (!store && lines.length > 0) {
    store = lines[0].length < 40 ? lines[0] : '';
  }

  // ── Date ─────────────────────────────────────────────────────────
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s+\d{4}/i,
  ];
  let date = new Date().toISOString();
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = new Date(match[0]);
      if (!isNaN(parsed.getTime())) {
        date = parsed.toISOString();
        break;
      }
    }
  }

  // ── Category ─────────────────────────────────────────────────────
  const category = guessCategory(store, text);

  // ── Items (first 10 lines that look like items) ───────────────────
  const items = lines
    .filter((l) => /\d+\.\d{2}/.test(l) && l.length < 60 && l.length > 3)
    .slice(0, 10);

  // ── Confidence ───────────────────────────────────────────────────
  const confidence = amount > 0 && store ? 'high' : amount > 0 ? 'medium' : 'low';

  return { store, amount, date, category, items, confidence };
}

/* ─ MK-XS-F-144 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * guessCategory
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     lower = (store + ' ' + text).to lower case()
 *     'Gas'   when ÷ gas|fuel|shell|chevron|bp|exxon|mobil|circle k|speedway|wawa ÷ .test(lower)
 *     'Dining'   when ÷ restaurant|cafe|pizza|burger|sushi|diner|grill|kitchen|bar |tavern|starbucks|mcdonald|subway|chipotle|taco|chick ÷ .test(lower)
 *     'Health'   when ÷ pharmacy|cvs|walgreen|rite aid|health|clinic|doctor|hospital|medical|dental ÷ .test(lower)
 *     'Subscriptions'   when ÷ netflix|hulu|disney|spotify|amazon prime|apple|subscription|recurring ÷ .test(lower)
 *     'Transit'   when ÷ uber|lyft|taxi|transit|metro|bus |train|airline|flight|parking ÷ .test(lower)
 *     'Groceries'   when ÷ walmart|target|costco|kroger|whole foods|trader|safeway|publix|aldi|grocery|market|food ÷ .test(lower)
 *     'Shopping'   when ÷ home depot|lowe|ikea|furniture|hardware ÷ .test(lower)
 *     'Utilities'   when ÷ electric|water|gas bill|utility|internet|phone bill|at&t|verizon|comcast ÷ .test(lower)
 *     the answer = 'Other'
 *
 * Called by ... MK-XS-F-094 parseReceiptText
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-094 parseReceiptText · MK-XS-F-092 parseReceiptWithOCR
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-144
 * Changed ..... not in git yet (—)
 */
function guessCategory(store: string, text: string): string {
  const lower = (store + ' ' + text).toLowerCase();

  if (/gas|fuel|shell|chevron|bp|exxon|mobil|circle k|speedway|wawa/.test(lower)) return 'Gas';
  if (/restaurant|cafe|pizza|burger|sushi|diner|grill|kitchen|bar |tavern|starbucks|mcdonald|subway|chipotle|taco|chick/.test(lower)) return 'Dining';
  if (/pharmacy|cvs|walgreen|rite aid|health|clinic|doctor|hospital|medical|dental/.test(lower)) return 'Health';
  if (/netflix|hulu|disney|spotify|amazon prime|apple|subscription|recurring/.test(lower)) return 'Subscriptions';
  if (/uber|lyft|taxi|transit|metro|bus |train|airline|flight|parking/.test(lower)) return 'Transit';
  if (/walmart|target|costco|kroger|whole foods|trader|safeway|publix|aldi|grocery|market|food/.test(lower)) return 'Groceries';
  if (/home depot|lowe|ikea|furniture|hardware/.test(lower)) return 'Shopping';
  if (/electric|water|gas bill|utility|internet|phone bill|at&t|verizon|comcast/.test(lower)) return 'Utilities';

  return 'Other';
}
