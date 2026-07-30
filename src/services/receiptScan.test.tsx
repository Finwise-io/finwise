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

// ── B46 finding 10: the founder's ACME receipt (2026-07-30) — OCR read $8.99/$9.99, truth $4.99 ──
// Three traps on one slip: the true total says "**** BALANCE" (not "total"); the savings section
// prints a decoy "Total 4.00" (coupons, not the bill); and with keywords mangled, the old fallback
// grabbed the item's LIST price. Fixture = the real receipt, line for line.
const ACME = `ACME
YOUR FAVORITE LOCAL SUPERMARKET
Store 1065
Fort Lee NJ 07024
YOUR CASHIER TODAY WAS SELF
PRODUCE
SDLESS WTRMLN EA 8.99 7.99 S
Sale Savings -1.00
ADDITIONAL DISCOUNTS
Rewards and CashOff -1.00
for U Savings -2.00
TAX 0.00
**** BALANCE 4.99
Credit Purchase 07/29/26 20:11
CARD # ***********885
REF: 661122448850 AUTH: 0003710R
PAYMENT AMOUNT 4.99
CASH BACK AMOUNT 0.00
AL Discover
AID A0000001523010
Discover 4.99
CHANGE 0.00
YOUR SAVINGS
Store Savings 1.00
for U Savings 2.00
Rewards and CashOff 1.00
Total 4.00
Total Savings Value 44%
YOUR POINTS
Points Earned Today 4
Points Available 36`;

test("the founder's ACME receipt: **** BALANCE 4.99 wins — not the 8.99 list price, not the savings 'Total 4.00'", () => {
  expect(parseReceipt(ACME).amount).toBe(4.99);
  const { parseReceiptText } = jest.requireActual('./receiptOCR');
  expect(parseReceiptText(ACME).amount).toBe(4.99);
});

test('ACME with the BALANCE keyword OCR-mangled: the payment echo ($4.99 paid) still beats the list price', () => {
  const mangled = ACME.replace('**** BALANCE 4.99', '**** 8ALANC£ 4.99');   // keyword unreadable, amount survives
  expect(parseReceipt(mangled).amount).toBe(4.99);
  const { parseReceiptText } = jest.requireActual('./receiptOCR');
  expect(parseReceiptText(mangled).amount).toBe(4.99);
});

test('the savings-section "Total" alone can never become the bill', () => {
  const noBalance = ACME.replace('**** BALANCE 4.99\n', '').replace('PAYMENT AMOUNT 4.99\n', '');
  const r = parseReceipt(noBalance);
  expect(r.amount).not.toBe(4.00);   // the coupon total is a decoy, whatever else wins
});
