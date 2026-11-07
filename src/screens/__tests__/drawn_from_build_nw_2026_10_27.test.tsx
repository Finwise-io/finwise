/** THREE SURFACES DRAWN FROM THE BUILD, HELD LINE BY LINE AND BOX BY BOX (FX-NW, 2026-10-27; drawing match rounds 2 and 3, NW2-15 to NW2-17,
 *  NW3-32). The debt editor (moneykeel_pres_mock_debt-editor_v03.html), the step-by-step add with its ＋ Add and Edit account sheets
 *  (moneykeel_pres_mock_step-by-step-add_v02.html) and Add an account in edit mode (moneykeel_pres_mock_add-account-edit-mode_v02.html)
 *  had no drawing. Each state below is rendered on Oct 27, 2026 with its own household; with FXNW_DRAW_OUT set the render is written
 *  out as the drawing's phone (src/testing/drawFromBuild.ts), and otherwise every line the drawing draws for that state must be the
 *  screen's, in order, and nothing else, and every line and box must look as drawn: its size, weight and colour, and what a box holds
 *  (a grey example marked as one). A change to any of the three surfaces goes red here until its drawing is redrawn.
 *  The guard proves it looked: every state finds its phone in its drawing and at least the lines it had when drawn. */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import { useStore } from '../../store/useStore';
import { toHtml, drawnLines, drawnItems, builtItems } from '../../testing/drawFromBuild';
import { ruledHtml } from '../../testing/ruledSince';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));
let mockParams: any = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [], usePathname: () => '/',
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));

