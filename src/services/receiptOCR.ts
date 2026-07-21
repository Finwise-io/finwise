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
  const TOTAL_LINE = /\b(grand\s*total|amount\s*due|balance\s*due|total\s*due|total)\b/i;
  const SUBTOTAL_LINE = /\bsub\s*-?\s*total\b/i;
  const AMOUNT = /\$?\s*([\d,]+\.[\d]{2})\b/;
  const amountOn = (l: string): number | null => {
    const m = l.match(AMOUNT);
    const v = m ? parseFloat(m[1].replace(/,/g, '')) : NaN;
    return Number.isFinite(v) && v > 0 && v < 10000 ? v : null;
  };
  let amount = 0;
  let subtotal = 0;
  let largestSafe = 0;
  for (const l of lines) {
    if (PAYMENT_LINE.test(l)) continue;                      // rule 1: cash/change/card lines are radioactive
    const v = amountOn(l);
    if (v == null) continue;
    if (TOTAL_LINE.test(l) && !SUBTOTAL_LINE.test(l)) amount = v;   // rule 2: last explicit total wins
    else if (SUBTOTAL_LINE.test(l)) subtotal = v;
    if (v > largestSafe) largestSafe = v;
  }
  if (amount === 0) amount = subtotal || largestSafe;        // rule 3: honest fallbacks

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
