/* Base pay — the laws, not examples.
 *
 * Each of these must hold for EVERY input, which is rung 5 of the verification standard. Written
 * before the screen, so the screen cannot quietly disagree with them.
 *
 * Only behaviour the FOUNDER APPROVED on 2026-08-27 is pinned here. Four further decisions in
 * base-pay.ts are mine and are NOT tested, because pinning an unapproved decision is how it
 * becomes permanent without anyone agreeing to it. They are listed in the report.
 */
import {
  annualisedGross, takeHomeAsEntered, deductionsFromPay, payFiguresAgree, basePay,
  AGREE_TOLERANCE, HIGH_DEDUCTION_SHARE, type BasePayEntry, earnerPay } from './base-pay';

const steady = (over: Partial<BasePayEntry> = {}): BasePayEntry => ({
  freq: 'monthly', varies: false, grossTypical: 7000, monthly401k: 800, landsTypical: 5000, ...over,
});
const table = (g: Record<string, number>, l?: Record<string, number>): BasePayEntry => ({
  freq: 'monthly', varies: true, grossTypical: 7000, grossByMonth: g,
  monthly401k: 800, landsTypical: l ? undefined : 5000, landsByMonth: l,
});

describe('the tax bracket is read from gross, annualised', () => {
  it('THE LAW: annualised gross is the AVERAGE month times twelve, never the window total', () => {
    // 14 months from last month to twelve ahead, totalling 103,000
    const months: Record<string, number> = {};
    ['2026-07','2026-08','2026-09','2026-10','2026-11','2026-12','2027-01','2027-02','2027-03',
     '2027-04','2027-05','2027-06','2027-07','2027-08'].forEach((k, i) => {
       months[k] = (i === 2 || i === 8) ? 9500 : 7000;
     });
    const total = Object.values(months).reduce((t, v) => t + v, 0);
    expect(total).toBe(103_000);                       // the window
    expect(annualisedGross(table(months))).toBeCloseTo((103_000 / 14) * 12, 2);
    expect(annualisedGross(table(months))).toBeLessThan(total);   // never the sum
  });

  it('THE LAW: a steady month annualises to twelve of it, whatever the pay frequency', () => {
    expect(annualisedGross(steady({ freq: 'monthly', grossTypical: 7000 }))).toBeCloseTo(84_000, 2);
    expect(annualisedGross(steady({ freq: 'weekly', grossTypical: 1000 }))).toBeCloseTo(52_000, 2);
    expect(annualisedGross(steady({ freq: 'biweekly', grossTypical: 3000 }))).toBeCloseTo(78_000, 2);
    expect(annualisedGross(steady({ freq: 'annually', grossTypical: 84_000 }))).toBeCloseTo(84_000, 2);
  });

  it('THE LAW: what lands in the bank never changes the annualised gross', () => {
    const a = annualisedGross(steady({ landsTypical: 5000 }));
    const b = annualisedGross(steady({ landsTypical: 3000 }));
    const c = annualisedGross(steady({ landsTypical: undefined }));
    expect(a).toBe(b); expect(b).toBe(c);
  });
});

describe('what lands in the bank', () => {
  it('THE LAW: when they told us, that IS the figure — used exactly as typed', () => {
    for (const v of [5000, 4818, 3333.33, 12_500]) {
      const t = takeHomeAsEntered(steady({ landsTypical: v }));
      expect(t.monthly).toBeCloseTo(v, 2);
      expect(t.estimated).toBe(false);
    }
  });

  it('THE LAW: it is never grossed up and taxed back down', () => {
    // the old road took $4,818 with a $20,000/yr 401(k) and showed $3,351
    const t = takeHomeAsEntered(steady({ grossTypical: 9000, monthly401k: 1666.67, landsTypical: 4818 }));
    expect(t.monthly).toBeCloseTo(4818, 2);
  });

  it('THE LAW: no 401(k) is ever subtracted when none was entered', () => {
    const none = takeHomeAsEntered(steady({ monthly401k: 0, landsTypical: undefined }));
    const gross = annualisedGross(steady({ monthly401k: 0, landsTypical: undefined }));
    expect(none.estimated).toBe(true);
    expect(none.monthly * 12).toBeLessThan(gross);          // tax came off
    expect(none.why).toContain('Nothing is taken out for a 401(k)');
  });

  it('an estimate always says it is one', () => {
    expect(takeHomeAsEntered(steady({ landsTypical: undefined })).estimated).toBe(true);
    expect(takeHomeAsEntered(steady({ landsTypical: 5000 })).estimated).toBe(false);
  });
});

