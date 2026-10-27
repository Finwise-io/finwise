// Contribution room — where the "Room left in your 401(k)" insight should land (per device feedback): the
// IRS limit, what you've contributed, the surplus, and how to add it — for 401(k), IRA, and HSA.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { fig, figPer, figSaid } from '../components/figure';   // every figure printed by its identifier (rule 11, 2026-10-26)
import { ProgressBar, InfoDot } from '../components/UI';
import { Disclaimer } from '../components/Disclaimer';
import { IRS_LIMITS } from '../domain/income/limits';
// ONE DOOR (MK-CF-O-005 theContributionRoom, Q-CF-4 ruled 2026-09-27: "yes"). This screen, the
// Tax organizer and Home answer one question; the three rulings it carries (G1 the age attained
// in the year · G10 Medicare bars an HSA entirely · G36 this month counts) live in the door.
import { theContributionRoom, type Room } from '../../MoneyKeel/functions/cashflow/contribution-room';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// THE CARD SAYS WHAT THE DOOR WORKED OUT, AND HOW (2026-10-25, FIX-ROOM; drawing contribution-room v01, states A to E):
//  · the year at the monthly amount is a plan, said as one — "At $1,200/month you will put in $14,400 this year — room for
//    $21,350 more" (the lead's ruling on CFR-4's first question, the way DEC-0013 did the HSA card); nothing entered → "up to";
//  · over the limit is shown, never cut to it — "$4,250 over", and what the law does with the excess (IRC §402(g), §4973);
//  · each card names its own catch-up (60–63 for the 401(k), 55+ for the HSA).
function RoomCard({ icon, title, room, knownUsed, catchUpWords, overRule, how, note, extra }: {
  icon: string; title: string; room: Room; knownUsed: boolean; catchUpWords?: string | null; overRule: string;
  how: string; note?: string; extra?: React.ReactNode;
}) {
  const over = knownUsed && room.excess > 0;
  const pct = room.limit > 0 ? Math.min(100, (room.used / room.limit) * 100) : (over ? 100 : 0);
  // every figure printed by its identifier (rule 11; 2026-10-26, PF-TOOLS): MK-MN-M-003 the room, the amount over or the "up to";
  // MK-MN-M-004 the year at the monthly amount; MK-MN-M-031 the limit; MK-MN-M-032 the monthly amount entered
  const head = !knownUsed ? `up to ${fig('MK-MN-M-003', room.limit)}` : over ? `${fig('MK-MN-M-003', room.excess)} over` : `room for ${fig('MK-MN-M-003', room.remaining)}`;
  const plan = `At ${figPer('MK-MN-M-032', room.monthly)} you will put in ${fig('MK-MN-M-004', room.used)} this year`;
  const said = !knownUsed
    ? `The ${IRS_LIMITS.year} limit is ${fig('MK-MN-M-031', room.limit)}.`
    : over
      ? `${plan} — ${fig('MK-MN-M-003', room.excess)} over the ${fig('MK-MN-M-031', room.limit)} limit. ${overRule} ${WORKED_FROM}`
      : `${plan} — room for ${fig('MK-MN-M-003', room.remaining)} more. ${WORKED_FROM}`;
  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.icon}>{icon}</Text>
        <Text style={s.title}>{title}</Text>
        <Text style={[s.room, over && s.roomOver]}>{head}</Text>
      </View>
      <ProgressBar pct={Math.round(pct)} color={over ? Colors.red : room.remaining > 0 ? Colors.primary : Colors.successGreen} height={7} />
      <Text style={s.line} accessibilityLabel={`${said.replace('/month', ' a month')}${catchUpWords ? ` (Includes the ${catchUpWords} catch-up.)` : ''}`}>
        {said}
        {catchUpWords ? ` (Includes the ${catchUpWords} catch-up.)` : ''}
      </Text>
      {note ? <Text style={s.note}>{note}</Text> : null}
      {extra}
      <Text style={s.how}>How to add: {how}</Text>
    </View>
  );
}
const WORKED_FROM = 'Calculated from the monthly amount you entered — check it against your latest statement.';

