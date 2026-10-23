/** THE FIVE SHEETS DRAWN FROM THE CODE, STATE BY STATE (2026-10-22, gap 24 of the Performance launch audit).
 *
 *  One list of states per sheet — the account, the records, the prices, the page the sheet is opened on and the taps that
 *  open it — read by the match test (src/screens/__tests__/sheets_drawn_from_code.test.tsx) and by the run that drew each
 *  drawing, so a drawing and its test can never be of two different states. The day is Sep 30, 2026 in every state.
 *
 *    the trade sheet ("Record activity") .............. moneykeel_pres_mock_trade-sheet_v02.html
 *    the holding editor ("Edit holding") .............. moneykeel_pres_mock_holding-editor_v02.html
 *    the activity sheet ("Activity") .................. moneykeel_pres_mock_activity-sheet_v01.html
 *    the account page's recorder (its three doors) .... moneykeel_pres_mock_record-activity-sheet_v01.html
 *    the edit sheet for a record you entered (✎) ...... moneykeel_pres_mock_edit-record-sheet_v02.html
 *  (all in MoneyKeel/documents/networth-and-performance/)
 */
import { fireEvent, screen } from '@testing-library/react-native';

export const SHEET_DAY = '2026-09-30';

// ── the households ───────────────────────────────────────────────────────────────────────────────────────────────
/** Vanguard, named Brokerage: built by hand, $50,000 typed Sep 1, $5,000 of it cash, 100 VTI bought Mar 3, 2025 at $80.00 */
const VANGUARD = { asset_id: 'van', label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 50_000, cash_balance: 5_000,
  source: 'manual', value_as_of: '2026-09-01', positions: [{ position_id: 'vti', ticker: 'VTI', label: 'Vanguard Total Stock Market ETF', kind: 'stocks_etf',
    lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] }] };
