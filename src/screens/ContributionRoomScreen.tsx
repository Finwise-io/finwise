// Contribution room — where the "Room left in your 401(k)" insight should land (per device feedback): the
// IRS limit, what you've contributed, the surplus, and how to add it — for 401(k), IRA, and HSA.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { ProgressBar, InfoDot } from '../components/UI';
import { Disclaimer } from '../components/Disclaimer';
import { k401Headroom, annualIraLimit, annualHsaLimit, IRS_LIMITS, monthsLeftInYear, perMonthToFill, ageAttainedInYear } from '../domain/income/limits';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

function RoomCard({ icon, title, limit, used, knownUsed, catchUp, how, note, extra }: {
  icon: string; title: string; limit: number; used: number; knownUsed: boolean; catchUp?: boolean; how: string; note?: string; extra?: React.ReactNode;
}) {
  const room = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.icon}>{icon}</Text>
        <Text style={s.title}>{title}</Text>
        <Text style={s.room}>{knownUsed ? `${money(room)} left` : `up to ${money(limit)}`}</Text>
      </View>
      <ProgressBar pct={Math.round(pct)} color={room > 0 ? Colors.primary : Colors.successGreen} height={7} />
      <Text style={s.line}>
        {knownUsed ? `That is about ${money(used)} of the ${money(limit)} limit — calculated from what you entered you contribute each month, not from your payroll, so check it against your latest statement.` : `The ${IRS_LIMITS.year} limit is ${money(limit)}.`}
        {catchUp ? ' (Includes the age-50+ catch-up.)' : ''}
      </Text>
      {note ? <Text style={s.note}>{note}</Text> : null}
      {extra}
      <Text style={s.how}>How to add: {how}</Text>
    </View>
  );
}

export default function ContributionRoomScreen() {
  const router = useRouter();
  const op = (useStore((st: any) => st.onboardingProfile) ?? {}) as any;
  const age = ageAttainedInYear(num(op.birthYear) || null);   // G1: the year-attained age, the IRS test for every catch-up

  const k401 = k401Headroom(age, num(op.c_401k) * 12);
  const iraLimit = annualIraLimit(age);
  const iraUsed = Math.min(num(op.c_roth) * 12, iraLimit);   // best-effort from the Roth contribution you entered
  // G10 (founder ruling 2026-09-08): enrolled in Medicare → no HSA contribution is allowed. The
  // question lives on this card because no other page captures it yet (MK-XS-I-062).
  const setProfile = useStore((st: any) => st.setOnboardingProfile);
  const medicare: boolean | null = op.medicareEnrolled === 'yes' ? true : op.medicareEnrolled === 'no' ? false : null;
  const hsaLimit = annualHsaLimit(age, false, medicare);
  const seniorHsa = age != null && age >= 65;

  return (
    <KeyboardAwareScreen style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={s.h1}>Contribution room · {IRS_LIMITS.year}</Text><InfoDot term="contributionRoom" /></View>
      <Text style={s.sub}>How much more you can still put into tax-advantaged accounts this year. Limits are set by the IRS{age != null ? ` for your age (${age})` : ''}.</Text>

      <RoomCard icon="💼" title="401(k)" limit={k401.limit} used={k401.used} knownUsed catchUp={k401.catchUp}
        how="raise your paycheck deferral % with your employer/plan." />

      {/* FCC: the designed try-it landing — the room ÷ months left, pre-filled into the forward what-if */}
      {k401.remaining > 0 && (() => {
        const monthsLeft = monthsLeftInYear();                // G36: the current month counts as remaining
        const perMonth = perMonthToFill(k401.remaining);
        return (
          <TouchableOpacity accessibilityRole="button" style={s.tryBtn}
            onPress={() => router.push(`/what-if?addMonthly=${perMonth}` as any)}
            accessibilityLabel={`Try it in a what-if: about ${money(perMonth)} a month for the rest of the year`}>
            <Text style={s.tryTxt}>Try it in a what-if — about {money(perMonth)}/month ›</Text>
          </TouchableOpacity>
        );
      })()}

      <RoomCard icon="🏦" title="IRA (Traditional + Roth)" limit={iraLimit} used={iraUsed} knownUsed={iraUsed > 0} catchUp={age != null && age >= 50}
        note="Traditional + Roth IRA share one combined limit. Income limits may reduce how much is deductible / Roth-eligible."
        how="open or add to an IRA at any brokerage before the tax-filing deadline." />

      {/* Build-47 walk row 1: the header must not claim "$X left" when contributions aren't
          tracked — "up to $X" + the honest note below say exactly what we know. */}
      <RoomCard icon="🩺" title="HSA (Health Savings Account)" limit={hsaLimit} used={0} knownUsed={false} catchUp={age != null && age >= 55 && medicare !== true}
        note={seniorHsa
          ? (medicare === true
            ? 'You are enrolled in Medicare, so no HSA contribution is allowed this year (IRS Publication 969). Not enrolled? Update it below.'
            : 'If you are not enrolled in Medicare. If you are enrolled in Medicare, update it below — then no contribution is allowed. Only if you\'re on a high-deductible health plan; self-only limit, family plans cap higher.')
          : "Only if you're on a high-deductible health plan. We don't track your HSA contributions yet, so this shows the full-year cap — self-only limit; family plans cap higher."}
        extra={seniorHsa ? (
          <View style={s.medicareRow} accessibilityRole="radiogroup" accessibilityLabel="Are you enrolled in Medicare?">
            {([['yes', "I'm enrolled in Medicare"], ['no', "I'm not enrolled"]] as const).map(([v, label]) => {
              const on = op.medicareEnrolled === v;
              return (
                <TouchableOpacity key={v} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={label}
                  style={[s.medicareBtn, on && s.medicareOn]} onPress={() => setProfile?.({ ...op, medicareEnrolled: v })}>
                  <Text style={[s.medicareTxt, on && s.medicareTxtOn]}>{on ? '◉' : '○'}  {label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        how="contribute via payroll or directly to your HSA provider." />

      <Disclaimer />
    </KeyboardAwareScreen>
  );
}

const s = StyleSheet.create({
  medicareRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  medicareBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: Colors.bgSecondary },
  medicareOn: { borderColor: Colors.primary },
  medicareTxt: { fontSize: 15, color: Colors.textSecondary },
  medicareTxtOn: { color: Colors.primary, fontWeight: '700' },
  content: { padding: Spacing.lg, gap: Spacing.md },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: -4, marginBottom: 4, lineHeight: 19 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, borderWidth: 0.5, borderColor: Colors.border },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { fontSize: 24, marginRight: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  room: { fontSize: 20, fontWeight: '800', color: Colors.primaryDark, fontVariant: ['tabular-nums'] },
  line: { fontSize: 13, color: Colors.textPrimary, marginTop: 8 },
  note: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  how: { fontSize: 13, color: Colors.primaryDeep, marginTop: 6, fontWeight: '600' },
  tryBtn: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  tryTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
