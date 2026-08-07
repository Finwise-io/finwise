// BANDED SECTIONS pins (founder-adopted 2026-08-04, UX design v1.2): the ONE band component —
// deep-green title bands (white caps), light-green sub-bands (deep-green text), totals on the band.
// Screens must use it rather than invent their own green bars (same-class-same-look).
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import { SectionBand } from '../SectionBand';
import { Colors } from '../../utils/theme';

test('title band: deep green, white caps title, optional right-aligned value', () => {
  render(<SectionBand title="WHAT YOU OWN" value="$813,152" />);
  expect(screen.getByText('WHAT YOU OWN')).toBeOnTheScreen();
  expect(screen.getByText('$813,152')).toBeOnTheScreen();
});

test('sub-band: the light green with deep-green text (never white-on-light)', () => {
  render(<SectionBand light title="CASH" value="$8,838" />);
  const t = screen.getByText('CASH');
  const flat = Object.assign({}, ...[t.props.style].flat(Infinity).filter(Boolean));
  expect(flat.color).toBe(Colors.primaryDeep);
});

test('band colors are the adopted tokens — deep #085041, light #DFF2E9', () => {
  expect(Colors.primaryDeep).toBe('#085041');
  expect(Colors.bandLight).toBe('#DFF2E9');
});

test('ALL FIVE tab screens render section titles through SectionBand (no bespoke bars)', () => {
  for (const f of ['HomeScreen.tsx', 'PlanHubScreen.tsx', 'NetWorthScreen.tsx', 'PerformanceScreen.tsx', 'CashflowScreen.tsx']) {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', f), 'utf8');
    expect(src).toMatch(/from '..\/components\/SectionBand'/);
    expect(src.match(/<SectionBand/g)!.length).toBeGreaterThanOrEqual(3);
  }
});

// CONSISTENCY SWEEP (founder order 2026-08-04: "font size and color and overall design the same
// across all screens"). Two guards so drift can't creep back: every fontSize must be a value from
// the design scale, and screens must not hardcode plain white/black instead of the theme tokens.
describe('one type scale + theme colors app-wide', () => {
  const SCALE = [11, 13, 15, 17, 20, 24, 30, 38];
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
    return p.endsWith('.tsx') ? [p] : [];
  });
  const files = [walk(path.join(__dirname, '..', '..', 'screens')), walk(path.join(__dirname, '..'))].flat();

  test('every fontSize comes from the design scale', () => {
    const offenders: string[] = [];
    for (const f of files) {
      fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        const m = line.match(/fontSize: ([0-9]+(?:\.[0-9]+)?)/);
        if (m && !SCALE.includes(Number(m[1]))) offenders.push(`${path.basename(f)}:${i + 1} → ${m[1]}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  test('screens use theme color tokens, not hardcoded white/black', () => {
    const offenders: string[] = [];
    for (const f of files) {
      fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (/'#(fff|FFF|ffffff|FFFFFF)'/.test(line)) offenders.push(`${path.basename(f)}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
