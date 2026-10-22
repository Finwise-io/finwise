/** NET WORTH DECISIONS, HELD BY A RENDER — each test opens with the decision it holds (2026-10-20).
 *
 *  The check of his Net worth decisions against the code found these built but held by nothing that renders the
 *  screen: DEC-0008 (type sizes), DEC-0066 (the change line — amber on a fall), DEC-0158 (a shortfall comes with a
 *  door) and DEC-0222 (the emergency fund's Tight / Comfortable word, held until now only by reading the source).
 *  Each one renders the real screen and reads what it draws — the rendered style, the words, where a tap goes. */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { recordedDay } from '../../testing/recordedDay';
import { employedPartner } from '../../testing/personas';
import { isoLocalDate } from '../../domain/_shared/dates';
import { Colors } from '../../utils/theme';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  router: { push: jest.fn() },
  useSegments: () => [],
}));

const today = isoLocalDate(new Date());
const year = new Date().getFullYear();
// the Net worth drawing's own household (the mock-match harness's REAL_DATA): $813,152 owned − $418,000 owed = $395,152
const HOUSEHOLD = {
  onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', hideBalances: false,
  onboardingProfile: { ...employedPartner, monthlySpending: '4500' },
  retirementAssumptions: { retireAge: 65, contribMonthly: 1200, spendMonthly: 4500, horizonAge: 92 },
  assetAccounts: [
    { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, target_return: 0 },
    { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 349333,
      target_return: 0.07, source: 'connected', last_synced: `${today}T09:00:00Z`, cash_balance: 838,
      positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 105, lots: [{ lot_id: 'l1', shares: 3319, cost_per_share: 84, purchase_date: '2024-01-02' }] }] },
    { asset_id: 'etr', label: 'E*TRADE Treasuries & CDs', institution: 'E*TRADE', kind: 'fixed_income', tax_bucket: 'TAXABLE',
      asset_class: 'bonds', balance: 5819, target_return: 0.042, source: 'connected', last_synced: `${today}T09:00:00Z`, maturity_date: '2026-08-24', coupon_rate: 0.04 },
    { asset_id: 'hme', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450000, target_return: 0, value_as_of: today },
  ],
  liabilities: [
    { debt_id: 'mtg', label: 'Home mortgage', debt_type: 'MORTGAGE', remaining_balance: 412000, interest_rate_apr: 0.055, minimum_monthly_payment: 2400 },
    { debt_id: 'cc', label: 'Chase Visa', debt_type: 'CREDIT_CARD', remaining_balance: 6000, interest_rate_apr: 0.229, minimum_monthly_payment: 150 },
  ],
  transactions: [],
  snapshotDays: [recordedDay(`${year}-01-05`, [['chk', 8000, 'cash'], ['van', 838, 'cash'], ['van', 346585], ['etr', 5819, 'typed']])],
};
const flat = (n: any) => Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean));
const NetWorthScreen = () => { const S = require('../NetWorthScreen').default; return <S />; };

beforeEach(() => { mockPush.mockClear(); useStore.getState().resetAll(); useStore.setState(HOUSEHOLD as any); });

test('DEC-0066 — the change line on Net worth is AMBER on a fall (green is only for a rise or no change)', () => {
  // the record's first day this year held $400,000; today the household is $395,152 — a fall of $4,848
  useStore.setState({ nwDaily: { [`${year}-01-05`]: 400000, [today]: 395152 } } as any);
  render(<NetWorthScreen />);
  const line = screen.getByText(/Change in net worth −\$4,848/);
  expect(flat(line).color).toBe(Colors.amber);
  expect(flat(line).color).not.toBe(Colors.gainText);
  expect(line.props.children.join('')).toMatch(/^▼ /);          // the arrow says it too — colour is never the only signal
});

test('DEC-0008 — the hero and money standing on its own are at least 17pt; a table\'s money keeps 15pt', () => {
  useStore.setState({ nwDaily: { [`${year}-01-05`]: 393042, [today]: 395152 } } as any);
  render(<NetWorthScreen />);
  const hero = screen.getByText('$395,152');
  expect(flat(hero).fontSize).toBeGreaterThanOrEqual(17);
  expect(flat(hero).fontSize).toBe(38);
  const tableMoney = screen.getAllByText('$8,000').map(flat).find((st) => st.fontVariant?.includes('tabular-nums'));
  expect(tableMoney?.fontSize).toBe(15);                         // the account rows are a table: 15pt, not hero size
});