/** Ally, named Savings: a cash account, $12,400 typed Sep 1 */
const ALLY = { asset_id: 'sav', label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-09-01' };
/** the account-page drawing's state E bond: US Treasury 4.00% 2030, built by hand Jun 2, 2026 at $9,850 */
const TSY = { asset_id: 'tsy30', label: 'US Treasury 4.00% 2030', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 9_850,
  face_value: 10_000, coupon_rate: 0.04, maturity_date: '2030-09-30', source: 'manual', value_as_of: '2026-06-02' };
/** A FRESH ACCOUNT: Schwab, named Brokerage, $10,000 typed today, nothing held inside it, no cash entered */
const FRESH = { asset_id: 'new', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10_000, source: 'manual', value_as_of: SHEET_DAY };
const HOUSEHOLD = [VANGUARD, ALLY, TSY];

/** the Holding page's account: Fidelity, built from its holdings (holding detail v02, phone A) */
const fidelity = (position: any, extra: any = {}) => ({ asset_id: 'fid', label: 'Fidelity', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 0, derive_balance: true, positions: [position], ...extra });
const AAPL = { position_id: 'p1', ticker: 'AAPL', label: 'Apple Inc.', kind: 'stocks_etf', lots: [
  { lot_id: 'l1', shares: 100, cost_per_share: 168, purchase_date: '2023-03-14' }, { lot_id: 'l2', shares: 40, cost_per_share: 192.5, purchase_date: '2026-01-09' }] };
const series = (ticker: string, pts: [string, number][]) => ({ ticker, points: pts.map(([date, close]) => ({ date, close })) });
const PRICES = {
  AAPL: series('AAPL', [['2024-08-01', 150], ['2025-09-30', 175], ['2026-09-29', 239.53], ['2026-09-30', 241.84]]),
  SPY: series('SPY', [['2024-08-01', 400], ['2025-09-30', 500], ['2026-09-29', 610], ['2026-09-30', 612]]),
  VTI: series('VTI', [['2024-08-01', 70], ['2025-09-30', 90], ['2026-09-29', 99], ['2026-09-30', 100]]),
};

// ── what a state is ──────────────────────────────────────────────────────────────────────────────────────────────
export type SheetState = {
  key: string;
  /** the orange label above the state, in capitals on the drawing */
  label: string;
  /** the page the sheet opens over, and what that page is handed */
  page: 'account' | 'holding';
  params: Record<string, string>;
  store: Record<string, any>;
  /** the taps and the typing that bring the sheet to this state, run after the page renders */
  steps: () => void;
};
export type Sheet = { id: string; file: string; title: string; states: SheetState[] };

const press = (label: string | RegExp) => fireEvent.press(screen.getByLabelText(label));
const pressText = (text: string) => fireEvent.press(screen.getByText(text));
const typeIn = (placeholder: string, value: string, nth = 0) => fireEvent.changeText(screen.getAllByPlaceholderText(placeholder)[nth], value);
const typeLabel = (label: string, value: string) => fireEvent.changeText(screen.getByLabelText(label), value);
const account = (id: string, accounts: any[], extra: Record<string, any> = {}) => ({
  page: 'account' as const, params: { id }, store: { assetAccounts: accounts, transactions: [], snapshotDays: [], priceCache: PRICES, ...extra } });
const holding = (acct: any, extra: Record<string, any> = {}) => ({
  page: 'holding' as const, params: { account: 'fid', position: 'p1' }, store: { assetAccounts: [acct], transactions: [], priceCache: PRICES, pricesFetchedAt: `${SHEET_DAY}T11:00:00Z`, ...extra } });

// ═══ THE TRADE SHEET ═══════════════════════════════════════════════════════════════════════════════════════════════
const openTrade = () => press('Add a buy or sale for Brokerage');
export const TRADE_SHEET: Sheet = {
  id: 'trade', file: 'moneykeel_pres_mock_trade-sheet_v02.html', title: 'Record activity',
  states: [
    { key: 'A', label: 'Opened from the account page: Buy, Vanguard chosen, nothing typed yet', ...account('van', HOUSEHOLD), steps: openTrade },
    { key: 'B', label: 'Buy 10 VTI at $100.00: $1,000 of the $5,000 cash', ...account('van', HOUSEHOLD),
      steps: () => { openTrade(); typeIn('e.g. AAPL', 'VTI'); typeIn('0', '10', 0); typeIn('0', '100', 1); } },
    { key: 'C', label: 'Buy 100 VTI at $100.00: more than the $5,000 cash', ...account('van', HOUSEHOLD),
      steps: () => { openTrade(); typeIn('e.g. AAPL', 'VTI'); typeIn('0', '100', 0); typeIn('0', '100', 1); } },
    { key: 'D', label: 'Sell: the holdings to choose from, VTI picked, 10 at $100.00', ...account('van', HOUSEHOLD),
      steps: () => { openTrade(); press('Transaction type: Sell'); press('Holding: VTI'); typeIn('0', '10', 0); typeIn('0', '100', 1); } },
    { key: 'E', label: 'Sell 150 VTI: more than the 100 held', ...account('van', HOUSEHOLD),
      steps: () => { openTrade(); press('Transaction type: Sell'); press('Holding: VTI'); typeIn('0', '150', 0); typeIn('0', '100', 1); } },
    { key: 'F', label: 'Deposit cash: $500', ...account('van', HOUSEHOLD),
      steps: () => { openTrade(); press('Transaction type: Deposit cash'); typeIn('0', '500'); } },
    { key: 'G', label: 'Transfer $1,000 from Vanguard to Ally Savings', ...account('van', HOUSEHOLD),
      steps: () => { openTrade(); press('Transaction type: Transfer'); press(/^To account: Ally/); typeIn('0', '1000'); } },
    { key: 'H', label: 'Dividend from VTI, paid as cash: $120', ...account('van', HOUSEHOLD),
      steps: () => { openTrade(); press('Transaction type: Dividend'); press('Holding: VTI'); typeIn('0', '120'); } },
    { key: 'I', label: 'Dividend from VTI, reinvested: 1.2 shares at $100.00', ...account('van', HOUSEHOLD),
      steps: () => { openTrade(); press('Transaction type: Dividend'); press('Holding: VTI'); press('Dividend reinvested'); typeIn('0', '1.2', 0); typeIn('0', '100', 1); } },
    { key: 'J', label: 'A fresh account (nothing held, no cash entered): Buy', ...account('new', [FRESH]), steps: openTrade },
    { key: 'K', label: 'A fresh account: Sell — nothing to sell', ...account('new', [FRESH]),
      steps: () => { openTrade(); press('Transaction type: Sell'); } },
    { key: 'L', label: 'Opened from the Holding page: AAPL in the ticker box, Fidelity chosen', ...holding(fidelity(AAPL)),
      steps: () => press('Record a buy or sell for AAPL') },
  ],
};

// ═══ THE HOLDING EDITOR ════════════════════════════════════════════════════════════════════════════════════════════
const openEdit = () => press('Edit this holding');
export const HOLDING_EDITOR: Sheet = {
  id: 'holding-editor', file: 'moneykeel_pres_mock_holding-editor_v02.html', title: 'Edit holding',
  states: [
    { key: 'A', label: 'A stock with two purchases: Apple in Fidelity', ...holding(fidelity(AAPL)), steps: openEdit },
    { key: 'B', label: 'The same stock in an account built by hand with its own total', ...holding(fidelity(AAPL, { derive_balance: false, balance: 40_000, source: 'manual', value_as_of: '2026-09-01' })), steps: openEdit },
    { key: 'C', label: 'An option: 2 SPX calls bought Jul 1, 2026 at $50.00, 100 shares a contract', ...holding(fidelity({ position_id: 'p1', ticker: 'SPX', label: 'SPX call', kind: 'options', multiplier: 100,
      lots: [{ lot_id: 'l1', shares: 2, cost_per_share: 50, purchase_date: '2026-07-01' }] })), steps: openEdit },
    { key: 'D', label: 'A bond held in the account: face, rate, how often it pays, maturity', ...holding(fidelity({ position_id: 'p1', ticker: '91282CGM7', label: 'US Treasury 4.25% 2028', kind: 'fixed_income',
      asset_class: 'bond', face_value: 10_000, coupon_rate: 0.0425, maturity_date: '2028-02-15', coupons_per_year: 2, lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 98.5, purchase_date: '2024-02-15' }] })), steps: openEdit },
    { key: 'E', label: 'A CD held in the account: never asked how often it pays', ...holding(fidelity({ position_id: 'p1', ticker: '49306SAB2', label: 'KeyBank CD 4.00%', kind: 'fixed_income',
      asset_class: 'bond', face_value: 5_000, coupon_rate: 0.04, maturity_date: '2027-03-31', lots: [{ lot_id: 'l1', shares: 5_000, cost_per_share: 1, purchase_date: '2025-03-31' }] })), steps: openEdit },
    { key: 'F', label: 'Typing a ticker: VO, and the suggestions under the box', ...holding(fidelity(AAPL)),
      steps: () => { openEdit(); const box = screen.getByPlaceholderText('e.g. AAPL, VTI, SPY'); fireEvent(box, 'focus'); fireEvent.changeText(box, 'VO'); } },
    { key: 'G', label: 'A ticker that cannot be a symbol: AAPL 2', ...holding(fidelity(AAPL)),
      steps: () => { openEdit(); typeIn('e.g. AAPL, VTI, SPY', 'AAPL 2'); } },
    { key: 'H', label: 'A holding with no purchase on record (every share sold): one blank purchase, Save waits', ...holding(fidelity({ position_id: 'p1', ticker: 'LCTX', label: 'Lucid Diagnostics', kind: 'stocks_etf', lots: [] }),
      { priceCache: { ...PRICES, LCTX: series('LCTX', [['2025-08-01', 2.1], ['2026-09-29', 1.48], ['2026-09-30', 1.42]]) } }), steps: openEdit },
    { key: 'I', label: 'A holding saved as private equity before this phase: its own chip kept', ...holding(fidelity({ ...AAPL, ticker: 'FUND3', label: 'Fund III', kind: 'private_equity',
      lots: [{ lot_id: 'l1', shares: 1, cost_per_share: 25_000, purchase_date: '2024-01-02' }] })), steps: openEdit },
  ],
};

