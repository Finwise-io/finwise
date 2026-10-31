// Roth conversion — simple scenario (FCC detailed design v1.1, Plan r34-r41): one dial, one
// honest trade — pay some tax now, in a low-tax year, so more of later life is tax-free.
// v1 covers ONLY "convert X dollars this year". Real balances (the same taxBucketSplit Net
// worth's by-type view uses), the tax cost now (estimate, editable rate), the two later
// effects (smaller required withdrawals · bigger tax-free bucket), the will-it-last impact
// (honest when it barely moves), ending in the shared Use-this-plan sheet. Estimates, clearly
// labeled. The app never moves money — it records the intention and the numbers.
import { MoneyBox } from '../components/MoneyBox';   // every money box, one component (DEC-8385)
import { CountedTaxableLines } from '../components/CountedTaxableLines';   // (DEC-4105, 2026-10-10)
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SectionBand } from '../components/SectionBand';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { maskedMoney, spokenMoney } from '../components/useMoney';
import { taxBucketSplit, rmdStartAgeFor } from '../domain/decumulation';
import { rothConversionLater, accountsAfterRothConversion } from '../domain/planning/rothConversion';   // what it buys, and the accounts after it (2026-10-27)
import { rothConversionCost } from '../domain/planning';
import { filingStatusOf, stateRateOf } from '../domain/income';
import { taxedAfterPreTax } from '../domain/income/tax-rate';   // what the year is taxed on, the 401(k)s out (B05, 2026-10-24)
import { useIncomeProfile } from '../hooks/useIncomeProfile';   // the one profile income and tax figures read (2026-10-26)
import { paycheckReturn, growthUsed } from '../domain/paycheck';   // the Plan's one return when none is set (2026-10-25, FIX-ROOM)
import { figWords, saidSentence } from '../components/figure';   // the return prints under its number, MK-CF-M-082 (2026-10-26)
// THE ROTH FIGURES ARE PRINTED HERE, AND THE GUARD COUNTS THEM (2026-10-31, PF-TOOLS; the lead's ruling the same day, as for the draw
// sheet on 2026-10-26): a figure is declared through the orchestrator that hands it, and no orchestrator hands these — this screen
// asks the functions itself, and the Plan doors wait on his Q-PL-5 (workplan row 121). So MK-PL-M-008, 022 to 024, 026 and 038 to 044
// stay reserved on the metric register, the money printed here is on guard_figures_declared's ratchet at its true count, and
// src/domain/planning/roth_worked_examples_2026_10_31.test.ts keeps the worked examples that prove the numbers.
import { ageFromProfile } from '../utils/persona';
import { selectWillItLast } from '../domain/retirement/willItLast';
import { resolveNetWorthRows } from '../domain/snapshot';
import { UseThisPlanSheet, type PlanChange } from '../components/UseThisPlanSheet';
import { TRYING_IT_OUT, EmptyNote } from '../components/UI';

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

  // tax estimate (r37): the SAME income figure the Cash flow tab stands on — no second income number. Since 2026-10-26 (CLEANUP-LEFT)
  // that is what it says: the Income summary's "what the year is taxed on" (taxedAfterPreTax, MK-CF-M-041) on the profile every tax
  // figure reads (useIncomeProfile — the accounts' interest and dividends in it, typed or not). It read totalGrossAnnual(op): the
  // interest left out, each earner's 401(k) and the untaxed income left in, so the conversion was stacked on too much income
  const incomeOp = useIncomeProfile(op);
  const gross = taxedAfterPreTax(incomeOp);
  const estRate = useMemo(() => {
    if (amt <= 0) return null;
    const status = filingStatusOf(op), state = stateRateOf(op);
    const cost = rothConversionCost(gross, amt, status, state);   // walk row 6: the ONE helper
    // THE RATE AT FULL PRECISION (2026-10-26, CLEANUP-LEFT; his Q49): it was rounded to a whole percent here, so $20,000 converted
    // read about $3,800 where the brackets give $3,750 (18.75%). It is rounded only when printed, to two decimals
    return Math.max(0, cost / amt);
  }, [gross, amt]);
  const [rateOverride, setRateOverride] = useState<string>('');
  const [rateOpen, setRateOpen] = useState(false);
  const rate = rateOverride !== '' ? Math.min(0.6, num(rateOverride) / 100) : (estRate ?? 0.22);
  // the tax is held exact and saved exact (DEC-0403); it was rounded to the dollar here until 2026-10-20 — every place
  // that prints it rounds it on the way out
  const taxCost = amt * rate;

  // later effects (r38): the ONE rmdAtAge path, pre-tax balance projected to the start age with the Plan's one return, stated
  // (2026-10-26, CLEANUP-LEFT; the lead's ruling 2 of 2026-10-25, as the draw sheet and the paycheck do): it was a flat 5.5% whenever
  // no return was set, and unstated — paycheckReturn gives a return set on the Plan, else the blended benchmark of the retirement
  // accounts, else the typical 6%
  const ret = paycheckReturn(rows.accounts, A, op);
  const growth = growthUsed(ret);   // never below 0%, and the words say so when the floor is used (2026-10-26, round 2 item 5)
  // WHAT IT BUYS, ROW BY ROW (2026-10-27, FX-PLAN; his words that day: "What it buys section does not make any sense. Design properly
  // and make it clear"; drawing plan/moneykeel_pres_mock_roth-conversion_v02.html): the pre-tax and Roth money before and after, the
  // first required withdrawal before and after and the difference, each from the one rmdAtAge path — asked of the domain, worked there
  const later = rothConversionLater({ preTax, roth: rothNow, amount: amt, age, growthRate: growth.rate, nowYear });
  const { grows, years: yearsToRmd, rmdAge: rmdAgeUsed, rmdYear, divisor } = later;

  // will-it-last impact (r39): before = the hub's selector untouched; after = the conversion as it happens. THE CONVERSION ITSELF IS
  // COUNTED (2026-10-27, FX-PLAN; roth-conversion_v02 row 4): the amount leaves the pre-tax accounts and lands in the Roth, and the
  // tax leaves the first accounts with money in them. Until today only the tax left, so the odds missed that more of the money then
  // comes out tax-free — 35.9% where the conversion gives 36.2% for the drawing's household
  const wilArgs = { op, accounts: rows.accounts, assumptions: A, bigCosts: store.bigCosts, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus, transactions: store.transactions ?? [] };
  const before = selectWillItLast(wilArgs as any);
  const after = useMemo(() => {
    if (amt <= 0 || !before.captured) return null;
    return selectWillItLast({ ...wilArgs, accounts: accountsAfterRothConversion(rows.accounts, amt, taxCost) } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amt, taxCost, before.captured, rows.accounts]);

  const retiresLater = before.inputs != null && before.inputs.retire_age > before.inputs.current_age;   // a nest egg "at retirement" only before it
  const adopted = Number(A.rothConversionThisYear) > 0;
  const [sheetOpen, setSheetOpen] = useState(false);
  const changes: PlanChange[] = [
    { label: `Convert to Roth this year (${nowYear})`, from: adopted ? maskedMoney(Number(A.rothConversionThisYear)) : 'nothing planned', to: maskedMoney(amt) },
    { label: 'Extra tax next April (calculated)', from: adopted ? `about ${maskedMoney(Number(A.rothConversionTax) || 0)}` : '—', to: `about ${maskedMoney(taxCost)}` },
    { label: 'To do, with your brokerage', from: '—', to: `convert before Dec 31, ${nowYear}` },
  ];

  // STATES (r41): no pre-tax accounts → three plain sentences and the road in; never a fake dial
  if (preTax <= 0) {
    return (
      <ScrollView automaticallyAdjustKeyboardInsets style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>Roth conversion</Text>
        <View style={s.card}>
          <Text style={s.line}>A Roth conversion moves money from a pre-tax retirement account (401(k), traditional IRA) into a Roth account. You pay income tax on the amount now. After that, it grows tax-free and skips the required withdrawals that start at {rmdStartAgeFor(age)}.</Text>
          <TouchableOpacity accessibilityRole="button" style={s.secondaryBtn} onPress={() => router.push('/(tabs)/analytics' as any)}
            accessibilityLabel="Add your retirement accounts on the Net worth tab">
            <Text style={s.secondaryTxt}>Add your retirement accounts ›</Text>
          </TouchableOpacity>
          {/* an account with no tax type is counted taxable, not pre-tax, and named (DEC-4105, 2026-10-10) */}
          <CountedTaxableLines accounts={rows.accounts} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView automaticallyAdjustKeyboardInsets style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.h1}>Roth conversion</Text>
      <Text style={s.sub}>Pay some tax now, in a low-tax year, so more of later life is tax-free. Estimates — you decide.</Text>
      {/* walk row 15a: the SAME trying-it-out sentence every scenario surface wears */}
      {!adopted && <Text style={s.tryBanner}>{TRYING_IT_OUT}</Text>}

      {/* walk row 15b: save the try-out like every other decision screen */}
      {amt > 0 && !adopted && (
        <TouchableOpacity accessibilityRole="button" style={s.saveScenarioLink}
          accessibilityLabel={`Save this scenario: convert ${spokenMoney(amt)}`}
          onPress={() => { store.saveRetirementScenario?.(`Roth: convert ${maskedMoney(amt)}`, { rothConversionThisYear: amt, rothConversionTax: taxCost, rothConversionYear: nowYear } as any, Number(A.retireAge) || 0, after?.chance ?? before.chance ?? 0); }}>
          <Text style={s.saveScenarioTxt}>Save this scenario — compare it later on the Plan hub ›</Text>
        </TouchableOpacity>
      )}

      {adopted && (
        <View style={[s.card, s.adoptedCard]}>
          <Text style={s.adoptedTxt}>✓ In your plan: convert {maskedMoney(Number(A.rothConversionThisYear))} this year · tax about {maskedMoney(Number(A.rothConversionTax) || 0)} next April. Undo lives on the Plan hub.</Text>
        </View>
      )}

      {/* convert-this-year dial (r36) — capped at the REAL pre-tax balance */}
      <View style={s.card}>
        <SectionBand inCard inset={20} title="CONVERT THIS YEAR" />
        <MoneyBox bare style={s.amtInput} placeholder="$0"
          value={amount} onChangeText={setAmount} a11y="Amount to convert this year" />
        <Text style={s.note}>from your pre-tax {maskedMoney(Math.round(preTax))}{num(amount) > preTax ? ' — capped at your balance' : ''}</Text>
        {/* an account with no tax type is counted taxable, not in this pre-tax figure, and named (DEC-4105, 2026-10-10) */}
        <CountedTaxableLines accounts={rows.accounts} />
        {preTax === 0 && <EmptyNote door="accounts" />}   {/* Q48 (MK-PL-M-024): no pre-tax account entered */}
        <View style={s.chipRow}>
          {[10000, 25000, 50000].filter((v) => v <= preTax).map((v) => (
            <TouchableOpacity accessibilityRole="button" key={v} style={s.chip} onPress={() => setAmount(String(v))}
              accessibilityLabel={`Set ${spokenMoney(v)}`}>
              <Text style={s.chipTxt}>{maskedMoney(v)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {amt > 0 && (
        <>
          {/* the tax bill now (r37) — estimate, rate visible and changeable */}
          <View style={s.card}>
            <SectionBand inCard inset={20} title="THE COST NOW" />
            <Text style={s.bigLine}>Tax bill next April: about {maskedMoney(taxCost)}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => setRateOpen(!rateOpen)}
              accessibilityLabel={`Tax rate used: ${(rate * 100).toFixed(2)} percent, ${rateOverride !== '' ? 'you entered' : 'calculated from your income'}. Tap to change it.`}>
              <Text style={s.link}>Rate used: {(rate * 100).toFixed(2)}% ({rateOverride !== '' ? 'you entered' : 'calculated from your income'}) · change it ›</Text>
            </TouchableOpacity>
            {rateOpen && (
              <TextInput style={s.rateInput} keyboardType="decimal-pad" placeholder={`${((estRate ?? 0.22) * 100).toFixed(2)}`}
                placeholderTextColor={Colors.textTertiary} value={rateOverride} onChangeText={setRateOverride}
                accessibilityLabel="Tax rate percent" />
            )}
            <Text style={s.note}>Estimate — your tax preparer has the exact number.</Text>
          </View>

          {/* the two later effects (r38) */}
          <View style={s.card}>
            <SectionBand inCard inset={20} title="WHAT IT BUYS LATER" />
            <Text style={s.line}>Converting moves {maskedMoney(amt)} out of the money the law makes you take out from {rmdStartAgeFor(age)}, into money that comes out tax-free.</Text>
            <View style={s.lrow}><Text style={s.lk}>Pre-tax (IRA, 401(k))</Text><Text style={s.lv}>{maskedMoney(preTax)} → {maskedMoney(later.preTaxAfter)}</Text></View>
            <View style={s.lrow}><Text style={s.lk}>Tax-free (Roth)</Text><Text style={s.lv}>{maskedMoney(rothNow)} → {maskedMoney(later.rothAfter)}</Text></View>
            <View style={s.lrow}><Text style={s.lk}>{grows ? `First required withdrawal, ${rmdYear} (age ${rmdAgeUsed})` : `This year’s required withdrawal (age ${rmdAgeUsed})`}</Text>
              <Text style={s.lv}>~{maskedMoney(later.rmdBefore)} → ~{maskedMoney(later.rmdAfter)}</Text></View>
            <View style={s.lrow}><Text style={s.lk}>Smaller each year by</Text><Text style={[s.lv, s.strong]}>about {maskedMoney(later.smaller)}</Text></View>
            {/* how the difference is worked, with the growth said — as the draw sheet says its own (2026-10-26); MK-CF-M-082 */}
            {grows
              ? <Text style={s.note}>How: the {maskedMoney(amt)} would grow at {figWords('MK-CF-M-082', growth.said)} — for {yearsToRmd} years, to {maskedMoney(later.grown)}. ÷ {divisor.toFixed(1)}, the IRS factor at {rmdAgeUsed} = {maskedMoney(later.smaller)}/year less you must take out, and less income to pay tax on then.</Text>
              : <Text style={s.note}>How: {maskedMoney(amt)} ÷ {divisor.toFixed(1)}, the IRS factor at {rmdAgeUsed} = {maskedMoney(later.smaller)}/year less you must take out, and less income to pay tax on.</Text>}
            <Text style={s.note}>Roth money is never required out, and comes out tax-free.</Text>
          </View>

          {/* the will-it-last impact (r39) — honest when it barely moves */}
          {before.captured && before.chance != null && after?.chance != null && (
            <View style={s.card}>
              <SectionBand inCard inset={20} title="WILL MY MONEY LAST?" />
              {/* HIS SHAPE (2026-10-27: "Current odds of your money "xxx" lasting till target age of yy is 35.3%. Moving … to Roth will
                  increase nest egg to and increase odds to 35.9%. This decision is about taxes, not the odds."), filled from the two runs:
                  today's nest egg the odds run on, the plan-to age, the middle future at retirement before and after, and the odds */}
              <Text style={s.line}>Today, the odds that your {before.inputs?.start_balance != null ? maskedMoney(before.inputs.start_balance) : 'nest egg'} lasts to age {before.horizonAge} are {before.chance}%.</Text>
              {/* ONE NEST EGG (2026-10-30): the cockpit's own figure, MK-PL-F-055 projectNestEgg on the same inputs, before and after */}
              <Text style={s.line}>Converting {maskedMoney(amt)} this year changes {retiresLater && after.nestEggAtRetirement != null && before.nestEggAtRetirement != null
                ? `your nest egg at ${before.inputs?.retire_age} to about ${maskedMoney(after.nestEggAtRetirement)} (from ${maskedMoney(before.nestEggAtRetirement)}) and `
                : ''}the odds to {after.chance}%.</Text>
              {Math.abs(after.chance - before.chance) < 2 && <Text style={[s.line, s.strong]}>This decision is about taxes, not the odds.</Text>}
              <Text style={s.note}>How: {retiresLater ? `the nest egg at ${before.inputs?.retire_age} is the Retirement cockpit’s — today’s money grown at the plan’s return, with what you add each year; converted, it starts ${maskedMoney(taxCost)} smaller. ` : ''}The odds count 1,000 simulated futures, run twice — as you are, and with {maskedMoney(amt)} moved from pre-tax to Roth and the {maskedMoney(taxCost)} tax paid from your cash: more of the money then comes out tax-free.</Text>
            </View>
          )}

          <TouchableOpacity accessibilityRole="button" style={s.primaryBtn} onPress={() => setSheetOpen(true)}
            accessibilityLabel={`Use as my plan: convert ${spokenMoney(amt)} this year`}>
            <Text style={s.primaryTxt}>Use as my plan</Text>
          </TouchableOpacity>
          <Text style={s.note}>Nothing moves by itself — you’d do the conversion with your brokerage; this records the numbers.</Text>
        </>
      )}

      <UseThisPlanSheet
        visible={sheetOpen} onClose={() => setSheetOpen(false)}
        title={`Convert ${maskedMoney(amt)} to Roth this year`}
        changes={changes}
        patch={{ rothConversionThisYear: amt, rothConversionTax: taxCost, rothConversionYear: nowYear } as any}   // the year it is for: its tax is due the April after (2026-10-25, FIX-MONTH; IRS Pub 590-A)
        adoptionLabel={`before the ${nowYear} Roth conversion`}
        onAdopted={() => setSheetOpen(false)}
      />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  saveScenarioLink: { minHeight: 44, justifyContent: 'center', marginBottom: Spacing.sm },
  saveScenarioTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  tryBanner: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark, backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: 10, marginBottom: Spacing.sm, overflow: 'hidden' },
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 15, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 20 },
  // EACH BOX RUNS END TO END ACROSS THE SCREEN, square corners, so its dark bar does too (his words, 2026-10-27: "dark green bar should be
  // end to end across the screen"; roth-conversion_v02 row 1): the page's margins taken back, the Cash flow pattern of 2026-10-25
  card: { backgroundColor: Colors.cardBg, padding: Spacing.lg, marginBottom: Spacing.md, marginHorizontal: -Spacing.lg },
  lrow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: Colors.bgTertiary },
  lk: { flex: 1, fontSize: 15, color: Colors.textSecondary },
  lv: { fontSize: 15, color: Colors.textPrimary, fontVariant: ['tabular-nums'], textAlign: 'right' },
  adoptedCard: { backgroundColor: Colors.primaryLight },
  adoptedTxt: { fontSize: 15, fontWeight: '700', color: Colors.primaryDark, lineHeight: 20 },
  kicker: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 6 },
  bigLine: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  line: { fontSize: 15, color: Colors.textPrimary, marginTop: 4, lineHeight: 21 },
  strong: { fontWeight: '800', color: Colors.textPrimary },
  note: { fontSize: 13, color: Colors.textTertiary, marginTop: 8, lineHeight: 17 },
  link: { fontSize: 15, fontWeight: '700', color: Colors.primaryDark, marginTop: 4, paddingVertical: 12, minHeight: 44, textAlignVertical: 'center' },
  amtInput: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  rateInput: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm, fontSize: 17, color: Colors.textPrimary, marginTop: 8, width: 120 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm },
  chip: { backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  chipTxt: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  secondaryBtn: { backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, paddingVertical: 12, alignItems: 'center', minHeight: 44, marginTop: Spacing.md },
  secondaryTxt: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryTxt: { color: Colors.white, fontSize: 17, fontWeight: '800' },
});

