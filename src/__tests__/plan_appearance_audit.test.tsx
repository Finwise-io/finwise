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
