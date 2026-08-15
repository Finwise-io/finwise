// PLAN APPEARANCE AUDIT (standing order step 5) — pulls the RENDERED style values off the Plan tab
// and writes them to /tmp/plan-appearance.json so the audit compares numbers to the mock's numbers.
// Nothing here is a presence check: every line reports a measured value.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import { useStore } from '../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  router: { push: jest.fn() },
  useSegments: () => [],
}));

const YEAR = new Date().getFullYear();
const PAT = {
  onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self',
  onboardingProfile: {
    taxMode: 'manual', manualTaxRate: '20', status: 'employed', name: 'Pat',
    birthYear: String(YEAR - 58), birthMonth: '4', targetRetirementAge: '65',
    incomeSources: ['employment'], baseSalary: '11000', salaryMode: 'gross', salaryFreq: 'monthly',
    monthlySpending: '5200',
  },
  retirementAssumptions: { retireAge: 65, horizonAge: 90, contribMonthly: 0, spendMonthly: 5200 },
  assetAccounts: [
    { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 355152, target_return: 0.07 },
    { asset_id: 'fid', label: 'Traditional IRA', institution: 'Fidelity', kind: 'ira', tax_bucket: 'PRE_TAX', balance: 420000, target_return: 0.07 },
    { asset_id: 'rot', label: 'Roth IRA', institution: 'Vanguard', kind: 'roth_ira', tax_bucket: 'ROTH', balance: 96000, target_return: 0.07 },
    { asset_id: 'ally', label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 38000, target_return: 0.01 },
    { asset_id: 'hme', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 620000, target_return: 0 },
  ],
  liabilities: [],
  bigCosts: [{ id: 'bc_1_2028', label: 'Roof', amount: 18000, year: 2028 }],
};

const flat = (n: any) => Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean));
const report: any = {};

describe('Plan appearance audit — measured, not asserted', () => {
  beforeEach(() => { useStore.getState().resetAll(); useStore.setState(PAT as any); });

  test('measure: every text node — size, weight, colour', () => {
    const Plan = require('../screens/PlanHubScreen').default;
    render(<Plan />);
    const SCALE = [11, 13, 15, 17, 20, 24, 30, 38];
    const seen: any[] = [];
    const offScale: any[] = [];
    const walk = (n: any) => {
      if (!n || typeof n === 'string') return;
      if (n.type === 'Text' && n.props?.style) {
        const f = flat(n);
        const txt = (n.children ?? []).filter((c: any) => typeof c === 'string').join('').trim().slice(0, 48);
        const row = { text: txt, size: f.fontSize, weight: f.fontWeight, color: f.color, bg: f.backgroundColor };
        seen.push(row);
        if (f.fontSize && !SCALE.includes(f.fontSize)) offScale.push(row);
      }
      (n.children ?? []).forEach(walk);
    };
    walk(screen.toJSON());
    report.textNodes = seen;
    report.offScale = offScale;
    expect(seen.length).toBeGreaterThan(0);
  });

  test('measure: the section headings — how many are FILLED bands vs quiet labels', () => {
    const Plan = require('../screens/PlanHubScreen').default;
    const { Colors } = require('../utils/theme');
    render(<Plan />);
    const bands: any[] = [];
    const walk = (n: any) => {
      if (!n || typeof n === 'string') return;
      if (n.type === 'View' && n.props?.style) {
        const f = flat(n);
        if (f.backgroundColor === Colors.primaryDeep || f.backgroundColor === Colors.bandLight) {
          const txt: string[] = [];
          const grab = (m: any) => { if (typeof m === 'string') txt.push(m); else (m?.children ?? []).forEach(grab); };
          (n.children ?? []).forEach(grab);
          bands.push({ title: txt.join(' ').trim().slice(0, 60), bg: f.backgroundColor, marginHorizontal: f.marginHorizontal ?? 0, marginTop: f.marginTop ?? 0 });
        }
      }
      (n.children ?? []).forEach(walk);
    };
    walk(screen.toJSON());
    report.filledBands = bands;
    expect(bands.length).toBeGreaterThan(0);
  });

  test('measure: THE SHARED RIGHT EDGE — the inset of every money figure', () => {
    const Plan = require('../screens/PlanHubScreen').default;
    const { Spacing } = require('../utils/theme');
    render(<Plan />);
    const edges: any[] = [];
    // walk with the accumulated horizontal padding/margin of every ancestor
    const walk = (n: any, inset: number) => {
      if (!n || typeof n === 'string') return;
      const f = n.props?.style ? flat(n) : {};
      const pad = (f.paddingHorizontal ?? f.paddingRight ?? 0) + (f.marginHorizontal ?? f.marginRight ?? 0)
        + (f.padding ?? 0);
      const here = inset + (typeof pad === 'number' ? pad : 0);
      if (n.type === 'Text') {
        const txt = (n.children ?? []).filter((c: any) => typeof c === 'string').join('').trim();
        if (/^[−-]?\$[\d,]+/.test(txt)) edges.push({ text: txt, insetFromScreenEdge: here, size: f.fontSize, weight: f.fontWeight });
      }
      (n.children ?? []).forEach((c: any) => walk(c, here));
    };
    walk(screen.toJSON(), 0);
    report.moneyEdges = edges;
    report.spacingMd = Spacing.md;
    expect(edges.length).toBeGreaterThan(0);
  });

  test('measure: tap targets under 44pt', () => {
    const Plan = require('../screens/PlanHubScreen').default;
    render(<Plan />);
    const small: any[] = [];
    const walk = (n: any) => {
      if (!n || typeof n === 'string') return;
      if (n.props?.accessibilityRole === 'button' && n.props?.style) {
        const f = flat(n);
        const h = f.minHeight ?? f.height ?? null;
        const txt: string[] = [];
        const grab = (m: any) => { if (typeof m === 'string') txt.push(m); else (m?.children ?? []).forEach(grab); };
        (n.children ?? []).forEach(grab);
        if (h == null || h < 44) small.push({ label: txt.join(' ').trim().slice(0, 46), minHeight: h, paddingVertical: f.paddingVertical ?? null });
      }
      (n.children ?? []).forEach(walk);
    };
    walk(screen.toJSON());
    report.smallTargets = small;
    expect(Array.isArray(small)).toBe(true);
  });

  afterAll(() => { fs.writeFileSync('/tmp/plan-appearance.json', JSON.stringify(report, null, 1)); });
});