// READ FROM THE SCREEN'S OWN STYLES, not rendered: on 2026-10-20 the Performance tab could not be rendered in a test
// while another change to the bond editor it opens was in progress. Every <Text> on the screen that prints the headline
// figure — the ending value, MK-PF-M-001 — is found in the source and its style's size read from its StyleSheet.
test('DEC-0008 — the Performance headline figure (the ending value) is at least 17pt', () => {
  const fs = require('fs'); const path = require('path'); const ts = require('typescript');
  const file = path.join(__dirname, '..', 'PerformanceScreen.tsx');
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const sizes: Record<string, number> = {};
  const printers: string[] = [];
  (function visit(n: any) {
    if (ts.isCallExpression(n) && n.expression.getText(sf) === 'StyleSheet.create' && ts.isObjectLiteralExpression(n.arguments[0])) {
      for (const p of n.arguments[0].properties) {
        const fsz = ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.initializer)
          ? p.initializer.properties.find((q: any) => q.name?.getText(sf) === 'fontSize') : null;
        if (fsz && ts.isNumericLiteral(fsz.initializer)) sizes[p.name.getText(sf)] = Number(fsz.initializer.text);
      }
    }
    if (ts.isJsxElement(n) && n.openingElement.tagName.getText(sf) === 'Text'
      && n.children.some((c: any) => ts.isJsxExpression(c) && /^fig\('MK-PF-M-001'/.test(c.expression?.getText(sf) ?? ''))) {
      const style = n.openingElement.attributes.properties.find((a: any) => a.name?.getText(sf) === 'style');
      const m = /styles\.(\w+)/.exec(style?.initializer?.getText(sf) ?? '');
      printers.push(m ? m[1] : '(no style)');
    }
    ts.forEachChild(n, visit);
  })(sf);
  expect(Object.keys(sizes).length).toBeGreaterThan(50);       // the StyleSheet was read (111 styles with a size on 2026-10-20)
  expect(printers.length).toBeGreaterThanOrEqual(1);           // and at least one Text prints the headline
  for (const name of printers) expect([name, sizes[name] ?? 0]).toEqual([name, expect.any(Number)]);
  for (const name of printers) expect(sizes[name]).toBeGreaterThanOrEqual(17);
});

test('DEC-0222 — the emergency fund reads "Tight ⚠" under 3 months (2.9) and "Comfortable ✓" at 3 months (3.0)', () => {
  const at = (cash: number) => {
    useStore.getState().resetAll();
    useStore.setState({ onboardingComplete: true, nwSetupChoice: 'self', hideBalances: false,
      onboardingProfile: { status: 'employed', incomeSources: ['employment'], monthlySpending: '4200' },
      assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: cash }] } as any);
    return render(<NetWorthScreen />);
  };
  const tight = at(12180);                                       // $12,180 ÷ $4,200 = 2.9 months
  expect(screen.getByText('2.9 months')).toBeOnTheScreen();
  expect(flat(screen.getByText('Tight ⚠')).color).toBe(Colors.amber);
  expect(screen.queryByText('Comfortable ✓')).toBeNull();
  tight.unmount();
  at(12600);                                                     // $12,600 ÷ $4,200 = 3.0 months
  expect(screen.getByText('3.0 months')).toBeOnTheScreen();
  expect(flat(screen.getByText('Comfortable ✓')).color).toBe(Colors.gainText);
  expect(screen.queryByText('Tight ⚠')).toBeNull();
});

// his words were "It is too harsh."; the rule written from them: a shortfall is never stated without the nearest thing
// to do about it — "a gap with a door beside it is a plan"
test('DEC-0158 — "It is too harsh.": a shortfall on Net worth always comes with a door, and the door is the Plan tab', () => {
  // spending far beyond what the savings carry: the plan runs short
  useStore.setState({ retirementAssumptions: { retireAge: 65, contribMonthly: 0, spendMonthly: 40000, horizonAge: 92 } } as any);
  render(<NetWorthScreen />);
  const sentence = screen.getByText(/running short/);
  let door: any = sentence;
  while (door && !(door.props?.accessibilityRole === 'button' && door.props?.onPress)) door = door.parent;
  expect(door).toBeTruthy();                                     // the sentence sits inside a door…
  expect(door.props.accessibilityLabel).toMatch(/running short.*Opens the Plan tab\.$/);
  fireEvent.press(door);
  expect(mockPush).toHaveBeenCalledWith('/(tabs)/plan');         // …and the door is the Plan tab
});