// ═══ THE ACTIVITY SHEET ════════════════════════════════════════════════════════════════════════════════════════════
const AAPL_RECORDS = [
  { id: 'r1', account_id: 'fid', type: 'SELL', ticker: 'AAPL', shares: 10, price: 230, date: '2026-09-15', created_at: '' },
  { id: 'r2', account_id: 'fid', type: 'DIVIDEND', ticker: 'AAPL', amount: 134.4, date: '2026-08-02', created_at: '' },
  { id: 'r3', account_id: 'fid', type: 'BUY', ticker: 'AAPL', shares: 40, price: 192.5, date: '2026-01-09', created_at: '' },
];
export const ACTIVITY_SHEET: Sheet = {
  id: 'activity', file: 'moneykeel_pres_mock_activity-sheet_v01.html', title: 'Activity',
  states: [
    { key: 'A', label: 'Apple in Fidelity: a sale, a dividend and a buy, newest first', ...holding(fidelity(AAPL), { transactions: AAPL_RECORDS }), steps: () => press("See AAPL's activity") },
    { key: 'B', label: 'A holding with no records yet', ...holding(fidelity(AAPL)), steps: () => press("See AAPL's activity") },
  ],
};

// ═══ THE ACCOUNT PAGE'S RECORDER (its three doors) ════════════════════════════════════════════════════════════════
const moneyDoor = () => press('Add a contribution or withdrawal for Brokerage');
export const RECORD_ACTIVITY_SHEET: Sheet = {
  id: 'record-activity', file: 'moneykeel_pres_mock_record-activity-sheet_v01.html', title: 'Deposit — Brokerage',
  states: [
    { key: 'A', label: 'The money door: Deposit first, nothing typed yet', ...account('van', HOUSEHOLD), steps: moneyDoor },
    { key: 'B', label: 'A deposit of $500: the line saying what saving records', ...account('van', HOUSEHOLD),
      steps: () => { moneyDoor(); typeLabel('Amount', '500'); } },
    { key: 'C', label: 'Withdraw $200, dated yesterday', ...account('van', HOUSEHOLD),
      steps: () => { moneyDoor(); pressText('Withdraw'); typeLabel('Amount', '200'); pressText('Yesterday'); } },
    { key: 'D', label: 'Transfer $1,000 into Ally Savings', ...account('van', HOUSEHOLD),
      steps: () => { moneyDoor(); pressText('Transfer'); press('Transfer into Savings'); typeLabel('Amount', '1000'); } },
    { key: 'E', label: 'A fresh account and no other: Transfer has nothing to move it into', ...account('new', [FRESH]),
      steps: () => { moneyDoor(); pressText('Transfer'); } },
    { key: 'F', label: 'A fresh account: Deposit, no line about holdings', ...account('new', [FRESH]), steps: moneyDoor },
    { key: 'G', label: 'The income door on a stock account: Dividend first, $120', ...account('van', HOUSEHOLD),
      steps: () => { press('Add a dividend or interest for Brokerage'); typeLabel('Amount', '120'); } },
    { key: 'H', label: 'The income door on a bond: interest and a coupon received', ...account('tsy30', HOUSEHOLD),
      steps: () => press('Add a dividend or interest for US Treasury 4.00% 2030') },
    { key: 'I', label: 'A savings account: interest only, so no choice to make', ...account('sav', HOUSEHOLD),
      steps: () => press('Add a dividend or interest for Savings') },
  ],
};

