// Retirement transition + required withdrawals (FCC detailed design v1.1, Plan r43-r51):
// the chief-of-staff view of the government-mandated yearly withdrawal — this year's required
// amount, what's already taken (from the ONE ledger), the deadline, a year-by-year schedule
// (clearly labeled estimates), and a getting-ready checklist for the run-up to 73.
// Logistics and reminders — the decision of WHEN in the year to take it stays with the user.
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { ageFromProfile } from '../utils/persona';
import { maskedMoney, spokenMoney } from '../components/useMoney';
import { InfoDot } from '../components/UI';
import { taxBucketSplit, rmdAtAge, rmdSchedule, rmdTakenThisYear, RMD_START_AGE } from '../domain/decumulation';
import { requestNotificationPermission, scheduleRmdReminder } from '../services/notifications';
import { modalAnimation } from '../hooks/reducedMotion';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

export default function RequiredWithdrawalsScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? null;
  const accounts = store.assetAccounts ?? [];
  const A = store.retirementAssumptions ?? {};
  const age = ageFromProfile(op);
  const nowYear = new Date().getFullYear();

  const preTaxAccts = useMemo(() => accounts.filter((a: any) => a.tax_bucket === 'PRE_TAX'), [accounts]);
  const preTax = taxBucketSplit(accounts).preTax;          // the SAME bucket rule Net worth's by-type view uses
  const applies = age != null && age >= RMD_START_AGE;

  const required = applies ? rmdAtAge(preTax, age as number) : 0;
  const taken = useMemo(
    () => rmdTakenThisYear(store.transactions ?? [], preTaxAccts.map((a: any) => a.asset_id)),
    [store.transactions, preTaxAccts],
  );
  const still = Math.max(0, required - taken);

  const schedule = useMemo(
    () => (age != null && preTax > 0 ? rmdSchedule(preTax, age, A.expectedReturn ?? 0.055, 12) : []),
    [preTax, age, A.expectedReturn],
  );
  const startYear = age != null ? nowYear + Math.max(0, RMD_START_AGE - age) : null;

  // mark-as-taken sheet
  const [markOpen, setMarkOpen] = useState(false);
  const [markAmt, setMarkAmt] = useState('');
  const [markAcct, setMarkAcct] = useState<string>('');
  const [reminded, setReminded] = useState(false);
  const markReady = num(markAmt) > 0 && !!(markAcct || preTaxAccts[0]);
  const saveTaken = () => {
    const acctId = markAcct || preTaxAccts[0]?.asset_id;
    if (!acctId || num(markAmt) <= 0) return;
    store.recordTransaction({
      type: 'WITHDRAWAL', account_id: acctId, amount: num(markAmt),
      date: new Date().toISOString().slice(0, 10), note: 'required withdrawal',
    });
    setMarkOpen(false); setMarkAmt(''); setMarkAcct('');
  };

  const remind = async (year: number) => {
    const ok = await requestNotificationPermission();
    if (!ok) { Alert.alert('Notifications are off', 'Allow notifications in Settings and try again.'); return; }
    const scheduled = await scheduleRmdReminder(year);
    setReminded(true);
    Alert.alert(scheduled ? 'Reminder set' : 'Too late for this year',
      scheduled ? `We'll nudge you November 1, ${year} — the deadline is Dec 31.` : 'November has passed — the deadline is Dec 31 this year.');
  };

  // getting-ready checklist (r49): states DERIVE from the same stores the target screens read —
  // never a manually-ticked shadow copy (the two view-flags record a real viewing, set on open)
  const checks = [
    { key: 'ss', label: 'Social Security decided', done: A.ssClaimAge != null || num(op?.ri_ss) > 0, route: '/ss-timing' },
    { key: 'paycheck', label: 'Retirement paycheck set up', done: num(op?.ri_ss) > 0 || num(op?.ri_pension) > 0, route: '/monthly-income' },
    { key: 'drawOrder', label: 'Withdrawal order reviewed', done: !!store.transitionChecks?.drawOrder, route: '/(tabs)/cashflow' },
    { key: 'health', label: 'Health coverage checked', done: !!store.transitionChecks?.health, route: null },
  ];
  const [healthOpen, setHealthOpen] = useState(false);
  const openCheck = (c: typeof checks[number]) => {
    if (c.key === 'health') { setHealthOpen(true); store.setTransitionCheck?.('health', true); return; }
    if (c.route) router.push(c.route as any);
  };

  const explainer = (
    <View style={s.card}>
      <Text style={s.kicker}>WHAT THIS IS</Text>
      <Text style={s.line}>From age {RMD_START_AGE}, the law requires a yearly withdrawal from pre-tax retirement accounts (401(k), traditional IRA). <InfoDot term="rmd" /></Text>
      {preTax > 0 && age != null && !applies && (
        <>
          <Text style={s.line}>Yours starts in <Text style={s.strong}>{startYear}</Text> (age {RMD_START_AGE}). First-year estimate on today's balance: <Text style={s.strong}>~{maskedMoney(Math.round(rmdAtAge(preTax, RMD_START_AGE)))}</Text> — the real number moves with your balance.</Text>
          <TouchableOpacity accessibilityRole="button" style={s.secondaryBtn} onPress={() => remind(startYear as number)}
            accessibilityLabel={`Remind me when this starts for me, ${startYear}`}>
            <Text style={s.secondaryTxt}>{reminded ? '✓ Reminder set' : `Remind me when this starts (${startYear})`}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <ScrollView automaticallyAdjustKeyboardInsets style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.h1}>Required withdrawals</Text>
      <Text style={s.sub}>Logistics only — when in the year you take it is your call.</Text>

      {/* STATES (r51): no pre-tax accounts → explain + the road in; never a fake number */}
      {preTax <= 0 ? (
        <>
          {explainer}
          <View style={s.card}>
            <Text style={s.line}>No pre-tax retirement accounts on file yet — add your 401(k) or IRA and this screen fills in with your real numbers.</Text>
            <TouchableOpacity accessibilityRole="button" style={s.secondaryBtn} onPress={() => router.push('/(tabs)/analytics' as any)}
              accessibilityLabel="Add your retirement accounts on the Net worth tab">
              <Text style={s.secondaryTxt}>Add your retirement accounts ›</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : applies ? (
        <>
          {/* this year (r45): required · taken · still, one ledger */}
          <View style={s.card} accessible
            accessibilityLabel={`This year: required ${spokenMoney(Math.round(required))}, taken so far ${spokenMoney(Math.round(taken))}, still to take ${spokenMoney(Math.round(still))} by December 31`}>
            <Text style={s.kicker}>THIS YEAR ({nowYear})</Text>
            <Text style={s.bigLine}>Required {maskedMoney(Math.round(required))}</Text>
            <Text style={s.line}>Taken so far {maskedMoney(Math.round(taken))} · <Text style={[s.strong, still > 0 && s.warnTxt]}>Still to take {maskedMoney(Math.round(still))}</Text> by Dec 31</Text>
            {still <= 0 && <Text style={s.doneTxt}>✓ Done for {nowYear} — nothing left to take.</Text>}
            {age === RMD_START_AGE && (
              // PRD F9#16 (SECURE 2.0): the very FIRST one may wait until April 1 next year —
              // stated as a fact with the trade-off, never a recommendation
              <Text style={s.note}>First-year rule: because this is your first required withdrawal, the law lets it wait until April 1, {nowYear + 1} — but then you'd take two in {nowYear + 1}, which can mean more tax that year. Your call; your tax preparer knows your picture.</Text>
            )}
            <View style={s.btnRow}>
              <TouchableOpacity accessibilityRole="button" style={s.secondaryBtn} onPress={() => setMarkOpen(true)} accessibilityLabel="Mark a withdrawal as taken">
                <Text style={s.secondaryTxt}>Mark as taken</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={s.secondaryBtn} onPress={() => remind(nowYear)} accessibilityLabel="Remind me in November">
                <Text style={s.secondaryTxt}>{reminded ? '✓ Reminder set' : 'Remind me in November'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        explainer
      )}

      {/* getting-ready checklist leads for the under-73 visitor (r49/r51) */}
      {preTax > 0 && (
        <View style={s.card}>
          <Text style={s.kicker}>GETTING READY{applies ? '' : ' FOR ' + RMD_START_AGE}</Text>
          {checks.map((c) => (
            <TouchableOpacity accessibilityRole="button" key={c.key} style={s.checkRow} onPress={() => openCheck(c)}
              accessibilityLabel={`${c.label}: ${c.done ? 'done' : 'not yet'}${c.key === 'health' ? '. Opens a short note.' : '. Opens its screen.'}`}>
              <Text style={[s.checkMark, c.done && s.checkOn]}>{c.done ? '✓' : '○'}</Text>
              <Text style={s.checkTxt}>{c.label}</Text>
              <Text style={s.chev}>›</Text>
            </TouchableOpacity>
          ))}
          <Text style={s.note}>Progress, not pressure — each row opens the real screen.</Text>
        </View>
      )}

      {/* year-by-year schedule (r47) — estimates, moving with balances and the divisor table */}
      {schedule.length > 0 && (
        <View style={s.card}>
          <Text style={s.kicker}>YEAR BY YEAR (ESTIMATES)</Text>
          {schedule.slice(0, 8).map((r) => (
            <View key={r.year} style={s.schedRow} accessible
              accessibilityLabel={`${r.year}, age ${r.age}: about ${spokenMoney(Math.round(r.amount))}${r.isCurrent ? ', this year' : ''}`}>
              <Text style={[s.schedYear, r.isCurrent && s.strong]}>{r.year} · {r.age}</Text>
              <Text style={[s.schedAmt, r.isCurrent && s.strong]}>{r.isCurrent ? '' : '~'}{maskedMoney(Math.round(r.amount))}</Text>
            </View>
          ))}
          <Text style={s.note}>Future amounts move with your balance and the IRS divisor table — estimates, not promises. Adopting a plan (like a Roth conversion) changes these rows.</Text>
        </View>
      )}

      {/* which accounts (r50): the visible inputs, with the road to fix a wrong tax chip */}
      {preTaxAccts.length > 0 && (
        <View style={s.card}>
          <Text style={s.kicker}>BASED ON THESE ACCOUNTS</Text>
          {preTaxAccts.map((a: any) => (
            <TouchableOpacity accessibilityRole="button" key={a.asset_id} style={s.acctRow}
              onPress={() => router.push(`/account-detail?id=${a.asset_id}` as any)}
              accessibilityLabel={`${a.label}, ${spokenMoney(Math.round(a.balance || 0))}, marked pre-tax. Opens its page to edit.`}>
              <Text style={s.acctLabel} numberOfLines={1}>{a.institution?.trim() || a.label}</Text>
              <Text style={s.acctBal}>{maskedMoney(Math.round(a.balance || 0))}</Text>
              <Text style={s.chev}>›</Text>
            </TouchableOpacity>
          ))}
          <Text style={s.note}>Marked pre-tax when added — tap to fix a wrong label.</Text>
        </View>
      )}

      {/* mark-as-taken (r46): writes a REAL ledger entry — history and balances stay honest */}
      <Modal visible={markOpen} transparent animationType={modalAnimation()} onRequestClose={() => setMarkOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" style={s.scrim} activeOpacity={1} onPress={() => setMarkOpen(false)} />
          <View style={s.sheet}>
            <Text style={s.sheetT}>Mark a withdrawal as taken</Text>
            <Text style={s.note}>Records it in the account's history — it counts toward this year's requirement.</Text>
            <TextInput style={s.input} keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor={Colors.textTertiary}
              value={markAmt} onChangeText={setMarkAmt} accessibilityLabel="Withdrawal amount" autoFocus />
            {preTaxAccts.map((a: any) => {
              const on = (markAcct || preTaxAccts[0]?.asset_id) === a.asset_id;
              return (
                <TouchableOpacity accessibilityRole="radio" key={a.asset_id} style={[s.pickRow, on && s.pickOn]}
                  onPress={() => setMarkAcct(a.asset_id)} accessibilityState={{ selected: on }}
                  accessibilityLabel={`From ${a.label}`}>
                  <Text style={s.pickTxt}>{on ? '◉' : '○'}  {a.institution?.trim() || a.label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity accessibilityRole="button" style={[s.primaryBtn, !markReady && { opacity: 0.4 }]} disabled={!markReady}
              onPress={saveTaken} accessibilityLabel="Save this withdrawal">
              <Text style={s.primaryTxt}>Record withdrawal</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* health coverage — a short plain note, no dedicated screen in v1 (r49) */}
      <Modal visible={healthOpen} transparent animationType="fade" onRequestClose={() => setHealthOpen(false)}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" style={s.scrim} activeOpacity={1} onPress={() => setHealthOpen(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetT}>Health coverage before 65</Text>
          <Text style={s.line}>Medicare starts at 65. If you stop working earlier, plan how you'll be covered in between — employer retiree coverage, a spouse's plan, COBRA, or the marketplace. Costs vary a lot; check before you set a retirement date.</Text>
          <TouchableOpacity accessibilityRole="button" style={s.primaryBtn} onPress={() => setHealthOpen(false)} accessibilityLabel="Got it">
            <Text style={s.primaryTxt}>Got it</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  kicker: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 6 },
  bigLine: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  line: { fontSize: 15, color: Colors.textPrimary, marginTop: 4, lineHeight: 21 },
  strong: { fontWeight: '800', color: Colors.textPrimary },
  warnTxt: { color: Colors.amber },
  doneTxt: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark, marginTop: 6 },
  note: { fontSize: 12, color: Colors.textTertiary, marginTop: 8, lineHeight: 17 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  secondaryBtn: { flex: 1, backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, paddingVertical: 12, alignItems: 'center', minHeight: 44, marginTop: 8 },
  secondaryTxt: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, minHeight: 44 },
  checkMark: { fontSize: 17, color: Colors.textTertiary, width: 22, textAlign: 'center' },
  checkOn: { color: Colors.primaryDark, fontWeight: '800' },
  checkTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  chev: { fontSize: 18, color: Colors.textTertiary },
  schedRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, minHeight: 32 },
  schedYear: { fontSize: 15, color: Colors.textSecondary },
  schedAmt: { fontSize: 15, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  acctRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, minHeight: 44 },
  acctLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  acctBal: { fontSize: 15, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: Colors.cardBg, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.lg, paddingBottom: Spacing.xl },
  sheetT: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  input: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, fontSize: 16, color: Colors.textPrimary, marginTop: Spacing.md },
  pickRow: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: Spacing.md, marginTop: 8, minHeight: 48, justifyContent: 'center' },
  pickOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  pickTxt: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  primaryTxt: { color: Colors.white, fontSize: 16, fontWeight: '800' },
});
