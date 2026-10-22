/** THE NET WORTH SCREEN AGAINST ITS APPROVED DRAWING, WORD FOR WORD (Quiet Instrument v08, approved
 *  2026-09-14) — all eight states it draws: A with data · A2 by institution · B collapsed, and down ·
 *  C first day · D the missing-data banner · E the change walk · F the fix sheet · G the add sheet.
 *
 *  Method and limits: src/testing/mockMatch.ts. Each state is rendered in the drawing's own data shape
 *  (the fixture reproduces its arithmetic: 8,000 + 838 + 348,495 + 5,819 + 450,000 = $813,152, less
 *  $418,000 owed = $395,152) and must give the same words in the same order.
 *
 *  ONE KNOWN DIFFERENCE, and it is a later ruling of his, not a gap: under the emergency fund the
 *  screen prints two lines the drawing does not — the months at the planned spend, and that both
 *  figures include the debt payments that cannot be stopped ("both numbers", founder, 2026-09-28,
 *  two weeks after this drawing was approved). Newest ruling wins, so they stay and are named in KNOWN.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { recordedDay } from '../../testing/recordedDay';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';
import { isoLocalDate } from '../../domain/_shared/dates';
import { norm, drawingLines, builtLines, firstDifference } from '../../testing/mockMatch';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn() }, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
}));
const NetWorth = () => { const C = require('../NetWorthScreen').default; return <C />; };
const today = isoLocalDate(new Date());
const daysAgo = (n: number) => isoLocalDate(new Date(Date.now() - n * 86_400_000));

const DRAWING = 'MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_net-worth-quiet-instrument_v08.html';
const LINES = drawingLines(DRAWING, [/<span class="pn">[^<]*<\/span>/g, /<span class="idot"[^>]*>i<\/span>/g, /<svg[\s\S]*?<\/svg>/g]);
const STARTS = LINES.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
const CHROME = new Set(['9:41', '▮▮▮ ⌁ ▐', '▦ Menu', 'MoneyKeel', '◉', '⚙']);
/** A phone's own words: from its status bar to its tab bar (or to its caption, where it has none). */
const phone = (n: number): string[] => {
  const seg = LINES.slice(STARTS[n - 1], STARTS[n] ?? LINES.length);
  let end = seg.findIndex((l, k) => l === 'Home' && seg[k + 1] === 'Net worth');
  if (end < 0) end = seg.findIndex((l) => /^STATE [A-G]/.test(l));
  return seg.slice(0, end).filter((l) => !CHROME.has(l));
};
/** A sheet drawn beside a phone: from its first line to its last. */
const between = (from: RegExp, to: RegExp, nth = 0): string[] => {
  const hits = LINES.map((l, i) => (from.test(l) ? i : -1)).filter((i) => i >= 0);
  const a = hits[nth]; const b = LINES.findIndex((l, i) => i > a && to.test(l));
  return LINES.slice(a, b + 1);
};

