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
  // THE LEAD'S RULING R7, 2026-10-27 (a READ THIS FIRST row on v08; canon rows 4 and 0b): the drawn household's $4,150 is calculated by the app
  // ($1,600 of the typed plan + $2,400 mortgage + $150 card), so its tag reads "calculated"; the drawing's "you entered" was true of
  // the $4,500 he typed when it was drawn. The figure itself is held below by networth_fxnw_2026_10_27.test.tsx, as printed.
  .replace('/month essentials — calculated ', '/month essentials — you entered ')
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

/** APPEARANCE AND THE DATED ROWS OF 2026-10-25 (the line-by-line drawing match of 2026-10-24). Three looks now as v08 draws them,
 *  the one amber box as the newer account-page drawing draws it, the step-by-step bars edge to edge — each read off the drawing's
 *  own stylesheet and the rendered styles — and every row of that day read off the drawing's face, its figures worked by the app. */
describe('v08 · the rows of 2026-10-25, on the drawing and on the screen', () => {
  const { Colors } = require('../../utils/theme');
  const st = (n: any) => flat(n?.props?.style);
  const ROWS = (() => {
    const html = require('fs').readFileSync(DRAWING, 'utf8') as string;
    const at = html.indexOf('READ THIS FIRST — ADDED AFTER THIS MOCKUP');
    return html.slice(at, html.indexOf('</table>', at)).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  })();

  test('the drawing carries the ten rows of 2026-10-25', () => {
    const want = [
      /2026-10-25 DRAWING ERROR, every frame — the info dot is drawn as a 9-point italic i in a ring/,
      /2026-10-25 DRAWING ERROR, frame G — the retirement plan line behind the add sheet is drawn without the info dot/,
      /2026-10-25 Frames A, A2, B and C — three small looks, now as drawn\. \(1\) The · in “3–6 months is the usual guide · an estimate from your own numbers” is in the line’s own grey at regular weight/,
      /2026-10-25 Frame D — the amber box is drawn with 16-point corners, 12 points inside on every side and its headline at 800/,
      /2026-10-25 DRAWING ERROR, frames A, A2, B, C and D — the drawing sets the rows, the emergency fund card and the doors 16 points from the edge/,
      /2026-10-25 DRAWING ERROR, every frame — the top bar’s buttons are drawn 32 points tall\. The app draws them 38 points tall/,
      /2026-10-25 DRAWING ERROR, every frame — the By category · By institution choice is drawn about 34 points tall\. The app draws it 44 points tall/,
      /2026-10-25 DRAWING ERROR, frames A and A2 — the bar under What you own draws each part at its true share/,
      /2026-10-25 Not a drawn state: the step-by-step add \(Step 1 of 5/,
      // FIX-MONTH, 2026-10-26 (the lead's ruling of 2026-10-25): a rate never entered reads "rate not entered", never "0.00% APR"
      /2026-10-25 Not a drawn state: the step-by-step add’s last step, Add your debts \(Step 5 of 5\), lists each debt with its rate under its name\. .* reads “rate not entered · \$1,900\/month” under “Lake house mortgage”, never “0\.00% APR · \$1,900\/month”\. A typed 0 reads “0\.00% APR · \$1,900\/month”\./,
    ];
    expect(want.filter((w) => !w.test(ROWS))).toEqual([]);
    const html = require('fs').readFileSync(DRAWING, 'utf8') as string;
    expect((html.match(/white-space:nowrap">2026-10-25<\/td>/g) ?? []).length).toBe(10);   // ten rows of that date, no more, no fewer
  });

  test('(10) the step-by-step add’s Debts step: a rate never entered reads “rate not entered”, never “0.00% APR” — a typed 0 is 0.00% (FIX-MONTH, the row of 2026-10-25)', () => {
    const lake = { debt_id: 'lake', label: 'Lake house mortgage', debt_type: 'MORTGAGE', remaining_balance: 300000, interest_rate_apr: undefined, minimum_monthly_payment: 1900 };
    const debtsStep = (rate: number | undefined) => {
      setup({ nwSetupChoice: 'guided', liabilities: [{ ...lake, interest_rate_apr: rate }] }); render(<NetWorth />);
      for (let k = 0; k < 4; k++) fireEvent.press(screen.getByText('Next →'));
      expect(screen.getByText('Step 5 of 5')).toBeOnTheScreen();
      return builtLines(screen.toJSON());
    };
    const blank = debtsStep(undefined);
    expect(blank).toContain('Lake house mortgage');
    expect(blank).toContain('rate not entered · $1,900/month');   // the row's words, as written on the drawing's row
    expect(blank.some((l) => /0\.00% APR/.test(l))).toBe(false);
    expect(debtsStep(0)).toContain('0.00% APR · $1,900/month');
  });

  test('(1)–(3): the ▸ at 600, the · in the line’s own grey and weight, frame C’s line at 13 regular — as the stylesheet draws them', () => {
    expect(ruleOf('.sheetRow .n')).toMatch(/font-weight:600/);   // the caret sits in the category's name, at its weight
    expect(ruleOf('.caret')).toMatch(/font-size:13px;color:var\(--textTertiary\)/);
    expect(ruleOf('.cushNote')).toMatch(/font-size:11px;color:var\(--textTertiary\)/);
    expect(ruleOf('.cushMath')).toMatch(/font-size:13px;color:var\(--textSecondary\)/);
    setup(); render(<NetWorth />);
    const carets = [...screen.queryAllByText('▸'), ...screen.queryAllByText('▾')].filter((n) => st(n).fontSize === 13);
    expect(carets.length).toBeGreaterThanOrEqual(2);
    for (const c of carets) expect(st(c)).toMatchObject({ fontSize: 13, fontWeight: '600', color: Colors.textTertiary });
    const guide = screen.getByText('3–6 months is the usual guide · an estimate from your own numbers');   // one Text: no darker · inside it
    expect(st(guide)).toMatchObject({ fontSize: 11, color: Colors.textTertiary });
    expect(st(guide).fontWeight ?? '400').toBe('400');
    expect((guide.children as any[]).every((c) => typeof c === 'string')).toBe(true);
    useStore.getState().resetAll(); useStore.getState().setOnboardingProfile({ ...employedPartner, birthYear: undefined, birthMonth: undefined } as any);
    render(<NetWorth />);
    const first = screen.getByText('appears with your first cash account + monthly expenses');
    expect(st(first)).toMatchObject({ fontSize: 13, color: Colors.textSecondary });
    expect(st(first).fontWeight ?? '400').toBe('400');
  });

  test('(4) frame D: the one amber box as the account page draws it — 12-point corners, 10 × 12 inside, its headline at 700', () => {
    const page = require('fs').readFileSync('MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_account-page_v01.html', 'utf8') as string;
    expect(page).toMatch(/\.warnb\{background:var\(--amberLight\);border:1px solid var\(--amber\);border-radius:12px;padding:10px 12px;/);
    expect(ruleOf('.banner')).toMatch(/border-radius:16px;padding:12px/);   // what v08 draws, corrected by its row
    setup(GAPS); render(<NetWorth />);
    const head = screen.getByText(/^⚠ .*numbers? needs? more information ›$/);
    expect(st(head)).toMatchObject({ fontSize: 13, fontWeight: '700' });
    let box: any = head; while (box && st(box).backgroundColor !== Colors.amberLight) box = box.parent;
    expect(st(box)).toMatchObject({ borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.amber });
  });

  test('(8) the bar’s drawn widths are the ones the row gives: under 1.5% drawn at 1.5%, then the bar scaled back to full', () => {
    const { barSegments, barDrawnWidths } = require('../../../MoneyKeel/functions/networth-and-performance/net-worth');
    const bar = (parts: [string, number][]) => barDrawnWidths(barSegments(parts.map(([key, total]) => ({ key, label: key, color: '#000', total }))));
    const byClass = bar([['Cash', 8_838], ['Stocks / Funds', 348_495], ['Bonds & CDs', 5_819], ['Real estate', 450_000]]);   // of $813,152
    const byInst = bar([['Home', 450_000], ['Vanguard', 349_333], ['Chase', 8_000], ['E*TRADE', 5_819]]);
    const pct = (xs: any[], k: string, f: 'exact' | 'drawn') => `${xs.find((x) => x.key === k)[f].toFixed(2)}%`;
    expect([pct(byClass, 'Cash', 'drawn'), pct(byClass, 'Bonds & CDs', 'drawn'), pct(byClass, 'Stocks / Funds', 'drawn'), pct(byClass, 'Real estate', 'drawn')])
      .toEqual(['1.48%', '1.48%', '42.35%', '54.69%']);
    expect([pct(byInst, 'Chase', 'drawn'), pct(byInst, 'E*TRADE', 'drawn'), pct(byInst, 'Vanguard', 'drawn'), pct(byInst, 'Home', 'drawn')])
      .toEqual(['1.48%', '1.48%', '42.41%', '54.63%']);
    const row = ROWS.slice(ROWS.indexOf('2026-10-25 DRAWING ERROR, frames A and A2 — the bar under What you own'));
    for (const f of ['1.09%', '0.72%', '1.48%', '42.86%', '42.35%', '55.34%', '54.69%', '0.98%', '42.96%', '42.41%', '54.63%', '$813,152'])
      expect(row.slice(0, 900)).toContain(f);
    expect(pct(byClass, 'Cash', 'exact')).toBe('1.09%'); expect(pct(byClass, 'Bonds & CDs', 'exact')).toBe('0.72%');
    expect(pct(byInst, 'Chase', 'exact')).toBe('0.98%'); expect(pct(byInst, 'Vanguard', 'exact')).toBe('42.96%');
  });

  test('(9) the step-by-step add: each step’s bar runs edge to edge, square, with “+ Add” under it — not beside it', () => {
    setup({ nwSetupChoice: 'guided', assetAccounts: [], liabilities: [] }); render(<NetWorth />);
    expect(screen.getByText('Step 1 of 5')).toBeOnTheScreen();
    let band: any = screen.getByText(/^💵 CASH$/);
    while (band && st(band).backgroundColor !== Colors.bandLight) band = band.parent;
    expect(st(band)).toMatchObject({ borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingHorizontal: 12 });
    let wrap: any = band.parent; while (wrap && st(wrap).marginHorizontal == null) wrap = wrap.parent;
    expect(st(wrap).marginHorizontal).toBe(-20);   // out through the step's 20 of padding: edge to edge
    const lines = builtLines(screen.toJSON());
    expect(lines.indexOf('+ Add')).toBeGreaterThan(lines.indexOf('💵 CASH'));
    for (let a: any = wrap.parent, k = 0; a && k < 2; a = a.parent, k += 1) expect(st(a).flexDirection).not.toBe('row');
  });
});
