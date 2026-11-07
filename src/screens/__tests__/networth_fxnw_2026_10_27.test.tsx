/** THE NET WORTH FIX WAVE OF 2026-10-27 (FX-NW), ONE TEST PER FIX — the drawing match round 2 (NW2-01 … NW2-22), workplan rows 353 and
 *  354, and the 29 February anniversary. Every figure is worked by hand in its comment; every drawing row it leans on is read off the
 *  drawing's own face, so a row that is missing goes red here.
 *
 *  THE CROSS-SCREEN AGREEMENT (the lead's ruling R2: the emergency fund is ONE function, MK-NW-O-004 theEmergencyFund): Net worth and the
 *  Stress test are rendered on the same household and must print the same months (MK-NW-M-013), both directions — and both must refuse
 *  when no expenses are entered, never months from the debt payments alone.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import { StyleSheet } from 'react-native';
import { useStore } from '../../store/useStore';
import { Colors, Spacing } from '../../utils/theme';
import { figuresPrinted, resetFiguresPrinted } from '../../components/figure';
import { theEmergencyFund } from '../../../MoneyKeel/functions/networth-and-performance/emergency-fund';
import { accruedInterestCaveat, accruedFrequencyAssumed, yearsToMaturity } from '../../domain/bonds';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));
let mockParams: any = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() }, Link: ({ children }: any) => children,
}));

const ROOT = path.join(__dirname, '..', '..', '..');
const DOCS = path.join(ROOT, 'MoneyKeel/documents/networth-and-performance');
const face = (file: string) => fs.readFileSync(path.join(DOCS, file), 'utf8').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
/** the nearest host View above a rendered node (a host's own parent is the component that drew it) */
const hostUp = (n: any): any => { let p = n?.parent; while (p && typeof p.type !== 'string') p = p.parent; return p; };
const flat = (st: any) => (StyleSheet.flatten(st) ?? {}) as any;
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
const nodes = (t: any): any[] => (t == null || typeof t === 'string' ? [] : Array.isArray(t) ? t.flatMap(nodes) : [t, ...nodes(t.children)]);
const NetWorth = () => { const C = require('../NetWorthScreen').default; return <C />; };
const Stress = () => { const C = require('../StressTestScreen').default; return <C />; };

