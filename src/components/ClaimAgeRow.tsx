// "WHEN SHOULD I CLAIM SOCIAL SECURITY?" — answered in place (founder ruling, 2026-08-12).
//
// It must NOT send a person to another screen to find out what waiting is worth. The row says the
// answer: waiting from full retirement age to 70 pays a specific number of dollars more a month, in
// their own money, from their own statement.
//
// It only exists between 60 and 70 (founder, 2026-08-14). Before 60 it is not a decision, it is
// trivia; at 70 the delayed credit stops, so there is nothing left to choose — which also makes 70
// the most urgent month of all, since every month after it costs money and buys nothing.
//
// NO LINK IN THE HERO ABOVE THIS ROW. The founder asked where "see what waiting is worth" went and
// the answer was: a few centimetres down the same screen. One decision, one place.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radii } from '../utils/theme';
import { maskedMoney, spokenMoney } from './useMoney';
import { ssBenefitAtClaimAge, FULL_RETIREMENT_AGE, EARLIEST_CLAIM_AGE, LATEST_CREDIT_AGE } from '../domain/retirement/ssTiming';

const AGES = [EARLIEST_CLAIM_AGE, FULL_RETIREMENT_AGE, LATEST_CREDIT_AGE];

export function ClaimAgeRow({ statementMonthly, adoptedAge, onAdopt }: {
  /** their own statement amount at full retirement age — the only honest input for this */
  statementMonthly: number;
  adoptedAge?: number | null;
  onAdopt?: (age: number) => void;
}) {
  const [showing, setShowing] = useState<number>(adoptedAge ?? FULL_RETIREMENT_AGE);
  // NO STATEMENT, NO COMPARISON (adversarial pass, 2026-08-14). Without their own figure this row
  // would offer "62 · $0 / 67 · $0 / 70 · $0" — three fake zeros dressed as a decision, and a
  // sentence claiming waiting pays $0 more a month. The screen gates on this too; the component
  // refuses independently, because a row this wrong must not depend on one caller remembering.
  if (!(statementMonthly > 0)) return null;
  const at = (age: number) => Math.round(ssBenefitAtClaimAge(statementMonthly, age));
  const delta = at(LATEST_CREDIT_AGE) - at(FULL_RETIREMENT_AGE);

  return (
    <View style={s.wrap} testID="claim-age-row">
      <Text style={s.q}>When should I claim Social Security?</Text>

      {/* THE ANSWER, IN THE ROW — not a promise to explain it somewhere else */}
      <Text style={s.answer}>
        Waiting from {FULL_RETIREMENT_AGE} to {LATEST_CREDIT_AGE} pays <Text style={s.b}>{maskedMoney(delta)} more a month</Text>:{' '}
        {maskedMoney(at(LATEST_CREDIT_AGE))} against {maskedMoney(at(FULL_RETIREMENT_AGE))}.
      </Text>

      <View style={s.chips}>
        {AGES.map((age) => {
          const on = age === showing;
          return (
            <TouchableOpacity key={age} style={[s.chip, on && s.chipOn]} onPress={() => setShowing(age)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Claiming at ${age} pays ${spokenMoney(at(age))} a month`}>
              <Text style={[s.chipTxt, on && s.chipTxtOn]}>{age} · {maskedMoney(at(age))}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* WHY 70 IS THE END OF IT — a person who does not know this assumes waiting always pays more,
          and keeps waiting past the point where it stops. */}
      <Text style={s.foot}>
        You can claim any time from {EARLIEST_CLAIM_AGE}. Each year you wait raises the cheque, and it stops
        rising at {LATEST_CREDIT_AGE} — waiting past then adds nothing.
      </Text>

      {onAdopt && showing !== adoptedAge && (
        <TouchableOpacity style={s.use} onPress={() => onAdopt(showing)} accessibilityRole="button"
          accessibilityLabel={`Plan on claiming at ${showing}`}>
          <Text style={s.useTxt}>Plan on claiming at {showing}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: 8 },
  q: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  answer: { fontSize: 13, lineHeight: 20, color: Colors.textSecondary },
  b: { fontWeight: '800', color: Colors.textPrimary },
  chips: { flexDirection: 'row', gap: 8, marginTop: 2 },
  chip: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.borderStrong, backgroundColor: Colors.white },
  chipOn: { backgroundColor: Colors.primaryDeep, borderColor: Colors.primaryDeep },
  chipTxt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  chipTxtOn: { color: Colors.white },
  foot: { fontSize: 11, lineHeight: 17, color: Colors.textSecondary },
  use: { backgroundColor: Colors.primaryDeep, borderRadius: Radii.md, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  useTxt: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