// THE HEADING HIERARCHY (Claude Design v3, founder-approved 2026-08-13, audit D9).
// One heading style meant every heading became a full-width green bar — seven down the Plan tab, so
// nothing was emphasised because everything was. The filled band is now reserved for a group that
// carries its own total riding the right edge; a section title is a quiet caps label.
describe('heading hierarchy', () => {
  beforeEach(() => { useStore.getState().resetAll(); useStore.setState(PAT as any); });

  test('a filled band appears ONLY where a total rides it', () => {
    const Plan = require('../screens/PlanHubScreen').default;
    const { Colors } = require('../utils/theme');
    render(<Plan />);
    const bands: string[] = [];
    const walk = (n: any) => {
      if (!n || typeof n === 'string') return;
      if (n.type === 'View' && n.props?.style && flat(n).backgroundColor === Colors.primaryDeep) {
        const txt: string[] = [];
        const grab = (m: any) => { if (typeof m === 'string') txt.push(m); else (m?.children ?? []).forEach(grab); };
        (n.children ?? []).forEach(grab);
        bands.push(txt.join(' ').trim());
      }
      (n.children ?? []).forEach(walk);
    };
    walk(screen.toJSON());
    // every filled band must carry a money figure; a title alone is not enough to earn one
    for (const b of bands) expect(b).toMatch(/\$[\d,]+/);
    // and there must be far fewer than the seven the audit measured
    expect(bands.length).toBeLessThanOrEqual(3);
  });

  test('the quiet label is the accessible green, not the mid green that fails on small text', () => {
    const { Colors } = require('../utils/theme');
    const { SectionBand } = require('../components/SectionBand');
    render(<SectionBand quiet title="FACTS — SAVE AS YOU GO" />);
    const t = screen.getByText('FACTS — SAVE AS YOU GO');
    expect(flat(t).color).toBe(Colors.primaryDeep);   // 8.74:1 — the mid green measures 3.78:1
    expect(flat(t).fontSize).toBe(11);
  });
});

// EVERY HEADING STARTS ON THE SAME LINE (audit D10, founder ruling 2026-08-14).
// One heading carried `inCard`, which bleeds a FILLED band to the card edge. A quiet label has no
// fill, so the flag did nothing but shove its text 12pt left of the six headings beneath it.
test('all section headings share one left edge', () => {
  const Plan = require('../screens/PlanHubScreen').default;
  render(<Plan />);
  const starts = new Set<number>();
  const walk = (n: any, inset: number) => {
    if (!n || typeof n === 'string') return;
    const f = n.props?.style ? flat(n) : {};
    const here = inset + (f.paddingHorizontal ?? f.paddingLeft ?? f.padding ?? 0) + (f.marginHorizontal ?? f.marginLeft ?? 0);
    if (n.type === 'Text' && f.textTransform === 'uppercase') {
      const t = (n.children ?? []).filter((c: any) => typeof c === 'string').join('').trim();
      if (t) starts.add(here);
    }
    (n.children ?? []).forEach((c: any) => walk(c, here));
  };
  walk(screen.toJSON(), 0);
  expect([...starts]).toHaveLength(1);
});

