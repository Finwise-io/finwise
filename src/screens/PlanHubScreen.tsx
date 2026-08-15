// Plan hub (FCC detailed design v1.1, Plan sheet) — the chief-of-staff desk: the ONE home of the
// will-it-last number, the big decisions waiting on you, and your saved what-ifs. Nothing here
// changes the plan by itself — every path ends at an explicit adoption step.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { resolveNetWorthRows } from '../domain/snapshot';
import { selectWillItLast } from '../domain/retirement/willItLast';
import { resolveLens } from '../domain/profile/lens';
import { RMD_START_AGE, withdrawalPlan } from '../domain/decumulation';
import { retirementIncomeMonthly } from '../domain/income';
import { k401Headroom } from '../domain/income/limits';
import { ageFromProfile } from '../utils/persona';
import { usePlanCompleteness } from './SharpenPlanScreen';
import { InfoDot } from '../components/UI';
import { maskedMoney, spokenMoney, maskDollars } from '../components/useMoney';
import { HiddenBalancesBanner } from '../components/HiddenBalancesBanner';
import { GaugeArc } from '../components/GaugeArc';
import { SectionBand } from '../components/SectionBand';
import { PlanOutcome } from '../components/PlanOutcome';
import { PlanInputs, type PlanDraft } from '../components/PlanInputs';
import { DesktopPlanSandbox } from '../../desktop/platform/DesktopPlanSandbox';
import { onCourseSentence, planDoor, nextDecision, shortfallAgeFromBand, oddsLine, sampleOddsLine, SS_DECISION_FROM, SS_DECISION_TO } from '../domain/planning/hub';
import { simulate } from '../domain/retirement';
import { useCashflowModel } from '../hooks/useCashflowModel';

/** How a withdrawal rate reads in words. Never "safe" — we do not know that, and saying it is a
 *  promise we cannot make (founder 2026-08-13). The 4% figure is a published guideline, which is a
 *  fact about the world rather than a claim about this person's money. */
const rateWords = (band: string | null | undefined) =>
  band === 'safe' ? 'within the ~4% guideline'
    : band === 'moderate' ? 'a bit above the 4% guideline — worth watching'
    : 'above 5% — a high chance of running short';

// saved-scenario dates read like the rest of the app — never raw ISO (audit PH-3)
const prettySavedDate = (v: any) => { const d = new Date(String(v ?? '')); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };

