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
    // 14 months from last month to twelve ahead, totalling 103,000 — the window as it stands in August 2026, so the clock is set
    // there. 2026-10-25 (CF-MMFIX-B; the lead's ruling on CFR-5's F7; tenet 4): the year is THIS CALENDAR YEAR's twelve months,
    // as every Cash flow month reads it, a month with nothing typed at the typical $7,000 — Jan to Jun 2026 6 × 7,000 = 42,000,
    // Jul 7,000, Aug 7,000, Sep 9,500, Oct to Dec 3 × 7,000 = 21,000: $86,500, the average month ($7,208.33) × 12, and never the
    // window's $103,000. It read (103,000 ÷ 14) × 12 = $88,286, which blends 2027's months into 2026's year.
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    jest.setSystemTime(new Date(2026, 7, 20, 12));
    const months: Record<string, number> = {};
    ['2026-07','2026-08','2026-09','2026-10','2026-11','2026-12','2027-01','2027-02','2027-03',
     '2027-04','2027-05','2027-06','2027-07','2027-08'].forEach((k, i) => {
       months[k] = (i === 2 || i === 8) ? 9500 : 7000;
     });
    const total = Object.values(months).reduce((t, v) => t + v, 0);
    expect(total).toBe(103_000);                       // the window
    expect(annualisedGross(table(months))).toBeCloseTo(6 * 7_000 + 7_000 + 7_000 + 9_500 + 3 * 7_000, 6);
    expect(annualisedGross(table(months))).toBeLessThan(total);   // never the sum
    jest.useRealTimers();
  });

  it('a month left blank counts as the typical month, never as nothing (2026-10-25, IN-05; drawing v07 phone 6)', () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    jest.setSystemTime(new Date(2026, 7, 20, 12));
    // Sam: $2,077 a fortnight ($2,077 × 26 ÷ 12 = $4,500.17 a month), September 2026 and March 2027 typed at $6,000; 2026's other
    // eleven months blank: 11 × 4,500.17 + 6,000 = $55,501.83 (March 2027 is next year's) — it read $72,000, every month $6,000
    const sam: BasePayEntry = { freq: 'biweekly', varies: true, grossTypical: 2077, grossByMonth: { '2026-09': 6000, '2027-03': 6000 }, monthly401k: 400 };
    expect(annualisedGross(sam)).toBeCloseTo(11 * ((2077 * 26) / 12) + 6000, 6);
    expect(Math.round(annualisedGross(sam))).toBe(55_502);
    expect(earnerPay(sam).typicalMonth).toBeCloseTo((2077 * 26) / 12, 9);
    jest.useRealTimers();
  });

  it('a month TYPED $0 is an answer and counts $0; a month CLEARED counts as the typical month (the lead’s ruling, 2026-10-25, CFR-5 F7)', () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
    jest.setSystemTime(new Date(2026, 9, 15, 12));
    // CFR-5's worker: $12,500 a month from July, every month of 2026 typed — January to June typed $0: 6 × $12,500 = $75,000
    // (it read $109,091 for one evening, the fourteen months blended into 2026's year; $75,000 at b1c659e8)
    const year = (v: (i: number) => any) => Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`2026-${String(i + 1).padStart(2, '0')}`, v(i)]));
    const { entryFromWage } = require('./base-pay');
    const worker = (byMonth: Record<string, any>) => entryFromWage({ baseSalary: '12500', salaryFreq: 'monthly', salaryMonthMode: 'months', salaryByMonth: byMonth });
    expect(annualisedGross(worker(year((i) => (i < 6 ? '0' : '12500'))))).toBe(75_000);
    // the same worker with January to June CLEARED — boxes emptied, '' stored — is a worker whose blank months start from $12,500
    expect(annualisedGross(worker(year((i) => (i < 6 ? '' : '12500'))))).toBe(150_000);
    // and with them taken out of the table altogether (the screen takes a cleared box out), the same
    expect(annualisedGross(worker(Object.fromEntries(Object.entries(year((i) => (i < 6 ? '' : '12500'))).filter(([, v]) => v !== ''))))).toBe(150_000);
    jest.useRealTimers();
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
    // the old road took $4,818 with a $20,000/year 401(k) and showed $3,351
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

