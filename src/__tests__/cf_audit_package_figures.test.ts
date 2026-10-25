// EVERY NUMBER IN THE CASH FLOW OUTSIDE-AUDIT PACKAGE COMES FROM THE APP — OR SAYS WHOSE IT IS (2026-10-23).
//
// The standing order BRIEFS ARE CODE (2026-08-14): every figure in a brief is either computed by the engine in a
// test, or labelled as the founder's. The Cash flow package (MoneyKeel/documents/audit/outside-test-cases/to-send/
// MoneyKeel_CashFlow_Audit_Package/, built by build-outside-test-cards.py --audit-package CF) states four kinds:
//
//   1. the published amounts the app uses — tax bands, deductions, limits, payroll — checked here against the
//      app's own constants and functions;
//   2. the screen register's worked answers — each RUN here through its own door and the app's own writer;
//   3. the three examples of how a figure is written (convention 6) — written here by the app's writer;
//   4. the approved-drawing households and the owner's rulings and decisions — his, labelled as his on the card
//      ("approved_drawing", "said_by": "owner") and on each decision ("whose"); the drawing sums are re-checked by
//      the card builder before anything is written.
// Everything else in the package is counts and identifiers, checked by check-outside-audit-package.py.
//
// A GUARD MUST PROVE IT LOOKED: each test asserts how many it examined.
import fs from 'fs';
import path from 'path';
import { TAX_TABLES, TAX_YEAR, SENIOR_DEDUCTION, STANDARD_DEDUCTION, ltcgRateFor, type FilingStatus } from '../domain/income/tax';
import { IRS_LIMITS } from '../domain/income/limits';
import { SS_WAGE_BASE, MEDICARE_ADDITIONAL_THRESHOLD, payrollTaxWithheld } from '../../MoneyKeel/functions/cashflow/base-pay';
import { FIGURE_REGISTER } from '../../MoneyKeel/functions/figures';
import { writeFigure, type FigureSpec } from '../../MoneyKeel/functions/_figure-spec';

const ROOT = path.join(__dirname, '..', '..');
const SEND = path.join(ROOT, 'MoneyKeel', 'documents', 'audit', 'outside-test-cases', 'to-send');
const NAME = 'MoneyKeel_CashFlow_Audit_Package';

/** The package as it stands. While it is in to-send/ it has not gone out, and every number in it must still be
 *  the app's: that is what the tests below check. Once sent it moves under its date to to-send/archive/ (the pack as
 *  sent is never rewritten) and is history — the code will move on after the outside review, so it is then held only
 *  to the record of its own check: its validation file must say it passed when it went out. */
const LIVE = path.join(SEND, NAME);
function archived(): string | null {
  const arch = path.join(SEND, 'archive');
  const dated = fs.existsSync(arch) ? fs.readdirSync(arch).filter((f) => f.endsWith('_' + NAME)).sort() : [];
  return dated.length ? path.join(arch, dated[dated.length - 1]) : null;
}
const DIR = process.env.CF_PACKAGE_DIR || (fs.existsSync(LIVE) ? LIVE : archived());
if (!DIR) throw new Error(`no ${NAME} in to-send/ or to-send/archive/ — the package has not been built`);
const UNSENT = !!process.env.CF_PACKAGE_DIR || DIR === LIVE;
const read = (f: string) => fs.readFileSync(path.join(DIR, f), 'utf8');
const files = fs.readdirSync(DIR);
const briefFile = files.find((f) => /^moneykeel_audit_module_cf_for-openai_v\d\d\.md$/.test(f))!;
const brief = read(briefFile);
const tax = JSON.parse(read(files.find((f) => /_tax-sources-and-acceptance_v\d\d\.json$/.test(f))!));
const contents = JSON.parse(read(files.find((f) => /_contents_v\d\d\.json$/.test(f))!));
const partFiles = files.filter((f) => /_part-\d\d-of-\d\d\.md$/.test(f)).sort();

