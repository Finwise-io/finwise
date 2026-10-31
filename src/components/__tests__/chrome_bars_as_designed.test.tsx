/** THE TAB BAR AND THE TOP BAR, AS DESIGNED (PF-7, NW2-10; the lead's ruling R9, 2026-10-27).
 *
 *  What decided it: the drawings drew the tab bar with emoji (Performance v17), letter shapes (Cash flow v01) or no icons at all
 *  (Net worth v08) — none of which the app draws, because the Menu's strip and the bar read one list of tabs (his UX review of
 *  2026-07-16, "hard to link menu to button bar"). The approved v08 (DEC-0644) draws the built bar's names, colours and green
 *  bar exactly; the UX design v1.2 and the screen standard name brand green #178F6B for the picked tab. So the built bar is the
 *  design, with one change: the names were 10.5 points, the one size in the app off the scale (DEC-0059), and are 11.
 *  The top bar: the approved account page v01 (DEC-6457, the newest approved drawing with it) and v08 draw it 4 points below the
 *  status bar, 20 in from the sides, 10 above the page; the app started it 6 down. Each drawing carries a dated row saying so.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import TopBar from '../TopBar';
import { Colors, Typography, Spacing } from '../../utils/theme';

const ROOT = path.join(__dirname, '..', '..', '..');
const SCALE = new Set([11, 13, 15, 17, 20, 24, 30, 38]);
const flat = (n: any) => StyleSheet.flatten(n.props.style) as any;

test('the tab bar: names at 11 points weight 700 (they were 10.5), picked tab #178F6B with its 22 × 3 green bar, the others #76766F', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', '_layout.tsx'), 'utf8');
  expect(Typography.sizes.xs).toBe(11);
  expect(src).toMatch(/tabBarLabelStyle: \{ fontSize: Typography\.sizes\.xs, fontWeight: '700' \}/);
  expect(src).not.toMatch(/fontSize: 10\.5/);
  expect(src).toMatch(/tabBarActiveTintColor: Colors\.primary,/);
  expect(src).toMatch(/tabBarInactiveTintColor: Colors\.textTertiary,/);
  expect(Colors.primary).toBe('#178F6B');
  expect(Colors.textTertiary).toBe('#76766F');
  // the green bar above the picked tab's icon, and the icon filled when picked, outlined at rest — one list of icons (TAB_META)
  expect(src).toMatch(/height: 3, width: 22, borderRadius: 2, marginBottom: 5, backgroundColor: focused \? Colors\.primary : 'transparent'/);
  expect(src).toMatch(/name=\{\(focused \? name : `\$\{name\}-outline`\) as any\}/);
  expect(src).toMatch(/<TabIcon name=\{TAB_META\[name\]\.icon\}/);
});

test('the top bar: 4 points below the status bar (it was 6), 20 in from the sides, 10 above the page; button and icons 38 tall, words 13', () => {
  render(<TopBar />);
  const menu = screen.getByLabelText('Menu');
  let bar: any = menu.parent;
  while (bar && !(flat(bar)?.flexDirection === 'row' && flat(bar)?.justifyContent === 'space-between')) bar = bar.parent;
  expect(bar).toBeTruthy();
  // the test's safe area is 0, so the bar's own top padding is what shows below the status bar
  expect(flat(bar)).toMatchObject({ paddingTop: 4, paddingHorizontal: Spacing.lg, paddingBottom: 10, backgroundColor: Colors.bgSecondary });
  expect(Spacing.lg).toBe(20);
  expect(flat(menu)).toMatchObject({ height: 38, borderRadius: 12 });
  expect(flat(screen.getByText('Menu'))).toMatchObject({ fontSize: 13, fontWeight: '700' });
  expect(flat(screen.getByLabelText('Settings'))).toMatchObject({ height: 38, width: 38 });
  expect(flat(screen.getByLabelText('Hide balances'))).toMatchObject({ height: 38, width: 38 });
});

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' || d.name === 'node_modules' ? [] : walk(p);
    return /\.tsx$/.test(d.name) && !/\.test\./.test(d.name) ? [p] : [];
  });
}

test('every size typed in the chrome, the shared components, the routes and sign-up is on the scale — and the guard says how much it read', () => {
  // The screens are read by DEC-0059's own guard (decisions_are_held); this reads what that one does not: src/components, app/
  // (the tab bar, the root header, the routes) and src/onboarding. Sizes written as Typography.sizes.* are on the scale by construction.
  const off: string[] = [];
  let files = 0, sizes = 0;
  for (const dir of ['src/components', 'app', 'src/onboarding']) {
    for (const f of walk(path.join(ROOT, dir))) {
      files += 1;
      const t = fs.readFileSync(f, 'utf8');
      for (const m of t.matchAll(/fontSize[:=][{ ]*([\d.]+)/g)) {
        sizes += 1;
        if (!SCALE.has(Number(m[1]))) off.push(`${path.relative(ROOT, f)}:${t.slice(0, m.index).split('\n').length} fontSize ${m[1]}`);
      }
    }
  }
  // counted 2026-10-27 from the disk, not typed from memory: 98 files, 281 typed sizes
  expect(files).toBeGreaterThanOrEqual(95);
  expect(sizes).toBeGreaterThanOrEqual(270);
  // THE TRUE DEBT, carried, never zeroed: sign-up's one 14-point door (FX-CF-B, 2026-10-27) went onto the scale on 2026-10-30
  // (CLEANUP-TESTS: 13/700, the Income screen's same door; add-account-by-hand v02 row of that day). The debt is now 0.
  const KNOWN: string[] = [];
  const unknown = off.filter((o) => !KNOWN.includes(o.replace(/:\d+ /, ' ')));
  expect(unknown).toEqual([]);
  expect(off.length).toBeLessThanOrEqual(KNOWN.length);
});

test('sheet titles as Net worth v08 draws them: an add sheet 20/800 centred (frame G), the fix sheet 17/800 (frame F)', () => {
  const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  // the shared sheet that holds the step-by-step add, Edit account and the debt editor (no drawing of its own): frame G's 20
  expect(read('src/components/KeyboardAwareSheet.tsx')).toMatch(/title: \{ fontSize: 20, fontWeight: '800', color: Colors\.textPrimary, textAlign: 'center'/);
  // the add sheet itself, on Net worth and on Performance's day-one door: 20, centred
  for (const f of ['src/screens/NetWorthScreen.tsx', 'src/screens/PerformanceScreen.tsx']) expect(read(f)).toMatch(/chooserHead: \{ fontSize: 20, fontWeight: '800'/);
  // the fix sheet keeps the 17 frame F draws
  expect(read('src/components/DataGapsBanner.tsx')).toMatch(/sheetTitle: \{ fontSize: 17, fontWeight: '800'/);
});