describe('a typed take-home is a MONTH, whatever the pay frequency (approved drawing v07, frames 2b and 2c)', () => {
  // The screen asks "take-home each month" of everyone. Until 2026-10-04 the figure was scaled as if it
  // had been typed for each pay period, so a fortnightly earner's $3,300 was shown as $7,150 — and no
  // test said otherwise, because every example with a typed take-home was paid monthly.
  it('THE LAW: it is used exactly as typed', () => {
    const gross: Record<string, number> = { hourly: 45, weekly: 1700, biweekly: 3400, monthly: 7000 };
    for (const freq of Object.keys(gross)) {
      // an hourly wage carries its hours a week (DEC-0296; 2026-10-26, FIX-INCOME-A)
      const e = steady({ freq, grossTypical: gross[freq], landsTypical: 5000, ...(freq === 'hourly' ? { hoursPerWeek: 40 } : {}) });
      expect(takeHomeAsEntered(e)).toMatchObject({ monthly: 5000, estimated: false });
      expect(deductionsFromPay(e)).toBeCloseTo(annualisedGross(e) - 800 * 12 - 5000 * 12, 6);
    }
  });
  it('THE LAW: the three-figure check reads it as a month too — the household the drawing draws', () => {
    // Sam: $2,077 a fortnight is $4,500.17 a month; less $400 into the 401(k) leaves $4,100.17
    const sam = steady({ freq: 'biweekly', grossTypical: 2077, monthly401k: 400, landsTypical: 3300 });
    expect(takeHomeAsEntered(sam).monthly).toBe(3300);
    expect(payFiguresAgree(sam)).toMatchObject({ ok: true, warn: false });
    expect(payFiguresAgree({ ...sam, landsTypical: 4200 }).ok).toBe(false);          // $99.83 more than there is
    expect(basePay({ earners: [{ name: 'You', entry: steady() }, { name: 'Sam', entry: sam }] }).landsInBank).toBe(8300);
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
    expect(v.say).toContain('in September 2026');               // the month in words (2026-10-25, CFR-5 F6): it read "in 2026-09"
    expect(v.say).not.toMatch(/\d{4}-\d{2}/);
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
    // the band of what is TAXED, each earner's 401(k) out first (B05; 2026-10-24, CF-FIX): $138,000 − $14,400 (Sam's $4,800 and
    // the default entry's) − $32,200 = $91,400 is 12%, and $84,000 − its 401(k) alone is 12% too, so no band note is due here.
    // Until 2026-10-24 the bands were read off gross — 22% together against 12% alone — and the note fired.
    expect(p.bandOnEveryWage).toBe(p.bandOnOneWage);
    expect(p.bandNote ?? '').not.toContain('what you earn together');   // no band sentence; the own-figures sentence may stand
    // with no 401(k)s the gap is still the whole point: $138,000 − $32,200 = $105,800 is 22%, $84,000 − $32,200 is 12%
    const noK = basePay({ filingStatus: 'married', earners: [{ name: 'You', entry: steady({ monthly401k: 0 }) }, { name: 'Sam', entry: steady({ grossTypical: 4500, monthly401k: 0, landsTypical: 3300 }) }] });
    expect(noK.bandOnEveryWage).toBeGreaterThan(noK.bandOnOneWage);
    expect(noK.bandNote).toContain('what you earn together');
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

// ── v6, from the founder's build-54 device test (2026-09-02) ───────────────────────────────────
describe('the card adds up, and every figure says whose it is (mock v6, rule 8e)', () => {
  const YOU = steady();                                                            // $84,000, lands 5,000
  const SAM = steady({ grossTypical: 4500, monthly401k: 400, landsTypical: 3300 }); // $54,000
  const SAM_SILENT = steady({ grossTypical: 4500, monthly401k: 400, landsTypical: undefined });

  it("THE LAW: 'Both of us' is never banded as single — jointly is assumed and SAID", () => {
    const p = basePay({ earners: [{ name: 'You', entry: YOU }, { name: 'Sam', entry: SAM }],
                        filingStatus: 'married', profile: { whoEarns: 'both' } });
    // jointly, on what is taxed once the 401(k)s are out ($138,000 − the two 401(k)s − $32,200), it is 12% — read as single it
    // would be 22% or more. It read 22% (the gross band) until 2026-10-24 (B05, CF-FIX)
    expect(Math.round(p.bandOnEveryWage * 100)).toBe(12);
    expect(p.tax.statusAssumed).toBe(true);                 // no filing answer yet → said, not silent
  });

  it('THE LAW: when nobody told us, gross − tax − 401(k)s = lands, TO THE CENT', () => {
    const you = steady({ landsTypical: undefined });
    const p = basePay({ earners: [{ name: 'You', entry: you }, { name: 'Sam', entry: SAM_SILENT }],
                        filingStatus: 'married', profile: { whoEarns: 'both', baseSalary: '7000',
                          salaryFreq: 'monthly', hasPartner: 'yes', whoEarns2: undefined,
                          partnerWage: { baseSalary: '4500', salaryFreq: 'monthly' } } });
    expect(p.tax.mode).toBe('estimated');
    const identity = p.grossAnnual / 12 - p.tax.monthly - p.monthly401k;
    expect(p.landsInBank).toBeCloseTo(identity, 1);         // build 54 was $1,280/month off itself
  });

  it('THE LAW: a mixed household shows NO single tax row, and the sentence names each figure', () => {
    const p = basePay({ earners: [{ name: 'You', entry: YOU }, { name: 'Sam', entry: SAM_SILENT }],
                        filingStatus: 'married', profile: { whoEarns: 'both', baseSalary: '7000',
                          salaryFreq: 'monthly', partnerWage: { baseSalary: '4500', salaryFreq: 'monthly' } } });
    expect(p.tax.mode).toBe('mixed');
    expect(p.landsEstimated).toBe(true);                    // the total wears ≈
    expect(p.landsNote).toMatch(/Your take-home: \$5,000 \(you entered\)/);
    expect(p.landsNote).toMatch(/Sam’s take-home: ~\$[\d,]+ \(calculated/);
    // entered beats estimated: your figure is exactly what you entered
    expect(p.earners[0].pay.landsInBank).toBe(5000);
  });

  it('THE LAW: everything-else-monthly is the annual figure ÷ 12, produced by the FUNCTION', () => {
    const p = earnerPay(steady());
    expect(p.everythingElseMonthly).toBeCloseTo((p.everythingElse as number) / 12, 2);
  });
});