const OUT = process.env.FXNW_DRAW_OUT;   // a folder: write each state's render there for the drawing, instead of holding it
if (OUT) fs.mkdirSync(OUT, { recursive: true });
const DOCS = path.join(__dirname, '..', '..', '..', 'MoneyKeel/documents/networth-and-performance');
// redrawn 2026-10-31 (drawing match round 3): the titles at 20 (DEC-8931), every box nobody filled empty (R16), one list of kinds (NW3-08)
const DRAWING: Record<string, string> = {
  debt: 'moneykeel_pres_mock_debt-editor_v03.html', step: 'moneykeel_pres_mock_step-by-step-add_v02.html', edit: 'moneykeel_pres_mock_add-account-edit-mode_v02.html',
};
const HTML: Record<string, string> = {};
// read with his rulings made after the drawing (ruledSince.ts; his ruling 'all', 2026-11-06). ruledSince drops the section emoji
// only on the Net worth drawing (v08); these three drawings draw the same section bars — Net worth behind a sheet ("▾ 💵 Cash",
// "📈 Investments", "▾ 🏠 Personal property") and the step-by-step's own bars ("💵 CASH", "📈 TAXABLE ACCOUNTS", "🏛️ RETIREMENT
// ACCOUNTS") — so the same ruling is applied here to exactly those bar texts. A kind's picker icon ("🚗 Personal property",
// "🏠 Mortgage", "💵 Cash & equivalents") is not a section bar and stays as drawn.
const SECTION_BAR = />(\s*(?:[▾▸] )?)(?:💵 (Cash|CASH)|📈 (Investments|TAXABLE ACCOUNTS)|🏠 (Personal property)|🏛️ (RETIREMENT ACCOUNTS))(\s*)</gu;
const sectionsRuled = (html: string) => html.replace(SECTION_BAR, (_m, pre, a, b, c, d, post) => `>${pre}${a ?? b ?? c ?? d}${post}<`);
const htmlOf = (fam: string) => (HTML[fam] ??= sectionsRuled(ruledHtml(path.join(DOCS, DRAWING[fam]), fs.readFileSync(path.join(DOCS, DRAWING[fam]), 'utf8'))));
const textOf = (n: any): string => (typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : (n?.children ?? []).map(textOf).join(''));
const lines = (): string[] => {
  const out: string[] = [];
  const walk = (n: any) => {
    if (!n || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = textOf(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
};
const snap = (key: string, meta: any) => {
  act(() => { jest.advanceTimersByTime(600); });   // a waiting button fades to full colour in 250 ms once the form can be saved: drawn at rest
  // an icon renders as one private-use glyph in a test: the drawing draws it as the app's icon font, not as a Text
  const built = lines().filter((l) => !/^[\uE000-\uF8FF\s]+$/.test(l));
  if (OUT) {
    const modals: string[] = [];
    const page = toHtml(screen.UNSAFE_root, modals);
    fs.writeFileSync(path.join(OUT, `${key}.json`), JSON.stringify({ key, ...meta, page, modals, lines: built }, null, 1));
    return;
  }
  const drawn = drawnLines(htmlOf(key.split('_')[0]), key);
  expect(drawn.length).toBeGreaterThanOrEqual(10);          // the state's phone is in its drawing, and was read
  expect(built).toEqual(drawn);                             // every line, in order, and nothing else
  // EVERY LINE AND EVERY BOX WITH HOW IT LOOKS (2026-10-31, NW3-32): its words or what the box holds — a grey example is marked as one —
  // and its size, weight and colour. The words alone let a title drawn at 17 pass beside one built at 20, and never read a box.
  const say = (x: { kind: string; t: string; size: number; weight: string; color: string }) => `${x.kind} · ${x.t} · ${x.size} · ${x.weight} · ${x.color}`;
  const dItems = drawnItems(htmlOf(key.split('_')[0]), key).map(say);
  const bItems = builtItems(screen.UNSAFE_root).map(say);
  expect(dItems.length).toBeGreaterThanOrEqual(drawn.length);   // it read every line, and the boxes too
  expect(bItems).toEqual(dItems);
};
const TopBar = require('../../components/TopBar').default;
const NetWorth = () => { const C = require('../NetWorthScreen').default; return <><TopBar /><C /></>; };
const AddAccount = () => { const C = require('../AddAccountScreen').default; return <C />; };
const ph = (t: string) => screen.getByPlaceholderText(t);
const typeIn = (placeholder: string, text: string, nth = 0) => fireEvent.changeText(screen.getAllByPlaceholderText(placeholder)[nth], text);
const byLabel = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);   // a box with no example is found by its label (R16)

const CHK = { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 18_000, target_return: 0, asset_class: 'cash', source: 'manual', value_as_of: '2026-10-27' };
const HOME = { asset_id: 'home', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450_000, target_return: 0, re_use: 'primary', source: 'manual', value_as_of: '2026-10-27' };
const PROFILE = { status: 'employed', birthYear: '1970', monthlySpending: '3200' };
const base = (assets: any[], liabilities: any[] = [], over: any = {}) => ({
  onboardingComplete: true, hideBalances: false, nwSetupChoice: 'self', nwSeeded: true, expenses: [], transactions: [],
  onboardingProfile: PROFILE, assetAccounts: assets, liabilities, ...over,
});
const setNow = () => jest.useFakeTimers({ now: new Date('2026-10-27T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
beforeEach(() => { mockParams = {}; setNow(); useStore.getState().resetAll(); });
afterEach(() => jest.useRealTimers());

// ═══ NW2-15 · THE DEBT EDITOR ═══════════════════════════════════════════════════════════════════════════════════
describe('debt editor', () => {
  const openAdd = (h: any) => { useStore.setState(h); render(<NetWorth />); fireEvent.press(screen.getByText(/Add your debts/)); };
  test('A · Add debt, as it opens', () => { openAdd(base([CHK, HOME])); snap('debt_A', { title: 'STATE A · ADD DEBT, AS IT OPENS · CHECKING $18,000 AND A HOME, NO DEBTS YET' }); });
  test('B · a card typed', () => {
    openAdd(base([CHK, HOME]));
    typeIn('Lender / name (e.g. Chase Sapphire)', 'Chase Visa'); byLabel('Balance', '6000'); byLabel('Interest rate percent', '22.99'); byLabel('Minimum payment a month', '180'); byLabel('You pay a month', '400');
    snap('debt_B', { title: 'STATE B · A CARD TYPED · CHASE VISA $6,000 AT 22.99%, MINIMUM $180, PAYING $400' });
  });
  test('C · a card whose payment does not cover the interest', () => {
    openAdd(base([CHK, HOME]));
    typeIn('Lender / name (e.g. Chase Sapphire)', 'Store card'); byLabel('Balance', '6000'); byLabel('Interest rate percent', '22.99'); byLabel('Minimum payment a month', '100');
    snap('debt_C', { title: 'STATE C · A CARD THAT NEVER PAYS OFF · $6,000 AT 22.99%, $100 A MONTH' });
  });
  test('D · Mortgage picked, the home not yet picked', () => {
    openAdd(base([CHK, HOME])); fireEvent.press(screen.getByLabelText('Mortgage'));
    snap('debt_D', { title: 'STATE D · MORTGAGE PICKED · THE HOME IS IN NET WORTH, NOT YET PICKED' });
  });
  test('E · a mortgage typed on the home', () => {
    openAdd(base([CHK, HOME])); fireEvent.press(screen.getByLabelText('Mortgage')); fireEvent.press(screen.getByLabelText('On Home'));
    typeIn('Lender / name (e.g. Chase Sapphire)', 'Home mortgage'); byLabel('Balance', '412000'); byLabel('Interest rate percent', '6.25'); byLabel('Due day', '1'); byLabel('Monthly payment, what you pay', '2850');
    snap('debt_E', { title: 'STATE E · A MORTGAGE ON THE HOME · $412,000 AT 6.25%, $2,850 A MONTH · TODAY OCT 27, 2026' });
  });
  test('F · Mortgage with no property in Net worth', () => {
    openAdd(base([CHK])); fireEvent.press(screen.getByLabelText('Mortgage'));
    snap('debt_F', { title: 'STATE F · MORTGAGE PICKED · NO PROPERTY IN NET WORTH YET' });
  });
  test('G · a loan due in full', () => {
    openAdd(base([CHK, HOME])); fireEvent.press(screen.getByLabelText('Personal loan')); fireEvent.press(screen.getByLabelText('Due in full'));
    typeIn('Lender / name (e.g. Chase Sapphire)', 'Loan from Dad'); byLabel('Balance', '15000'); byLabel('Due date, month and year', '12/2026');
    snap('debt_G', { title: 'STATE G · A LOAN DUE IN FULL · $15,000 DUE DECEMBER 2026 · TODAY OCT 27, 2026' });
  });
  test('H · Edit debt: a car loan whose rate and payment were never entered', () => {
    useStore.setState(base([CHK, HOME], [{ debt_id: 'car', label: 'Car loan', institution: 'Car loan', debt_type: 'AUTO', remaining_balance: 14_000, payment_type: 'installment' }]));
    render(<NetWorth />); fireEvent.press(screen.getByLabelText(/^Car loan, you owe/));
    snap('debt_H', { title: 'STATE H · EDIT DEBT · A CAR LOAN, $14,000, ITS RATE AND PAYMENT NEVER ENTERED' });
  });
});

// ═══ NW2-16 · THE STEP-BY-STEP ADD, ITS ＋ ADD SHEET AND THE EDIT ACCOUNT SHEET ══════════════════════════════════
describe('step-by-step add', () => {
  const guided = (assets: any[] = [], liabilities: any[] = []) => base(assets, liabilities, { nwSetupChoice: 'guided' });
  const BROK = { asset_id: 'fid', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 142_000, target_return: 0.07, asset_class: 'stocks_etf', source: 'manual', value_as_of: '2026-10-27', class_source: 'user' };
  const LAKE = { asset_id: 'lake', label: 'Lake house', kind: 'second_home', tax_bucket: 'PROPERTY', balance: 300_000, target_return: 0, re_use: 'secondary', source: 'manual', value_as_of: '2026-10-27' };
  const next = (n: number) => { for (let i = 0; i < n; i++) fireEvent.press(screen.getByText('Next →')); };
  test('A · step 1, nothing entered', () => { useStore.setState(guided()); render(<NetWorth />); snap('step_A', { title: 'STATE A · STEP 1 OF 5, ADD YOUR CASH · NOTHING ENTERED YET', tab: true }); });
  test('B · step 1, a checking account entered', () => { useStore.setState(guided([CHK])); render(<NetWorth />); snap('step_B', { title: 'STATE B · STEP 1 OF 5 · CHASE CHECKING $18,000', tab: true }); });
  test('C · step 2, an investment account', () => { useStore.setState(guided([CHK, BROK])); render(<NetWorth />); next(1); snap('step_C', { title: 'STATE C · STEP 2 OF 5, ADD YOUR INVESTMENTS · FIDELITY BROKERAGE $142,000', tab: true }); });
  test('D · step 5, debts — a mortgage whose rate is not entered and a card', () => {
    useStore.setState(guided([CHK, BROK, LAKE], [
      { debt_id: 'lm', label: 'Lake house mortgage', debt_type: 'MORTGAGE', remaining_balance: 240_000, minimum_monthly_payment: 1_900, monthly_payment: 1_900, property_id: 'lake' },
      { debt_id: 'cc', label: 'Chase Visa', debt_type: 'CREDIT_CARD', remaining_balance: 6_000, interest_rate_apr: 0.2299, minimum_monthly_payment: 180 }]));
    render(<NetWorth />); next(4); snap('step_D', { title: 'STATE D · STEP 5 OF 5, ADD YOUR DEBTS · LAKE HOUSE MORTGAGE (RATE NOT ENTERED) AND A CARD', tab: true });
  });
  const sheet = (key: string, title: string, step: number, section: RegExp, pick?: string) => {
    useStore.setState(guided([CHK])); render(<NetWorth />); next(step);
    fireEvent.press(screen.getByLabelText(section));
    if (pick) fireEvent.press(screen.getByLabelText(pick));
    snap(key, { title, tab: true });
  };
  test('E · ＋ Add on step 2 opens the list', () => sheet('step_E', 'STATE E · ＋ ADD ON STEP 2 · ADD TO NET WORTH, THE LIST', 1, /^Add to /));
  test('F · ＋ Add on step 1 opens the cash form', () => sheet('step_F', 'STATE F · ＋ ADD ON STEP 1 · CASH & EQUIVALENTS', 0, /^Add to /));
  test('G · Stocks / Funds', () => sheet('step_G', 'STATE G · THE LIST, THEN STOCKS / FUNDS', 1, /^Add to /, 'Stocks / Funds'));
  test('H · Bonds', () => sheet('step_H', 'STATE H · THE LIST, THEN BONDS & CDS', 1, /^Add to /, 'Bonds & CDs'));
  test('I · Alternatives', () => sheet('step_I', 'STATE I · THE LIST, THEN ALTERNATIVES', 1, /^Add to /, 'Alternatives'));
  test('J · Real estate', () => sheet('step_J', 'STATE J · THE LIST, THEN REAL ESTATE', 1, /^Add to /, 'Real estate'));
  test('K · Personal property', () => sheet('step_K', 'STATE K · THE LIST, THEN PERSONAL PROPERTY', 1, /^Add to /, 'Personal property'));
  test('L · Retirement account', () => sheet('step_L', 'STATE L · ＋ ADD ON STEP 3 · RETIREMENT ACCOUNT, NO KIND PICKED YET', 2, /^Add to /));
  test('M · Brokerage account', () => sheet('step_M', 'STATE M · THE LIST, THEN BROKERAGE ACCOUNT', 1, /^Add to /, 'Brokerage (taxable, a mix)'));
  test('N · Quick add', () => sheet('step_N', 'STATE N · THE LIST, THEN QUICK ADD', 1, /^Add to /, 'Quick add'));
  test('O · Edit account — an investment account (from its page’s edit door)', () => {
    useStore.setState(base([CHK, BROK])); mockParams = { edit: 'fid' };
    render(<NetWorth />); snap('step_O', { title: 'STATE O · EDIT ACCOUNT · FIDELITY BROKERAGE, OPENED FROM ITS PAGE', tab: true });
  });
  test('P · Edit account — a home', () => {
    useStore.setState(base([CHK, HOME])); mockParams = { edit: 'home' };
    render(<NetWorth />); snap('step_P', { title: 'STATE P · EDIT ACCOUNT · THE HOME, OPENED FROM ITS PAGE', tab: true });
  });
});

// ═══ NW2-17 · ADD AN ACCOUNT, EDIT MODE ═════════════════════════════════════════════════════════════════════════
describe('add an account, edit mode', () => {
  const BOND = { asset_id: 'ust', label: 'US Treasury 2029', institution: 'Fidelity', kind: 'bond', tax_bucket: 'TAXABLE', balance: 24_200, face_value: 25_000, coupon_rate: 0.045, maturity_date: '2029-09-30', target_return: 0.045, asset_class: 'bonds', source: 'manual', value_as_of: '2026-10-27' };
  const GOLD = { asset_id: 'gold', label: 'Gold coins', institution: 'Home safe', kind: 'commodity', tax_bucket: 'TAXABLE', balance: 9_000, target_return: 0, asset_class: 'alternatives', source: 'manual', value_as_of: '2026-10-27' };
  const BROK = { asset_id: 'fid', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 142_000, target_return: 0.07, asset_class: 'stocks_etf', source: 'manual', value_as_of: '2026-10-27', class_source: 'user' };
  const edit = (key: string, title: string, acct: any) => { useStore.setState(base([acct])); mockParams = { edit: acct.asset_id }; render(<AddAccount />); snap(key, { title }); };
  test('A · cash', () => edit('edit_A', 'STATE A · UPDATE CHASE CHECKING · A CASH ACCOUNT', CHK));
  test('B · stocks / funds', () => edit('edit_B', 'STATE B · UPDATE FIDELITY BROKERAGE · STOCKS / FUNDS, TAXABLE', BROK));
  test('C · a bond', () => edit('edit_C', 'STATE C · UPDATE US TREASURY 2029 · A BOND', BOND));
  test('D · an alternative', () => edit('edit_D', 'STATE D · UPDATE GOLD COINS · ALTERNATIVES', GOLD));
  test('E · the home', () => edit('edit_E', 'STATE E · UPDATE HOME · REAL ESTATE, THE HOME LIVED IN', HOME));
});