test('the card no longer announces the tab it is sitting on', () => {
  const Plan = require('../screens/PlanHubScreen').default;
  render(<Plan />);
  // "YOUR RETIREMENT PLAN" sat directly above "WILL MY MONEY LAST?" saying nearly the same thing
  expect(screen.queryByText('YOUR RETIREMENT PLAN')).toBeNull();
  expect(screen.getByText('WILL MY MONEY LAST?')).toBeOnTheScreen();
});

// THE THREE CHIPS MUST BE TELLABLE APART (audit D11, founder ruling 2026-08-14).
// FACT means "saved"; DRAFT means "you are only trying this"; MISSING means "we still need it".
// That distinction is the whole facts-save / choices-commit model, and it was carried by two light
// greens two shades apart — so the badge told a reader nothing and they had to stop and read it.
describe('the FACT / DRAFT / MISSING chips', () => {
  beforeEach(() => { useStore.getState().resetAll(); useStore.setState(PAT as any); });

  test('each sits on a different colour family, not two shades of one', () => {
    const Plan = require('../screens/PlanHubScreen').default;
    const { Colors } = require('../utils/theme');
    render(<Plan />);
    const bgOf = (t: string) => flat(screen.getAllByText(t)[0]).backgroundColor;
    const fact = bgOf('FACT'), draft = bgOf('DRAFT');
    expect(fact).not.toBe(draft);
    // and not merely different — FACT must be the NEUTRAL one, off the green ramp entirely
    expect(fact).toBe(Colors.bgTertiary);
    expect(draft).toBe(Colors.primaryLight);
    expect(fact).not.toBe(Colors.bandLight);   // the green band tint it used to wear
  });

  test('the quiet one is still readable — contrast over the small-text floor', () => {
    // #6B6B66 on #EEEEE9 measures 4.60:1 against a 4.5 floor; recomputed here so a token change
    // that quietly drops it below the line fails rather than ships.
    const lum = (hex: string) => {
      const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    const { Colors } = require('../utils/theme');
    const ratio = (lum(Colors.bgTertiary) + 0.05) / (lum(Colors.textSecondary) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

// 44pt IS THE FLOOR, AND THIS AUDIENCE IS WHY (audit D13, founder ruling 2026-08-14).
// "What drives this? ›" was a single 15pt line inside a touchable with no height and no padding —
// about 20pt of target. Fingers miss that, and steadier hands than this audience's do too.
test('every tappable row on the Plan tab clears 44pt, counting its content', () => {
  // SEED FIRST. This test originally sat outside the describe that seeds PAT, so it rendered the
  // FIRST-DAY screen — where "What drives this? ›" does not exist — and passed without ever looking
  // at the thing it was written to check. A test that renders the wrong state is worse than no test.
  useStore.getState().resetAll();
  useStore.setState(PAT as any);
  const Plan = require('../screens/PlanHubScreen').default;
  render(<Plan />);
  const tooSmall: string[] = [];
  const walk = (n: any) => {
    if (!n || typeof n === 'string') return;
    // NO `&& n.props.style` HERE. The first version required a style prop, so a touchable with none
    // at all was skipped — and "no style at all" is exactly how a 20pt target comes about. The check
    // walked straight past the defect it exists to find.
    if (n.props?.accessibilityRole === 'button') {
      const f = n.props?.style ? flat(n) : ({} as any);
      const txt: string[] = [];
      const grab = (m: any) => { if (typeof m === 'string') txt.push(m); else (m?.children ?? []).forEach(grab); };
      (n.children ?? []).forEach(grab);
      const label = txt.join(' ').trim();
      // A row is tall enough if it declares a fixed height, a minimum, or its padding plus its own
      // lines reach 44. The first version of this check read only minHeight and padding, and so
      // reported the stepper buttons — which are declared a flat 44×44 — as 19pt targets. A
      // measurement that misses how a thing is actually sized invents defects.
      const lines = Math.max(1, txt.filter((t) => t.trim().length > 3).length);
      const height = (f.height ?? 0) || (f.minHeight ?? 0)
        || ((f.paddingVertical ?? f.padding ?? 0) * 2 + lines * 19);
      if (height < 44 && label && label !== 'ⓘ') tooSmall.push(`${label.slice(0, 40)} ≈ ${height}pt`);
    }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  expect(tooSmall).toEqual([]);
});
