/** ONE INFO DOT, AT ITS LINE'S SIZE AND IN ITS LINE'S COLOUR, EVERYWHERE (the lead's ruling R8, 2026-10-27).
 *
 *  His words (DEC-0142, 2026-08-13): "info dot should be the same size as text. Can we do that?" — and DEC-8339 added "in that
 *  line's colour". The build drew the dot a flat 13 in grey #76766F beside every line, so beside Net worth's 15-point #1A1A18
 *  retirement plan line it was small and grey, and the Performance and Holding pages drew it grey on #6B6B66 and #1A1A18 lines
 *  (PF-3, NW2-07, NW2-24). Net worth v08's own row said "13 on a line", which disagreed with its "in that line's colour".
 *
 *  Held three ways: (1) every call site in src and app hands the dot its line, or states a size AND a colour where it sits on no
 *  line (a bar's title, a chip) — counted, so a pattern that stops matching goes red; (2) the dot reads that line's size and
 *  colour; (3) rendered on Net worth and on the green bars, each dot carries the size and colour of the text just before it.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { Text, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { InfoDot } from '../components/UI';
import { SectionBand } from '../components/SectionBand';
import { Colors } from '../utils/theme';
import { useStore } from '../store/useStore';
import { employedPartner } from '../testing/personas';
import { isoLocalDate } from '../domain/_shared/dates';

jest.mock('../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn() }, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
}));

const ROOT = path.join(__dirname, '..', '..');
const flat = (n: any) => StyleSheet.flatten(n.props.style) as any;

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' || d.name === 'node_modules' ? [] : walk(p);
    return /\.tsx$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
  });
}

test('(1) every info dot in src and app is handed its line — or states its size and colour — and the guard says how many it read', () => {
  const calls: { at: string; tag: string }[] = [];
  let files = 0;
  for (const root of ['src', 'app']) {
    for (const f of walk(path.join(ROOT, root))) {
      files += 1;
      const t = fs.readFileSync(f, 'utf8');
      for (const m of t.matchAll(/<InfoDot\b[^>]*?\/>/gs)) {
        calls.push({ at: `${path.relative(ROOT, f)}:${t.slice(0, m.index).split('\n').length}`, tag: m[0] });
      }
      // an opened <InfoDot> that never self-closes would be missed by the pattern above: count it, so it cannot hide
      const opened = (t.match(/<InfoDot\b/g) ?? []).length;
      const closed = (t.match(/<InfoDot\b[^>]*?\/>/gs) ?? []).length;
      expect(`${path.relative(ROOT, f)}: ${opened}`).toBe(`${path.relative(ROOT, f)}: ${closed}`);
    }
  }
  const bad = calls.filter((c) => !/\bline=\{/.test(c.tag) && !(/\bsize=\{/.test(c.tag) && /\bcolor=\{/.test(c.tag)));
  // counted from the disk: 34 call sites on 2026-10-27; 32 on 2026-10-30, when Tax-smart moves (Retirement cockpit) and IF INTEREST
  // RATES MOVE (the account page) put their dots inside their bars (R1) — each dot is still drawn, by its bar
  expect(calls.length).toBeGreaterThanOrEqual(32);
  expect(files).toBeGreaterThanOrEqual(145);   // 148 .tsx files on 2026-10-27, counted from the disk
  expect(bad.map((c) => `${c.at} ${c.tag}`)).toEqual([]);
});

describe('(2) the dot reads its line', () => {
  test('a 15-point #1A1A18 line: the dot is 15 points in #1A1A18, weight 700', () => {
    render(<InfoDot term="netWorth" line={{ fontSize: 15, color: Colors.textPrimary, fontWeight: '600' }} />);
    expect(flat(screen.getByText('ⓘ'))).toMatchObject({ fontSize: 15, color: Colors.textPrimary, fontWeight: '700' });
  });
  test('a line written as a list of styles: the last one wins, as it does on the Text', () => {
    render(<InfoDot term="netWorth" line={[{ fontSize: 11, color: Colors.textSecondary }, { fontSize: 13 }]} />);
    expect(flat(screen.getByText('ⓘ'))).toMatchObject({ fontSize: 13, color: Colors.textSecondary });
  });
  test('beside a chip, a size and colour stated outright', () => {
    render(<InfoDot term="provenance" size={11} color={Colors.textTertiary} />);
    expect(flat(screen.getByText('ⓘ'))).toMatchObject({ fontSize: 11, color: Colors.textTertiary });
  });
});

/** Each rendered ⓘ against the Text just before it inside the same row. Returns what it compared, so the test can count. */
function dotsAgainstTheirLines(): { dot: any; line: any }[] {
  const pairs: { dot: any; line: any }[] = [];
  for (const dot of screen.getAllByText('ⓘ')) {
    // up from the dot to the row that holds it and its line
    let child: any = dot, row: any = dot.parent;
    while (row && !(row.type === 'View' || (typeof row.type !== 'string' && row.children?.length > 1))) { child = row; row = row.parent; }
    while (row && typeof row.type !== 'string') { child = row; row = row.parent; }
    if (!row) continue;
    const kids: any[] = row.children.filter((k: any) => typeof k !== 'string');
    const hostText = (n: any): any => (n.type === 'Text' ? n : (n.children ?? []).filter((k: any) => typeof k !== 'string').map(hostText).find(Boolean));
    let i = kids.indexOf(child); let line: any = null;
    while (i-- > 0 && !line) { const h = hostText(kids[i]); if (h && h !== dot && h.props.children !== 'ⓘ') line = h; }
    if (line) pairs.push({ dot: flat(dot), line: flat(line) });
  }
  return pairs;
}

