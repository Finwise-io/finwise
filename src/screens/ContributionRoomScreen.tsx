// Contribution room — where the "Room left in your 401(k)" insight should land (per device feedback): the
// IRS limit, what you've contributed, what's left, and how to add it — for 401(k), IRA, and HSA.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { ProgressBar, InfoDot } from '../components/UI';
import { Disclaimer } from '../components/Disclaimer';
import { k401Headroom, annualIraLimit, annualHsaLimit, IRS_LIMITS } from '../domain/income/limits';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

function RoomCard({ icon, title, limit, used, knownUsed, catchUp, how, note }: {
  icon: string; title: string; limit: number; used: number; knownUsed: boolean; catchUp?: boolean; how: string; note?: string;
}) {
  const room = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.icon}>{icon}</Text>
        <Text style={s.title}>{title}</Text>
        <Text style={s.room}>{money(room)} left</Text>
      </View>
      <ProgressBar pct={Math.round(pct)} color={room > 0 ? Colors.primary : Colors.successGreen} height={7} />
      <Text style={s.line}>
        {knownUsed ? `You've put in ${money(used)} of the ${money(limit)} limit this year.` : `The ${IRS_LIMITS.year} limit is ${money(limit)}.`}
        {catchUp ? ' (Includes the age-50+ catch-up.)' : ''}
      </Text>
      {note ? <Text style={s.note}>{note}</Text> : null}
      <Text style={s.how}>How to add: {how}</Text>
    </View>
  );
}

export default function ContributionRoomScreen() {
  const router = useRouter();
  const op = (useStore((st: any) => st.onboardingProfile) ?? {}) as any;
  const age = num(op.birthYear) ? new Date().getFullYear() - num(op.birthYear) : null;

  const k401 = k401Headroom(age, num(op.c_401k) * 12);
  const iraLimit = annualIraLimit(age);
  const iraUsed = Math.min(num(op.c_roth) * 12, iraLimit);   // best-effort from the Roth contribution you entered
  const hsaLimit = annualHsaLimit(age, false);

  return (
    <KeyboardAwareScreen style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={s.h1}>Contribution room · {IRS_LIMITS.year}</Text><InfoDot term="contributionRoom" /></View>
      <Text style={s.sub}>How much more you can still put into tax-advantaged accounts this year. Limits are set by the IRS{age != null ? ` for your age (${age})` : ''}.</Text>

      <RoomCard icon="💼" title="401(k)" limit={k401.limit} used={k401.used} knownUsed catchUp={k401.catchUp}
        how="raise your paycheck deferral % with your employer/plan." />

      {/* FCC: the designed try-it landing — the room ÷ months left, pre-filled into the forward what-if */}
      {k401.remaining > 0 && (() => {
        const monthsLeft = Math.max(1, 12 - new Date().getMonth());
        const perMonth = Math.round(k401.remaining / monthsLeft / 100) * 100;
        return (
          <TouchableOpacity accessibilityRole="button" style={s.tryBtn}
            onPress={() => router.push(`/what-if?addMonthly=${perMonth}` as any)}
            accessibilityLabel={`Try it in a what-if: about ${money(perMonth)} a month for the rest of the year`}>
            <Text style={s.tryTxt}>Try it in a what-if — about {money(perMonth)}/mo ›</Text>
          </TouchableOpacity>
        );
      })()}

      <RoomCard icon="🏦" title="IRA (Traditional + Roth)" limit={iraLimit} used={iraUsed} knownUsed={iraUsed > 0} catchUp={age != null && age >= 50}
        note="Traditional + Roth IRA share one combined limit. Income limits may reduce how much is deductible / Roth-eligible."
        how="open or add to an IRA at any brokerage before the tax-filing deadline." />

      <RoomCard icon="🩺" title="HSA" limit={hsaLimit} used={0} knownUsed={false} catchUp={age != null && age >= 55}
        note="Only if you're on a high-deductible health plan. Self-only limit shown; family is higher."
        how="contribute via payroll or directly to your HSA provider." />

      <Disclaimer />
    </KeyboardAwareScreen>
  );
}

const s = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.md },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: -4, marginBottom: 4, lineHeight: 19 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, borderWidth: 0.5, borderColor: Colors.border },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { fontSize: 22, marginRight: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  room: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  line: { fontSize: 13, color: Colors.textPrimary, marginTop: 8 },
  note: { fontSize: 11.5, color: Colors.textSecondary, marginTop: 4, lineHeight: 16 },
  how: { fontSize: 12.5, color: Colors.primaryDeep, marginTop: 6, fontWeight: '600' },
  tryBtn: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  tryTxt: { fontSize: 13.5, fontWeight: '700', color: Colors.primary },
});