const DATA = (over: any = {}) => ({
  onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', hideBalances: false,
  onboardingProfile: { ...employedPartner, monthlySpending: '4500' },
  retirementAssumptions: { retireAge: 65, contribMonthly: 1200, spendMonthly: 4500, horizonAge: 92 },
  assetAccounts: [
    { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, target_return: 0 },
    { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 349333,
      target_return: 0.07, source: 'connected', last_synced: `${today}T09:00:00Z`, cash_balance: 838,
      positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 105, price: 105, shares: 3319,
        lots: [{ lot_id: 'l1', shares: 3319, cost_per_share: 84, purchase_date: '2024-01-02' }] }] },
    { asset_id: 'etr', label: 'E*TRADE Brokerage', institution: 'E*TRADE', kind: 'fixed_income', tax_bucket: 'TAXABLE',
      asset_class: 'bonds', balance: 5819, target_return: 0.042, source: 'connected', last_synced: `${today}T09:00:00Z`,
      maturity_date: '2027-08-24', coupon_rate: 0.04 },
    { asset_id: 'hme', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450000, target_return: 0, value_as_of: today },
  ],
  liabilities: [
    { debt_id: 'mtg', label: 'Home mortgage', debt_type: 'MORTGAGE', remaining_balance: 412000, interest_rate_apr: 0.055, minimum_monthly_payment: 2400 },
    { debt_id: 'cc', label: 'Chase Visa', debt_type: 'CREDIT_CARD', remaining_balance: 6000, interest_rate_apr: 0.229, minimum_monthly_payment: 150 },
  ],
  transactions: [
    { id: 'c', account_id: 'van', type: 'DEPOSIT', amount: 500, date: today },
    { id: 'w', account_id: 'van', type: 'WITHDRAWAL', amount: 500, date: today },
    { id: 'd', account_id: 'van', type: 'DIVIDEND', ticker: 'VTI', amount: 1220, date: today },
    { id: 'i', account_id: 'etr', type: 'INTEREST', amount: 430, date: today },
  ],
  nwDaily: { [daysAgo(8)]: 393042, [today]: 395152 },
  // the day the return is measured from (time-weighted since 2026-10-04): $8,000 checking, Vanguard
  // $838 cash + $346,585 of VTI, $5,819 of bonds = $361,242 — so $363,152 today is +0.53%
  snapshotDays: [recordedDay(daysAgo(8), [['chk', 8000, 'cash'], ['van', 838, 'cash'], ['van', 346585], ['etr', 5819, 'typed']])],
  ...over,
});
const setup = (over: any = {}) => { useStore.getState().resetAll(); useStore.setState(DATA(over) as any); };
/** The two lines his ruling of 2026-09-28 added under the emergency fund (see the header). */
const KNOWN = (built: string) => built.replace(/ # months at your planned spend — \$# cash ÷ \$#\/month both include \$#\/month of debt payments you cannot stop\./, '')
  // HIS RULE, 2026-10-04 (DEC-1923): the drawn household owns its home with the mortgage in Debts and a
  // Rent / Mortgage budget line, so the mortgage is counted from Debts and the card says the line is not.
  .replace(" your rent / mortgage budget line is not counted here: your home's mortgage, home mortgage, is in debts and is counted from there.", '')
  // HIS RULING, 2026-10-11 (DEC-4528, a READ THIS FIRST row on v08): the empty Debts door reads "Add your debts ›",
  // the wording of the approved empty-state drawing; state C drew "Add a mortgage, card, or loan ›".
  .replace('nothing entered yet. add your debts emergency fund', 'nothing entered yet. add a mortgage, card, or loan emergency fund')
  // 2026-10-21 (tenets 2 and 3, a READ THIS FIRST row on v08): a LINKED holding with no price is counted as the rest of the
  // broker's total on Net worth and on the account page, so the fix sheet now says so; state F drew the line written for a
  // holding built by hand, which is counted at what was paid and still reads that way
  // (or, where the total leaves nothing over for it, that it counts for nothing — its row then shows no figure)
  .replace(/meanwhile it counts as the rest of [^']*'s total — what the other holdings and the cash leave over\. it stays out of the change line, and we say so\./,
    'meanwhile we show what you paid — it stays out of the change line, and we say so.')
  .replace(/meanwhile it counts for nothing: [^']*'s total leaves nothing over for it once the other holdings and the cash are counted\. it stays out of the change line, and we say so\./,
    'meanwhile we show what you paid — it stays out of the change line, and we say so.');
const compare = (_name: string, drawn: string[], built: string[], minWords = 35) => {
  const want = norm(drawn), got = KNOWN(norm(built));
  expect(want.split(' ').length).toBeGreaterThanOrEqual(minWords);   // a state that read as empty would match anything
  expect(firstDifference(want, got)).toBe('');
};
test('the drawing still has its six phones — the guard proves it looked', () => { expect(STARTS).toHaveLength(6); });

const collapseAll = () => { for (const g of [/^▾ 💵 Cash/, /^▾ 📈 Investments/, /^▾ 🏠 Personal property/]) fireEvent.press(screen.getByText(g)); };
const GAPS = {
  assetAccounts: DATA().assetAccounts.map((a: any) => a.asset_id === 'etr' ? { ...a, last_synced: `${daysAgo(8)}T09:00:00Z` }
    : a.asset_id === 'van' ? { ...a, positions: [...a.positions, { position_id: 'p2', ticker: 'LCTX', asset_class: 'stock_etf', shares: 965, price: null, lots: [{ lot_id: 'l2', shares: 965, cost_per_share: 1, purchase_date: '2024-01-02' }] }] } : a),
};
const from = (lines: string[], start: RegExp, nth = 0) => { const hits = lines.map((l, i) => (start.test(l) ? i : -1)).filter((i) => i >= 0); return lines.slice(hits[nth]); };
const upTo = (lines: string[], stop: RegExp) => { const i = lines.findIndex((l) => stop.test(l)); return i < 0 ? lines : lines.slice(0, i); };
const through = (lines: string[], last: RegExp) => { const i = lines.findIndex((l) => last.test(l)); return i < 0 ? lines : lines.slice(0, i + 1); };

test('A — with data, by category', () => { setup(); render(<NetWorth />); compare('A', phone(1), builtLines(screen.toJSON())); });
test('A2 — by institution', () => { setup(); render(<NetWorth />); fireEvent.press(screen.getByText('By institution')); compare('A2', phone(2), builtLines(screen.toJSON())); });
test('B — all collapsed, and the down case', () => {
  setup({ nwDaily: { [daysAgo(8)]: 396632, [today]: 395152 },   // the down case: Vanguard's VTI was worth $349,975 that day, $364,632 in all
    snapshotDays: [recordedDay(daysAgo(8), [['chk', 8000, 'cash'], ['van', 838, 'cash'], ['van', 349975], ['etr', 5819, 'typed']])] });
  render(<NetWorth />); collapseAll(); compare('B', phone(3), builtLines(screen.toJSON()));
});
// State C draws "3 answers make it yours" — the person has given none of the three (age, spending, what they
// have), so the drawing is read with no age. With an answer given, the line names what is left (DEC-0086,
// 2026-10-18 on this screen): held by nw_no_accounts_one_door.test.tsx for 3, 2 and 1 missing.
test('C — first day', () => { useStore.getState().resetAll(); useStore.getState().setOnboardingProfile({ ...employedPartner, birthYear: undefined, birthMonth: undefined } as any); render(<NetWorth />); compare('C', phone(4), builtLines(screen.toJSON())); });
test('D — the missing-data banner', () => {
  setup(GAPS); render(<NetWorth />); collapseAll();
  compare('D', phone(5), upTo(builtLines(screen.toJSON()), /^EMERGENCY FUND/));
});
test('E — the change walk', () => {
  setup(); render(<NetWorth />); fireEvent.press(screen.getByText(/Change in net worth/));
  compare('E', between(/^How \$393,042 became/, /^Contributions are not a gain/), through(from(builtLines(screen.toJSON()), /^How .* became/i), /Contributions are not a gain/));
});
test('F — the fix sheet', () => {
  setup(GAPS); render(<NetWorth />); fireEvent.press(screen.getByText(/numbers? needs? more information/));
  compare('F', between(/^2 numbers need more information$/, /^Nothing here is a nag/), through(from(builtLines(screen.toJSON()), /numbers? needs? more information/, 1), /^Nothing here is a nag/));
});
test('G — the add sheet', () => {
  setup(); render(<NetWorth />); fireEvent.press(screen.getByText(/Add an account/));
  compare('G', from(phone(6), /^How do you want to add an account/), from(builtLines(screen.toJSON()), /^How do you want to add an account/));
});

/** APPEARANCE — THE CARDS' EDGES (2026-10-20). The words above cannot see a shadow or a ring, so this reads the drawing's own
 *  stylesheet for every rule that draws one, and the rendered styles for every node on the screen. What v08 draws: the
 *  hero and the ledger are flat white cards with no shadow (the Quiet Instrument direction — no floating cards); the one
 *  ring on a card is the fix sheet's gap card, 1px of 5% black; the phone's own frame and the orange change marks are
 *  drawing furniture, not the app. */
const CSS = require('fs').readFileSync(DRAWING, 'utf8').match(/<style>([\s\S]*?)<\/style>/)[1] as string;
const ruleOf = (sel: string) => (CSS.match(new RegExp(`(?:^|\\n|\\})\\s*${sel.replace(/\./g, '\\.')}\\{([^}]*)\\}`)) ?? [])[1];
const flat = (st: any): any => (Array.isArray(st) ? Object.assign({}, ...st.map(flat)) : st ?? {});
const nodes = (t: any): any[] => (t == null || typeof t === 'string' ? [] : Array.isArray(t) ? t.flatMap(nodes) : [t, ...nodes(t.children)]);
const SHADOW = ['shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius', 'elevation', 'boxShadow'];
test('appearance: the drawing puts a shadow or ring on exactly these, and no card on the screen carries a shadow', () => {
  const drawn = [...CSS.matchAll(/([^{}]+)\{[^}]*box-shadow[^}]*\}/g)].map((m) => m[1].trim().split('\n').pop()!.trim()).sort();
  expect(drawn).toEqual(['.chip.changed', '.gapcard', '.phone']);   // the guard read the stylesheet: a new shadow in the drawing goes red here
  expect(ruleOf('.hero')).toBeDefined(); expect(ruleOf('.card')).toBeDefined();
  expect(ruleOf('.hero')).not.toMatch(/shadow/); expect(ruleOf('.card')).not.toMatch(/shadow/);
  setup(); render(<NetWorth />);
  const all = nodes(screen.toJSON());
  expect(all.length).toBeGreaterThanOrEqual(150);   // it looked at the whole screen (162 host nodes on 2026-10-20)
  const shadowed = all.filter((n) => SHADOW.some((k) => flat(n.props?.style)[k] != null));
  expect(shadowed.map((n) => `${n.type} ${JSON.stringify(flat(n.props.style))}`)).toEqual([]);
});
test('appearance: each gap card on the fix sheet carries the drawn ring — 1px of 5% black, 16pt corners, white', () => {
  const ring = ruleOf('.gapcard')!;
  expect(ring).toMatch(/box-shadow:0 0 0 1px rgba\(0,0,0,\.05\)/);
  expect(ring).toMatch(/border-radius:16px/);
  setup(GAPS); render(<NetWorth />); fireEvent.press(screen.getByText(/numbers? needs? more information/));
  const cards = [/^LCTX has no price today$/, /^E\*TRADE Brokerage last updated/].map((t) => {
    const hits = screen.getAllByText(t);   // the banner names it too; the sheet's card is the last
    let n: any = hits[hits.length - 1];
    while (n && !(n.type === 'View' && flat(n.props.style).borderRadius === 16)) n = n.parent;
    return n ? flat(n.props.style) : null;
  });
  expect(cards).toHaveLength(2);
  for (const c of cards) expect(c).toMatchObject({ borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', borderRadius: 16, backgroundColor: '#FFFFFF' });
});