test('(3) rendered: on every green bar the dot is the title\'s 11 points in the title\'s colour', () => {
  render(<>
    <SectionBand title="WHAT YOU OWN" infoTerm="netWorth" />
    <SectionBand title="CASH" light infoTerm="netWorth" />
    <SectionBand title="Debts" quiet infoTerm="netWorth" />
  </>);
  const pairs = dotsAgainstTheirLines();
  expect(pairs.length).toBe(3);
  expect(pairs.map((p) => [p.dot.fontSize, p.dot.color])).toEqual([[11, Colors.white], [11, Colors.primaryDeep], [11, Colors.primaryDeep]]);
  for (const p of pairs) expect([p.dot.fontSize, p.dot.color]).toEqual([p.line.fontSize, p.line.color]);
});

test('(3) rendered: on Net worth every dot carries the size and colour of the line just before it — the retirement plan line\'s is 15 in #1A1A18', () => {
  const today = isoLocalDate(new Date());
  useStore.setState({
    onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', hideBalances: false,
    onboardingProfile: { ...employedPartner, monthlySpending: '4500' },
    retirementAssumptions: { retireAge: 65, contribMonthly: 1200, spendMonthly: 4500, horizonAge: 92 },
    assetAccounts: [
      { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, target_return: 0 },
      { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 100000,
        target_return: 0.07, source: 'manual', value_as_of: today },
    ],
    liabilities: [{ debt_id: 'cc', label: 'Chase Visa', debt_type: 'CREDIT_CARD', remaining_balance: 6000, interest_rate_apr: 0.229, minimum_monthly_payment: 150 }],
  } as any);
  const NetWorth = require('../screens/NetWorthScreen').default;
  render(<NetWorth />);
  const pairs = dotsAgainstTheirLines();
  // every dot on the screen was compared: none sat with no line before it
  expect(pairs.length).toBe(screen.getAllByText('ⓘ').length);
  expect(pairs.length).toBeGreaterThanOrEqual(3);
  for (const p of pairs) expect([p.dot.fontSize, p.dot.color, p.dot.fontWeight]).toEqual([p.line.fontSize, p.line.color, '700']);
  // the retirement plan line (15 points, #1A1A18): its dot was 13 points in grey #76766F until 2026-10-27
  expect(pairs.some((p) => p.dot.fontSize === 15 && p.dot.color === Colors.textPrimary)).toBe(true);
  expect(pairs.some((p) => p.dot.color === Colors.textTertiary && p.line.color !== Colors.textTertiary)).toBe(false);
});
