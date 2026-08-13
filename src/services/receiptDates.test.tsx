// A DATE IS NOT MONEY — founder's parking receipt, 2026-08-12: read as $30.04 when the fee was
// $22.45, because "30.04.24" (30 April 2024) matched the money pattern and, on a receipt with no
// TOTAL keyword, was the largest number on the page.
import { parseReceiptText, stripNonMoney } from './receiptOCR';


const PARKING = `9th & Thomas
Parking Garage
SP+ PARKING
PAY-ON-FOOT      37
RECEIPT:       2340
PERSONELL:        0
TRANSACTION:    902
SNR: 01 011 0007477
IN:    30.04.24 08:30
ENTRY: 30.04.24 16:24
P.AT:   HOURLY TICKET
FEE:          22.45 $
PAID:         22.45 $
NET:          22.45 $
GST 0%:        0.00 $
0T 7:54`;

test("the founder's parking receipt reads $22.45 — the charge, not the date", () => {
  expect(parseReceiptText(PARKING).amount).toBe(22.45);
});

test('and the other parser agrees — one bug, both doors', () => {
  // the scan module is mocked in the RN test project (ML Kit has no simulator slice), so reach the
  // real parser the way production does
  const { parseReceipt } = jest.requireActual('./receiptScan');
  expect(parseReceipt(PARKING).amount).toBe(22.45);
});

test('dates and times are stripped before money is looked for, in every common format', () => {
  expect(stripNonMoney('IN: 30.04.24 08:30')).not.toMatch(/30\.04/);
  expect(stripNonMoney('Date 04/30/24')).not.toMatch(/04\/30/);
  expect(stripNonMoney('2024-04-30 12:15:03')).not.toMatch(/\d{4}-\d{2}/);
  expect(stripNonMoney('0T 7:54')).not.toMatch(/7:54/);
  // …and real money survives untouched
  expect(stripNonMoney('FEE: 22.45 $')).toMatch(/22\.45/);
  expect(stripNonMoney('TOTAL 1,234.56')).toMatch(/1,234\.56/);
});
