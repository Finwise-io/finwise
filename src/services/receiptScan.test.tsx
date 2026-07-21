// BUILD-44 FIX pins (founder receipt test, 2026-07-19): the scanner captured CASH TENDERED
// instead of the total. Both parsers (on-device + Vision fallback) now read like a human:
// payment-mechanics lines never count; the last explicit total wins; subtotal then the largest
// non-payment amount are the honest fallbacks.
// the UI jest project mocks receiptScan globally (screens render hermetically) — these pins test
// the REAL parser, so pierce the mock explicitly.
const { parseReceipt } = jest.requireActual('./receiptScan');
import { parseReceiptText } from './receiptOCR';

const FOUNDER_RECEIPT = `WHOLE FOODS MARKET
123 Main St
SUBTOTAL        51.92
TAX              4.55
TOTAL           56.47
CASH           100.00
CHANGE          43.53
THANK YOU`;

test('the founder case: TOTAL wins over the bigger CASH tendered line (both parsers)', () => {
  expect(parseReceipt(FOUNDER_RECEIPT).amount).toBe(56.47);
  expect(parseReceiptText(FOUNDER_RECEIPT).amount).toBe(56.47);
});

test('OCR missed the word "total": CASH/CHANGE still never win — subtotal is the honest fallback', () => {
  const noTotal = `SHELL
SUBTOTAL 42.10
CASH 60.00
CHANGE 17.90`;
  expect(parseReceipt(noTotal).amount).toBe(42.1);
  expect(parseReceiptText(noTotal).amount).toBe(42.1);
});

test('no total or subtotal at all: the largest NON-payment amount, never the card/auth lines', () => {
  const itemsOnly = `CAFE
LATTE 6.50
SANDWICH 12.25
VISA XXXX1234 18.75
AUTH 482913`;
  expect(parseReceipt(itemsOnly).amount).toBe(12.25);
});

test('the LAST explicit total wins (grand total at the bottom beats a mid-receipt total)', () => {
  const grand = `STORE
TOTAL ITEMS 3
TOTAL 20.00
GRAND TOTAL 21.65`;
  expect(parseReceipt(grand).amount).toBe(21.65);
});