// ═══ THE EDIT SHEET FOR A RECORD YOU ENTERED ═══════════════════════════════════════════════════════════════════════
const MINE = [
  { id: 'm1', account_id: 'van', type: 'DIVIDEND', ticker: 'VTI', amount: 120, date: '2026-09-10', source: 'manual', created_at: '' },
  { id: 'm2', account_id: 'van', type: 'DEPOSIT', amount: 500, date: '2026-09-02', source: 'manual', created_at: '' },
];
const pencil = (nth: number) => fireEvent.press(screen.getAllByText('✎')[nth]);
export const EDIT_RECORD_SHEET: Sheet = {
  id: 'edit-record', file: 'moneykeel_pres_mock_edit-record-sheet_v02.html', title: 'Deposit — you entered this',
  states: [
    { key: 'A', label: 'The ✎ on a deposit you entered: $500 on Sep 2, 2026', ...account('van', HOUSEHOLD, { transactions: MINE }), steps: () => pencil(1) },
    { key: 'B', label: 'The amount cleared: Save waits', ...account('van', HOUSEHOLD, { transactions: MINE }),
      steps: () => { pencil(1); typeLabel('Amount', ''); } },
    { key: 'C', label: 'The ✎ on a dividend you entered: $120 from VTI on Sep 10, 2026', ...account('van', HOUSEHOLD, { transactions: MINE }), steps: () => pencil(0) },
  ],
};

export const SHEETS: Sheet[] = [TRADE_SHEET, HOLDING_EDITOR, ACTIVITY_SHEET, RECORD_ACTIVITY_SHEET, EDIT_RECORD_SHEET];
