// "SHOULD I PAY THE MORTGAGE DOWN FASTER?" — the rate comparison, on Cash flow · Debt.
//
// The decision MOVED here from Plan · Retire (founder, 2026-08-14): it is a debt decision a person
// makes about a debt, and it only ever sat on the retirement tab because its side-effect lands
// there. A person thinking about their mortgage goes looking for their mortgage.
//
// Same sentence shape whichever way the answer falls, so nobody can tell from the layout which
// answer they are getting. And it never says what to do — both rates, the difference in dollars,
// stop. We are not advisers (§7.1).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radii } from '../utils/theme';
import { maskedMoney, spokenMoney } from './useMoney';
import { fig } from './figure';   // the bracket prints under the Income summary's own number, MK-CF-M-043 (2026-10-26)
import { compareMortgageToTreasury } from '../domain/debt/mortgageVsTreasury';
import { mortgageOddsEffect } from '../domain/debt/mortgageOdds';
import type { RetirementInputs } from '../domain/retirement';
import { InfoDot } from './UI';
import { useStore } from '../store/useStore';
import { useIncomeProfile } from '../hooks/useIncomeProfile';   // the one profile income figures read (2026-10-26)
import { incomeSummary } from '../../MoneyKeel/functions/cashflow/income-summary';
import { percentDigits } from '../../MoneyKeel/functions/_figure-spec';   // the one percent writer (R24, 2026-11-01)

/** THE FEDERAL TAX BRACKET THE COMPARISON RUNS ON — the one the Income summary shows as "Federal tax bracket" (MK-CF-O-004
 *  incomeSummary), so the two screens can never name different brackets; null when no income is entered, and the card then
 *  compares before tax and says so (2026-10-25, FIX-ROOM; the lead's ruling on MK-CF-F-043). */
/* ─ MK-CF-F-284 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * federalBracketForComparison
 *
 * Answers ..... The federal tax bracket the mortgage comparison runs on: the one the Income summary shows as Federal tax bracket (MK-CF-M-043, handed by MK-CF-O-004 incomeSummary); nothing when no income is entered, and the card then compares before tax.
 *
 * Called by ... MortgageRateCompare
 *
 * Numbered by hand 2026-10-26 (PF-TOOLS, the lead's instruction): the scan that issues identifiers reads functions in the
 *               calculation folders only, so this screen helper has no generated record; this one is written by hand in the generated form,
 *               as MK-NW-F-145's is
 * Changed ..... not in git yet (—)
 */
export function federalBracketForComparison(op: Record<string, any> | null | undefined): number | null {
  const summary = incomeSummary(op ?? null);
  return summary.ready ? summary.taxed.bracket : null;
}

