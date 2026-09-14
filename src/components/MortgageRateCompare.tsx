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
import { compareMortgageToTreasury } from '../domain/debt/mortgageVsTreasury';
import { mortgageOddsEffect } from '../domain/debt/mortgageOdds';
import type { RetirementInputs } from '../domain/retirement';
import { InfoDot } from './UI';

export function MortgageRateCompare({ balance, annualRate, monthlyPayment, extraMonthly, treasuryYield, isFallback, planInputs, nowYear }: {
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
}) {
  const c = compareMortgageToTreasury({ balance, annualRate, monthlyPayment, extraMonthly, treasuryYield });
  const effect = planInputs
    ? mortgageOddsEffect({ base: planInputs, balance, annualRate, monthlyPayment, extraMonthly, nowYear: nowYear ?? new Date().getFullYear() })
    : null;
  if (!c) return null;

  const rates = `Your mortgage costs ${c.mortgagePct}%. A ten-year Treasury pays ${c.treasuryPct}% today.`;
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
            <> Over the life of the loan, paying the extra {maskedMoney(extraMonthly)} a month leaves you around{' '}
              <Text style={s.b}>{maskedMoney(lifetime)} {c.lifetimeDifference > 0 ? 'better off' : 'worse off'}</Text>{' '}
              than putting it in Treasuries instead.</>
          )}
        </Text>
      )}

      {/* THE RETIREMENT CONSEQUENCE TRAVELS WITH THE CONTROL. Moving this decision to the debt
          surface and leaving this line behind on Retire would let a person decide blind to its
          biggest effect — worse than where we started (brief §3.3.1).
          BOTH numbers are full simulation runs (§6.1). Never a subtraction. */}
      {effect && (
        <Text style={s.body}
          accessibilityLabel={`Paying the extra means less going into savings. Your money lasts in about ${effect.before} of 100 futures today, and about ${effect.after} of 100 if you do this.`}>
          {'\n'}That's {maskedMoney(extraMonthly)}/month not going into savings while the loan runs — and the whole
          payment freeing up once it clears, {effect.fasterPayoffYear} instead of {effect.payoffYear}. Taken together, your
          money lasts in about <Text style={s.b}>{effect.before} out of 100 simulated futures</Text> today, and about{' '}
          <Text style={s.b}>{effect.after} out of 100</Text> if you do this.
        </Text>
      )}

      {/* SHARES ARE A DIFFERENT QUESTION, and saying so is what stops this reading as advice.
          Paying a mortgage down is a guaranteed return; shares are not. */}
      <Text style={s.caveat}>
        Shares might earn more than either — or less. Paying the mortgage is the only one that is certain.
        Tax usually widens this gap rather than closing it, but that depends on your own return.
        <InfoDot term="nestEggMath" size={11} />
      </Text>

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
  stale: { fontSize: 11, lineHeight: 17, color: Colors.amber, marginTop: 6, fontWeight: '600' },
});

