// The state-contract meta-pin (docs/FCC-core-55-70/FCC-state-contract.md — BINDING).
// Pins the contract's load-bearing helpers and thresholds by NAME, so a change that would
// silently weaken the contract fails here and points at the document.
import * as fs from 'fs';
import * as path from 'path';
import { priceFreshness } from '../services/marketData';
import { connectionFreshness } from '../services/sync';
import { valueFreshness } from '../domain/assets';
import { money } from '../domain/_shared/num';

describe('state contract (FCC-state-contract.md)', () => {
  test('rule 2 — the three staleness clocks hold their thresholds', () => {
    // connections: stale AFTER 3 days, in words
    const days = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
    expect(connectionFreshness(days(2))!.stale).toBe(false);
    expect(connectionFreshness(days(4))!.stale).toBe(true);
    expect(connectionFreshness(days(9))!.label).toBe('9 days old');
    expect(connectionFreshness(null)).toBeNull();                       // manual rows never flagged

    // manual values: the 6-month nudge
    const monthsAgo = (n: number) => {
      const d = new Date(); d.setMonth(d.getMonth() - n);
      return d.toISOString().slice(0, 10);
    };
    expect(valueFreshness({ value_as_of: monthsAgo(2) } as any)?.stale).toBe(false);
    expect(valueFreshness({ value_as_of: monthsAgo(7) } as any)?.stale).toBe(true);

    // prices: stale wording exists and flips
    expect(priceFreshness(new Date().toISOString(), Date.now()).stale).toBe(false);
    expect(priceFreshness(days(6), Date.now()).stale).toBe(true);
  });

  test('rule 3 — money() stays PURE (masking lives at the component layer, one concept)', () => {
    // the pure formatter must never mask on its own — maskedMoney wraps it with store state
    expect(money(1234)).toBe('$1,234');
  });

  test('rule 3 — the runtime mask walk covers all four money tabs', () => {
    const src = fs.readFileSync(path.join(__dirname, '../screens/__tests__/fcc_agreement.test.tsx'), 'utf8');
    for (const name of ['Home', 'CashFlow', 'PlanHub', 'NetWorth']) {
      expect(src.includes(`'${name}'`)).toBe(true);                     // dropping a screen from the walk fails HERE
    }
  });

  test('the contract document itself stays present and BINDING', () => {
    const doc = fs.readFileSync(path.join(__dirname, '../../docs/FCC-core-55-70/FCC-state-contract.md'), 'utf8');
    expect(doc).toMatch(/Status: BINDING/);
    expect(doc).toMatch(/never leaves your device|zero dollar signs/i);
  });
});