export default function PlanHubScreen() {
  const router = useRouter();
  // Home and Net worth deep-link here with the answer they were missing (founder ruling: one screen,
  // reached three ways — it used to be a separate /plan-answers route, which drifted)
  const { focus } = (useLocalSearchParams?.() ?? {}) as { focus?: string };
  const focusParam = typeof focus === 'string' ? focus : null;
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const uid = store.user?.uid ?? 'local';
  const A = store.retirementAssumptions ?? {};
  const plan = usePlanCompleteness();
  const lens = resolveLens(op, store.lensOverride);
  const age = ageFromProfile(op) ?? null;

  const { accounts } = resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []);
  const wil = useMemo(
    () => selectWillItLast({ op, accounts, assumptions: A, bigCosts: store.bigCosts, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus, withBand: true }),
    [op, accounts, A, store.inflationRate, store.employmentStatus],
  );
  // PIN: the hub's number is THE number — cache it so Home's strip and Insights read the same value.
  useEffect(() => { if (wil.chance != null) store.setLastRetireChance?.(wil.chance); }, [wil.chance]);

  // FACTS SAVE · CHOICES COMMIT (founder 2026-08-12). The committed plan is what the app believes;
  // the draft is what the person is trying on. The outcome above always reflects the DRAFT, so a
  // stepper moves the answer in front of them — and nothing is written until they say so.
  const committed: PlanDraft = useMemo(() => ({
    retireAge: Math.round(Number(A.retireAge ?? op.targetRetirementAge ?? (lens === 'retired' ? age ?? 65 : 65))),
    horizonAge: Math.round(Number(A.horizonAge ?? op.horizonAge ?? 90)),
    extraMonthly: Math.round(Number(A.contribMonthly ?? 0)),
  }), [A.retireAge, A.horizonAge, A.contribMonthly, op.targetRetirementAge, op.horizonAge, lens, age]);
  const [draft, setDraft] = useState<PlanDraft>(committed);
  useEffect(() => { setDraft(committed); }, [committed]);
  const trying = draft.retireAge !== committed.retireAge || draft.horizonAge !== committed.horizonAge || draft.extraMonthly !== committed.extraMonthly;
  // the odds the OUTCOME shows: the draft's, whenever one is in play
  const draftWil = useMemo(
    () => (trying
      ? selectWillItLast({ op, accounts, assumptions: { ...A, retireAge: draft.retireAge, horizonAge: draft.horizonAge, contribMonthly: draft.extraMonthly }, bigCosts: store.bigCosts, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus, withBand: true })
      : wil),
    [trying, draft, op, accounts, A, store.inflationRate, store.employmentStatus, wil],
  );
  const commitDraft = () => {
    Alert.alert('Use this as your plan?', `Retire at ${draft.retireAge}, plan to ${draft.horizonAge}${draft.extraMonthly ? `, saving ${money(draft.extraMonthly)}/mo more` : ''}.\n\nYour odds become ${draftWil.chance}%.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Use as my plan', onPress: () => store.setRetirementAssumptions?.({ retireAge: draft.retireAge, horizonAge: draft.horizonAge, contribMonthly: draft.extraMonthly }) },
    ]);
  };

  const scenarios = (store.retirementScenarios ?? []) as any[];
  const guaranteedMonthly = retirementIncomeMonthly(op);
  // what they earn decides whether the required saving is a real ask or an impossible one; the room
  // is what the app already knows can go somewhere tax-advantaged
  const annualIncomeForPlan = Math.round(Number(op.baseSalary ?? 0) * (op.salaryFreq === 'monthly' ? 12 : 1)) || undefined;
  // WIRED 2026-08-14 (audit D12). The bridge sentence has always been able to say how much of the
  // required saving fits somewhere tax-advantaged — the sentence was written, and the value feeding
  // it was hard-coded undefined, so nobody ever saw it. The number is not new: the same headroom
  // already drives Home's "Room left in your 401(k)" insight and the contribution-room screen.
  // It is an ESTIMATE, not a fact — see the wording note in PlanOutcome.
  const monthly401k = Math.round(Number(op.c_401k ?? 0));
  const roomAnnual = monthly401k > 0 && lens !== 'retired'
    ? k401Headroom(age, monthly401k * 12).remaining || undefined
    : undefined;
  const ssChip = A.ssClaimAge != null ? `your plan: claim at ${A.ssClaimAge}` : null;
  // FOUNDER 2026-08-12: "for someone already drawing social security, let's just remove this
  // question." Not a settled-state screen to land on — the row simply is not offered.
  const alreadyClaiming = Number(op.ri_ss ?? 0) > 0;
  // FOUNDER RULING 2026-08-14: "when should I claim?" is a decision between 60 and 70 — before 60 it
  // is not yet a decision, and after 70 the delayed credit has stopped, so there is nothing left to
  // choose. The rows had NO age gate at all, so a 58-year-old was offered it.
  const ssIsLive = !alreadyClaiming && age != null && age >= SS_DECISION_FROM && age <= SS_DECISION_TO;

  // ── mock v9 (founder-approved 2026-08-01): the if-clause, the door, the one next decision ──
  const planRetire = Math.round(Number(A.retireAge ?? op.targetRetirementAge ?? 67));
  const planSave = Number(A.contribMonthly ?? 0);
  const planSpend = Number(A.spendMonthly ?? op.monthlySpending ?? 0);
  // approved-words numbers (founder 2026-08-04): pot at retirement day + median left at plan-to age
  const simFull = useMemo(() => (wil.inputs ? simulate({ ...wil.inputs, with_band: true }) : null), [wil.inputs]);
  const onCourse = onCourseSentence({
    lens, chance: wil.chance, retireAge: planRetire, horizonAge: wil.horizonAge,
    potAtRetire: simFull?.projected_at_retirement ?? null,
    leftoverAtHorizon: simFull?.band?.length ? simFull.band[simFull.band.length - 1].p50 : null,
    shortfallAge: shortfallAgeFromBand(simFull?.band),
    money: maskedMoney,
  });
  const door = useMemo(() => planDoor(op, accounts), [op, accounts]);
  const preTaxIds = accounts.filter((a: any) => a.tax_bucket === 'PRE_TAX').map((a: any) => a.asset_id);
  const preTaxBal = accounts.filter((a: any) => a.tax_bucket === 'PRE_TAX').reduce((t: number, a: any) => t + (a.balance || 0), 0);
  const next = useMemo(() => nextDecision({
    lens, age, birthYear: Number(op.birthYear) || null, ssClaimAge: A.ssClaimAge != null ? Number(A.ssClaimAge) : null,
    preTaxBalance: preTaxBal, preTaxAccountIds: preTaxIds, transactions: store.transactions ?? [], moneyWord: maskedMoney,
    alreadyClaiming,
  }), [lens, age, op.birthYear, A.ssClaimAge, preTaxBal, store.transactions]);
  // retired: the honest spend-more delta — the SAME engine re-run with +$500/mo, never a guess
  const spendMore = useMemo(() => {
    if (lens !== 'retired' || wil.chance == null || !wil.inputs) return null;
    const bumped = simulate({ ...wil.inputs, retire_monthly_spend_today: (wil.inputs.retire_monthly_spend_today || 0) + 500 }).chance_of_success;
    return { chance: bumped, delta: bumped - wil.chance };
  }, [lens, wil.chance, wil.inputs]);
  // retired: the paycheck numbers — the ONE model Home's card uses (never re-derived)
  const { year: payYear } = useCashflowModel();
  const payMonth = payYear.thisMonth;
  const drawUsed = Math.max(0, planSpend - (payMonth?.guaranteedTotal ?? 0));
  const paycheckTotal = (payMonth?.guaranteedTotal ?? 0) + (payMonth?.safeDraw ?? 0);
  // SAMENESS (pre-48 audit): the rate comes from the CANONICAL withdrawalPlan helper, fed the SAME
  // inputs the odds above used — claim-age-adjusted guaranteed income and the same nest-egg base.
  // Never re-derive inline (that exact drift was the July-24 audit's top finding).
  const wplan = wil.inputs
    ? withdrawalPlan(wil.inputs.retire_monthly_spend_today || planSpend, wil.inputs.guaranteed_monthly_income || 0, wil.inputs.start_balance || 0)
    : null;

  const deleteScenario = (s: any) => {
    Alert.alert('Delete this scenario?', s.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => store.deleteRetirementScenario?.(s.id) },
    ]);
  };

  // F11: revert is always a confirmation showing exactly what switches back
  const planHistory = (store.planHistory ?? []) as any[];
  const confirmRevert = () => {
    const prev = planHistory[0];
    if (!prev) return;
    Alert.alert('Back to your previous plan?', `Restores the plan saved ${prev.date} (${prev.label}). Every number switches back exactly.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Switch back', onPress: () => store.revertPlan?.() },
    ]);
  };

  // ── section blocks — desktop places the SAME blocks in two columns; phone order unchanged ──
  const verdictBlock = (<>
      {/* THE VERDICT — mock v9, minus the word (founder 2026-08-12): the spectrum, the number, and
          the "if" clause that makes it theirs. The percentage IS the uncertainty; naming it too said
          the same thing twice. */}
      {wil.captured && wil.chance != null ? (
        <View style={styles.card}>
          {/* "YOUR RETIREMENT PLAN" used to sit here, directly above "WILL MY MONEY LAST?" — two
              headings saying nearly the same thing. The green bars disguised the repetition; once
              both became quiet labels it was plain. Dropped 2026-08-14: the tab itself will be
              named Retire, under Plan, so the card does not need to announce what tab it is on.
              The question underneath is the heading. */}
          {/* ONE score, then arithmetic — the second gauge was dropped once the engine proved it
              could read "80% of the way" beside 31% odds (founder 2026-08-12). */}
          <PlanOutcome
            inputs={draftWil.inputs ?? null}
            chance={draftWil.chance!}
            band={draftWil.band}
            horizonAge={draftWil.horizonAge}
            retireAge={draft.retireAge}
            annualIncome={annualIncomeForPlan}
            roomAnnual={roomAnnual}
            roomFromMonthly={monthly401k}
            lens={lens}
          />
          {trying && <Text style={styles.tryingTag}>Trying it out — your plan still says {wil.chance}%.</Text>}
          {/* the withdrawal rate USED to be tacked on to the retired line below, beside the money left
              over — a rate describing money going OUT, printed next to money staying in. It measures
              the draw (spending less guaranteed income), so it now sits with that draw on the paycheck
              card further down (founder 2026-08-13). */}
          {lens === 'retired' ? (
            <Text style={styles.ifLine}>
              Your {maskedMoney(planSpend)}/mo spending{onCourse ? ` — ${onCourse}` : ` — ${oddsLine(lens, wil.chance!, wil.horizonAge)}`}.
            </Text>
          ) : (
            // the outcome block and the inputs directly beneath it now say all of this, and say it
            // for the DRAFT — the old pair repeated the plan and claimed "you set it" of a spending
            // figure the app had derived (founder 2026-08-12).
            null
          )}
          {/* the inputs live HERE, on the tab (founder 2026-08-12) — not behind a link */}
          <PlanInputs draft={draft} committed={committed} onDraft={setDraft} onCommit={commitDraft}
            onOpenDoor={(r) => router.push(r as any)} />
          {/* a single line of text is a ~20pt target; fingers miss it, and this audience is the
              reason the 44pt rule exists at all (audit D13) */}
          <TouchableOpacity style={styles.cardLinkTap} accessibilityRole="button" onPress={() => router.push('/will-it-last')} accessibilityLabel="See what drives this number">
            <Text style={styles.cardLink}>What drives this? ›</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* FIRST DAY — the page previews itself: locked sample gauge + the DYNAMIC door */}
          <View style={styles.card}>
            <SectionBand inCard quiet title={lens === 'retired' ? 'IS MY MONEY LASTING?' : 'WILL MY MONEY LAST?'} />
            <View style={styles.gaugeRow} accessible
              accessibilityLabel={`Sample gauge: ${lens === 'retired' ? 'Holding, 88' : 'Likely, 84'} in 100 — a sample, not your number.`}>
              <GaugeArc locked />
              <Text style={styles.sampleTxt}>
                <Text style={{ fontWeight: '800', color: Colors.textPrimary }}>{sampleOddsLine(wil.horizonAge)}</Text>{'\n'}
                <Text style={{ color: Colors.textTertiary }}>A sample, not your number — {door.count < 3 ? `yours needs ${door.count} more answer${door.count === 1 ? '' : 's'}, below` : 'answer the three below and it becomes yours'}.</Text>
              </Text>
            </View>
            {/* the can't-compute box, in place of the odds — the design's "Missing Age" state */}
            <View style={styles.cantCompute} accessible
              accessibilityLabel={`Your odds can't be worked out yet. Add ${door.missing.join(' and ')} in the facts below.`}>
              <Text style={styles.cantComputeTxt}>
                Your odds — can't work them out yet. Add {door.missing.map((m) => m === 'what you spend' && lens === 'retired' ? 'what you spend each month' : m).join(' and ')} below.
              </Text>
            </View>
            {door.credit && (
              <Text style={styles.doorCredit}>✓ What you have — already in: {door.credit.accounts} {accounts.some((a: any) => a.source === 'connected') ? 'connected ' : ''}account{door.credit.accounts === 1 ? '' : 's'}, {maskedMoney(Math.round(door.credit.total))} counted</Text>
            )}
            {/* THE SAME inputs as the complete state — one component, so the two can never drift.
                This is what folding /plan-answers into the tab means (founder 2026-08-12). */}
            <PlanInputs draft={draft} committed={committed} onDraft={setDraft} onCommit={commitDraft}
              missing={door.missing} focus={focusParam} onOpenDoor={(r) => router.push(r as any)} />
          </View>
          <View style={[styles.nextCard, { opacity: 0.5 }]} accessible
            accessibilityLabel="Sample of the next-decision card — real ones are dated from your numbers, never invented.">
            <Text style={styles.nextKicker}>{lens === 'retired' ? 'SAMPLE — DEADLINES LAND HERE' : 'SAMPLE — YOUR NEXT DECISION LANDS HERE'}</Text>
            <Text style={styles.nextTitle}>{lens === 'retired' ? 'Required withdrawal: due Dec 31' : 'Your Social Security claim window opens at 62'}</Text>
            <Text style={styles.nextSub}>{lens === 'retired' ? "Watched and dated from your real accounts, once they're in. Never invented before then." : 'Dated and in your dollars, once your numbers are in. Never invented before then.'}</Text>
          </View>
        </>
      )}
  </>);
  // THE DATED DECISION IS NO LONGER A CARD OF ITS OWN (founder ruling, 2026-08-14).
  // It used to sit above the decisions list in an amber card, while the list below deliberately
  // omitted whatever the card was showing — so one decision occupied two positions on one screen and
  // the list quietly changed shape depending on what was due. The founder's finding on Ray's hero
  // settled the principle: ONE DECISION, ONE PLACE. The dated obligation is now simply the FIRST row
  // of the list, wearing its deadline, which is also what the ordering rule already asked for
  // (anything with a real date goes first, because it expires).
  const paycheckBlock = (<>
      {/* RETIRED: the paycheck — the SAME engine as Home's card, one set of numbers */}
      {lens === 'retired' && wil.captured && wil.chance != null && payMonth && (
        <>
          <SectionBand quiet title="WHERE YOUR INCOME COMES FROM — YOUR RETIREMENT PAYCHECK" />
          <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={() => router.push('/monthly-income')}
            accessibilityLabel={`Your retirement paycheck: guaranteed ${spokenMoney(Math.round(payMonth.guaranteedTotal))}, draw from savings ${spokenMoney(Math.round(payMonth.safeDraw))}, total ${spokenMoney(Math.round(paycheckTotal))} a month. Opens your income.`}>
            {/* `source` is the engine's field — Home's PaycheckCard, MonthDetail and PaycheckMonths all
                read it. This screen read `.label`, which does not exist, so every row rendered its
                amount with no name beside it (audit D5, 2026-08-12). */}
            {(payMonth.guaranteed ?? []).map((g: any, i: number) => (
              <View key={i} style={styles.payRow}><Text style={styles.payL}>{g.source}</Text><Text style={styles.payV}>{maskedMoney(Math.round(g.amount))}</Text></View>
            ))}
            <View style={styles.payRow}><Text style={[styles.payL, styles.payStrong]}>= Guaranteed</Text><Text style={[styles.payV, styles.payStrong]}>{maskedMoney(Math.round(payMonth.guaranteedTotal))}</Text></View>
            <View style={styles.payRow}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={styles.payL}>+ Draw from savings</Text><InfoDot term="safeDraw" /></View><Text style={styles.payV}>{maskedMoney(Math.round(payMonth.safeDraw))}</Text></View>
            <View style={[styles.payRow, styles.payTotal]}><Text style={[styles.payL, styles.payStrong]}>Your paycheck</Text><Text style={[styles.payV, styles.payStrong]}>{maskedMoney(Math.round(paycheckTotal))}/mo</Text></View>
            {/* THE RATE BELONGS TO THE DRAW, not to what is left over (founder 2026-08-13). It is
                (spending − guaranteed income) ÷ savings, so it is printed beside the very figure it
                divides. NOTE: the two "safe" words on this line are replaced with the founder's own
                approved wording because the line is being rewritten anyway — re-typing a banned word
                into new code is not defensible. The remaining occurrences across the app still await
                the sweep he approved. */}
            {planSpend > 0 && (paycheckTotal >= planSpend ? (
              <Text style={styles.payOk}>
                ✓ covers your {maskedMoney(planSpend)}/mo spending. You're drawing {maskedMoney(Math.round(drawUsed))} a month
                {wplan?.withdrawalRate != null ? ` — ${(wplan.withdrawalRate * 100).toFixed(1)}% of your savings a year, ${rateWords(wplan.rateBand)}` : ''}. You could draw up to {maskedMoney(Math.round(payMonth.safeDraw))}.
              </Text>
            ) : (
              <Text style={styles.payWarn}>
                your {maskedMoney(planSpend)}/mo spending runs {maskedMoney(Math.round(planSpend - paycheckTotal))} above this paycheck — worth a look below
                {wplan?.withdrawalRate != null ? `. You'd be drawing ${(wplan.withdrawalRate * 100).toFixed(1)}% of your savings a year — ${rateWords(wplan.rateBand)}` : ''}
              </Text>
            ))}
            <Text style={styles.payNote}>The same paycheck as Home's card — one engine, one set of numbers.</Text>
          </TouchableOpacity>
        </>
      )}
  </>);
  const decisionsBlock = (withDoor: boolean) => (<>
      {/* DECISIONS — every row a complete question, ranked by what's on the mind (mock v9) */}
      {wil.captured && wil.chance != null ? (
        <>
          <SectionBand quiet title="DECISIONS YOU CAN MAKE TODAY" />
          <View style={styles.card}>
            {lens === 'retired' ? (
              <>
                {next && (
                  <DecisionRow due={next.kicker.replace(/^NEXT DECISION · /, '')} title={next.title} sub={next.sub}
                    onPress={() => router.push(next.route as any)} />
                )}
                <DecisionRow divider={!!next} title="Can I spend more?"
                  sub={spendMore ? maskDollars(`an extra $500/mo would take you to ${spendMore.chance}% (${spendMore.delta >= 0 ? '+' : '−'}${Math.abs(spendMore.delta)} points) — see the trade before deciding`) : 'see what spending a bit more does to your odds first'}
                  onPress={() => router.push('/retirement')} />
                <DecisionRow divider title="Which account do I draw from first?" sub="the order matters — taxes differ by account" onPress={() => router.push('/(tabs)/cashflow')} />
                {ssIsLive && (
                  <DecisionRow divider title="When should I claim Social Security?"
                    sub={A.ssClaimAge != null ? `claimed at ${A.ssClaimAge} ✓ — settled, shown so you know it's handled` : 'set the age your plan counts on — in your dollars'}
                    onPress={() => router.push('/ss-timing')} />
                )}
                {next?.kind !== 'rmd' && age != null && age >= RMD_START_AGE && (
                  <DecisionRow divider title="Have I taken my required withdrawal?" sub={`✓ on track for ${new Date().getFullYear()} — the details live one tap away`} onPress={() => router.push('/required-withdrawals')} />
                )}
                <DecisionRow divider title="Is a Roth move worth it?"
                  sub={Number(A?.rothConversionThisYear) > 0
                    ? `✓ to do with your brokerage: convert ${maskedMoney(Number(A.rothConversionThisYear))} before Dec 31, ${new Date().getFullYear()}`
                    : 'conversions in low-tax years · and what passes on to family'}
                  onPress={() => router.push('/roth')} />
              </>
            ) : (
              <>
                {next && (
                  <DecisionRow due={next.kicker.replace(/^NEXT DECISION · /, '')} title={next.title} sub={next.sub}
                    onPress={() => router.push(next.route as any)} />
                )}
                {/* "When can I retire?" moved into section 1 — it is the retire-at stepper wearing a
                    question mark, and three copies of one question is how it got confusing. */}
                <DecisionRow divider={!!next} title="Can I afford it?" sub="college help · the mortgage · keep saving — together, not one at a time" onPress={() => router.push('/multi-goal')} />
                {ssIsLive && (
                  <DecisionRow divider title="When should I claim Social Security?" sub={ssChip ?? 'set the age your plan counts on — 62 vs 67 vs 70 in your dollars'} onPress={() => router.push('/ss-timing')} />
                )}
                {next?.kind !== 'rmd' && age != null && age >= RMD_START_AGE && (
                  <DecisionRow divider title="Have I taken my required withdrawal?" sub={`✓ on track for ${new Date().getFullYear()}`} onPress={() => router.push('/required-withdrawals')} />
                )}
                <DecisionRow divider title="Is a Roth move worth it?"
                  sub={Number(A?.rothConversionThisYear) > 0
                    ? `✓ to do with your brokerage: convert ${maskedMoney(Number(A.rothConversionThisYear))} before Dec 31, ${new Date().getFullYear()}`
                    : `the window before required withdrawals begin at ${RMD_START_AGE}`}
                  onPress={() => router.push('/roth')} />
              </>
            )}
          </View>
          {/* the sandbox door is GONE (founder 2026-08-12): the steppers in section 1 ARE the sandbox,
              sitting under the number they move. Four places to try a change became one. */}
        </>
      ) : (
        <>
          <SectionBand quiet title={lens === 'retired' ? 'START WHERE IT PAYS MOST' : 'DECISIONS YOU CAN MAKE TODAY'} />
          <View style={styles.card}>
            {lens === 'retired' ? (
              <>
                <DecisionRow title="Your income" sub="add Social Security and your pension — two minutes, and your paycheck view lights up" onPress={() => router.push('/monthly-income')} />
                {ssIsLive && <DecisionRow divider title="When should I claim Social Security?" sub="set the age your plan counts on — 62 vs 67 vs 70 in your dollars" onPress={() => router.push('/ss-timing')} />}
                <View style={styles.lockRow} accessible accessibilityLabel="Can I spend more? Locked — unlocks with your answers above.">
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>Can I spend more? 🔒</Text>
                    <Text style={styles.rowSub}>unlocks with your 3 answers above</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.lockRow} accessible accessibilityLabel="When can I retire? Locked — your biggest question unlocks with the answers above.">
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>When can I retire? 🔒</Text>
                    <Text style={styles.rowSub}>your biggest question — it unlocks with the answers above</Text>
                  </View>
                </View>
                <DecisionRow divider title="Can I afford it?" sub="add a goal — college, the mortgage, helping parents — and see the trade" onPress={() => router.push('/multi-goal')} />
                {ssIsLive && <DecisionRow divider title="When should I claim Social Security?" sub="62 vs 67 vs 70 in your dollars — set the age your plan counts on. Worked example until your statement number goes in." onPress={() => router.push('/ss-timing')} />}
              </>
            )}
          </View>
        </>
      )}
  </>);
  const scenariosBlock = (<>
      {/* SAVED SCENARIOS */}
      {scenarios.length > 0 && (
        <>
          <SectionBand title={`SAVED SCENARIOS (${scenarios.length})`} />
          <View style={styles.card}>
            {scenarios.map((s, i) => (
              <View key={s.id} style={[styles.scRow, i > 0 && styles.divider]}>
                <TouchableOpacity accessibilityRole="button" style={{ flex: 1 }} onPress={() => router.push('/retirement')}
                  accessibilityLabel={`Saved scenario ${s.name}, ${s.chance != null ? `${s.chance} percent when saved` : ''}`}>
                  <Text style={styles.rowTitle}>{s.name}</Text>
                  <Text style={styles.rowSub}>{s.chance != null ? `${s.chance}% when saved` : 'open to re-run'} · {prettySavedDate(s.createdAt)}</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" onPress={() => deleteScenario(s)} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  accessibilityLabel={`Delete scenario ${s.name}`}>
                  <Text style={styles.deleteTxt}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}
  </>);
  const revertBlock = (<>
      {/* Back to previous plan (appears only after an adoption) */}
      {planHistory.length > 0 && (
        <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={confirmRevert}
          accessibilityLabel={`Back to previous plan, saved ${planHistory[0].date}`}>
          <Text style={styles.rowTitle}>Back to previous plan ({planHistory[0].date})</Text>
          <Text style={styles.rowSub}>One tap shows exactly what would switch back — nothing changes without a confirmation.</Text>
        </TouchableOpacity>
      )}
  </>);
  const meterBlock = (<>
      {/* Sharpen your plan meter */}
      <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={() => router.push('/sharpen')}
        accessibilityLabel={`Sharpen your plan, ${plan.doneCount} of ${plan.total} done`}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.rowTitle, { flex: 1 }]}>Sharpen your plan</Text>
          <Text style={styles.meterTxt}>{plan.doneCount} of {plan.total} answered ›</Text>
        </View>
        <View style={styles.meterBar}><View style={[styles.meterFill, { width: `${plan.pct}%` }]} /></View>
      </TouchableOpacity>
  </>);
  const footBlock = (<>
      {wil.captured && wil.chance != null
        ? <Text style={styles.tinyFoot}>Estimates from ~400 market simulations of your own numbers — not advice.</Text>
        : <Text style={styles.tinyFoot}>No percent is shown until it's yours — we never fake a number.</Text>}
  </>);

  // DESKTOP (approved shell mock, 2026-08-03): verdict + next + decisions LEFT (1.15) |
  // inline sandbox + scenarios + revert + meter RIGHT (0.85). Same blocks, zero forked math.
  if (Platform.OS === 'web') {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HiddenBalancesBanner />
        <Text style={styles.h1}>Plan</Text>
        <Text style={styles.tagline}>We lay it out. You decide.</Text>
        <View style={styles.deskCols} testID="plan-desktop-columns">
          <View style={styles.deskLeft} testID="plan-desktop-left">
            {verdictBlock}{paycheckBlock}{decisionsBlock(false)}
          </View>
          <View style={styles.deskRight} testID="plan-desktop-right">
            {wil.captured && wil.chance != null && wil.inputs && (
              <DesktopPlanSandbox lens={lens} inputs={wil.inputs} planChance={wil.chance} />
            )}
            {scenariosBlock}{revertBlock}{meterBlock}
          </View>
        </View>
        {footBlock}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HiddenBalancesBanner />
      <Text style={styles.h1}>Plan</Text>
      <Text style={styles.tagline}>We lay it out. You decide.</Text>
      {verdictBlock}
      {paycheckBlock}
      {decisionsBlock(true)}
      {scenariosBlock}
      {revertBlock}
      {meterBlock}
      {footBlock}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// `due` turns a row into the dated one: it wears its deadline instead of a separate card sitting
// above the list. Founder ruling 2026-08-14 — one decision, one place on the screen.
function DecisionRow({ title, sub, onPress, divider, due }: { title: string; sub: string; onPress: () => void; divider?: boolean; due?: string }) {
  return (
    <TouchableOpacity style={[styles.decRow, divider && styles.divider]} activeOpacity={0.7} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={due ? `${title}, ${due} — ${sub}` : `${title} — ${sub}`}>
      <View style={{ flex: 1 }}>
        {due ? <Text style={styles.rowDue}>{due}</Text> : null}
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // desktop two-column (approved shell mock: 1.15fr / .85fr, 16 gap)
  deskCols: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  deskLeft: { flex: 1.15, minWidth: 0 },
  deskRight: { flex: 0.85, minWidth: 0 },
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },   // never outweigh the verdict hero (audit PH-2)
  tagline: { fontSize: 15, color: Colors.textSecondary, marginBottom: Spacing.md },
  section: { fontSize: 13, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: Spacing.xs },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardKicker: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.6 },
  chanceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  cantCompute: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.borderStrong, marginHorizontal: Spacing.md, marginTop: Spacing.sm, padding: Spacing.md },
  cantComputeTxt: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  tryingTag: { fontSize: 11, color: Colors.textSecondary, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  chanceWord: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary },
  chancePct: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary },
  bandTxt: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  bandTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.bgSecondary, marginTop: 8, overflow: 'hidden' },
  bandFill: { position: 'absolute', top: 0, bottom: 0, backgroundColor: Colors.primaryLight },
  bandMark: { position: 'absolute', top: 0, bottom: 0, width: 3, borderRadius: 1.5, backgroundColor: Colors.primary },
  inviteTxt: { fontSize: 15, color: Colors.textSecondary, lineHeight: 20, marginTop: 6 },
  cardLink: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  cardLinkTap: { minHeight: 44, justifyContent: 'center', marginTop: 4 },
  decRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  rowDue: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: Colors.amber, marginBottom: 2 },
  rowSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  arrow: { fontSize: 20, color: Colors.textTertiary, marginLeft: 8 },
  scRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  deleteTxt: { fontSize: 15, color: Colors.textTertiary, paddingHorizontal: 8 },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 2 },
  ifLine: { fontSize: 15, color: Colors.textPrimary, lineHeight: 20, marginTop: 6 },
  sampleTxt: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  doorBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 13, alignItems: 'center', marginTop: 10, minHeight: 44 },
  doorBtnTxt: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  doorSub: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', marginTop: 7 },
  doorCredit: { fontSize: 13, color: Colors.primaryDark, fontWeight: '700', textAlign: 'center', marginTop: 5 },
  nextCard: { backgroundColor: Colors.amberLight, borderWidth: 1.5, borderColor: Colors.amberMid, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  nextKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: Colors.amber, marginBottom: 3 },
  nextTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, lineHeight: 20 },
  nextSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  nextCta: { fontSize: 13, fontWeight: '800', color: Colors.amber, marginTop: 7 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  payL: { fontSize: 15, color: Colors.textSecondary },
  payV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  payStrong: { fontWeight: '800', color: Colors.textPrimary },
  payTotal: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 3, paddingTop: 9 },
  payOk: { fontSize: 13, color: Colors.primaryDark, fontWeight: '600', marginTop: 7 },
  payWarn: { fontSize: 13, color: Colors.amber, fontWeight: '600', marginTop: 7 },
  payNote: { fontSize: 11, color: Colors.textTertiary, marginTop: 5 },
  sandbox: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.borderStrong, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  sandT: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  sandS: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  lockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, minHeight: 44, opacity: 0.75 },
  tinyFoot: { fontSize: 11, color: Colors.textTertiary, marginTop: 2, marginBottom: 4, lineHeight: 15 },
  meterTxt: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  meterBar: { height: 6, borderRadius: 3, backgroundColor: Colors.bgSecondary, marginTop: 8, overflow: 'hidden' },
  meterFill: { height: 6, borderRadius: 3, backgroundColor: Colors.primary },
});