export function MortgageRateCompare({ balance, annualRate, monthlyPayment, extraMonthly, treasuryYield, isFallback, planInputs, nowYear, nowMonth, federalRate }: {
  balance: number;
  annualRate: number;
  monthlyPayment: number;
  extraMonthly: number;
  treasuryYield: number;
  /** the live feed failed and we are on a typical rate — say so, because this is the one screen
   *  where a stale rate changes the answer */
  isFallback?: boolean;
  /** the plan as committed — without it we cannot say what this does to retirement, and moving the
   *  decision here without that line was the whole risk of moving it (brief §3.3.1) */
  planInputs?: RetirementInputs | null;
  nowYear?: number;
  /** this month, 1 to 12 — the payoff year counts from it, not from January (2026-10-25, MK-CF-F-042) */
  nowMonth?: number;
  /** the federal bracket, decimal; absent → read from the person's income (federalBracketForComparison), null → before tax */
  federalRate?: number | null;
}) {
  const op = useStore((st: any) => st.onboardingProfile);
  const incomeOp = useIncomeProfile(op);   // the bracket the Income summary names, the accounts' interest in it (2026-10-26, FIX-INCOME-A; src/hooks/useIncomeProfile.ts)
  const bracket = React.useMemo(() => (federalRate !== undefined ? federalRate : federalBracketForComparison(incomeOp)), [federalRate, incomeOp]);
  const c = compareMortgageToTreasury({ balance, annualRate, monthlyPayment, extraMonthly, treasuryYield, federalRate: bracket });
  const effect = planInputs
    ? mortgageOddsEffect({ base: planInputs, balance, annualRate, monthlyPayment, extraMonthly, nowYear: nowYear ?? new Date().getFullYear(), nowMonth: nowMonth ?? new Date().getMonth() + 1 })
    : null;
  if (!c) return null;

  // THE RATES TO TWO DECIMALS (his precision standard, Q49; cash-flow_v01 READ THIS FIRST 2026-10-26). The card works the comparison
  // out itself (MK-CF-F-043), so no orchestrator hands these figures and they are not declared: the percent guard counts them here
  // at their true number. The bracket is the Income summary's (MK-CF-O-004 hands it), so it prints under MK-CF-M-043.
  const pct2 = (r: number) => `${percentDigits(r, 2)}%`;
  // AFTER FEDERAL TAX WHEN THE BRACKET IS KNOWN, AND SAID EITHER WAY (2026-10-25, FIX-ROOM; drawing cash-flow v01, READ THIS
  // FIRST row of 2026-10-25): the same sentence shape whichever way it falls (DEC-0161)
  const rates = c.basis === 'after-tax'
    ? `Your mortgage costs ${pct2(annualRate)}. A ten-year Treasury pays ${pct2(treasuryYield)} today — ${pct2(c.treasuryAfterTaxPct! / 100)} after your ${fig('MK-CF-M-043', c.federalRatePct! / 100)} federal tax bracket.`
    : `Your mortgage costs ${pct2(annualRate)}. A ten-year Treasury pays ${pct2(treasuryYield)} today, before tax.`;
  const taxWords = c.basis === 'after-tax'
    ? 'The Treasury is shown after federal tax (it pays no state tax), the mortgage without any interest deduction.'
    : 'Before tax: a Treasury’s interest is taxed, so after tax it pays less than this.';
  const yearly = Math.abs(c.annualDifference);
  const lifetime = Math.abs(c.lifetimeDifference);

  return (
    <View style={s.card} testID="mortgage-rate-compare">
      <Text style={s.rates}>{rates}</Text>

      {c.direction === 'too-close' ? (
        // WITHIN A QUARTER-POINT WE DO NOT PICK A WINNER. A dollar figure implying precision we do
        // not have is worse than no dollar figure — rates move, and so does the answer.
        <Text style={s.body} accessibilityLabel={`${rates} They are close enough that neither choice is clearly better.`}>
          They are close enough that neither choice is clearly better — this one comes down to
          whether you would rather owe less or hold more.
        </Text>
      ) : (
        <Text style={s.body}
          accessibilityLabel={`${rates} A dollar into your mortgage saves you ${c.direction === 'paying-down-wins' ? 'more' : 'less'} than the same dollar would earn in Treasuries, about ${spokenMoney(yearly)} a year.`}>
          So a dollar into your mortgage <Text style={s.b}>saves you {c.direction === 'paying-down-wins' ? 'more' : 'less'}</Text>{' '}
          than the same dollar would earn sitting in Treasuries — about <Text style={s.b}>{maskedMoney(yearly)}/year</Text> at your balance.
          {lifetime > 0 && (
            <> Over the life of the loan, paying the extra {maskedMoney(extraMonthly)}/month leaves you around{' '}
              <Text style={s.b}>{maskedMoney(lifetime)} {c.lifetimeDifference > 0 ? 'better off' : 'worse off'}</Text>{' '}
              than putting it in Treasuries instead.</>
          )}
          {/* a payment that never clears the loan has no lifetime figure — said, never silently left out (MK-CF-F-125) */}
          {c.noLifetimeBecause === 'never-clears' && <> At this payment the loan never clears, so there is no lifetime figure.</>}
        </Text>
      )}

      {/* THE RETIREMENT CONSEQUENCE TRAVELS WITH THE CONTROL. Moving this decision to the debt
          surface and leaving this line behind on Retire would let a person decide blind to its
          biggest effect — worse than where we started (brief §3.3.1).
          BOTH numbers are full simulation runs (§6.1). Never a subtraction. */}
      {effect && (
        <Text style={s.body}
          accessibilityLabel={`Paying the extra means less going into savings. Your money lasts in about ${effect.before} of 100 futures today, and about ${effect.after} of 100 if you do this.`}>
          {'\n'}That’s {maskedMoney(extraMonthly)}/month not going into savings while the loan runs — and the whole
          payment freeing up once it clears, {effect.fasterPayoffYear} instead of {effect.payoffYear}. Taken together, your
          money lasts in about <Text style={s.b}>{effect.before} out of 100 simulated futures</Text> today, and about{' '}
          <Text style={s.b}>{effect.after} out of 100</Text> if you do this.
        </Text>
      )}

      {/* SHARES ARE A DIFFERENT QUESTION, and saying so is what stops this reading as advice.
          Paying a mortgage down is a guaranteed return; shares are not. */}
      {/* THE DOT SITS BESIDE THE SENTENCE, NOT INSIDE IT (2026-10-24, Cash flow journey E2E-78): inside a sentence a screen reader
          reads the sentence with the ⓘ in it and the dot itself as "ⓘ" — beside it, the dot says "What is …?" like every other */}
      <View style={s.caveatRow}>
        <Text style={[s.caveat, { flex: 1, marginTop: 0 }]}>
          Shares might earn more than either — or less. Paying the mortgage is the only one that is certain. {taxWords}
        </Text>
        <InfoDot term="nestEggMath" line={s.caveat} />
      </View>

      {isFallback && (
        // never let a stale rate pass as live on the one screen where it changes the answer
        <Text style={s.stale}>We could not reach the rate feed today, so this uses a typical ten-year yield.</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  rates: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6, lineHeight: 22 },
  body: { fontSize: 13, lineHeight: 20, color: Colors.textPrimary },
  b: { fontWeight: '800' },
  caveat: { fontSize: 11, lineHeight: 17, color: Colors.textSecondary, marginTop: Spacing.sm },
  caveatRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: Spacing.sm },
  stale: { fontSize: 11, lineHeight: 17, color: Colors.amber, marginTop: 6, fontWeight: '600' },
});