const CASH = { asset_id: 'chk', label: 'Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 18_000, target_return: 0, asset_class: 'cash' };
const HOME = { asset_id: 'home', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450_000, target_return: 0, re_use: 'primary' };
const MORTGAGE = { debt_id: 'm', label: 'Home mortgage', debt_type: 'MORTGAGE', remaining_balance: 320_000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2_400, property_id: 'home' };
const CAR_NO_PAY = { debt_id: 'car', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14_000, interest_rate_apr: 0.069 };
const household = (profile: any, liabilities: any[] = [MORTGAGE]) => ({
  onboardingComplete: true, hideBalances: false, nwSetupChoice: 'self', nwSeeded: true, expenses: [],
  onboardingProfile: { status: 'employed', birthYear: '1970', ...profile }, assetAccounts: [CASH, HOME], liabilities,
});
const NO_SPEND = household({});                                   // the row of 2026-10-21's own household: nothing typed, nothing logged
const TYPED = household({ monthlySpending: '1100' }, [MORTGAGE, CAR_NO_PAY]);   // its new worked example (v08 row of 2026-10-27)
const set = (h: any) => { useStore.getState().resetAll(); useStore.setState(h); };
const doorOf = (h: any) => theEmergencyFund({ accounts: h.assetAccounts, debts: h.liabilities, expenses: h.expenses, profile: h.onboardingProfile });
/** the months a screen printed under MK-NW-M-013, as printed */
const monthsOn = (Screen: () => React.JSX.Element, h: any): string[] => {
  set(h); resetFiguresPrinted();
  const r = render(<Screen />);
  const got = [...new Set(figuresPrinted().filter((p) => p.id === 'MK-NW-M-013' && !p.spoken).map((p) => p.text))];
  r.unmount();
  return got;
};

describe('NW2-01 and NW2-02 · no expenses entered: the emergency fund refuses, never months from the debt payments alone (R2)', () => {
  test('the door: $18,000 and a $2,400 mortgage, nothing typed or logged — no month, so no months, no target, no months after a hit', () => {
    const e = doorOf(NO_SPEND);
    expect(e.cash).toBe(18_000);
    expect(e.debtMinimums).toBe(2_400);                       // the debt payments are still known and said where months are shown
    expect(e.essentialsMonthly).toBe(0);                      // it was 2,400: the mortgage taken for the whole month
    expect(e.monthsCovered).toBeNull();                       // it was 18,000 ÷ 2,400 = 7.5
    expect(e.monthsCoveredAtPlannedSpend).toBeNull();
    expect(e.targetFor(6)).toBeNull();
    expect(e.afterAShock(3_000)).toEqual({ cashAfter: 15_000, monthsAfter: null, coversIt: true });   // the hit itself is a real answer
    expect(e.essentialsBasis).toBe('');
  });
  test('Net worth shows the refusal and its door, no 7.5 months and no line ending in a bare dash', () => {
    set(NO_SPEND); render(<NetWorth />);
    const ls = lines();
    const at = ls.indexOf('EMERGENCY FUND');
    expect(at).toBeGreaterThan(0);
    expect(ls.slice(at + 1, at + 3)).toEqual(['Your cash is $18,000 — tell us your typical monthly expenses and this becomes a real number.', 'Answer one question in Cash flow ›']);
    expect(ls.join(' ')).not.toMatch(/7\.5 months|Comfortable|essentials —$|of essentials covered by your cash/);
  });
  test('the new worked example of the row of 2026-10-21: $1,100/month typed, the $2,400 mortgage and a car loan with no payment entered', () => {
    const e = doorOf(TYPED);
    expect(e.essentialsMonthly).toBe(3_500);                  // 1,100 + 2,400; the car loan counts nothing and is named
    expect(e.monthsCovered).toBeCloseTo(18_000 / 3_500, 12);  // 5.142857…
    expect(e.paymentsNotEntered).toEqual([{ id: 'car', label: 'Car loan' }]);
    set(TYPED); render(<NetWorth />);
    const ls = lines();
    expect(ls).toContain('5.1 months');
    expect(ls).toContain('of essentials covered by your cash — $18,000 cash ÷ $3,500/month essentials — calculated');
    expect(ls).toContain('Both include $2,400/month of debt payments you cannot stop.');
    expect(ls).toContain('Car loan · payment not entered, so it is not included. Enter it to include.');
  });
  test('the drawing carries the row, with its figures', () => {
    expect(face('moneykeel_pres_mock_net-worth-quiet-instrument_v08.html')).toMatch(/2026-10-27 Emergency fund with no expenses entered — not a drawn state; it replaces the worked example of the row of 2026-10-21 above\..*‘Your cash is \$18,000 — tell us your typical monthly expenses and this becomes a real number\.’.*5\.1 months — \$18,000 ÷ \(\$1,100 \+ \$2,400\) = 5\.14/);
  });
});

describe('CROSS-SCREEN AGREEMENT · Net worth beside the Stress test, the same household, one function (R2)', () => {
  test('with expenses typed: both print the same months, and it is the function’s figure — both directions', () => {
    const nw = monthsOn(NetWorth, TYPED), st = monthsOn(Stress, TYPED);
    expect(nw).toEqual(['5.1 months']);                        // 18,000 ÷ 3,500 = 5.14, one decimal
    expect(st).toEqual(nw);                                    // the Stress test prints Net worth's figure …
    expect(nw).toEqual(st);                                    // … and Net worth the Stress test's
  });
  test('with the v08 household’s kind of month (typed plan, budget lines, debts) the two still agree', () => {
    const h = household({ monthlySpending: '4500', spendCats: [
      { id: 'rent', label: 'Rent / Mortgage', amount: 2_300, bucket: 'fixed', tier: 'need' },
      { id: 'groceries', label: 'Groceries', amount: 900, bucket: 'flexible', tier: 'need' },
      { id: 'dining', label: 'Eating out', amount: 600, bucket: 'flexible', tier: 'flex' }] },
      [MORTGAGE, { debt_id: 'cc', label: 'Chase Visa', debt_type: 'CREDIT_CARD', remaining_balance: 6_000, interest_rate_apr: 0.229, minimum_monthly_payment: 150 }]);
    // the Rent / Mortgage line stands down (the mortgage is in Debts): 4,500 − 2,300 = 2,200 a month; 900 food + 700 no category names
    // are must-pay, the 600 eating out is not → 1,600; + 2,400 + 150 = 4,150 → 18,000 ÷ 4,150 = 4.337… → 4.3 months
    expect(doorOf(h).essentialsMonthly).toBe(4_150);
    expect(doorOf(h).essentialsBasis).toBe('calculated');
    const nw = monthsOn(NetWorth, h), st = monthsOn(Stress, h);
    expect(nw).toEqual(['4.3 months']);
    expect(st).toEqual(nw); expect(nw).toEqual(st);
  });
  test('no expenses entered: neither screen prints a months figure (the door refuses, so both do)', () => {
    expect(monthsOn(NetWorth, NO_SPEND)).toEqual([]);
    expect(monthsOn(Stress, NO_SPEND)).toEqual([]);
    set(NO_SPEND); render(<Stress />);
    expect(lines().join(' ')).not.toMatch(/7\.5|months your cash would last/);
  });
});

describe('NW2-03 · "you entered" only for a figure the person typed; a worked-out figure says "calculated" (R7)', () => {
  test('the one monthly total typed, no debt: "you entered"; the same total plus a debt payment: "calculated"', () => {
    const typedOnly = household({ monthlySpending: '5000' }, []);
    expect(doorOf(typedOnly).essentialsMonthly).toBe(5_000);
    expect(doorOf(typedOnly).essentialsBasis).toBe('you entered');
    const plusDebt = household({ monthlySpending: '5000' }, [MORTGAGE]);
    expect(doorOf(plusDebt).essentialsMonthly).toBe(7_400);   // 5,000 + 2,400
    expect(doorOf(plusDebt).essentialsBasis).toBe('calculated');
    set(typedOnly); const r = render(<NetWorth />);
    expect(lines()).toContain('of essentials covered by your cash — $18,000 cash ÷ $5,000/month essentials — you entered');
    r.unmount();
    set(plusDebt); render(<NetWorth />);
    expect(lines()).toContain('of essentials covered by your cash — $18,000 cash ÷ $7,400/month essentials — calculated');
  });
  test('a figure from logged expenses keeps its own words', () => {
    const now = new Date();
    const ago = (k: number) => { const d = new Date(now.getFullYear(), now.getMonth() - k, 10); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-10`; };
    const logged = { ...household({ monthlySpending: '5000' }, []), expenses: [1, 2, 3].map((k) => ({ id: `e${k}`, amount: 3_000, category: 'Groceries', store: 'x', date: ago(k), createdAt: ago(k) })) };
    expect(doorOf(logged).essentialsBasis).toMatch(/month average$/);
  });
  test('the drawing carries the row', () => {
    expect(face('moneykeel_pres_mock_net-worth-quiet-instrument_v08.html')).toMatch(/2026-10-27 Frames A, A2 and B — the word after the essentials figure\..*\$8,838 cash ÷ \$4,150\/month essentials — calculated/);
  });
});

/** v08's own household (networth_matches_v08's fixture, rebuilt here): $813,152 owned, $418,000 owed. */
const today = new Date().toISOString().slice(0, 10);
const V08 = {
  onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', hideBalances: false,
  onboardingProfile: { status: 'employed', birthYear: '1970', monthlySpending: '4500' },
  assetAccounts: [
    { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, target_return: 0 },
    { asset_id: 'hme', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450000, target_return: 0, value_as_of: today },
  ],
  liabilities: [
    { debt_id: 'mtg', label: 'Home mortgage', debt_type: 'MORTGAGE', remaining_balance: 412000, interest_rate_apr: 0.055, minimum_monthly_payment: 2400 },
    { debt_id: 'cc', label: 'Chase Visa', debt_type: 'CREDIT_CARD', remaining_balance: 6000, interest_rate_apr: 0.229, minimum_monthly_payment: 150 },
  ],
};
const bandsOf = (all: any[]) => all.filter((n) => n.type === 'View' && [Colors.primaryDeep, Colors.bandLight].includes(flat(n.props?.style).backgroundColor));

describe('NW2-05 · one continuous ledger: every bar sits flush on what follows it, as v08 draws it', () => {
  test('every bar in the ledger hands back SectionBand’s 4 points (its holder sits at −4), and the emergency fund card is 10 inside above, 14 below', () => {
    set(V08); render(<NetWorth />);
    const all = nodes(screen.toJSON());
    // the ledger sits right under the choice since 2026-10-31 (NW3-14: v08 draws 0 between them; it was 8 + 4)
    const ledger = all.find((n) => n.type === 'View' && flat(n.props?.style).backgroundColor === Colors.cardBg && flat(n.props?.style).marginTop === 0
      && textOf(n).includes('WHAT YOU OWN') && textOf(n).includes('DEBTS') && textOf(n).includes('EMERGENCY FUND'));
    expect(ledger).toBeDefined();                              // one white ledger holds all three sections
    expect(bandsOf(nodes(ledger)).length).toBeGreaterThanOrEqual(6);   // WHAT YOU OWN, Cash, Investments, Personal property, DEBTS, EMERGENCY FUND
    const bands = screen.UNSAFE_root.findAll((n: any) => n.type === 'View' && [Colors.primaryDeep, Colors.bandLight].includes(flat(n.props?.style).backgroundColor)
      && flat(n.props?.style).alignSelf === 'stretch' && /^(WHAT YOU OWN|DEBTS|EMERGENCY FUND|▾|▸|Cash|Investments|Personal property)/.test(textOf(n)));   // section names, no emoji since his ruling 'all', 2026-11-06 (was 💵|📈|🏠); the ledger's bars, not the hero's or the plan card's
    expect(bands.length).toBeGreaterThanOrEqual(6);            // the guard proves it looked: every bar of the ledger
    for (const b of bands) {
      expect(flat(b.props.style).marginBottom).toBe(Spacing.xs);   // SectionBand's own 4 …
      expect(flat(hostUp(b).props.style).marginBottom).toBe(-Spacing.xs);   // … handed back by the holder: flush
    }
    const efHolder = hostUp(bands.find((b: any) => textOf(b).startsWith('EMERGENCY FUND')));
    const box = hostUp(efHolder);
    const pads = box.findAll((x: any) => typeof x.type === 'string' && flat(x.props.style).paddingTop === 10 && flat(x.props.style).paddingBottom === 14);
    expect(pads.length).toBeGreaterThan(0);                    // v08 .cush: padding 10 … 14, under the bar
  });
});

describe('NW2-06 · the debt rows’ icons at the row’s own 15 points, beside the name', () => {
  test('and 💳 are 15, in the name group with the name (v08 .debt .n)', () => {
    set(V08); render(<NetWorth />);
    for (const [icon, name] of [['🏠', 'Home mortgage'], ['💳', 'Chase Visa']]) {
      const row = screen.getByLabelText(new RegExp(`^${name}, you owe`));
      const icons = nodes(row).filter((x) => x.type === 'Text' && textOf(x) === icon);
      expect(icons).toHaveLength(1);
      expect(flat(icons[0].props.style).fontSize).toBe(15);    // it was 20
      expect(textOf(hostUp(icons[0]))).toContain(name);        // the icon and the name share one group
    }
  });
});

describe('NW2-08 · the Debts bar floors its smallest part at 1.5%, as the What you own bar does', () => {
  test('Chase Visa $6,000 of $418,000 (1.44%) is drawn 1.5% wide, the mortgage 98.5%; the printed shares stay 99% and 1%', () => {
    set(V08); render(<NetWorth />);
    // the Debts bar: its first part is the mortgage in the debts' own colour (v08 #4A2E00), not the What you own bar above it
    const bar = nodes(screen.toJSON()).find((n) => n.type === 'View' && flat(n.props?.style).height === 10 && (n.children ?? []).length === 2
      && (n.children as any[]).every((c) => typeof c !== 'string' && /%$/.test(String(flat(c.props?.style).width)))
      && String(flat((n.children as any[])[0].props.style).backgroundColor).toUpperCase() === '#4A2E00');
    expect(bar).toBeDefined();
    const widths = (bar.children as any[]).map((c) => parseFloat(flat(c.props.style).width));
    // 412,000 ÷ 418,000 = 98.5646%; the card 1.4354% is floored to 1.5, and the two scaled back to 100: 98.5646 ÷ 100.0646 = 98.5010%,
    // 1.5 ÷ 100.0646 = 1.4990% — 98.50% and 1.50% at two decimals, as the row says
    expect(widths[0]).toBeCloseTo((412000 / 418000 * 100) / (412000 / 418000 * 100 + 1.5) * 100, 9); expect(widths[1]).toBeCloseTo(1.5 / (412000 / 418000 * 100 + 1.5) * 100, 9);
    expect([widths[0].toFixed(2), widths[1].toFixed(2)]).toEqual(['98.50', '1.50']);
    expect(lines()).toEqual(expect.arrayContaining(['Home mortgage 99%', 'Chase Visa 1%']));
    expect(face('moneykeel_pres_mock_net-worth-quiet-instrument_v08.html')).toMatch(/2026-10-27 DRAWING ERROR, frames A and A2 — the Debts bar draws Home mortgage at 98\.56% and Chase Visa at 1\.44%.*Chase Visa is drawn 1\.50% wide and Home mortgage 98\.50%/);
  });
});

describe('NW2-04 · the change walk: the dark-green bar starts 10 points under the handle, never over it', () => {
  test('the sheet is 10 above the handle; the handle 10 above a holder that gives the bar’s −16 back', () => {
    const { ChangeWalkSheet } = require('../../components/ChangeWalkSheet');
    render(<ChangeWalkSheet visible onClose={() => {}} walk={{ fromLabel: 'Aug 3', toLabel: 'Aug 11', beginning: 393042, contributions: 500, withdrawals: 500,
      wealthGenerated: 1910, dividends: 1220, interest: 430, marketChange: 260, debtPrincipal: 200, ending: 395152 } as any} />);
    const band = screen.getByText(/^How \$393,042 became \$395,152$/);
    let b: any = band; while (b && !(b.type === 'View' && flat(b.props?.style).backgroundColor === Colors.primaryDeep)) b = b.parent;
    expect(flat(b.props.style).marginTop).toBe(-Spacing.base);                 // inCard pulls the bar up by the sheet's padding …
    const holder = hostUp(b);
    expect(flat(holder.props.style).paddingTop).toBe(Spacing.base);           // … and the holder gives it back
    const sheet = hostUp(holder);
    const grab = (sheet.children as any[]).find((c) => typeof c !== 'string' && flat(c.props?.style).height === 4);
    expect(flat(grab.props.style)).toMatchObject({ width: 36, marginBottom: 10 });
    expect(flat(sheet.props.style)).toMatchObject({ paddingTop: 10 });
    expect(flat(sheet.props.style).padding).toBe(Spacing.base);               // 16 at the sides (v08 .sheet: 10px 16px 30px)
    // the bar's top = handle bottom + 10 + 16 − 16 = handle bottom + 10
    expect(flat(grab.props.style).marginBottom + flat(holder.props.style).paddingTop + flat(b.props.style).marginTop).toBe(10);
  });
});

describe('NW2-09 · the add sheet’s handle and padding as v08 frame G draws them', () => {
  test('handle 36 wide in the tertiary grey, 10 under the top; 16 at the sides, 30 below', () => {
    set(V08); render(<NetWorth />);
    fireEvent.press(screen.getByLabelText('Add an account'));
    const title = screen.getByText('How do you want to add an account?');
    const card = hostUp(title);
    expect(flat(card.props.style)).toMatchObject({ paddingTop: 10, paddingHorizontal: Spacing.base, paddingBottom: 30 });
    const grab = (card.children as any[]).find((c) => typeof c !== 'string' && flat(c.props?.style).height === 4);
    expect(flat(grab.props.style)).toMatchObject({ width: 36, backgroundColor: Colors.bgTertiary, marginBottom: 10 });
  });
});

describe('workplan row 354 · rows are at least 44 points: the drawing draws none at 52, and 44 is the smallest finger target', () => {
  test('every ledger row on Net worth is at least 44, and the row of 2026-10-27 says why', () => {
    set(V08); render(<NetWorth />);
    const rows = nodes(screen.toJSON()).filter((n) => n.type === 'View' && flat(n.props?.style).borderTopWidth === 1 && n.props?.accessibilityRole === 'button');
    expect(rows.length).toBeGreaterThanOrEqual(4);
    for (const r of rows) expect(flat(r.props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(face('moneykeel_pres_mock_net-worth-quiet-instrument_v08.html')).toMatch(/2026-10-27 Frames A, A2, B and D — how tall a row is\. Measured on this drawing at 390 points: a category row 39 points .* No row is drawn at 52\. The app builds every row at least 44 points tall/);
  });
});

describe('NW2-14 · the accrued-interest note says the once-a-year assumption when Pays interest was never chosen', () => {
  const APPLE = { face: 20_000, couponRate: 0.045, maturity: '2030-03-15', value: 19_530 } as any;
  test('not chosen: his sentence, then the assumption; chosen: his sentence alone', () => {
    const now = new Date('2026-10-01T12:00:00');
    expect(accruedInterestCaveat(APPLE, now)).toMatch(/^Added estimated \$\d[\d,]* in accrued interest to bond value at 4\.5% coupon for \d+ days to calculate YTM\. If this is not accurate, enter actual accrued interest$/);
    expect(accruedFrequencyAssumed(APPLE, now)).toBe('How often it pays is not entered, so the estimate takes it as once a year.');
    expect(accruedFrequencyAssumed({ ...APPLE, couponsPerYear: 1 }, now)).toBeNull();
    expect(accruedFrequencyAssumed({ ...APPLE, couponsPerYear: 2 }, now)).toBeNull();
    expect(accruedFrequencyAssumed({ ...APPLE, accruedInterest: 0 }, now)).toBeNull();   // no estimate used, nothing assumed
  });
  test('the Bonds screen prints the two sentences as one note; the drawing carries the row', () => {
    set({ ...V08, assetAccounts: [{ asset_id: 'b2', label: 'Apple Corp 4.5%', kind: 'bond', tax_bucket: 'TAXABLE', balance: 19530, face_value: 20000, coupon_rate: 0.045, maturity_date: '2030-03-15' }] });
    render(<>{React.createElement(require('../BondsScreen').default)}</>);
    expect(lines().some((l) => /^\* Added estimated \$[\d,]+ in accrued interest .* enter actual accrued interest\. How often it pays is not entered, so the estimate takes it as once a year\.$/.test(l))).toBe(true);
    expect(face('moneykeel_pres_mock_bonds_v02.html')).toMatch(/2026-10-27 Phone 1 — the note under Apple Corp 4\.5%, whose Pays interest was never chosen\./);
  });
});

describe('NW2-22 · an account built by hand: no line about a broker’s records', () => {
  const FID = { asset_id: 'fid', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', source: 'manual', balance: 3_500, cash_balance: 1_000,
    positions: [{ position_id: 'v', ticker: 'VTI', asset_class: 'stock_etf', shares: 10, price: 250, last_price: 250, lots: [{ lot_id: 'l', shares: 10, cost_per_share: 250, purchase_date: '2026-09-01' }] }] };
  const TXNS = [{ id: 't1', account_id: 'fid', type: 'DEPOSIT', amount: 1_000, date: '2026-09-01', source: 'manual' },
    { id: 't2', account_id: 'fid', type: 'BUY', ticker: 'VTI', shares: 10, price: 250, amount: 2_500, date: '2026-09-02', source: 'manual' }];
  const page = (acct: any, txns: any[]) => {
    set({ ...V08, assetAccounts: [acct], transactions: txns });
    mockParams = { id: acct.asset_id };
    const r = render(React.createElement(require('../AccountPortfolioScreen').default));
    const ls = lines(); r.unmount(); mockParams = {};
    return ls;
  };
  test('built by hand: the second sentence alone; linked: the whole drawn line', () => {
    const hand = page(FID, TXNS);
    expect(hand).toContain('Anything you add is marked “you entered this” and stays editable.');
    expect(hand.join(' ')).not.toMatch(/can’t be edited — they are the broker’s own/);
    const linked = page({ ...FID, source: 'connected' }, TXNS.map((t) => ({ ...t, source: 'connected' })));
    expect(linked).toContain('Records from Fidelity can’t be edited — they are the broker’s own. Anything you add is marked “you entered this” and stays editable.');
    expect(face('moneykeel_pres_mock_account-page_v01.html')).toMatch(/86 ?2026-10-27 · Not a drawn state: an account built by hand, whose every record the person typed\./);
  });
});

describe('workplan row 353 · the property form asks the mortgage’s rate; blank is not entered, a typed rate is saved', () => {
  const AddAccount = () => { const C = require('../AddAccountScreen').default; return <C />; };
  const addLakeHouse = (rate: string | null) => {
    set({ ...V08, liabilities: [] });
    const r = render(<AddAccount />);
    fireEvent.press(screen.getByLabelText('Real estate'));
    fireEvent.changeText(screen.getByLabelText('Account name'), 'Lake house');
    fireEvent.changeText(screen.getByLabelText('Balance'), '300000');
    expect(screen.queryByLabelText('Mortgage interest rate percent, optional')).toBeNull();   // asked only once a balance is owed
    fireEvent.changeText(screen.getByLabelText('Amount still owed'), '240000');
    fireEvent.changeText(screen.getByLabelText('Monthly mortgage payment'), '1900');
    expect(screen.getByText('Mortgage interest rate % (optional)')).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('6.5')).toBeNull();                      // the box opens empty, with no example rate (R16, 2026-10-31)
    if (rate != null) fireEvent.changeText(screen.getByLabelText('Mortgage interest rate percent, optional'), rate);
    fireEvent.press(screen.getByLabelText('Save this account'));
    r.unmount();
    return ((useStore.getState() as any).liabilities as any[]).find((d) => d.debt_type === 'MORTGAGE');
  };
  test('6.5 typed is 6.5% a year; blank is not entered, never 0%; a typed 0 is 0%', () => {
    expect(addLakeHouse('6.5')).toMatchObject({ label: 'Lake house mortgage', remaining_balance: 240_000, minimum_monthly_payment: 1_900 });
    expect(addLakeHouse('6.5').interest_rate_apr).toBeCloseTo(0.065, 12);
    expect(addLakeHouse(null).interest_rate_apr).toBeUndefined();
    expect(addLakeHouse('0').interest_rate_apr).toBe(0);
    expect(face('moneykeel_pres_mock_add-account-by-hand_v02.html')).toMatch(/2026-10-27 Real estate \(phone 5\) — with a mortgage balance typed, the form now also asks the mortgage’s rate, under Monthly mortgage payment: ‘Mortgage interest rate % \(optional\)’/);
  });
});

describe('NW2-11, NW2-12, NW2-13 · the drawings say what the screens print', () => {
  test('the straight apostrophes are corrected on v08 E, Alternatives 3 and Itemize 1–3; the Bonds hint and the Itemize face value box are drawn by a row', () => {
    expect(face('moneykeel_pres_mock_net-worth-quiet-instrument_v08.html')).toMatch(/2026-10-27 DRAWING ERROR, state E — the note under the walk draws ‘that's’ with a straight apostrophe\..*‘Contributions are not a gain — that’s why Wealth generated is its own section\.’/);
    expect(face('moneykeel_pres_mock_alternatives_v02.html')).toMatch(/2026-10-27 DRAWING ERROR, phone 3 — the box’s name is drawn ‘Where it's held \(institution\)’.*‘Where it’s held \(institution\)’/);
    const itemize = face('moneykeel_pres_mock_itemize_v02.html');
    expect(itemize).toMatch(/READ THIS FIRST \(2026-10-27, DEC-8336, DEC-4529\): DRAWING ERROR, phones 1 to 3 — ‘what's’ and ‘it'll’/);
    expect(itemize).toMatch(/READ THIS FIRST \(2026-10-27, DEC-0651\): phone 3, the bond form — the box ‘Face value \(optional\) — what it pays back’/);
    expect(face('moneykeel_pres_mock_bonds_v02.html')).toMatch(/2026-10-27 Editor \(phone 3\) — under the Institution \/ account box .*‘Held inside a brokerage or bank account\? Add it here — if that account already has a balance, we’ll ask whether this bond is part of it so nothing is double-counted\.’ It stays/);
  });
});

describe('MK-NW-F-058 yearsToMaturity · one anniversary rule: 29 February falls on 28 February in other years', () => {
  test('2028-02-29 seen on 2026-10-09 is 1 + 142 ÷ 365; a 28 February maturity reads the same day; 2028-10-09 is exactly 2', () => {
    const D = (s: string) => new Date(`${s}T12:00:00`);
    expect(yearsToMaturity('2028-02-29', D('2026-10-09'))!).toBeCloseTo(1 + 142 / 365, 12);   // it read 1 + 143 ÷ 365 = 1.3918
    expect(yearsToMaturity('2028-02-28', D('2026-10-09'))!).toBeCloseTo(1 + 142 / 365, 12);
    expect(yearsToMaturity('2028-10-09', D('2026-10-09'))).toBe(2);
    expect(yearsToMaturity('2028-02-29', D('2028-02-28'))!).toBeCloseTo(1 / 366, 12);          // the day before, in the leap year: Feb 28, 2027 → Feb 29, 2028 is 366 days
  });
});

describe('MK-NW-F-106 · a mortgage sits on a property only where the person placed it (the lead’s ruling, tenet 5)', () => {
  test('one unnamed mortgage beside one home is on no property: Net worth names it and its tap opens it; its payment still counts', () => {
    const h = household({ monthlySpending: '1100' }, [{ debt_id: 'ch', label: 'Chase', debt_type: 'MORTGAGE', remaining_balance: 300_000, interest_rate_apr: 0.06, minimum_monthly_payment: 2_400 }]);
    set(h); render(<NetWorth />);
    expect(lines()).toContain('Your mortgage “Chase” is not on a property. A mortgage is always on a property — open it and say which one.');
    expect(doorOf(h).debtMinimums).toBe(2_400);                                   // the $2,400 still counts
    expect(doorOf(h).monthsCovered).toBeCloseTo(18_000 / 3_500, 12);              // 18,000 ÷ (1,100 + 2,400): the months do not move
    expect(face('moneykeel_pres_mock_net-worth-quiet-instrument_v08.html')).toMatch(/2026-10-27 Not a drawn state: every drawn mortgage names its property .* The app no longer puts the one mortgage left over on the one property left over by itself\./);
  });
});

describe('R1 · every box title on a dark-green bar, every sub-title on a light-green bar (his words, DEC-8839) — the rows of 2026-10-30', () => {
  test('the rows are on the account page, Bonds, Alternatives and Itemize drawings, each opening with what he approved, his words and what is new', () => {
    const acct = face('moneykeel_pres_mock_account-page_v01.html');
    expect(acct).toMatch(/87 ?2026-10-30 · Approved before: this drawing, states A to F, 2026-10-19 \(DEC-6457: “approved\.”\)\..* His feedback: .*“ContributionRoom, Stress Test screens - both are not standard app design as the standard design says box titles in dark green bar, and sub-titles in light green bar\.” New: each of the four is its card’s title on the dark-green bar/);
    for (const f of ['moneykeel_pres_mock_bonds_v02.html', 'moneykeel_pres_mock_alternatives_v02.html']) {
      expect(face(f)).toMatch(/2026-10-30 Approved before: this drawing, 2026-10-01 \(DEC-0650: .* His feedback: .* New: the sell box’s title is a sub-title on the light-green bar/);
    }
    expect(face('moneykeel_pres_mock_itemize_v02.html')).toMatch(/READ THIS FIRST \(2026-10-30, DEC-8839\): Approved before: nothing of his .* New: ‘ADD A HOLDING’ is the form’s title on the dark-green bar/);
  });
  test('the account page’s card titles render on the dark-green bar, white', () => {
    const BOND = { asset_id: 'b', label: 'Treasury note', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 9800, face_value: 10000, coupon_rate: 0.045, maturity_date: '2031-06-01', source: 'manual' };
    set({ ...V08, assetAccounts: [BOND] }); mockParams = { id: 'b' };
    render(React.createElement(require('../AccountPortfolioScreen').default)); mockParams = {};
    let n: any = screen.getByText('BOND FACTS');
    expect(flat(n.props.style).color).toBe(Colors.white);
    while (n && !(n.type === 'View' && flat(n.props?.style).backgroundColor === Colors.primaryDeep)) n = n.parent;
    expect(n).toBeTruthy();
  });
});

/** EVERY SENTENCE THAT CARRIES THE EMERGENCY FUND'S SOURCE WORD (2026-10-30, the lead's follow-up to R7). R7 changed the word to
 *  "calculated", and Job safety had set the word inside a longer phrase: "— calculated of your logged expenses". Each sentence that
 *  reads the door's word is read here in its three sources — a typed total, a calculated figure, a logged average — and must say it
 *  in whole English. 7 sentences: Net worth 1, the Stress test 3, Job safety 1, Insights 1, the door's own worked example 1. */
describe('the source word inside every sentence that reads it — 7 of 7, each source', () => {
  const now = new Date();
  const ago = (k: number) => { const d = new Date(now.getFullYear(), now.getMonth() - k, 10); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-10`; };
  const TYPED = household({ monthlySpending: '3000' }, []);                                   // $3,000 typed, no debt → "you entered"
  const CALC = household({ monthlySpending: '1100' }, [MORTGAGE]);                            // $1,100 + $2,400 → "calculated"
  const LOGGED = { ...household({ monthlySpending: '5000' }, []),                             // three logged months of $3,000 → "3 month average"
    expenses: [1, 2, 3].map((k) => ({ id: `e${k}`, amount: 3_000, category: 'Groceries', store: 'x', date: ago(k), createdAt: ago(k) })) };
  const linesOf = (Screen: any, h: any) => { set(h); const r = render(React.createElement(Screen)); const ls = lines(); r.unmount(); return ls; };
  const Job = require('../JobSafetyScreen').default;
  const StressScreen = require('../StressTestScreen').default;
  const BROKEN = /— (calculated|you entered) of |\(\)|— —|— $/;

  test('the door: its word and its whole phrase, for each source', () => {
    expect([doorOf(TYPED).essentialsBasis, doorOf(TYPED).essentialsSource]).toEqual(['you entered', 'the monthly total you entered']);
    expect([doorOf(CALC).essentialsBasis, doorOf(CALC).essentialsSource]).toEqual(['calculated', 'calculated from your budget and your debt payments']);
    expect([doorOf(LOGGED).essentialsBasis, doorOf(LOGGED).essentialsSource]).toEqual(['3 month average', '3 month average of your logged expenses']);
    // $5,000 typed, $900 of groceries (must-pay) and $600 eating out (not): 900 + the 3,500 no category names = $4,400, no debt
    const calcNoDebt = household({ monthlySpending: '5000', spendCats: [{ id: 'g', label: 'Groceries', amount: 900, bucket: 'flexible', tier: 'need' },
      { id: 'd', label: 'Eating out', amount: 600, bucket: 'flexible', tier: 'flex' }] }, []);
    expect(doorOf(calcNoDebt).essentialsMonthly).toBe(4_400);
    expect([doorOf(calcNoDebt).essentialsBasis, doorOf(calcNoDebt).essentialsSource]).toEqual(['calculated', 'calculated from your budget']);
    // a typed total that IS the month — every dollar of it must-pay — is the figure the person typed: "you entered"
    const allNeed = household({ monthlySpending: '5000', spendCats: [{ id: 'g', label: 'Groceries', amount: 900, bucket: 'flexible', tier: 'need' }] }, []);
    expect([doorOf(allNeed).essentialsMonthly, doorOf(allNeed).essentialsBasis]).toEqual([5_000, 'you entered']);
  });
  test('1 · Net worth: "… essentials — <word>", the word closing the line', () => {
    expect(linesOf(require('../NetWorthScreen').default, TYPED)).toContain('of essentials covered by your cash — $18,000 cash ÷ $3,000/month essentials — you entered');
    expect(linesOf(require('../NetWorthScreen').default, CALC)).toContain('of essentials covered by your cash — $18,000 cash ÷ $3,500/month essentials — calculated');
    expect(linesOf(require('../NetWorthScreen').default, LOGGED)).toContain('of essentials covered by your cash — $18,000 cash ÷ $3,000/month essentials — 3 month average');
  });
  test('2–4 · the Stress test: the word after a dash or in brackets, in all three of its sentences', () => {
    for (const [h, word] of [[TYPED, 'you entered'], [CALC, 'calculated'], [LOGGED, '3 month average']] as const) {
      const ls = linesOf(StressScreen, h).filter((l) => l.includes(`(${word})`) || l.includes(`— ${word})`) || l.includes(`— ${word},`));
      expect(ls.length).toBeGreaterThanOrEqual(2);              // the hit's line and the job-loss line both carry it
      for (const l of ls) expect(l).not.toMatch(BROKEN);
    }
  });
  test('5 · Job safety: "Using $X/month — <whole phrase> — type your own…"', () => {
    expect(linesOf(Job, TYPED)).toContain('Using $3,000/month — the monthly total you entered — type your own if a typical month differs.');
    expect(linesOf(Job, CALC)).toContain('Using $3,500/month — calculated from your budget and your debt payments — type your own if a typical month differs.');
    expect(linesOf(Job, LOGGED)).toContain('Using $3,000/month — 3 month average of your logged expenses — type your own if a typical month differs.');
    for (const h of [TYPED, CALC, LOGGED]) expect(linesOf(Job, h).join(' ')).not.toMatch(BROKEN);
  });
  test('6 · Insights: each figure of the runway card carries its own source', () => {
    // $6,000 of cash so the runway card shows (6,000 ÷ 3,500 = 1.7 months, under 3); opened, it lists the figures behind the months
    const openRunway = (h: any) => {
      set({ ...h, assetAccounts: [{ ...CASH, balance: 6_000 }, HOME] });
      const r = render(React.createElement(require('../InsightsScreen').default));
      fireEvent.press(screen.getByLabelText(/^Build your emergency fund/));
      const ls = lines(); r.unmount(); return ls;
    };
    const calc = openRunway(CALC);
    expect(calc).toContain('Expenses/month at your planned spend');                     // the planned spend's own words — never the essentials' source
    expect(calc).toContain('Needed each month (calculated)');                           // the essentials' source beside the essentials: $1,100 + $2,400
    expect(calc.join(' ')).not.toMatch(BROKEN);
    const typed = openRunway({ ...TYPED, onboardingProfile: { ...TYPED.onboardingProfile, monthlySpending: '4000' } });   // 6,000 ÷ 4,000 = 1.5
    expect(typed).toContain('Needed each month (you entered)');
  });
  test('7 · the door’s worked example prints the whole phrase', () => {
    const { figureSpec } = require('../../../MoneyKeel/functions/figures');
    const spec = figureSpec('MK-MN-M-021');
    expect(spec.worked.answer).toBe('Using $3,470/month — calculated from your budget and your debt payments');
    expect(spec.worked.run()).toBe(spec.worked.answer);
  });
});

/** A QUANTITY AS HELD, THE SAME ON THE ACCOUNT PAGE AND THE HOLDING PAGE (2026-10-30, FX-PF's finding; Q49; account-page v01 row 88).
 *  The account page wrote quantities through toLocaleString, which cut them to three decimals. */
describe('a quantity with decimals — the account page writes it as the Holding page does', () => {
  const ACC = { asset_id: 'cb', label: 'Coinbase', institution: 'Coinbase', kind: 'brokerage', tax_bucket: 'TAXABLE', source: 'manual', balance: 9_000, cash_balance: 0,
    positions: [
      { position_id: 'btc', ticker: 'BTC', kind: 'crypto', asset_class: 'alternatives', shares: 0.12345678, price: 60_000, last_price: 60_000,
        lots: [{ lot_id: 'l1', shares: 0.12345678, cost_per_share: 50_000, purchase_date: '2026-01-02' }] },
      { position_id: 'vti', ticker: 'VTI', asset_class: 'stock_etf', shares: 12.3456789, price: 250, last_price: 250,
        lots: [{ lot_id: 'l2', shares: 12.3456789, cost_per_share: 200, purchase_date: '2026-01-02' }] }] };
  const page = (Screen: any, params: any) => { set({ ...V08, assetAccounts: [ACC], transactions: [] }); mockParams = params; const r = render(React.createElement(Screen)); const ls = lines(); r.unmount(); mockParams = {}; return ls.join(' '); };
  test('0.12345678 BTC and 12.3456789 VTI keep every decimal, on both pages', () => {
    const acct = page(require('../AccountPortfolioScreen').default, { id: 'cb' });
    expect(acct).toMatch(/0\.12345678 coins/);                          // it read 0.123 coins
    expect(acct).toMatch(/12\.3456789 shares/);                         // it read 12.346 shares
    expect(acct).not.toMatch(/0\.123 coins|12\.346 shares/);
    const btc = page(require('../HoldingDetailScreen').default, { account: 'cb', position: 'btc' });
    const vti = page(require('../HoldingDetailScreen').default, { account: 'cb', position: 'vti' });
    expect(btc).toMatch(/0\.12345678 coins/);
    expect(vti).toMatch(/12\.3456789 shares/);
    expect(face('moneykeel_pres_mock_account-page_v01.html')).toMatch(/88 ?2026-10-30 · Not a drawn state: every drawn holding has a whole number of shares/);
  });
  test('a whole quantity is grouped in thousands, as before', () => {
    const { heldQuantity } = require('../../domain/performance');
    expect([heldQuantity(3319), heldQuantity(160), heldQuantity(1234.5)]).toEqual(['3,319', '160', '1,234.5']);
  });
});

/** ROUND 3 OF THE DRAWING MATCH (2026-10-31): NW3-05 to NW3-11 and NW3-14, each pinned with its figures worked by hand. */
describe('drawing match round 3 — the Net worth fixes', () => {
  test('NW3-05 · a bank CD with no face value: its money comes back, not "the face value above"', () => {
    const { theBonds } = require('../../../MoneyKeel/functions/networth-and-performance/bonds');
    const cd = { asset_id: 'ally', label: 'Ally CD', kind: 'cd', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 10_000, coupon_rate: 0.0505, maturity_date: '2027-06-01', cd_bought: 'bank' };
    const noFace = theBonds({ accounts: [cd], accountId: 'ally' }).one;
    expect(noFace.ratesMoveRefusal).toMatch(/it is worth its balance until it matures, when the money you put in comes back\./);
    expect(noFace.ratesMoveRefusal).not.toMatch(/face value above/);
    const withFace = theBonds({ accounts: [{ ...cd, face_value: 10_000 }], accountId: 'ally' }).one;
    expect(withFace.ratesMoveRefusal).toMatch(/when the face value above comes back\./);
    expect(face('moneykeel_pres_mock_account-page_v01.html')).toMatch(/2026-10-31 · Not a drawn state: a CD bought from the bank with no face value entered/);
  });
  test('NW3-06 · Alternatives: the share of investable money to two decimals, worked once by its door', () => {
    const { theAlternativesOutlook } = require('../../../MoneyKeel/functions/networth-and-performance/alternatives-outlook');
    const accts = [{ asset_id: 'a1', label: 'Bitcoin', kind: 'crypto', tax_bucket: 'TAXABLE', balance: 61_500 }];
    expect(theAlternativesOutlook({ accounts: accts, investable: 501_500 }).shareOfInvestable).toBeCloseTo(61_500 / 501_500, 12);   // 0.122632…
    expect(theAlternativesOutlook({ accounts: accts, investable: 0 }).shareOfInvestable).toBeNull();                                 // no share, never 0%
    set({ ...V08, assetAccounts: [...accts, { asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 440_000 }] });
    render(React.createElement(require('../OtherInvestmentsScreen').default));
    expect(lines()).toContain('1 holding · 12.26% of your investable assets');           // 61,500 ÷ 501,500 = 12.26%; it read 12.3%
    expect(face('moneykeel_pres_mock_alternatives_v02.html')).toMatch(/2026-10-31 Phone 1 — the share of investable assets under the total\. It reads to two decimals: ‘3 holdings · 12\.00% of your investable assets’/);
  });
  test('NW3-07 · R16: a box nobody filled opens empty — no grey figure on the debt editor, Add an account, Bonds, Alternatives, Itemize, the add sheet', () => {
    const FIGURE = /^\$?[\d.,%/]+$/;   // a grey example made of a figure: '0', '$0', '6.5', '19.99', '0%', '12/2026', '03/2047', '$9,700'
    const examples = () => screen.UNSAFE_root.findAll((n: any) => n.type === 'TextInput').map((n: any) => (n.props.value ? null : n.props.placeholder)).filter((p: any) => p != null);
    set(household({ monthlySpending: '3200' }, [])); render(<NetWorth />);
    fireEvent.press(screen.getByText(/Add your debts/));
    for (const kind of ['Credit card', 'Mortgage', 'Auto loan']) {
      fireEvent.press(screen.getByLabelText(kind));
      for (const shape of ['Monthly payments', 'Card / revolving', 'Due in full']) {
        fireEvent.press(screen.getByLabelText(shape));
        expect(examples().filter((p: string) => FIGURE.test(p))).toEqual([]);
      }
    }
    const AddAccount = require('../AddAccountScreen').default;
    for (const kind of ['Cash', 'Stocks / Funds', 'Bonds', 'Alternatives', 'Real estate', 'Debt']) {
      set(household({}, [])); const r = render(<AddAccount />);
      fireEvent.press(screen.getAllByText(kind)[0]);
      if (kind === 'Real estate') fireEvent.changeText(screen.getByLabelText('Amount still owed'), '240000');   // the payment and rate boxes appear
      expect([kind, examples().filter((p: string) => FIGURE.test(p))]).toEqual([kind, []]);
      r.unmount();
    }
    for (const [Screen, open] of [[require('../BondsScreen').default, /^＋ Add a bond$|Add a bond/], [require('../OtherInvestmentsScreen').default, /Add an investment/]] as const) {
      set(household({}, [])); const r = render(React.createElement(Screen));
      fireEvent.press(screen.getAllByText(open)[0]);
      expect(examples().filter((p: string) => FIGURE.test(p))).toEqual([]);
      r.unmount();
    }
    expect(face('moneykeel_pres_mock_add-account-by-hand_v02.html')).toMatch(/2026-10-31 Every phone — a box nobody has filled opens empty\./);
  });
  test('NW3-08 · one list of Alternatives kinds on all three forms, in one order', () => {
    const FIVE = ['Crypto', 'Gold / commodities', 'Annuities', 'Options', 'Other'];
    set(household({}, [])); let r = render(React.createElement(require('../AddAccountScreen').default));
    fireEvent.press(screen.getAllByText('Alternatives')[0]);
    const ls = lines(); expect(ls.slice(ls.indexOf('What kind?') + 1, ls.indexOf('What kind?') + 6)).toEqual(FIVE); r.unmount();
    set({ ...household({}, []), nwSetupChoice: 'guided' }); r = render(<NetWorth />);
    fireEvent.press(screen.getByText('Next →'));
    fireEvent.press(screen.getByLabelText(/^Add to /)); fireEvent.press(screen.getByLabelText('Alternatives'));
    const sheet = lines(); const at = sheet.indexOf('Alternatives', sheet.indexOf('Add to net worth') + 1);
    expect(sheet.filter((l) => FIVE.includes(l)).slice(-5)).toEqual(FIVE); r.unmount();
    set({ ...household({}, []) }); r = render(React.createElement(require('../OtherInvestmentsScreen').default));
    fireEvent.press(screen.getAllByText(/Add an investment/)[0]);
    expect(lines().filter((l) => FIVE.includes(l))).toEqual(FIVE);
    void at;
  });
  test('NW3-09 · every debt with no balance: the Debts bar says "Value not entered", as the Investments bar does', () => {
    set({ ...V08, liabilities: V08.liabilities.map((d: any) => ({ ...d, remaining_balance: null })) }); render(<NetWorth />);
    const ls = lines(); const at = ls.indexOf('DEBTS');
    expect(ls.slice(at, at + 3)).toEqual(['DEBTS', 'ⓘ', 'Value not entered']);
  });
  test('NW3-10 · accounts but no debts: v08 frame C’s two parts — the line, then the door row', () => {
    set({ ...V08, liabilities: [] }); render(<NetWorth />);
    const ls = lines(); const at = ls.indexOf('DEBTS');
    expect(ls.slice(at, at + 6)).toEqual(['DEBTS', 'ⓘ', '$0', 'Nothing entered yet.', 'Add your debts', '›']);   // it was one line, 'Nothing entered yet. Add your debts ›'
  });
  test('NW3-11 · a gap whose title ends in a full stop is not given a second one', () => {
    const { DataGapsBanner } = require('../../components/DataGapsBanner');
    render(<DataGapsBanner onPage={{ sync: true }} gaps={[{ kind: 'history-depth', title: 'Your broker sent 30 days of history; figures before that aren’t counted.', meanwhile: 'Figures for this window count from Oct 5.' } as any]} />);
    const all = lines().join(' ');
    expect(all).toContain('figures before that aren’t counted. Figures for this window count from Oct 5.');
    expect(all).not.toMatch(/\.\./);
  });
  test('NW3-14 · Net worth’s spacing, as v08 draws it', () => {
    set(V08); render(<NetWorth />);
    const band = screen.getByText(/^YOUR NET WORTH/);
    let b: any = band; while (b && !(b.type === 'View' && flat(b.props?.style).backgroundColor === Colors.primaryDeep)) b = b.parent;
    expect(flat(b.props.style).marginBottom + Spacing.xs).toBe(8);                    // SectionBand's 4 + the body's 4 = v08's 8 under the bar
    const { StyleSheet: SS } = require('react-native');
    const src = fs.readFileSync(path.join(ROOT, 'src/screens/NetWorthScreen.tsx'), 'utf8');
    expect(src).toMatch(/groupPills: \{ flexDirection: 'row', gap: 8, marginTop: Spacing\.md, marginBottom: 0,/);   // 8 + 12 = 20 above, 0 below
    expect(src).toMatch(/ledger: \{ backgroundColor: Colors\.cardBg, marginTop: 0 \}/);
    expect(src).toMatch(/chooserHead: \{[^}]*marginBottom: 14 \}/);
    const walk = fs.readFileSync(path.join(ROOT, 'src/components/ChangeWalkSheet.tsx'), 'utf8');
    expect(walk).toMatch(/paddingTop: 10, paddingBottom: 30 \}/);
    expect(walk).toMatch(/bandHolder: \{ paddingTop: Spacing\.base, paddingBottom: 2 \}/);   // 4 + 2 = v08's 6 under the walk's bar
    void SS;
  });
});

/** ROUND 5 OF THE DRAWING MATCH (2026-11-01): NW5-01, NW5-05, NW5-06 and NW5-09, each with its row written before the code. */
describe('drawing match round 5 — the Net worth fixes', () => {
  const NetWorth = () => React.createElement(require('../NetWorthScreen').default);
  const Account = () => React.createElement(require('../AccountPortfolioScreen').default);
  const real = jest.requireActual('fs') as typeof import('fs');
  const face = (f: string) => real.readFileSync(require('path').join(__dirname, '..', '..', '..', 'MoneyKeel/documents/networth-and-performance', f), 'utf8');
  test('NW5-01 · every category bar on the account page takes the touch margin — 44 to the touch; row 94 corrects row 92', () => {
    const src = real.readFileSync(require('path').join(__dirname, '..', 'AccountPortfolioScreen.tsx'), 'utf8');
    expect(src).toMatch(/<TouchableOpacity style=\{s\.classBand\} hitSlop=\{Tap\.slop\}/);
    const { Tap } = require('../../utils/theme');
    expect(11 * 1.2 + Tap.slop.top + Tap.slop.bottom).toBeGreaterThanOrEqual(44);   // the bar's 11-point caps alone, 13.2 + 32 = 45.2
    expect(face('moneykeel_pres_mock_account-page_v01.html')).toMatch(/2026-11-01 · Correction to row 92\./);
  });
  test('NW5-05 · a typed total dated Sep 1, 2026, nothing recorded since, on Nov 1, 2026: its date, and why there is no return', () => {
    jest.useFakeTimers({ now: new Date('2026-11-01T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    set({ ...V08, assetAccounts: [{ asset_id: 'chb', label: 'Chase Brokerage', institution: 'Chase', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 50_000, value_as_of: '2026-09-01' }], transactions: [], snapshotDays: [], nwDaily: {} });
    mockParams = { id: 'chb' }; render(Account()); mockParams = {};
    const ls = lines();
    expect(ls).toContain('Its value was entered as of Sep 1, 2026, and nothing has been recorded since, so there is no change to measure. Wealth generated and Return show once a record or a new value is entered.');
    expect(ls).not.toContain('You added this account today, so its figures start today.');
    expect(ls).not.toContain('Since today');
    expect(ls.at(ls.indexOf('Return') + 1)).toBe('—');                       // no second value: no figure, never +0.00%
    jest.useRealTimers();
  });
  test('NW5-05 · the same account typed today still reads the approved day-one line (DEC-6075)', () => {
    set({ ...V08, assetAccounts: [{ asset_id: 'chb', label: 'Chase Brokerage', institution: 'Chase', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 50_000, value_as_of: require('../../domain/_shared/dates').isoLocalDate(new Date()) }], transactions: [], snapshotDays: [], nwDaily: {} });
    mockParams = { id: 'chb' }; render(Account()); mockParams = {};
    expect(lines()).toContain('You added this account today, so its figures start today.');
  });
  test('NW5-06 · the debts step: a setup loan starting Sep 2027 is not counted, and the step says so in Net worth’s words', () => {
    jest.useFakeTimers({ now: new Date('2026-11-01T12:00:00'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    set({ ...V08, nwSetupChoice: 'guided', assetAccounts: [], liabilities: [{ debt_id: 'v', label: 'Visa', debt_type: 'CREDIT_CARD', remaining_balance: 3_200, interest_rate_apr: 0.229, minimum_monthly_payment: 90 }],
      onboardingProfile: { ...V08.onboardingProfile, loans: [{ label: 'Student loan', amount: '30000', months: [9], year: '2027' }, { label: 'Student loan', amount: '12000' }] } });
    render(NetWorth());
    for (let i = 0; i < 4; i++) fireEvent.press(screen.getByText('Next →'));
    const ls = lines();
    expect(ls).toContain('Step 5 of 5');
    // by hand: the Visa $3,200 + the undated $12,000 loan (owed today) = $15,200; the Sep 2027 loan is not owed yet
    expect(ls).toContain('$15,200');
    expect(ls).toContain('A $30,000 student loan starts in Sep 2027, not counted until then.');
    expect(ls).toContain('The $12,000 student loan has no start month entered, so it counts as owed today.');
    jest.useRealTimers();
  });
  test('NW5-09 · a net worth below zero prints its minus sign once: ‘−$38,000’, said ‘minus $38,000’', () => {
    set({ ...V08, assetAccounts: [{ asset_id: 'c', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 5_000 }],
      liabilities: [{ debt_id: 'l', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 43_000, interest_rate_apr: 0.06, minimum_monthly_payment: 500 }] });
    render(NetWorth());
    const ls = lines();
    expect(ls).toContain('−$38,000');                                        // 5,000 − 43,000
    expect(ls.join(' ')).not.toMatch(/\(negative\)/);
    expect(screen.getByLabelText('minus $38,000')).toBeOnTheScreen();
    expect(face('moneykeel_pres_mock_net-worth-quiet-instrument_v08.html')).toMatch(/A net worth below zero is printed with its minus sign only\./);
  });
  // THE OLD ANSWER, KEPT (NW5-09, 2026-11-01)
  test.failing('the old answer: ‘−$38,000  (negative)’', () => {
    set({ ...V08, assetAccounts: [{ asset_id: 'c', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 5_000 }],
      liabilities: [{ debt_id: 'l', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 43_000, interest_rate_apr: 0.06, minimum_monthly_payment: 500 }] });
    render(NetWorth());
    expect(lines()).toContain('−$38,000  (negative)');
  });
});

/** ROUND 6 (2026-11-02): NW6-02 — no cash account, no months worked from a $0 nobody typed (DEC-0296), on every screen that prints the fund */
describe('drawing match round 6 — NW6-02, the emergency fund with no cash account', () => {
  const { theEmergencyFund } = require('../../../MoneyKeel/functions/networth-and-performance/emergency-fund');
  const CARLOAN = { debt_id: 'car', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9_800, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' };
  const PROFILE = { status: 'employed', monthlySpending: '3000' };
  test('the door: no cash account → no months; a $5,000 checking account → 5,000 ÷ (3,000 + 250) = 1.54 months; a $0 typed → 0', () => {
    const none = theEmergencyFund({ accounts: [], expenses: [], profile: PROFILE, debts: [CARLOAN] });
    expect([none.cashEntered, none.monthsCovered, none.monthsCoveredAtPlannedSpend]).toEqual([false, null, null]);
    const five = theEmergencyFund({ accounts: [{ asset_id: 'c', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 5_000 }], expenses: [], profile: PROFILE, debts: [CARLOAN] });
    expect(five.cashEntered).toBe(true);
    expect(five.monthsCovered).toBeCloseTo(5_000 / (five.essentialsMonthly), 12);
    const zero = theEmergencyFund({ accounts: [{ asset_id: 'c', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 0 }], expenses: [], profile: PROFILE, debts: [CARLOAN] });
    expect([zero.cashEntered, zero.monthsCovered]).toEqual([true, 0]);          // a $0 typed is entered: 0.0 months
    expect(theEmergencyFund({ accounts: [], expenses: [], profile: PROFILE, debts: [CARLOAN], cashOverride: 1_000 }).cashEntered).toBe(true);   // Stress test's typed cash
  });
  test('Net worth: debts and expenses, no cash account — ‘— months’ and the words, never ‘0.0 months · Tight ⚠’', () => {
    set({ ...V08, assetAccounts: [], liabilities: [CARLOAN], onboardingProfile: { ...V08.onboardingProfile, monthlySpending: '3000' } });
    render(React.createElement(require('../NetWorthScreen').default));
    const ls = lines();
    const at = ls.lastIndexOf('EMERGENCY FUND');
    expect(ls.slice(at + 1, at + 3)).toEqual(['— months', 'No cash account entered yet — it appears with your first cash account.']);
    expect(ls.join(' ')).not.toMatch(/0\.0 months|Tight ⚠/);
  });
  test('Job safety: no account it counts — no gap from $0, it says so', () => {
    set({ ...V08, assetAccounts: [], liabilities: [CARLOAN], onboardingProfile: { ...V08.onboardingProfile, monthlySpending: '3000' } });
    render(React.createElement(require('../JobSafetyScreen').default));
    const ls = lines();
    expect(ls).toContain('No savings account entered yet — add one to see what you still need.');   // savings only, the screen's first choice
    expect(ls).toContain('6 months of essentials is $19,500 ($3,250/month).');                     // 6 × (3,000 + the car loan's 250): the target stands
    expect(ls.join(' ')).not.toMatch(/cover \$0 of it/);
  });
  test.failing('the old answer (NW6-02): Net worth reads ‘0.0 months’ with no cash account', () => {
    set({ ...V08, assetAccounts: [], liabilities: [CARLOAN], onboardingProfile: { ...V08.onboardingProfile, monthlySpending: '3000' } });
    render(React.createElement(require('../NetWorthScreen').default));
    expect(lines()).toContain('0.0 months');
  });
});
