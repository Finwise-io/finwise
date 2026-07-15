// Roth conversion — simple scenario (FCC detailed design v1.1, Plan r34-r41): one dial, one
// honest trade — pay some tax now, in a low-tax year, so more of later life is tax-free.
// v1 covers ONLY "convert X dollars this year". Real balances (the same taxBucketSplit Net
// worth's by-type view uses), the tax cost now (estimate, editable rate), the two later
// effects (smaller required withdrawals · bigger tax-free bucket), the will-it-last impact
// (honest when it barely moves), ending in the shared Use-this-plan sheet. Estimates, clearly
// labeled. The app never moves money — it records the intention and the numbers.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { maskedMoney } from '../components/useMoney';
import { taxBucketSplit, rmdAtAge, RMD_START_AGE } from '../domain/decumulation';
import { taxOwedFor } from '../domain/income/tax';
import { totalGrossAnnual, filingStatusOf, stateRateOf } from '../domain/income';
import { ageFromProfile } from '../utils/persona';
import { selectWillItLast } from '../domain/retirement/willItLast';
import { resolveNetWorthRows } from '../domain/snapshot';
import { UseThisPlanSheet, type PlanChange } from '../components/UseThisPlanSheet';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

export default function RothScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? null;
  const A = store.retirementAssumptions ?? {};
  const age = ageFromProfile(op);
  const nowYear = new Date().getFullYear();

  // the SAME resolved rows + bucket rule every other money surface uses (r36 agreement pin)
  const rows = resolveNetWorthRows(store.user?.uid ?? 'local', op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []);
  const split = taxBucketSplit(rows.accounts);
  const preTax = split.preTax;
  const rothNow = split.roth;

  const [amount, setAmount] = useState('');
  const amt = Math.min(num(amount), Math.round(preTax));

  // tax estimate (r37): the SAME income figure the Cash flow tab stands on — no second income number
  const gross = totalGrossAnnual(op);
  const estRate = useMemo(() => {
    if (amt <= 0) return null;
    const status = filingStatusOf(op), state = stateRateOf(op);
    const cost = taxOwedFor(gross + amt, status, state) - taxOwedFor(gross, status, state);
    return Math.max(0, Math.round((cost / amt) * 100) / 100);
  }, [gross, amt]);
  const [rateOverride, setRateOverride] = useState<string>('');
  const [rateOpen, setRateOpen] = useState(false);
  const rate = rateOverride !== '' ? Math.min(0.6, num(rateOverride) / 100) : (estRate ?? 0.22);
  const taxCost = Math.round(amt * rate);

  // later effects (r38): the ONE rmdAtAge path, pre-tax balance projected to 73 with the shared return
  const growTo73 = (bal: number) => {
    if (age == null || age >= RMD_START_AGE) return bal;
    const r = Math.max(0, Math.min(0.12, A.expectedReturn ?? 0.055));
    return bal * Math.pow(1 + r, RMD_START_AGE - age);
  };
  const rmdAgeUsed = Math.max(RMD_START_AGE, age ?? RMD_START_AGE);
  const rmdSmaller = Math.max(0, Math.round(rmdAtAge(growTo73(preTax), rmdAgeUsed) - rmdAtAge(growTo73(Math.max(0, preTax - amt)), rmdAgeUsed)));

  // will-it-last impact (r39): before = the hub's selector untouched; after = the tax cash leaves
  // the nest egg now (the conversion itself just moves money between buckets)
  const wilArgs = { op, accounts: rows.accounts, assumptions: A, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus };
  const before = selectWillItLast(wilArgs as any);
  const after = useMemo(() => {
    if (amt <= 0 || !before.captured) return null;
    let remaining = taxCost;
    const adjusted = rows.accounts.map((a: any) => {
      if (remaining <= 0 || !(a.balance > 0) || a.tax_bucket === 'PROPERTY') return a;
      const cut = Math.min(a.balance, remaining); remaining -= cut;
      return { ...a, balance: a.balance - cut };
    });
    return selectWillItLast({ ...wilArgs, accounts: adjusted } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amt, taxCost, before.captured, rows.accounts]);

  const adopted = Number(A.rothConversionThisYear) > 0;
  const [sheetOpen, setSheetOpen] = useState(false);
  const changes: PlanChange[] = [
    { label: `Convert to Roth this year (${nowYear})`, from: adopted ? maskedMoney(Number(A.rothConversionThisYear)) : 'nothing planned', to: maskedMoney(amt) },
    { label: 'Extra tax next April (estimate)', from: adopted ? `about ${maskedMoney(Number(A.rothConversionTax) || 0)}` : '—', to: `about ${maskedMoney(taxCost)}` },
    { label: 'To do, with your brokerage', from: '—', to: `convert before Dec 31, ${nowYear}` },
  ];

  // STATES (r41): no pre-tax accounts → three plain sentences and the road in; never a fake dial
  if (preTax <= 0) {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>Roth conversion</Text>
        <View style={s.card}>
          <Text style={s.line}>A Roth conversion moves money from a pre-tax retirement account (401(k), traditional IRA) into a Roth account. You pay income tax on the amount now. After that, it grows tax-free and skips the required withdrawals that start at {RMD_START_AGE}.</Text>
          <TouchableOpacity accessibilityRole="button" style={s.secondaryBtn} onPress={() => router.push('/(tabs)/analytics' as any)}
            accessibilityLabel="Add your retirement accounts on the Net worth tab">
            <Text style={s.secondaryTxt}>Add your retirement accounts ›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.h1}>Roth conversion</Text>
      <Text style={s.sub}>Pay some tax now, in a low-tax year, so more of later life is tax-free. Estimates — you decide.</Text>

      {adopted && (
        <View style={[s.card, s.adoptedCard]}>
          <Text style={s.adoptedTxt}>✓ In your plan: convert {maskedMoney(Number(A.rothConversionThisYear))} this year · tax about {maskedMoney(Number(A.rothConversionTax) || 0)} next April. Undo lives on the Plan hub.</Text>
        </View>
      )}

      {/* convert-this-year dial (r36) — capped at the REAL pre-tax balance */}
      <View style={s.card}>
        <Text style={s.kicker}>CONVERT THIS YEAR</Text>
        <TextInput style={s.amtInput} keyboardType="number-pad" placeholder="$0" placeholderTextColor={Colors.textTertiary}
          value={amount} onChangeText={setAmount} accessibilityLabel="Amount to convert this year" />
        <Text style={s.note}>from your pre-tax {maskedMoney(Math.round(preTax))}{num(amount) > preTax ? ' — capped at your balance' : ''}</Text>
        <View style={s.chipRow}>
          {[10000, 25000, 50000].filter((v) => v <= preTax).map((v) => (
            <TouchableOpacity accessibilityRole="button" key={v} style={s.chip} onPress={() => setAmount(String(v))}
              accessibilityLabel={`Set ${maskedMoney(v)}`}>
              <Text style={s.chipTxt}>{maskedMoney(v)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {amt > 0 && (
        <>
          {/* the tax bill now (r37) — estimate, rate visible and changeable */}
          <View style={s.card}>
            <Text style={s.kicker}>THE COST NOW</Text>
            <Text style={s.bigLine}>Tax bill next April: about {maskedMoney(taxCost)}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => setRateOpen(!rateOpen)}
              accessibilityLabel={`Tax rate used: ${Math.round(rate * 100)} percent, ${rateOverride !== '' ? 'set by you' : 'estimated from your income'}. Tap to change it.`}>
              <Text style={s.link}>Rate used: {Math.round(rate * 100)}% ({rateOverride !== '' ? 'set by you' : 'estimated from your income'}) · change it ›</Text>
            </TouchableOpacity>
            {rateOpen && (
              <TextInput style={s.rateInput} keyboardType="decimal-pad" placeholder={`${Math.round((estRate ?? 0.22) * 100)}`}
                placeholderTextColor={Colors.textTertiary} value={rateOverride} onChangeText={setRateOverride}
                accessibilityLabel="Tax rate percent" />
            )}
            <Text style={s.note}>Estimate — your tax preparer has the exact number.</Text>
          </View>

          {/* the two later effects (r38) */}
          <View style={s.card}>
            <Text style={s.kicker}>WHAT IT BUYS LATER</Text>
            <Text style={s.line}>Required withdrawals at {RMD_START_AGE}: about <Text style={s.strong}>{maskedMoney(rmdSmaller)} a year smaller</Text></Text>
            <Text style={s.line}>Tax-free bucket: {maskedMoney(Math.round(rothNow))} → <Text style={s.strong}>{maskedMoney(Math.round(rothNow + amt))}</Text></Text>
            <Text style={s.note}>From {RMD_START_AGE} the government requires yearly withdrawals from pre-tax accounts — converting shrinks that requirement.</Text>
          </View>

          {/* the will-it-last impact (r39) — honest when it barely moves */}
          {before.captured && before.chance != null && after?.chance != null && (
            <View style={s.card}>
              <Text style={s.kicker}>YOUR MONEY-LASTS ODDS</Text>
              <Text style={s.line}>
                {before.chance}% → {after.chance}%{Math.abs(after.chance - before.chance) < 2 ? ' — little change. This decision is about taxes, not the odds.' : ''}
              </Text>
            </View>
          )}

          <TouchableOpacity accessibilityRole="button" style={s.primaryBtn} onPress={() => setSheetOpen(true)}
            accessibilityLabel={`Use this plan: convert ${maskedMoney(amt)} this year`}>
            <Text style={s.primaryTxt}>Use this plan</Text>
          </TouchableOpacity>
          <Text style={s.note}>Nothing moves by itself — you'd do the conversion with your brokerage; this records the numbers.</Text>
        </>
      )}

      <UseThisPlanSheet
        visible={sheetOpen} onClose={() => setSheetOpen(false)}
        title={`Convert ${maskedMoney(amt)} to Roth this year`}
        changes={changes}
        patch={{ rothConversionThisYear: amt, rothConversionTax: taxCost } as any}
        adoptionLabel={`before the ${nowYear} Roth conversion`}
        onAdopted={() => setSheetOpen(false)}
      />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 20 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  adoptedCard: { backgroundColor: Colors.primaryLight },
  adoptedTxt: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark, lineHeight: 20 },
  kicker: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 6 },
  bigLine: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  line: { fontSize: 15, color: Colors.textPrimary, marginTop: 4, lineHeight: 21 },
  strong: { fontWeight: '800', color: Colors.textPrimary },
  note: { fontSize: 12, color: Colors.textTertiary, marginTop: 8, lineHeight: 17 },
  link: { fontSize: 13.5, fontWeight: '700', color: Colors.primaryDark, marginTop: 8 },
  amtInput: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  rateInput: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm, fontSize: 16, color: Colors.textPrimary, marginTop: 8, width: 120 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm },
  chip: { backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, paddingVertical: 8, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  chipTxt: { fontSize: 13.5, fontWeight: '700', color: Colors.primaryDark },
  secondaryBtn: { backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, paddingVertical: 12, alignItems: 'center', minHeight: 44, marginTop: Spacing.md },
  secondaryTxt: { fontSize: 13.5, fontWeight: '700', color: Colors.primaryDark },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryTxt: { color: Colors.white, fontSize: 16, fontWeight: '800' },
});