export default function ContributionRoomScreen() {
  const router = useRouter();
  const op = (useStore((st: any) => st.onboardingProfile) ?? {}) as any;
  const answer = theContributionRoom({ profile: op });
  const age = answer.age;   // G1: the year-attained age, the IRS test for every catch-up
  const k401 = answer.k401;
  // G10 (founder ruling 2026-09-08): enrolled in Medicare → no HSA contribution from its first month. The questions live on
  // this card because no other page captures them yet (MK-XS-I-062, and the month Medicare began, 2026-10-25).
  const setProfile = useStore((st: any) => st.setOnboardingProfile);
  const medicare: boolean | null = op.medicareEnrolled === 'yes' ? true : op.medicareEnrolled === 'no' ? false : null;
  const seniorHsa = age != null && age >= 65;
  const thisYear = answer.year;
  const from = answer.medicareFrom;
  // NO BIRTH YEAR: the limits are the base ones, said so, and the year can be entered right here (tenet 3; MK-MN-M-003)
  const [birthText, setBirthText] = React.useState('');
  const saveBirthYear = (v: string) => {
    const digits = v.replace(/[^0-9]/g, '').slice(0, 4);
    setBirthText(digits);
    const y = Number(digits);
    if (digits.length === 4 && y >= 1900 && y <= new Date().getFullYear()) setProfile?.({ ...op, birthYear: digits });
  };

  const k401CatchUp = age != null && age >= 60 && age <= 63 ? 'age 60–63' : k401.catchUp ? 'age-50+' : null;
  const hsaNote = !seniorHsa
    ? "Only if you're on a high-deductible health plan. We don't track your HSA contributions yet, so this shows the full-year cap — self-only limit; family plans cap higher."
    : medicare !== true
      ? 'If you are not enrolled in Medicare. If you are enrolled in Medicare, update it below — then no contribution is allowed. Only if you\'re on a high-deductible health plan; self-only limit, family plans cap higher.'
      : from && from !== 'before' && answer.hsaEligibleMonths > 0
        ? `You are enrolled in Medicare from ${MONTH_NAMES[from.month - 1]} ${from.year}, so HSA money counts for January to ${MONTH_NAMES[from.month - 2]} only: ${fig('MK-MN-M-033', answer.hsaFullYearLimit)} × ${answer.hsaEligibleMonths} ÷ 12 = ${fig('MK-MN-M-031', answer.hsa.limit)} (IRS Publication 969).`
        : from && from !== 'before'
          ? `You are enrolled in Medicare from ${MONTH_NAMES[from.month - 1]} ${from.year}, so no HSA contribution is allowed this year (IRS Publication 969). Not enrolled? Update it below.`
          : from === 'before'
            ? 'You are enrolled in Medicare, so no HSA contribution is allowed this year (IRS Publication 969). Not enrolled? Update it below.'
            : 'You are enrolled in Medicare, so no HSA contribution is allowed from its first month (IRS Publication 969). If it began this year, pick the month below — the months before it still count.';
  const startChoices: [string, string, string][] = [[`before-${thisYear}`, `Before ${thisYear}`, `Before ${thisYear}`],
    ...MONTHS.map((m, i): [string, string, string] => [`${thisYear}-${String(i + 1).padStart(2, '0')}`, m, `${MONTH_NAMES[i]} ${thisYear}`])];

  return (
    <KeyboardAwareScreen style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={s.h1}>Contribution room · {IRS_LIMITS.year}</Text><InfoDot term="contributionRoom" /></View>
      <Text style={s.sub}>How much more you can still put into tax-advantaged accounts this year. Limits are set by the IRS{age != null ? ` for your age (${age})` : ''}.{answer.baseLimitOnly ? ' Your birth year is not entered, so each limit below is the one before any catch-up.' : ''}</Text>
      {answer.baseLimitOnly && (
        <View style={s.birthRow}>
          <Text style={s.birthLabel}>Your birth year</Text>
          <TextInput style={s.birthInput} value={birthText} onChangeText={saveBirthYear} keyboardType="number-pad" maxLength={4}
            placeholder="YYYY" placeholderTextColor={Colors.textTertiary} returnKeyType="done" accessibilityLabel="Your birth year" />
        </View>
      )}

      <RoomCard icon="💼" title="401(k)" room={k401} knownUsed={k401.monthly > 0} catchUpWords={k401CatchUp}
        overRule="Money over the limit has to come out by April 15 next year, or it is taxed twice."
        how="raise your paycheck deferral % with your employer/plan." />

      {/* FCC: the designed try-it landing — the room ÷ months left, pre-filled into the forward what-if */}
      {k401.remaining > 0 && (() => {
        const perMonth = answer.perMonthToFill401k;          // G36: the current month counts as remaining
        return (
          <TouchableOpacity accessibilityRole="button" style={s.tryBtn}
            onPress={() => router.push(`/what-if?addMonthly=${perMonth}` as any)}
            accessibilityLabel={`Try it in a what-if: about ${figSaid('MK-MN-M-005', perMonth)} for the rest of the year`}>
            <Text style={s.tryTxt}>Try it in a what-if — about {figPer('MK-MN-M-005', perMonth)} ›</Text>
          </TouchableOpacity>
        );
      })()}

      <RoomCard icon="🏦" title="IRA (Traditional + Roth)" room={answer.ira} knownUsed={answer.ira.monthly > 0} catchUpWords={answer.ira.catchUp ? 'age-50+' : null}
        overRule="Money over the limit has to come out by your tax-filing deadline, or it is taxed 6% for each year it stays."
        note="Traditional + Roth IRA share one combined limit. Income limits may reduce how much is deductible / Roth-eligible."
        how="open or add to an IRA at any brokerage before the tax-filing deadline." />

      {/* Build-47 walk row 1: the header must not claim "$X left" when contributions aren't
          tracked — "up to $X" + the honest note below say exactly what we know (DEC-0013). */}
      <RoomCard icon="🩺" title="HSA (Health Savings Account)" room={answer.hsa} knownUsed={false}
        catchUpWords={answer.hsa.catchUp && answer.hsa.limit > 0 ? 'age-55+' : null}
        overRule="" note={hsaNote}
        extra={seniorHsa ? (
          <>
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
            {medicare === true && (
              <>
                <Text style={s.startLabel}>When did your Medicare start?</Text>
                <View style={s.startRow} accessibilityRole="radiogroup" accessibilityLabel="When did your Medicare start?">
                  {startChoices.map(([v, label, spoken]) => {
                    const on = op.medicareStart === v;
                    return (
                      <TouchableOpacity key={v} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={spoken}
                        style={[s.startChip, on && s.medicareOn]} onPress={() => setProfile?.({ ...op, medicareStart: v })}>
                        <Text style={[s.startTxt, on && s.medicareTxtOn]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </>
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
  startLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginTop: 10 },
  startRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  startChip: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingVertical: 6, paddingHorizontal: 9, minHeight: 32, backgroundColor: Colors.bgSecondary, justifyContent: 'center' },
  startTxt: { fontSize: 13, color: Colors.textSecondary },
  birthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, paddingVertical: 10, paddingHorizontal: Spacing.md, borderWidth: 0.5, borderColor: Colors.border },
  birthLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  birthInput: { width: 96, minHeight: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 10, fontSize: 15, color: Colors.textPrimary, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, gap: Spacing.md },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: -4, marginBottom: 4, lineHeight: 19 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, borderWidth: 0.5, borderColor: Colors.border },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { fontSize: 24, marginRight: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  room: { fontSize: 20, fontWeight: '800', color: Colors.primaryDark, fontVariant: ['tabular-nums'] },
  roomOver: { color: Colors.red },
  line: { fontSize: 13, color: Colors.textPrimary, marginTop: 8 },
  note: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  how: { fontSize: 13, color: Colors.primaryDeep, marginTop: 6, fontWeight: '600' },
  tryBtn: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  tryTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
