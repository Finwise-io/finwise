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

test('Home and Plan hub render their section titles through SectionBand (no bespoke bars)', () => {
  for (const f of ['HomeScreen.tsx', 'PlanHubScreen.tsx']) {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', f), 'utf8');
    expect(src).toMatch(/from '..\/components\/SectionBand'/);
    expect(src.match(/<SectionBand/g)!.length).toBeGreaterThanOrEqual(4);
  }
});