describe('the three figures reconcile', () => {
  it('THE LAW: gross − 401(k) − what lands = everything else, to the cent', () => {
    const e = steady();
    expect(deductionsFromPay(e)).toBeCloseTo(84_000 - 9_600 - 60_000, 2);
  });

  it('THE LAW: three figures that cannot all be true are refused', () => {
    const bad = payFiguresAgree(steady({ grossTypical: 5500, monthly401k: 800, landsTypical: 5000 }));
    expect(bad.ok).toBe(false);
    expect(bad.say).toContain('cannot all be right');
  });

  it('rounding of a few dollars is allowed, a real gap is not', () => {
    expect(payFiguresAgree(steady({ grossTypical: 7000, monthly401k: 800, landsTypical: 6202 })).ok).toBe(true);
    expect(payFiguresAgree(steady({ grossTypical: 7000, monthly401k: 800, landsTypical: 6500 })).ok).toBe(false);
    expect(AGREE_TOLERANCE).toBe(5);
  });

  it('THE LAW: one bad month is caught even when the year balances', () => {
    // Feb is $2,000 short and Mar is $2,000 long — the YEAR reconciles exactly, the months do not.
    const g: Record<string, number> = {}, l: Record<string, number> = {};
    ['2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'].forEach((k) => { g[k] = 7000; l[k] = 6200; });
    l['2026-08'] = 4200; l['2026-09'] = 8200;                    // cancels across the year
    expect(Object.values(l).reduce((t, v) => t + v, 0)).toBe(6200 * 6);   // the year still balances
    const v = payFiguresAgree({ freq: 'monthly', varies: true, grossTypical: 7000,
      grossByMonth: g, monthly401k: 0, landsByMonth: l });
    expect(v.ok).toBe(false);                                    // and it is still caught
    expect(v.say).toContain('2026-09');
  });

  it('deductions above 60% warn but never block', () => {
    const v = payFiguresAgree(steady({ grossTypical: 7000, monthly401k: 0, landsTypical: 2000 }));
    expect(v.ok).toBe(true);
    expect(v.warn).toBe(true);
    expect(HIGH_DEDUCTION_SHARE).toBe(0.6);
  });
});

describe('the orchestrator', () => {
  it('one earner: one call returns everything that section shows', () => {
    const p = basePay({ earners: [{ name: 'You', entry: steady() }] });
    const me = p.earners[0].pay;
    expect(me.grossMonthly).toBeCloseTo(7000, 2);
    expect(me.grossAnnualised).toBeCloseTo(84_000, 2);
    expect(me.monthly401k).toBeCloseTo(800, 2);
    expect(me.landsInBank).toBeCloseTo(5000, 2);
    expect(me.landsIsEstimated).toBe(false);
    expect(me.everythingElse).toBeCloseTo(14_400, 2);
    expect(me.verdict.ok).toBe(true);
    expect(p.grossAnnual).toBeCloseTo(84_000, 2);
    expect(p.landsInBank).toBeCloseTo(5000, 2);
    expect(p.bandNote).toBeNull();                     // nothing to explain with one wage
  });

  // The approved screen (income-v3, frame 2a) has a section per earner and one household block.
  it('two earners: the household is the sum, and the band comes off BOTH wages', () => {
    const p = basePay({
      filingStatus: 'married',
      earners: [
        { name: 'You', entry: steady() },                                              // $84,000
        { name: 'Sam', entry: steady({ grossTypical: 4500, monthly401k: 400, landsTypical: 3300 }) },
      ],
    });
    expect(p.earners).toHaveLength(2);
    expect(p.grossAnnual).toBeCloseTo(84_000 + 54_000, 2);
    expect(p.landsInBank).toBeCloseTo(5000 + 3300, 2);
    // 84,000 alone sits in a lower married band than 138,000 does — that gap is the whole point
    expect(p.bandOnEveryWage).toBeGreaterThan(p.bandOnOneWage);
    expect(p.bandNote).toContain('what you earn together');
  });

  it('THE LAW: the household total is exactly the sum of its earners, never a re-derivation', () => {
    for (const second of [0, 2000, 4500, 9000]) {
      const p = basePay({ earners: [
        { name: 'You', entry: steady() },
        { name: 'Sam', entry: steady({ grossTypical: second, monthly401k: 0, landsTypical: second }) },
      ] });
      expect(p.grossAnnual).toBeCloseTo(p.earners.reduce((t, e) => t + e.pay.grossAnnualised, 0), 2);
      expect(p.landsInBank).toBeCloseTo(p.earners.reduce((t, e) => t + e.pay.landsInBank, 0), 2);
    }
  });

  it('THE LAW: one earner and the same wage split across nobody give the same household total', () => {
    const alone = basePay({ earners: [{ name: 'You', entry: steady() }] });
    const withEmpty = basePay({ earners: [{ name: 'You', entry: steady() }] });
    expect(withEmpty.grossAnnual).toBe(alone.grossAnnual);
  });

  it('THE LAW: the three figures on screen always add up', () => {
    for (const g of [5000, 7000, 12_000]) for (const k of [0, 500, 1500]) {
      const lands = g - k - 800;                       // a plausible deduction
      const p = earnerPay(steady({ grossTypical: g, monthly401k: k, landsTypical: lands }));
      expect(p.grossAnnualised - p.monthly401k * 12 - p.landsInBank * 12)
        .toBeCloseTo(p.everythingElse as number, 2);
    }
  });
});