// (skipped while check-outside-audit-package.py itself runs this file: it writes that record only after this passes)
(process.env.CF_PACKAGE_CHECKING ? test.skip : test)('the package passed its own check (check-outside-audit-package.py) — and, once sent, that record is what holds it', () => {
  const v = JSON.parse(read('moneykeel_audit_module_cf_validation_v01.json'));
  expect(v.passed).toBe(true);
  expect(v.failures).toEqual([]);
  expect(v.cards).toBeGreaterThanOrEqual(200);
});

/** Every ```json block in the screen parts that carries figures, as the outside model reads them. */
function figuresInPackage(): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of partFiles) {
    const text = read(f);
    const m = text.match(/## The figures — as the screen register holds them[\s\S]*?```json\n([\s\S]*?)\n```/);
    if (!m) continue;
    for (const fig of JSON.parse(m[1])) {
      if (out[fig.id]) throw new Error(`${fig.id} is printed in two screen parts`);
      out[fig.id] = fig;
    }
  }
  return out;
}

// Skipped — and named as skipped in the run — only once the package has gone out and sits in to-send/archive/.
// If this fails while the package is still in to-send/, either the code moved after the package was built (rebuild it,
// if it has not been sent) or it was sent and not archived (move it to to-send/archive/ under its date).
(UNSENT ? describe : describe.skip)('the Cash flow package states only what the app computes, or what is the owner\'s', () => {
  test('the package is whole on disk: its brief, its tax file, its contents and every part it lists', () => {
    expect(contents.parts.length).toBeGreaterThanOrEqual(19);
    expect(partFiles.length).toBe(contents.parts.length);
    for (const p of contents.parts) expect(partFiles).toContain(p.file);
  });

  test('1 · the federal tables in the tax file are the app\'s own, every band of every filing status', () => {
    const seen: string[] = [];
    expect(tax.tax_year).toBe(TAX_YEAR);
    for (const status of Object.keys(TAX_TABLES) as FilingStatus[]) {
      const ours = TAX_TABLES[status];
      const sent = tax.source_checks[0].the_app_uses[status];
      expect(sent.standard_deduction).toBe(ours.deduction);
      expect(sent.added_for_each_person_65_or_over).toBe(ours.over65Add);
      expect(sent.bands.length).toBe(ours.brackets.length);
      ours.brackets.forEach(([top, rate], i) => {
        expect(sent.bands[i].rate).toBe(rate);
        expect(sent.bands[i].up_to).toBe(Number.isFinite(top) ? top : null);
        if (Number.isFinite(top)) {
          // and the brief's printed table carries the same top, written as the brief writes money
          expect(brief).toContain(`$${top.toLocaleString('en-US')} at ${+(rate * 100).toFixed(4)}%`);
        }
        seen.push(`${status}:${i}`);
      });
    }
    expect(STANDARD_DEDUCTION).toBe(TAX_TABLES.single.deduction);
    expect(seen.length).toBe(28);
  });

  test('1 · the senior deduction, the gains tops, the limits and the payroll amounts are the app\'s own', () => {
    const sd = tax.source_checks[2].the_app_uses;
    expect(sd.amount_per_person_65_or_over).toBe(SENIOR_DEDUCTION.amount);
    expect(sd.phase_out_rate).toBe(SENIOR_DEDUCTION.phaseOutRate);
    expect(sd.phase_out_starts_above).toEqual(SENIOR_DEDUCTION.phaseOutStart);
    expect(sd.given_when_filing).toEqual(SENIOR_DEDUCTION.eligible);
    expect([sd.first_tax_year, sd.last_tax_year]).toEqual([SENIOR_DEDUCTION.firstYear, SENIOR_DEDUCTION.lastYear]);
    // the 0% and 15% tops are not exported, so the app's own rate function is asked at each top and a dollar above
    const gains = tax.source_checks[3].the_app_uses;
    let asked = 0;
    for (const status of Object.keys(gains) as FilingStatus[]) {
      const ded = TAX_TABLES[status].deduction;
      const { zero_up_to: z, fifteen_up_to: f } = gains[status];
      expect([ltcgRateFor(z + ded, status), ltcgRateFor(z + ded + 1, status),
              ltcgRateFor(f + ded, status), ltcgRateFor(f + ded + 1, status)]).toEqual([0, 0.15, 0.15, 0.2]);
      asked += 4;
    }
    expect(asked).toBe(16);
    expect(tax.source_checks[4].the_app_uses).toEqual(IRS_LIMITS);
    const pay = tax.source_checks[5].the_app_uses;
    expect(pay.social_security_wage_base).toBe(SS_WAGE_BASE);
    expect(pay.additional_medicare_withholding_above).toBe(MEDICARE_ADDITIONAL_THRESHOLD);
    // the three rates, asked of the one function that withholds them, below the base, between, and above the threshold
    const byRates = (w: number) => Math.min(w, pay.social_security_wage_base) * pay.social_security_rate + w * pay.medicare_rate
      + Math.max(0, w - pay.additional_medicare_withholding_above) * pay.additional_medicare_rate;
    for (const w of [50_000, 190_000, 260_000]) expect(payrollTaxWithheld(w)).toBeCloseTo(byRates(w), 9);
  });

  test('2 · every Cash flow figure in the screen parts is the register\'s, and its worked answer is what its door gives', () => {
    const sent = figuresInPackage();
    const ours = Object.entries(FIGURE_REGISTER).filter(([id]) => id.startsWith('MK-CF-M-'));
    expect(ours.length).toBeGreaterThanOrEqual(64);
    expect(Object.keys(sent).sort()).toEqual(ours.map(([id]) => id).sort());
    const wrong: string[] = [];
    for (const [id, spec] of ours) {
      const s = sent[id];
      for (const k of ['label', 'unit', 'per', 'formula', 'refusal', 'grain', 'ruled'] as const) {
        if ((s[k] ?? null) !== ((spec as any)[k] ?? null)) wrong.push(`${id} ${k}: package ${JSON.stringify(s[k])}, register ${JSON.stringify((spec as any)[k])}`);
      }
      if (JSON.stringify(s.screens) !== JSON.stringify(spec.screens)) wrong.push(`${id} screens differ`);
      const w = spec.worked!;
      if (s.worked?.given !== w.given || s.worked?.answer !== w.answer) wrong.push(`${id}: the worked example differs from the register's`);
      const raw = w.run();
      const got = typeof raw === 'string' ? raw : writeFigure(spec, raw, { withPeriod: !!spec.per });
      if (got !== s.worked?.answer) wrong.push(`${id}: the package says ${s.worked?.answer}, the door gives ${got}`);
    }
    expect(wrong).toEqual([]);
  });

  test('3 · the examples of how a figure is written are written by the app\'s own writer', () => {
    expect(contents.writer_examples.length).toBe(3);
    for (const x of contents.writer_examples) {
      const spec = { unit: x.unit, per: x.per ?? undefined, refusal: '' } as unknown as FigureSpec;
      expect(writeFigure(spec, x.value, { withPeriod: !!x.per })).toBe(x.written);
      expect(brief).toContain(`is written "${x.written}"`);
    }
  });

  test('4 · the owner\'s figures are labelled as his: every approved drawing on a card names the drawing and its approval', () => {
    let drawings = 0;
    for (const f of partFiles) {
      const m = read(f).match(/## The cards\n\n```json\n([\s\S]*?)\n```/);
      if (!m) continue;
      for (const card of JSON.parse(m[1])) {
        if (!card.approved_drawing) continue;
        drawings += 1;
        expect(card.approved_drawing.drawing).toMatch(/\(approved \d{4}-\d{2}-\d{2}\)/);
      }
    }
    expect(drawings).toBeGreaterThanOrEqual(6);
  });
});
