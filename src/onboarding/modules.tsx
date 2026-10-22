import { plural } from '../domain/_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, Share } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Card } from '../components/UI';
import { Colors, Spacing, Radii } from '../utils/theme';
import { Status, Track, StepId, incomeSourceOptionsFor } from './steps';
import Mascot from './Mascot';
import { useRouter } from 'expo-router';
import { effectiveRateOnGrossFor, marginalBracketFor, filingStatusOf, stateRateOf, over65CountOf, TAX_YEAR, grossSalaryMonthly, annualizedEnteredSalary, rsuAnnual, equityRowValue, equityCashFlow, rentalNetAnnual, incomeMonthlyGrid, totalGrossAnnual, taxableAnnual, extraIncome, salaryAnnual, salaryActiveMonths, benefitAnnual } from '../domain/income';
import { loanPayment } from '../domain/debt';
import { currentAge as domainCurrentAge, ageToday } from '../domain/profile/calc';
import { colFactor } from '../domain/retirement/col';
import { capitalNeeded } from '../domain/retirement';
import { createInvite, resendVerification, refreshEmailVerified } from '../services/firebase';
import { useStore } from '../store/useStore';
import { savingsByMonth, spendBuckets, annualCashflow } from '../domain/budget';
// ONE take-home in the whole app. This screen used to calculate it for itself — tax on the full
// gross, then the 401(k) off afterwards — while every other screen read the income grid, where
// the 401(k) comes off BEFORE tax as a traditional contribution does. $160/month apart on the
// employedPartner persona. Same defect as B05, fixed in the grid and never reaching this copy.
import { takeHomeMonthly as domainTakeHomeMonthly } from '../domain/savings';
import { annual401kLimit, IRS_LIMITS, ageAttainedInYear } from '../domain/income/limits';
import { formatMoney, currencySymbol } from '../domain/_shared/money';

export type StepCtx = {
  status: Status | null;
  tracks: Track[];
  answers: Record<string, any>;
  setAnswer: (key: string, value: any) => void;
};

export const num = (v: any): number => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
};
import { money } from '../domain/_shared/num';
export { money };
// compact form for tight spots like chart bar labels — always in thousands with a "K":
// $0.9K, $2.1K, $12K, -$1K (currency-aware symbol)
export const moneyShort = (n: number) => {
  const k = n / 1000, s = k < 0 ? '-' : '', a = Math.abs(k);
  return `${s}${currencySymbol()}${a >= 10 ? a.toFixed(0) : a.toFixed(1)}K`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Format a stored "YYYY-MM" as "Mon YYYY" for display.
function fmtMonthYear(v?: string): string {
  const m = String(v ?? '').match(/(\d{4})-(\d{1,2})/);
  return m ? `${MONTHS[Math.min(11, Math.max(0, +m[2] - 1))]} ${m[1]}` : '';
}

// ── reusable inputs ─────────────────────────────────────────────────────────
// Onboarding progress (0-1), set by OnboardingScreen each render so Centi (in Header) can warm up.
let _onbProgress = 1;
export function setOnboardingProgress(p: number) { _onbProgress = Math.max(0, Math.min(1, p)); }
export function onbProgress() { return _onbProgress; }
function Header({ emoji, title, sub }: { emoji: string; title: string; sub?: string }) {
  return (
    <View style={s.head}>
      <Mascot accessory={emoji} size={88} progress={_onbProgress} />
      <Text style={s.title}>{title}</Text>
      {!!sub && <Text style={s.sub}>{sub}</Text>}
    </View>
  );
}

function MoneyRow({ ctx, k, label, ph }: { ctx: StepCtx; k: string; label?: string; ph?: string }) {
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <TextInput style={s.input} keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary}
        placeholder={ph ?? `${currencySymbol()}0`} value={ctx.answers[k] ?? ''} onChangeText={(t) => ctx.setAnswer(k, t)} />
    </View>
  );
}

// Cadence-aware money row: an amount + a Monthly / Quarterly / Annual selector (stored in `<k>_freq`).
// Different retirement-income & dividend sources pay on different schedules.
export const CAD_DIV: Record<string, number> = { monthly: 1, quarterly: 3, annual: 12 };  // → divide to get per-month
const CAD_OPTS = [{ v: 'monthly', l: 'Monthly' }, { v: 'quarterly', l: 'Quarterly' }, { v: 'annual', l: 'Annual' }];
function MoneyCadenceRow({ ctx, k, label }: { ctx: StepCtx; k: string; label: string }) {
  const freq = ctx.answers[k + '_freq'] ?? 'monthly';
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
        value={ctx.answers[k] ?? ''} onChangeText={(t) => ctx.setAnswer(k, t)} />
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        {CAD_OPTS.map((o) => {
          const on = freq === o.v;
          return <TouchableOpacity key={o.v} style={[s.chip, on && s.chipOn]} onPress={() => ctx.setAnswer(k + '_freq', o.v)}>
            <Text style={[s.chipTxt, on && s.chipTxtOn]}>{o.l}</Text></TouchableOpacity>;
        })}
      </View>
    </View>
  );
}

// RMD start age (SECURE 2.0): born 1951–1959 → 73; born 1960+ → 75 (earlier cohorts already at/after 73).
import { rmdStartAge } from '../../Calculation Module code/engines/rmd';
export { rmdStartAge };

// IRS Uniform Lifetime Table (2022+) — distribution-period factors by age. RMD = balance ÷ factor.
const UNIFORM_LIFETIME: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5,
  83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8,
  93: 10.1, 94: 9.5, 95: 8.9,
};
/** Rough annual RMD on a pre-tax balance at a given age (0 below 73). */
export function estimateAnnualRMD(balance: number, age: number): number {
  const f = UNIFORM_LIFETIME[Math.max(73, Math.min(95, age))];
  return f && balance > 0 ? balance / f : 0;
}

// Hero amount — the screen's ONE primary number, large and centered (the design standard).
function HeroAmount({ ctx, k, label, ph, kind = 'money' }: {
  ctx: StepCtx; k: string; label?: string; ph?: string; kind?: 'money' | 'number';
}) {
  return (
    <>
      {!!label && <Text style={s.heroLabel}>{label}</Text>}
      <TextInput style={s.heroInput} keyboardType={kind === 'number' ? 'number-pad' : 'decimal-pad'}
        placeholder={ph ?? (kind === 'number' ? '0' : `${currencySymbol()}0`)} placeholderTextColor={Colors.textTertiary}
        value={ctx.answers[k] ?? ''} onChangeText={(t) => ctx.setAnswer(k, t)} />
    </>
  );
}

// Green insight callout — the screen's "smart" takeaway. ✨ for good news, ⚠️ for a warning.
function Callout({ text, sub, warn }: { text: string; sub?: string; warn?: boolean }) {
  return (
    <View style={[s.callout, warn && s.calloutWarn]}>
      <Text style={s.calloutIcon}>{warn ? '⚠️' : '✨'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.calloutTxt, warn && s.calloutTxtWarn]}>{text}</Text>
        {!!sub && <Text style={[s.calloutSub, warn && s.calloutTxtWarn]}>{sub}</Text>}
      </View>
    </View>
  );
}

// Tap-to-pick month + year, stored as "YYYY-MM". Styled to sit inside the schedule grid.
function MonthYearCell({ value, onChange, style }: { value?: string; onChange: (v: string) => void; style?: any }) {
  const [open, setOpen] = React.useState(false);
  const now = new Date();
  const m = String(value ?? '').match(/(\d{4})-(\d{1,2})/);
  const selYear = m ? +m[1] : now.getFullYear();
  const selMonth = m ? +m[2] : now.getMonth() + 1;
  const years = Array.from({ length: 13 }, (_, i) => now.getFullYear() - 2 + i);
  const set = (y: number, mo: number) => onChange(`${y}-${String(mo).padStart(2, '0')}`);
  return (
    <>
      <TouchableOpacity style={style} onPress={() => setOpen(true)}>
        <Text numberOfLines={1} style={{ fontSize: 15, color: value ? Colors.textPrimary : Colors.textTertiary }}>
          {value ? fmtMonthYear(value) : 'Pick date'}
        </Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={s.cap}>Vesting month</Text>
            <View style={s.monthGrid}>
              {MONTHS.map((mm, idx) => {
                const on = idx + 1 === selMonth;
                return (
                  <TouchableOpacity key={mm} style={[s.monthChip, on && s.monthChipOn]} onPress={() => set(selYear, idx + 1)}>
                    <Text style={[s.monthTxt, on && s.monthTxtOn]}>{mm}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[s.cap, { marginTop: Spacing.sm }]}>Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
              {years.map((y) => {
                const on = y === selYear;
                return (
                  <TouchableOpacity key={y} style={[s.yearChip, on && s.monthChipOn]} onPress={() => set(y, selMonth)}>
                    <Text style={[s.monthTxt, on && s.monthTxtOn]}>{y}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[s.addBtn, { marginTop: Spacing.md }]} onPress={() => setOpen(false)}>
              <Text style={s.addBtnT}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function NumRow({ ctx, k, label, ph, decimal }: { ctx: StepCtx; k: string; label?: string; ph?: string; decimal?: boolean }) {
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <TextInput style={s.input} keyboardType={decimal ? 'decimal-pad' : 'number-pad'} placeholderTextColor={Colors.textTertiary}
        placeholder={ph ?? ''} value={ctx.answers[k] ?? ''} onChangeText={(t) => ctx.setAnswer(k, t)} />
    </View>
  );
}

function TextRow({ ctx, k, label, ph }: { ctx: StepCtx; k: string; label?: string; ph?: string }) {
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <TextInput style={s.input} placeholderTextColor={Colors.textTertiary}
        placeholder={ph ?? ''} value={ctx.answers[k] ?? ''} onChangeText={(t) => ctx.setAnswer(k, t)} />
    </View>
  );
}

// Amount input with an inline unit toggle (enter a number, pick the unit at the end).
function AmountUnitRow({ ctx, k, modeK, label, units, ph }: {
  ctx: StepCtx; k: string; modeK: string; label?: string;
  units?: { value: string; label: string }[]; ph?: string;
}) {
  const opts = units ?? [{ value: 'pct', label: '%' }, { value: 'dollar', label: currencySymbol() }];
  const mode = ctx.answers[modeK] ?? opts[0].value;
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput style={[s.input, { flex: 1 }]} keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary}
          placeholder={ph ?? (mode === 'pct' ? '50' : `${currencySymbol()}0`)} value={ctx.answers[k] ?? ''} onChangeText={(t) => ctx.setAnswer(k, t)} />
        {opts.map((o) => {
          const on = mode === o.value;
          return (
            <TouchableOpacity key={o.value} onPress={() => ctx.setAnswer(modeK, o.value)} style={[s.unitBtn, on && s.unitBtnOn]}>
              <Text numberOfLines={1} style={[s.unitTxt, on && s.unitTxtOn]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Compact pill selector — for short single-word choices (fits one or two rows).
function Chips({ ctx, k, options }: { ctx: StepCtx; k: string; options: { value: string; label: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm }}>
      {options.map((o) => {
        const on = ctx.answers[k] === o.value;
        return (
          <TouchableOpacity key={o.value} onPress={() => ctx.setAnswer(k, o.value)} style={[s.chip, on && s.chipOn]}>
            <Text numberOfLines={1} style={[s.chipTxt, on && s.chipTxtOn]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Equal-width segmented control — always one line, for short option sets.
function Segmented({ ctx, k, options, defaultValue }: {
  ctx: StepCtx; k: string; options: { value: string; label: string }[]; defaultValue?: string;
}) {
  const sel = ctx.answers[k] ?? defaultValue;
  return (
    <View style={s.segRow}>
      {options.map((o) => {
        const on = sel === o.value;
        return (
          <TouchableOpacity key={o.value} style={[s.seg, on && s.segOn]} onPress={() => ctx.setAnswer(k, o.value)}>
            <Text numberOfLines={1} style={[s.segTxt, on && s.segTxtOn]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Choice({ ctx, k, options }: { ctx: StepCtx; k: string; options: { value: string; title: string; sub?: string }[] }) {
  return (
    <>
      {options.map(o => {
        const on = ctx.answers[k] === o.value;
        return (
          <TouchableOpacity key={o.value} style={[s.choice, on && s.choiceOn]} onPress={() => ctx.setAnswer(k, o.value)}>
            <View style={{ flex: 1 }}>
              <Text style={[s.choiceTitle, on && s.choiceTitleOn]}>{o.title}</Text>
              {!!o.sub && <Text style={s.choiceSub}>{o.sub}</Text>}
            </View>
            <View style={[s.radio, on && s.radioOn]} />
          </TouchableOpacity>
        );
      })}
    </>
  );
}

// Multi-select version of Choice — stores an array; pick any combination.
function MultiChoice({ ctx, k, options }: { ctx: StepCtx; k: string; options: { value: string; title: string; sub?: string }[] }) {
  const sel: string[] = Array.isArray(ctx.answers[k]) ? ctx.answers[k] : (ctx.answers[k] ? [ctx.answers[k]] : []);
  const toggle = (v: string) => ctx.setAnswer(k, sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v]);
  return (
    <>
      {options.map((o) => {
        const on = sel.includes(o.value);
        return (
          <TouchableOpacity key={o.value} style={[s.choice, on && s.choiceOn]} onPress={() => toggle(o.value)}>
            <View style={{ flex: 1 }}>
              <Text style={[s.choiceTitle, on && s.choiceTitleOn]}>{o.title}</Text>
              {!!o.sub && <Text style={s.choiceSub}>{o.sub}</Text>}
            </View>
            <View style={[s.checkBox, on && s.checkBoxOn]}>{on ? <Text style={s.checkMark}>✓</Text> : null}</View>
          </TouchableOpacity>
        );
      })}
    </>
  );
}

function Stepper({ ctx, k }: { ctx: StepCtx; k: string }) {
  const v = parseInt(ctx.answers[k] ?? '0') || 0;
  return (
    <View style={s.stepper}>
      <TouchableOpacity style={s.stepBtn} onPress={() => ctx.setAnswer(k, String(Math.max(0, v - 1)))}><Text style={s.stepBtnT}>−</Text></TouchableOpacity>
      <Text style={s.stepVal}>{v}</Text>
      <TouchableOpacity style={s.stepBtn} onPress={() => ctx.setAnswer(k, String(v + 1))}><Text style={s.stepBtnT}>+</Text></TouchableOpacity>
    </View>
  );
}

function RecapStat({ label, value, color, plain }: { label: string; value: string; color?: string; plain?: boolean }) {
  return (
    <View style={s.recapRow}>
      <Text style={s.recapLabel}>{label}</Text>
      <Text style={[s.recapVal, plain && s.recapValPlain, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

// A highlighted total row — neutral for subtotals (Gross), green for the headline (Available).
function RecapBox({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'green' }) {
  const green = tone === 'green';
  return (
    <View style={[s.recapBox, green ? s.recapBoxGreen : s.recapBoxNeutral]}>
      <Text style={[s.recapBoxLabel, green && { color: Colors.primaryDark }]}>{label}</Text>
      <Text style={[s.recapBoxVal, green && { color: Colors.primaryDark }]}>{value}</Text>
    </View>
  );
}

// Simple two-tone bar for recaps (no chart lib yet).
function Bar({ aPct, color }: { aPct: number; color: string }) {
  return (
    <View style={s.barTrack}><View style={[s.barFill, { width: `${Math.max(2, Math.min(100, aPct))}%`, backgroundColor: color }]} /></View>
  );
}

// ── recap math ──────────────────────────────────────────────────────────────
// Total annual income across EVERY source (salary, bonus, RSUs, signing, rental, self-employment,
// investment, benefits, support, scholarships, other). Includes non-taxable income.
export function grossAnnual(a: Record<string, any>): number {
  return totalGrossAnnual(a);
}
// Effective tax rate in use: the user's own (manual) rate, else the IRS-schedule estimate on TAXABLE income.
export function incomeTaxRate(a: Record<string, any>): number {
  return a.taxMode === 'manual' ? num(a.manualTaxRate) / 100
    : effectiveRateOnGrossFor(taxableAnnual(a), filingStatusOf(a as any), stateRateOf(a as any), over65CountOf(a as any));
}
export function monthlyIncome(a: Record<string, any>): number {
  const total = totalGrossAnnual(a);
  if (total <= 0) return 0;
  return (total - taxableAnnual(a) * incomeTaxRate(a)) / 12;   // net of tax only (NOT take-home — see below)
}

/** THE canonical take-home: what actually hits your bank = net of tax AND of your 401(k) (which comes
 *  out of your paycheck). Every screen that says "Take-home" must read this — the income recap and the
 *  budget used to disagree by exactly the 401(k). `monthlyIncome` (net-of-tax) is for %-of-income
 *  math only, never displayed as "take-home". */
export { domainTakeHomeMonthly as takeHomeMonthly };
export function retirementMonthlyIncome(a: Record<string, any>): number {
  // each source carries its own cadence (ri_<k>_freq) → normalize to per-month
  return ['ss', 'pension', 'withdrawals', 'rmd', 'annuities', 'other']
    .reduce((t, k) => t + num(a['ri_' + k]) / (CAD_DIV[a['ri_' + k + '_freq']] ?? 1), 0);
}
import { employerMatchMonthly, rentEntryMonthly } from '../domain/income/onboarding';
import { hasMonthlySalaryTable, salaryCalendarYear, salaryYearFromCells, salaryMonths } from '../domain/income/salary-months';
import { FilingStatusQuestions } from '../screens/FilingStatusScreen';
import { incomeFromAccounts } from '../domain/income/from-accounts';
import { assetClassOf } from '../domain/assets';
import BasePayScreen from '../screens/BasePayScreen';
export { employerMatchMonthly };
export function monthlyContributions(a: Record<string, any>): number {
  return ['c_401k', 'c_roth', 'c_invest', 'c_property'].reduce((t, k) => t + num(a[k]), 0) + employerMatchMonthly(a);
}
/** The person's age, or a stand-in when we were never told their birth year. NOT the same question
 *  as domain ageOrDefault(birthYear, birthMonth), which knows the month and answers null when it
 *  cannot say — so it does not share its name. */
export function ageOrDefault(a: Record<string, any>, fallback = 35): number {
  return ageToday(num(a.birthYear) || null, num(a.birthMonth) || null) ?? fallback;   // G9: no stand-in June — the year-attained age when the month is missing
}
export function fv(principal: number, monthly: number, years: number, rate = 0.07): number {
  const m = years * 12, r = rate / 12;
  return principal * Math.pow(1 + r, m) + monthly * ((Math.pow(1 + r, m) - 1) / r);
}

// Debt payoff snapshot from the debts answers — shared by the debts screen + its recap.
export function debtPayoff(a: Record<string, any>): { bal: number; pay: number; rate: number; months: number; interestOnly: boolean } {
  const bal = num(a.debtBalance), pay = num(a.debtPayment), rate = num(a.debtRate) / 100;
  const mRate = rate / 12, interestOnly = pay > 0 && pay <= bal * mRate;
  let months = 0;
  if (bal > 0 && pay > 0 && !interestOnly) {
    months = mRate > 0 ? Math.ceil(Math.log(pay / (pay - bal * mRate)) / Math.log(1 + mRate)) : Math.ceil(bal / pay);
  }
  return { bal, pay, rate, months, interestOnly };
}

// ── must-have validation ────────────────────────────────────────────────────
const REQUIRED: Partial<Record<StepId, (a: Record<string, any>) => boolean>> = {
  income_sources: a => Array.isArray(a.incomeSources) && a.incomeSources.length > 0,
  income_salary: a => num(a.baseSalary) > 0 || Object.values(salaryMonths(a as any)).some((x) => x > 0),
  income_self: a => num(a.seAmount) > 0,
  income_investment: a => num(a.invAnnual) > 0,
  income_benefits: a => num(a.benefitMonthly) > 0,
  income_support: a => num(a.supportMonthly) > 0,
  income_scholarship: a => Array.isArray(a.scholarships) ? a.scholarships.some((x: any) => num(x?.amount) > 0) : num(a.scholarshipAmount) > 0,
  income_loans: a => Array.isArray(a.loans) && a.loans.some((x: any) => num(x?.amount) > 0),
  income_other: a => num(a.otherAmount) > 0,
  // Pre-answered from what they already said (and filingStatusOf falls back the same way), so
  // Continue confirms rather than requires. Never blank, whatever they do.
  filing_status: a => a.filingStatus == null || ['single', 'married', 'mfs', 'hoh'].includes(String(a.filingStatus)),
  income_tax: a => a.taxMode !== 'manual' || num(a.manualTaxRate) > 0,
  monthlySpending: a => num(a.monthlySpending) > 0,
  // a real calendar date — month 13 or year 12 would silently wreck the age math downstream
  birth: a => {
    const m = num(a.birthMonth), y = num(a.birthYear), nowY = new Date().getFullYear();
    return m >= 1 && m <= 12 && y >= nowY - 120 && y <= nowY;
  },
  currentRetirementSavings: a => (a.currentRetirementSavings != null && a.currentRetirementSavings !== '') || (a.currentRetirementSavingsRoth != null && a.currentRetirementSavingsRoth !== ''),
  // zero extra contributions is a legitimate answer — never blocks
  contributionsByType: a => true,
  // must be ahead of the user's current age (when we know it) and humanly plausible
  targetRetirementAge: a => num(a.targetRetirementAge) > 0 && num(a.targetRetirementAge) < 100
    && (!num(a.birthYear) ? true : num(a.targetRetirementAge) > ageOrDefault(a)),
  expectedRetirementSpending: a => num(a.expectedRetirementSpending) > 0,
  currentSavingsPortfolio: a => a.currentSavingsPortfolio != null && a.currentSavingsPortfolio !== '',
  retirementIncomeSources: a => retirementMonthlyIncome(a) > 0,
  horizonAge: a => num(a.horizonAge) > 0,
  investObjective: a => Array.isArray(a.investObjective) ? a.investObjective.length > 0 : !!a.investObjective,
  trackingLevel: a => Array.isArray(a.trackingLevel) ? a.trackingLevel.length > 0 : !!a.trackingLevel,
  investmentHoldings: a => num(a.investmentHoldings) > 0,
  goals_detail: a => Array.isArray(a.goals) && a.goals.length > 0,
  monthlySavingsCapacity: a => num(a.monthlySavingsCapacity) > 0,
  hasPartner: a => !!a.hasPartner,
  // an untouched stepper means 0 dependents — a valid answer, don't force a tap
  dependentsCount: a => true,
  debts: a => num(a.debtBalance) > 0,
  legacyTarget: a => num(a.legacyTarget) > 0,
};
export function stepValid(step: StepId, ctx: StepCtx): boolean {
  const fn = REQUIRED[step];
  return fn ? fn(ctx.answers) : true; // optional & recap steps always pass
}

// ── render each field / recap step ──────────────────────────────────────────
export function renderStep(step: StepId, ctx: StepCtx): React.ReactNode {
  const a = ctx.answers;
  const retired = ctx.status === 'retired';
  const household = ctx.tracks.includes('partner') || ctx.tracks.includes('family');

  switch (step) {
    // ── income: pick your sources, then one focused screen per source ──
    case 'income_sources': {
      const picked: string[] = Array.isArray(a.incomeSources) ? a.incomeSources : [];
      const toggle = (v: string) => ctx.setAnswer('incomeSources', picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v]);
      return (<>
        <Header emoji="💰" title="Where does your money come from?" sub="Pick everything that applies. We'll only ask about what you choose." />
        {incomeSourceOptionsFor(ctx.status).map((o) => {
          const on = picked.includes(o.value);
          return (
            <TouchableOpacity key={o.value} style={[s.srcCard, on && s.srcCardOn]} onPress={() => toggle(o.value)} activeOpacity={0.8}>
              <Text style={s.srcIcon}>{o.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.srcTitle, on && s.srcTitleOn]}>{o.title}</Text>
                <Text style={s.srcSub}>{o.sub}</Text>
              </View>
              <View style={[s.srcCheck, on && s.srcCheckOn]}>{on && <Text style={s.srcCheckMark}>✓</Text>}</View>
            </TouchableOpacity>
          );
        })}
      </>);
    }

    case 'income_self': {
      const freq = a.seFreq ?? 'monthly';
      return (<>
        <Header emoji="🧰" title="Self-employment income" sub="Freelance, consulting, a side business, or gig work." />
        <Card>
          <Text style={s.label}>How often?</Text>
          <Segmented ctx={ctx} k="seFreq" defaultValue="monthly" options={[{ value: 'monthly', label: 'Per month' }, { value: 'annual', label: 'Per year' }]} />
          <Text style={s.heroLabel}>About how much ({freq === 'annual' ? 'per year' : 'per month'})</Text>
          <TextInput style={s.heroInput} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
            value={a.seAmount ?? ''} onChangeText={(t) => ctx.setAnswer('seAmount', t)} />
          <Text style={s.hint}>Enter the surplus after business costs, before income tax. A rough number is fine.</Text>
        </Card>
      </>);
    }

    case 'income_investment': {
      const freq = a.invFreq ?? 'annual';
      const MULT: Record<string, number> = { monthly: 12, quarterly: 4, annual: 1 };   // → annualize
      const setAmt = (t: string) => { ctx.setAnswer('invAmount', t); ctx.setAnswer('invAnnual', String(num(t) * MULT[freq])); };
      const setFreq = (f: string) => { ctx.setAnswer('invFreq', f); ctx.setAnswer('invAnnual', String(num(a.invAmount ?? a.invAnnual) * MULT[f])); };
      const annual = num(a.invAnnual);
      // NEVER ASK FOR WHAT CAN BE WORKED OUT (approved mock income-v5, 3c). The app holds the
      // accounts, so it shows what they pay and lets the person correct it. Asking cold invites a
      // second, different answer to one question with nothing to reconcile them.
      const st: any = useStore.getState();
      const worked = incomeFromAccounts(st.assetAccounts ?? [], st.transactions ?? []);
      return (<>
        <Header emoji="💵" title="Interest & dividends" sub="Money your savings and investments pay you." />
        {worked.lines.length > 0 && (
          <Card>
            <Text style={s.label}>From your accounts</Text>
            {worked.lines.map((l) => (
              <View key={l.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.workedRow}>{l.label}</Text>
                  <Text style={s.hint}>{l.why}</Text>
                </View>
                <Text style={s.workedRow}>{money(l.annual)}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={s.workedTot}>= We work out</Text>
              <Text style={s.workedTot}>{money(worked.annual)}/year</Text>
            </View>
            {!!worked.missing && <Text style={s.hint}>{worked.missing}</Text>}
            {Math.round(worked.annual) !== Math.round(annual) && worked.annual > 0 && (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Use ${money(worked.annual)}`}
                onPress={() => { ctx.setAnswer('invAmount', String(Math.round(worked.annual)));
                                 ctx.setAnswer('invFreq', 'annual');
                                 ctx.setAnswer('invAnnual', String(Math.round(worked.annual))); }}>
                <Text style={s.addAnother}>Use {money(worked.annual)} ›</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}
        <Card>
          <Text style={s.heroLabel}>{worked.lines.length > 0 ? 'Change it if that is not right' : 'How much'}</Text>
          <TextInput style={s.heroInput} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
            value={a.invAmount ?? a.invAnnual ?? ''} onChangeText={setAmt} />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, justifyContent: 'center' }}>
            {CAD_OPTS.map((o) => { const on = freq === o.v; return (
              <TouchableOpacity key={o.v} style={[s.chip, on && s.chipOn]} onPress={() => setFreq(o.v)}><Text style={[s.chipTxt, on && s.chipTxtOn]}>{o.l}</Text></TouchableOpacity>); })}
          </View>
          <Text style={s.hint}>Interest from savings plus dividends from stocks or funds — pick how often you receive it (monthly bond funds, quarterly stock dividends, annual distributions).</Text>
        </Card>
        {annual > 0 && (
          <>
            {/* TAXED, AND NOT SPENDABLE (finding B34, approved mock income-v5 frame 3c). In most
                accounts these are reinvested where they are earned and never reach the bank — so
                counting them as money to spend made every surplus too generous by the whole
                dividend. They are still taxed, so the tax still comes out of the pay that does
                reach the bank. Reinvested is the default: silence is not "paid to my bank". */}
            <Card>
              <Text style={s.label}>Does this reach your bank?</Text>
              <Choice ctx={ctx} k="invPaidToBank" options={[
                { value: 'no',  title: 'No — it is reinvested', sub: 'It stays where it is earned. Taxed, but not money you can spend.' },
                { value: 'yes', title: 'Yes — it is paid out',  sub: 'It is paid into your bank and you can spend it.' }]} />
            </Card>
            <Callout
              text={`About ${money(annual)}/year`}
              sub={a.invPaidToBank === 'yes'
                ? 'Counted as income you are taxed on, and as money that reaches your bank.'
                : `Counted as income you are taxed on — but not as money to spend, because it is reinvested where it is earned. The tax on it still comes out of your pay.`} />
          </>
        )}
      </>);
    }

    case 'income_benefits': {
      const types = Array.isArray(a.benefitTypes) ? a.benefitTypes : [];
      const toggleT = (v: string) => ctx.setAnswer('benefitTypes', types.includes(v) ? types.filter((x: string) => x !== v) : [...types, v]);
      const BT = [
        { value: 'snap', label: 'SNAP (food)' }, { value: 'tanf', label: 'TANF' }, { value: 'disability', label: 'Disability' },
        { value: 'unemployment', label: 'Unemployment' }, { value: 'housing', label: 'Housing help' }, { value: 'other', label: 'Other' },
      ];
      return (<>
        <Header emoji="🛟" title="Benefits" sub="Money or help from government or assistance programs." />
        <Card>
          <Text style={s.label}>Which ones? (optional)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
            {BT.map((b) => {
              const on = types.includes(b.value);
              return <TouchableOpacity key={b.value} style={[s.chip, on && s.chipOn]} onPress={() => toggleT(b.value)}><Text style={[s.chipTxt, on && s.chipTxtOn]}>{b.label}</Text></TouchableOpacity>;
            })}
          </View>
          <Text style={s.heroLabel}>Total benefits per month</Text>
          <TextInput style={s.heroInput} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
            value={a.benefitMonthly ?? ''} onChangeText={(t) => ctx.setAnswer('benefitMonthly', t)} />
          {num(a.benefitMonthly) > 0 && (() => {
            const someMonths = Array.isArray(a.benefitMonths) && a.benefitMonths.length > 0;
            return (<>
              <Text style={[s.label, { marginTop: 10 }]}>When do you receive them?</Text>
              <View style={s.segRow}>
                <TouchableOpacity style={[s.seg, !someMonths && s.segOn]} onPress={() => ctx.setAnswer('benefitMonths', undefined)}>
                  <Text style={[s.segTxt, !someMonths && s.segTxtOn]}>All year</Text></TouchableOpacity>
                <TouchableOpacity style={[s.seg, someMonths && s.segOn]} onPress={() => ctx.setAnswer('benefitMonths', someMonths ? a.benefitMonths : [new Date().getMonth() + 1])}>
                  <Text style={[s.segTxt, someMonths && s.segTxtOn]}>Certain months</Text></TouchableOpacity>
              </View>
              {someMonths && (<>
                <Text style={s.dueLabel}>Pick the months you'll receive benefits (e.g. unemployment after a job ends)</Text>
                <MonthMultiSelect value={a.benefitMonths} onChange={(v) => ctx.setAnswer('benefitMonths', v.length ? v : undefined)} />
              </>)}
            </>);
          })()}
          <Text style={s.hint}>{(() => {
            const notes: string[] = [];
            if (types.includes('snap')) notes.push('SNAP can usually only buy food');
            if (types.includes('housing')) notes.push('housing help often goes straight to your landlord');
            if (types.includes('unemployment')) notes.push('unemployment benefits end after a set period — plan for that');
            return (notes.length ? `Heads up: ${notes.join('; ')}. ` : 'Heads up: some benefits can only be spent on certain things, and a few have limits on how much you can save. ') + "We won't tax this income.";
          })()}</Text>
        </Card>
      </>);
    }

    case 'income_support': {
      return (<>
        <Header emoji="👪" title="Child support or alimony" sub="Support payments you receive." />
        <Card>
          <Text style={s.heroLabel}>How much per month</Text>
          <TextInput style={s.heroInput} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
            value={a.supportMonthly ?? ''} onChangeText={(t) => ctx.setAnswer('supportMonthly', t)} />
          <Text style={s.hint}>Enter what you actually receive in a typical month.</Text>
        </Card>
      </>);
    }

    case 'income_scholarship': {
      const list: any[] = Array.isArray(a.scholarships) && a.scholarships.length ? a.scholarships : [{ label: '', amount: '', freq: 'annual' }];
      const setList = (next: any[]) => ctx.setAnswer('scholarships', next);
      const setRow = (i: number, patch: any) => setList(list.map((r, j) => j === i ? { ...r, ...patch } : r));
      return (<>
        <Header emoji="🎓" title="Scholarships, grants & stipends" sub="Money for school, training, or research. Add each one you get." />
        {list.map((row, i) => (
          <Card key={i}>
            {list.length > 1 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.label}>Scholarship {i + 1}</Text>
                <TouchableOpacity onPress={() => setList(list.filter((_, j) => j !== i))}><Text style={{ color: Colors.red, fontWeight: '700', fontSize: 13 }}>Remove</Text></TouchableOpacity>
              </View>
            )}
            <Text style={s.label}>Name (optional)</Text>
            <TextInput style={s.input} value={row.label ?? ''} onChangeText={(t) => setRow(i, { label: t })} placeholder="e.g. Pell Grant, merit award" placeholderTextColor={Colors.textTertiary} />
            <Text style={s.label}>How often?</Text>
            <View style={s.segRow}>
              {[{ value: 'annual', label: 'Per year' }, { value: 'monthly', label: 'Per month' }].map((o) => {
                const on = (row.freq ?? 'annual') === o.value;
                return <TouchableOpacity key={o.value} style={[s.seg, on && s.segOn]} onPress={() => setRow(i, { freq: o.value })}><Text style={[s.segTxt, on && s.segTxtOn]}>{o.label}</Text></TouchableOpacity>;
              })}
            </View>
            <Text style={s.heroLabel}>How much ({(row.freq ?? 'annual') === 'monthly' ? 'per month' : 'per year'})</Text>
            <TextInput style={s.heroInput} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
              value={row.amount ?? ''} onChangeText={(t) => setRow(i, { amount: t })} />
            {(row.freq ?? 'annual') !== 'monthly' && num(row.amount) > 0 && (
              <>
                <Text style={s.dueLabel}>When does it land? (pick the months)</Text>
                <MonthMultiSelect value={Array.isArray(row.months) ? row.months : []} onChange={(v) => setRow(i, { months: v })} />
                <WhenField day={row.day} year={row.year} onDay={(t) => setRow(i, { day: t })} onYear={(t) => setRow(i, { year: t })} />
              </>
            )}
          </Card>
        ))}
        <TouchableOpacity onPress={() => setList([...list, { label: '', amount: '', freq: 'annual' }])}><Text style={s.addAnother}>＋ Add another scholarship</Text></TouchableOpacity>
        <Text style={s.hint}>Count money you receive to live on. We won't tax this.</Text>
      </>);
    }

    case 'income_loans': {
      const list: any[] = Array.isArray(a.loans) && a.loans.length ? a.loans : [{ label: '', amount: '', months: [] }];
      const setList = (next: any[]) => ctx.setAnswer('loans', next);
      const setRow = (i: number, patch: any) => setList(list.map((r, j) => j === i ? { ...r, ...patch } : r));
      return (<>
        <Header emoji="🏦" title="Student loans" sub="Money you borrow now and repay later. Add each loan you plan to take." />
        {list.map((row, i) => (
          <Card key={i}>
            {list.length > 1 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={s.label}>Loan {i + 1}</Text>
                <TouchableOpacity onPress={() => setList(list.filter((_, j) => j !== i))}><Text style={{ color: Colors.red, fontWeight: '700', fontSize: 13 }}>Remove</Text></TouchableOpacity>
              </View>
            )}
            <Text style={s.label}>Name (optional)</Text>
            <TextInput style={s.input} value={row.label ?? ''} onChangeText={(t) => setRow(i, { label: t })} placeholder="e.g. Federal subsidized, private" placeholderTextColor={Colors.textTertiary} />
            <Text style={s.heroLabel}>How much (this disbursement)</Text>
            <TextInput style={s.heroInput} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
              value={row.amount ?? ''} onChangeText={(t) => setRow(i, { amount: t })} />
            {num(row.amount) > 0 && (
              <>
                <Text style={s.dueLabel}>When does it land? (pick the months)</Text>
                <MonthMultiSelect value={Array.isArray(row.months) ? row.months : []} onChange={(v) => setRow(i, { months: v })} />
                <WhenField day={row.day} year={row.year} onDay={(t) => setRow(i, { day: t })} onYear={(t) => setRow(i, { year: t })} />
                <Text style={[s.label, { marginTop: 12 }]}>Repayment, once you graduate (optional)</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.dueLabel}>Interest rate %</Text>
                    <TextInput style={s.input} keyboardType="decimal-pad" placeholder="e.g. 6" placeholderTextColor={Colors.textTertiary}
                      value={row.apr ?? ''} onChangeText={(t) => setRow(i, { apr: t })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.dueLabel}>Pay off over (years)</Text>
                    <TextInput style={s.input} keyboardType="decimal-pad" placeholder="e.g. 10" placeholderTextColor={Colors.textTertiary}
                      value={row.termYears ?? ''} onChangeText={(t) => setRow(i, { termYears: t })} />
                  </View>
                </View>
                {num(row.apr) > 0 && num(row.termYears) > 0 && (() => {
                  const lp = loanPayment(num(row.amount), num(row.apr), num(row.termYears));
                  return <Text style={s.note2}>≈ <Text style={{ fontWeight: '800' }}>{money(lp.monthly)}/month</Text> for {num(row.termYears)} years · {money(lp.totalInterest)} total interest.</Text>;
                })()}
              </>
            )}
          </Card>
        ))}
        <TouchableOpacity onPress={() => setList([...list, { label: '', amount: '', months: [] }])}><Text style={s.addAnother}>＋ Add another loan</Text></TouchableOpacity>
        {(() => {
          const borrowed = list.reduce((t, r) => t + num(r.amount), 0);
          const repay = list.reduce((t, r) => t + (num(r.apr) > 0 && num(r.termYears) > 0 ? loanPayment(num(r.amount), num(r.apr), num(r.termYears)).monthly : 0), 0);
          return borrowed > 0 ? (
            <View style={s.callout}>
              <Text style={s.calloutIcon}>🏦</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.calloutTxt}>{money(borrowed)} borrowed{repay > 0 ? ` · ≈ ${money(repay)}/month after graduation` : ''}</Text>
                <Text style={s.calloutSub}>It lands as cash now in your bill calendar; repayment starts after you graduate.</Text>
              </View>
            </View>
          ) : null;
        })()}
        <Text style={s.hint}>This is borrowed money — it shows as cash arriving in your bill calendar, and you'll repay it later.</Text>
      </>);
    }

    case 'income_other': {
      const freq = a.otherFreq ?? 'monthly';
      const freqLabel = freq === 'annual' ? 'per year' : freq === 'onetime' ? 'one time' : 'per month';
      const otherMo = num(a.otherMonth) || 1;
      return (<>
        <Header emoji="🧾" title="Other income" sub="Anything else — a gift, royalties, a one-time payment." />
        <Card>
          <Text style={s.label}>What is it? (optional)</Text>
          <TextInput style={s.input} value={a.otherLabel ?? ''} onChangeText={(t) => ctx.setAnswer('otherLabel', t)} placeholder="e.g. tutoring, a gift" placeholderTextColor={Colors.textTertiary} />
          <Text style={s.label}>How often?</Text>
          <Segmented ctx={ctx} k="otherFreq" defaultValue="monthly" options={[{ value: 'monthly', label: 'Per month' }, { value: 'annual', label: 'Per year' }, { value: 'onetime', label: 'One time' }]} />
          <Text style={s.heroLabel}>How much ({freqLabel})</Text>
          <TextInput style={s.heroInput} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
            value={a.otherAmount ?? ''} onChangeText={(t) => ctx.setAnswer('otherAmount', t)} />
          {freq === 'onetime' && num(a.otherAmount) > 0 && (
            <>
              <Text style={s.label}>Which month does it land?</Text>
              <View style={s.monthGrid}>
                {MONTHS3.map((lbl, idx) => {
                  const m = idx + 1, on = otherMo === m;
                  return <TouchableOpacity key={m} style={[s.monthChip, on && s.monthChipOn]} onPress={() => ctx.setAnswer('otherMonth', m)}><Text style={[s.monthTxt, on && s.monthTxtOn]}>{lbl}</Text></TouchableOpacity>;
                })}
              </View>
            </>
          )}
          {num(a.otherAmount) > 0 && (
            <>
              <Text style={[s.label, { marginTop: 10 }]}>Is it taxable income?</Text>
              <Segmented ctx={ctx} k="otherTaxable" defaultValue="yes" options={[
                { value: 'yes', label: 'Taxable' }, { value: 'no', label: "No — it's a gift" }]} />
              {a.otherTaxable === 'no' && <Text style={s.hint}>Personal gifts aren't taxable income to you — we'll count this money without taxing it.</Text>}
            </>
          )}
        </Card>
      </>);
    }

    case 'income_salary':
      // ONE COMPONENT, TWO FRAMES (approved mock income-v5, rule 2b). This step used to be its own
      // copy of the base-pay questions — one earner, its own wording, its own idea of what to ask —
      // while Cash flow opened a different screen with a section per earner. Four places could set a
      // salary and each asked differently. It renders the real screen now, so they cannot drift.
      // The 401(k) and the employer match come with it, inside each earner's own section, which is
      // why income_401k and employerContribution are no longer separate steps.
      return <BasePayScreen frame="onboarding" />;

    case 'income_401k': {
      const monthly401k = num(a.c_401k);
      const annual401k = monthly401k * 12;
      const limit = annual401kLimit(ageAttainedInYear(num(a.birthYear) || null));   // G1: the year-attained age, as the law counts it
      const overLimit = annual401k > limit;
      return (<>
        <Header emoji="🏦" title="401(k) contributions" sub="Locked until retirement — we track it separately." />
        <Card>
          <HeroAmount ctx={ctx} k="c_401k" label="Your contribution (per month)" />
        </Card>
        {monthly401k > 0 && (overLimit
          ? <Callout warn text={`${money(annual401k)}/year — over the ${IRS_LIMITS.year} limit by ${money(annual401k - limit)}`}
              sub={`Limit is ${money(limit)}.`} />
          : <Callout text={`${money(annual401k)}/year — within the ${IRS_LIMITS.year} limit of ${money(limit)}`}
              sub={`Room for ${money(limit - annual401k)} more this year.`} />)}
      </>);
    }

    case 'employerContribution': {
      const matchMode = a.employerMatchMode ?? 'pct';
      const matchMonthly = employerMatchMonthly(a as any);   // the third copy of this rule, removed
      return (<>
        <Header emoji="🏢" title="Employer match" sub="What your employer adds to your 401(k)." />
        <Card>
          <AmountUnitRow ctx={ctx} k="employerMatchValue" modeK="employerMatchMode" label="Match (% of your contribution, or a flat amount per month)" />
          {matchMode === 'pct' && num(a.c_401k) <= 0 && (
            <Text style={s.hint}>You haven't set a contribution yet, so a % match counts as {currencySymbol()}0 — enter a flat amount instead, or go back and add your contribution.</Text>
          )}
        </Card>
        {matchMonthly > 0 && <Callout text={`≈ ${money(matchMonthly)}/month of free money`}
          sub={`About ${money(matchMonthly * 12)}/year your employer adds on top of your own savings.`} />}
      </>);
    }

    case 'income_bonus': {
      const b = num(a.bonusAnnual), sign = num(a.signingOnetime);
      const bonusMo = num(a.bonusMonth) || 12;
      return (<>
        <Header emoji="🎉" title="Bonuses" sub="Cash bonuses beyond your salary." />
        <Card>
          <HeroAmount ctx={ctx} k="bonusAnnual" label="Annual bonus (per year)" />
          {b > 0 && (
            <>
              <Text style={s.label}>Which month does it usually land?</Text>
              <View style={s.monthGrid}>
                {MONTHS3.map((lbl, idx) => {
                  const m = idx + 1, on = bonusMo === m;
                  return <TouchableOpacity key={m} style={[s.monthChip, on && s.monthChipOn]} onPress={() => ctx.setAnswer('bonusMonth', m)}><Text style={[s.monthTxt, on && s.monthTxtOn]}>{lbl}</Text></TouchableOpacity>;
                })}
              </View>
            </>
          )}
          <MoneyRow ctx={ctx} k="signingOnetime" label="Signing bonus (one-time)" />
        </Card>
        {(b > 0 || sign > 0) && <Callout text={`${money(b + sign)} in bonus income`}
          sub={sign > 0 ? `Includes a one-time ${money(sign)} signing bonus.` : 'On top of your base salary.'} />}
      </>);
    }

    case 'income_rsu':
      return <RsuEditor ctx={ctx} />;

    case 'income_rental':
      return <RentalEditor ctx={ctx} />;

    case 'filing_status':
      return (
        <FilingStatusQuestions
          op={a}
          status={(a.filingStatus as any) ?? (a.hasPartner === 'yes' ? 'married' : 'single')}
          onStatus={(v) => ctx.setAnswer('filingStatus', v)}
          over65={(a.over65Who as any) ?? null}
          onOver65={(v) => ctx.setAnswer('over65Who', v)} />
      );

    case 'income_tax': {
      const gross = grossAnnual(a);
      const estPct = Math.round(effectiveRateOnGrossFor(gross, filingStatusOf(a as any), stateRateOf(a as any), over65CountOf(a as any)) * 100);
      const brkPct = Math.round(marginalBracketFor(gross, filingStatusOf(a as any), over65CountOf(a as any)) * 100);
      return (<>
        <Header emoji="🧾" title="Taxes" sub="What comes out of your pay?" />
        {/* THE SAME QUESTION AS THE BASE-PAY SCREEN, IN THE SAME WORDS. It used to ask for an
            "effective tax rate % — from last year's return", and that phrase means one thing on a
            return and another on a payslip: our figure is FEDERAL INCOME TAX ONLY, while a return
            reads about 12 points higher once Social Security, Medicare and a state are in it. A
            person could type 18 against our 9.2 and both be right. Founder ruling 2026-08-28. */}
        {gross > 0 && <Callout text={`~${estPct}% federal income tax · ${brkPct}% bracket (${TAX_YEAR})`}
          sub={`On ~${money(gross)} gross, from the IRS schedule after the standard deduction. It does NOT include Social Security and Medicare — about another 7.7% of a wage — or any state tax.`} />}
        <Card>
          <Choice ctx={ctx} k="taxMode" options={[
            { value: 'system', title: `Use the calculated rate (~${estPct}%)`, sub: 'Federal income tax only' },
            { value: 'manual', title: 'Tell us what really comes out', sub: 'Everything withheld, from a payslip' }]} />
          {a.taxMode === 'manual' && <NumRow ctx={ctx} k="manualTaxRate" decimal
            label="Everything taken out, as a share of your gross" ph="24" />}
          {a.taxMode === 'manual' && <Text style={s.hint}>From a payslip: add up every deduction except your 401(k), and divide by the gross.</Text>}
        </Card>
      </>);
    }

    case 'recap_income':
      return <IncomeRecap ctx={ctx} />;

    case 'monthlySpending': {
      const spend = num(a.monthlySpending);
      const inc = monthlyIncome(a) || retirementMonthlyIncome(a);
      const pct = inc > 0 ? Math.round((spend / inc) * 100) : 0;
      return (<><Header emoji="🧾" title={retired ? 'Your monthly expenses' : "What are your average monthly expenses?"}
        sub="Roughly what leaves your account each month." />
        <Card><HeroAmount ctx={ctx} k="monthlySpending" label="Per month" /></Card>
        {spend > 0 && inc > 0 && <Callout text={`That's ${pct}% of your monthly income`}
          sub={pct <= 80 ? `You keep ${100 - pct}% to save & invest — healthy.` : `Leaves ${Math.max(0, 100 - pct)}% to save — we'll help you stretch it.`}
          warn={pct > 100} />}
      </>);
    }

    case 'flexBuckets':
      return <SpendingEditor ctx={ctx} />;

    case 'savingsRateTarget':
      return <SavingsEditor ctx={ctx} />;

    case 'birth':
      return (<><Header emoji="🎂" title="When were you born?" sub="Your age drives the rules we apply — 401(k) catch-up limits, Social Security timing, and when required withdrawals start." />
        <Card><View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}><NumRow ctx={ctx} k="birthMonth" label="Month" ph="MM" /></View>
          <View style={{ flex: 1.4 }}><NumRow ctx={ctx} k="birthYear" label="Year" ph="YYYY" /></View>
        </View></Card></>);

    case 'currentRetirementSavings':
      // #8: capture Traditional (pre-tax) and Roth (after-tax) SEPARATELY — they're taxed differently in
      // retirement, so the nest-egg/tax math needs them apart, not lumped into one number.
      return (<><Header emoji="🏦" title="Your 401(k) & retirement savings"
        sub="Split by how it's taxed. Brokerage and other investments are excluded — we ask about those separately." />
        <Card>
          <MoneyRow ctx={ctx} k="currentRetirementSavings" label="Traditional / pre-tax — 401(k), Traditional IRA, 403(b), 457, TSP" />
          <MoneyRow ctx={ctx} k="currentRetirementSavingsRoth" label="Roth / after-tax — Roth 401(k), Roth IRA" />
        </Card></>);

    case 'contributionsByType':
      return <SavePlanScreen ctx={ctx} />;

    case 'targetRetirementAge': {
      const tgt = num(a.targetRetirementAge), age = ageOrDefault(a), yrs = tgt - age;
      return (<><Header emoji="🏖️" title="When do you hope to retire?" sub="Your target age." />
        <Card><HeroAmount ctx={ctx} k="targetRetirementAge" label="Target age" ph="65" kind="number" /></Card>
        {tgt > 0 && a.birthYear && yrs > 0 && <Callout text={`${yrs} years from now`} sub="That's your runway to save and invest." />}
        {tgt > 0 && num(a.birthYear) > 0 && yrs <= 0 && <Callout warn
          text={`Retiring at ${tgt} is in the past — you're ${age} now`}
          sub={`Pick an age above ${age}. (We calculated ${age} from your birth year, ${num(a.birthYear)} — if that's a typo, go Back to fix it.)`} />}
        {tgt >= 100 && <Callout warn text="Pick a target age below 100" />}
      </>);
    }

    case 'expectedRetirementSpending': {
      const rs = num(a.expectedRetirementSpending), now = num(a.monthlySpending);
      return (<><Header emoji="💸" title="Expected expenses in retirement" sub="Per month, in today's dollars." />
        <Card><HeroAmount ctx={ctx} k="expectedRetirementSpending" label="Monthly (retirement)" /></Card>
        {rs > 0 && <Callout text={now > 0 ? `${Math.round((rs / now) * 100)}% of what you spend today` : `${money(rs * 12)}/year`}
          sub={`About ${money(rs * 12)}/year in today's dollars.`} />}
      </>);
    }

    case 'currentSavingsPortfolio': {
      // If a 401(k)/IRA question is also in this flow, scope THIS to non-retirement money so nothing is double-counted.
      const hasRet = ctx.tracks.includes('retire_acc');
      const bal = num(a.currentSavingsPortfolio);
      const by = num(a.birthYear), startAge = by > 0 ? rmdStartAge(by) : 0, age = ageOrDefault(a);
      const rmdAge = startAge > 0 ? Math.max(age, startAge) : 0;
      const rmd = !hasRet && rmdAge > 0 ? estimateAnnualRMD(bal, rmdAge) : 0;   // RMD insight only when this is the full pre-tax-ish pool
      return (<><Header emoji="🏦" title={hasRet ? 'Your other savings & investments' : 'Your savings & investments'}
        sub={hasRet ? 'Taxable brokerage & cash — not the retirement accounts above.' : 'Everything you can draw on in retirement.'} />
        <Card><HeroAmount ctx={ctx} k="currentSavingsPortfolio" label={hasRet ? 'Taxable + cash' : 'Total portfolio'} /></Card>
        {rmd > 0 && <Callout
          text={age >= startAge ? `~${money(rmd)}/year in required withdrawals at ${age}` : `~${money(rmd)}/year required once you reach ${startAge}`}
          sub="Rough required withdrawal (RMD) if this is mostly pre-tax (Traditional 401(k)/IRA). Roth accounts have no required withdrawal." />}
      </>);
    }

    case 'retirementIncomeSources': {
      const tot = retirementMonthlyIncome(a);
      const by = num(a.birthYear);
      const startAge = by > 0 ? rmdStartAge(by) : 0;
      const age = ageOrDefault(a);
      return (<><Header emoji="📨" title="Retirement income" sub="Enter each source and how often you receive it." />
        <Card>
          <MoneyCadenceRow ctx={ctx} k="ri_ss" label="Social Security" />
          <MoneyCadenceRow ctx={ctx} k="ri_pension" label="Pension" />
          <MoneyCadenceRow ctx={ctx} k="ri_withdrawals" label="401(k) / IRA withdrawals" />
          <MoneyCadenceRow ctx={ctx} k="ri_rmd" label="Required Minimum Distributions (RMDs)" />
          <Text style={[s.hint, { marginTop: -8, marginBottom: 8 }]}>An RMD is a withdrawal — if it's already counted in the row above, leave this blank so it isn't counted twice.</Text>
          <MoneyCadenceRow ctx={ctx} k="ri_annuities" label="Annuities" />
          {(() => {
            // dividends/rental get their own screens when those sources are picked — don't double-count
            const srcs: string[] = Array.isArray(a.incomeSources) ? a.incomeSources : [];
            const div = srcs.includes('investment_income'), rent = srcs.includes('rental');
            // always "Other Income"; the sub-text lists what counts (incl. interest) and keeps the
            // don't-double-count guidance when dividends/rental are captured on their own screens.
            const hint = div && rent
              ? 'Interest and any other income. Dividends and rental are asked on their own screens — don\'t repeat them here.'
              : div ? 'Interest, rental and any other income. Dividends are asked on their own screen — don\'t repeat them here.'
              : rent ? 'Dividends, interest and any other income. Rental is asked on its own screen — don\'t repeat it here.'
              : 'Dividends, Interest, Rental or other income.';
            return (<>
              <MoneyCadenceRow ctx={ctx} k="ri_other" label="Other Income" />
              <Text style={[s.hint, { marginTop: -8 }]}>{hint}</Text>
            </>);
          })()}
        </Card>
        {startAge > 0 && (
          <Callout
            text={age >= startAge ? `You're past your RMD age (${startAge}) — RMDs are required` : `Your RMDs begin at age ${startAge}`}
            sub={age >= startAge
              ? `Traditional 401(k)/IRA balances must be drawn down yearly (Roth is exempt). Add yours above.`
              : `Born ${by < 1960 ? '1951–1959 → 73' : '1960 or later → 75'}. Traditional 401(k)/IRA will require yearly withdrawals then; Roth is exempt.`} />
        )}
        {tot > 0 && <Callout text={`${money(tot)}/month in retirement income`}
          sub={`About ${money(tot * 12)}/year before drawing on savings.`
            + (num(a.ri_ss) > 0 ? ' Up to 85% of Social Security can be taxable, depending on your other income.' : '')} />}
      </>);
    }

    case 'horizonAge': {
      const h = num(a.horizonAge), r = num(a.targetRetirementAge);
      return (<><Header emoji="🛟" title="How long should your money last?" sub="Plan to what age?" />
        <Card><HeroAmount ctx={ctx} k="horizonAge" label="To age" ph="90" kind="number" /></Card>
        {h > 0 && r > 0 && h > r && <Callout text={`${h - r} years of retirement to fund`} />}
      </>);
    }

    case 'retLocation': {
      const loc = String(a.retLocation ?? '').trim();
      const col = colFactor(loc);
      const pct = Math.round(Math.abs(1 - col.factor) * 100);
      return (<><Header emoji="🌍" title={retired ? 'Where do you live in retirement?' : 'Where do you plan to retire?'} sub="We adjust your retirement expenses to local living costs (optional)." />
        <Card><TextRow ctx={ctx} k="retLocation" label="Country / region" ph="e.g. Portugal" /></Card>
        {col.name && col.factor !== 1 && <Callout
          text={`${col.name}: about ${pct}% ${col.factor < 1 ? 'cheaper' : 'pricier'} than the US average`}
          sub={`We scale the retirement expenses you enter by this — a rough planning adjustment, not a quote.`} />}
        {col.name && col.factor === 1 && <Callout text={`${col.name}: similar to the US average`} sub="No adjustment applied to your retirement expenses." />}
        {!col.name && loc.length > 2 && <Text style={s.hint}>We don't have living-cost data for "{loc}" yet — no adjustment applied.</Text>}
      </>);
    }

    case 'travelBudget':
      return (<><Header emoji="✈️" title="Travel budget (optional)" sub="Extra you'd budget for travel in retirement." />
        <Card><HeroAmount ctx={ctx} k="travelBudget" label="Per year" /></Card></>);

    case 'medicalBudget':
      return (<><Header emoji="🩺" title="Medical / long-term care (optional)" sub="Yearly health costs you want to plan for." />
        <Card><HeroAmount ctx={ctx} k="medicalBudget" label="Per year" /></Card></>);

    case 'spendingChangeLater':
      return (<><Header emoji="📉" title="Expenses later in retirement (optional)"
        sub={retired ? 'Do you expect it to change as you age?' : 'About the same, less, or more than today?'} />
        <Card><Choice ctx={ctx} k="spendingChangeLater" options={[
          { value: 'same', title: 'About the same' }, { value: 'less', title: 'Less' }, { value: 'more', title: 'More' }]} /></Card></>);

    case 'investObjective':
      return (<><Header emoji="📈" title="What's your investing goal?" sub="Pick any that apply." />
        <Card><MultiChoice ctx={ctx} k="investObjective" options={[
          { value: 'pnl', title: 'Monitor performance', sub: 'Gains & losses — sold and still on paper' },
          { value: 'networth', title: 'Everything in one place', sub: 'Net worth, MoM / YoY change' }]} /></Card></>);

    case 'trackingLevel':
      return (<><Header emoji="🔎" title="How detailed do you want to track?" sub="Pick any — combine them for all levels." />
        <Card><MultiChoice ctx={ctx} k="trackingLevel" options={[
          { value: 'account', title: 'By account' }, { value: 'asset', title: 'By asset type' },
          { value: 'holding', title: 'Each individual holding' }]} /></Card></>);

    case 'investmentHoldings': {
      const hasRet = ctx.tracks.includes('retire_acc');   // scope to non-retirement money if 401(k)/IRA is asked elsewhere
      return (<><Header emoji="📊" title={hasRet ? 'Your other investments' : 'Your investments'}
        sub={hasRet ? 'Taxable brokerage, cash & crypto — not the retirement savings above.' : 'Total value for now — add detail in the app later.'} />
        <Card><HeroAmount ctx={ctx} k="investmentHoldings" label={hasRet ? 'Taxable + cash' : 'Total portfolio value'} /></Card>
        {/* #13: point to the importer (lives on Net Worth) so the CSV path is discoverable from setup too */}
        <Callout text="📄 Have a brokerage statement? After setup, open Net Worth → “Import holdings from a brokerage file” to add every position automatically." /></>);
    }

    case 'networthIntro':
      return (<><Header emoji="🧮" title="Your net worth lives in the Net Worth tab" sub="Everything you own minus what you owe — kept up to date automatically." />
        <Card>
          <Text style={s.note}>Once you've finished setup, head to the <Text style={{ fontWeight: '800' }}>Net Worth</Text> tab (top-right chip or the ▦ menu) to add your accounts and debts — cash, investments, retirement, home, car, loans, credit cards. As you add them, your net worth total updates everywhere.</Text>
          <Text style={[s.hint, { marginTop: 10 }]}>No rush — there's nothing to do here right now. You can add accounts anytime after setup.</Text>
        </Card></>);

    case 'whatYouNeed': {
      const ret = ctx.status === 'retired';
      const items: { e: string; t: string; d: string }[] = [
        ret
          ? { e: '🏦', t: 'Retirement income', d: 'Your monthly Social Security, pension, and any annuity amounts.' }
          : { e: '💵', t: 'Your income', d: 'Your pay (take-home or gross), plus any bonus, stock, or side income.' },
        { e: '💰', t: 'Account balances', d: 'Checking, savings, investments, and retirement (401(k), IRA). Recent statements help.' },
        { e: '💳', t: 'Debts', d: 'Balances and interest rates for any loans and credit cards.' },
        { e: '🧾', t: 'Monthly expenses', d: 'Roughly what you spend each month — rent/mortgage, bills, and everyday costs.' },
      ];
      if (!ret) items.push({ e: '🏖', t: 'Retirement plans', d: 'When you’d like to retire, and any Social Security or pension you expect.' });

      return (<><Header emoji="📋" title="Here’s what you’ll need" sub="Gathering these now makes the next few minutes quick. Don’t have something handy? Skip it — nothing is required, and you can add it anytime." />
        <Card>
          {items.map((it, i) => (
            <View key={i} style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 11 }, i < items.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: Colors.border }]}>
              <Text style={{ fontSize: 24 }}>{it.e}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.textPrimary }}>{it.t}</Text>
                <Text style={{ fontSize: 13, color: Colors.textSecondary, lineHeight: 17, marginTop: 2 }}>{it.d}</Text>
              </View>
            </View>
          ))}
        </Card>
        <Text style={[s.hint, { marginTop: 10, textAlign: 'center' }]}>🔒 Everything you enter is encrypted on your device — and you can change or add details anytime.</Text>
      </>);
    }

    case 'goals_detail':
      return <GoalsEditor ctx={ctx} />;

    case 'monthlySavingsCapacity': {
      const cap = num(a.monthlySavingsCapacity);
      return (<><Header emoji="💪" title="How much can you save each month?" sub="Toward your goals." />
        <Card><HeroAmount ctx={ctx} k="monthlySavingsCapacity" label="Monthly" /></Card>
        {cap > 0 && <Callout text={`${money(cap * 12)}/year toward your goals`} />}
      </>);
    }

    case 'hasPartner':
      return (<><Header emoji="👫" title="Do you manage money with a spouse?" />
        <Card><Choice ctx={ctx} k="hasPartner" options={[
          { value: 'yes', title: 'I have a spouse' }, { value: 'no', title: 'Just me for now' }]} />
          {a.hasPartner === 'yes' && <TextRow ctx={ctx} k="partnerName" label="Spouse’s name (optional)" ph="Name" />}</Card></>);

    case 'invitePartner':
      return <InvitePartner ctx={ctx} />;

    case 'verifyEmail':
      return <VerifyEmail ctx={ctx} />;

    case 'dependentsCount':
      return (<><Header emoji="👨‍👩‍👧" title="How many kids or dependents?" />
        <Card><Stepper ctx={ctx} k="dependentsCount" /></Card></>);

    case 'debts': {
      const { bal, pay, rate, months, interestOnly } = debtPayoff(a);
      const payoff = months >= 12 ? `${(months / 12).toFixed(1)} years` : `${months} months`;
      return (<><Header emoji="🎓" title="Your debt" sub="Biggest balance to start — add more in the app." />
        <Card><TextRow ctx={ctx} k="debtName" label="What is it?" ph="e.g. Student loan" />
          <MoneyRow ctx={ctx} k="debtBalance" label="Balance" />
          <NumRow ctx={ctx} k="debtRate" decimal label="Interest rate %" ph="6.5" />
          <MoneyRow ctx={ctx} k="debtPayment" label="Monthly payment" /></Card>
        {bal > 0 && pay > 0 && (interestOnly
          ? <Callout warn text="Your payment barely covers the interest" sub="At this rate the balance won't go down — worth paying more." />
          : <Callout text={`Paid off in ~${payoff}`} sub={`At ${money(pay)}/month and ${(rate * 100).toFixed(2)}% interest.`} />)}
      </>);
    }

    case 'legacyTarget':
      return (<><Header emoji="🎁" title="What would you like to leave?" sub="A target for your estate / heirs." />
        <Card><HeroAmount ctx={ctx} k="legacyTarget" label="Legacy target" />
          <Text style={s.hint}>We'll hold your plan to this on top of your own expenses. The full estate checklist — will, beneficiaries, healthcare proxy — lives in Goals & Debt → Estate.</Text></Card></>);

    // ── recaps ──
    case 'recap_spend':
      return <CashflowRecap ctx={ctx} />;
    case 'recap_retire': {
      const dec = ctx.tracks.includes('retire_dec') && !ctx.tracks.includes('retire_acc');
      if (dec) {
        const pool = num(a.currentSavingsPortfolio);
        const incAnnual = retirementMonthlyIncome(a) * 12;
        const spendAnnual = num(a.monthlySpending) * 12;
        const netDraw = Math.max(0, spendAnnual - incAnnual);
        const lastsYears = netDraw > 0 ? pool / netDraw : 99;
        const startAge = ageOrDefault(a, 65);
        const lastsToAge = Math.round(startAge + lastsYears);
        const ok = lastsToAge >= num(a.horizonAge || 90);
        return (<><Header emoji="🛟" title="Will your money last?" />
          <Card>
            <RecapStat label="Portfolio" value={money(pool)} />
            <RecapStat label="Income" value={money(incAnnual) + '/year'} />
            <RecapStat label="Expenses" value={'-' + money(spendAnnual) + '/year'} />
            <View style={s.divider} />
            <RecapStat label="Projected to last to age" value={lastsYears >= 99 ? '90+' : String(lastsToAge)}
              color={ok ? Colors.primary : Colors.red} />
          </Card>
          {netDraw > 0
            ? (() => {
                const horizon = num(a.horizonAge || 90);
                const targetYears = Math.max(1, horizon - startAge);
                const monthlyLever = Math.max(0, (netDraw - pool / targetYears) / 12);   // cut to make it last to the horizon
                return <Callout text={`Your ${money(pool)} covers ~${money(netDraw)}/year of drawdown for about ${Math.round(lastsYears)} years (you're ${startAge}).`}
                  sub={ok ? `That reaches your plan-to age of ${horizon}.`
                    : `Short of age ${horizon} — trim about ${money(monthlyLever)}/month of expenses (or add that much income) to get there.`} warn={!ok} />;
              })()
            : <Callout text={`Your income covers your expenses — you're not drawing down your ${money(pool)} portfolio yet.`} />}
        </>);
      }
      return <RetireOutlook ctx={ctx} />;
    }
    case 'recap_invest': {
      const total = num(a.investmentHoldings) || num(a.currentSavingsPortfolio);   // deduped: retiree's pool comes from the savings & investments step
      const levels = Array.isArray(a.trackingLevel) ? a.trackingLevel : (a.trackingLevel ? [a.trackingLevel] : []);
      const objs = Array.isArray(a.investObjective) ? a.investObjective : (a.investObjective ? [a.investObjective] : []);
      const objLabel = objs.map((o: string) => o === 'pnl' ? 'performance / P&L' : 'net worth over time').join(' + ') || '—';
      return (<><Header emoji="📈" title="Your portfolio" />
        <Card><RecapStat label="Total value" value={money(total)} color={Colors.primary} />
          <Text style={s.note}>Tracking {levels.length ? `by ${levels.join(', ')}` : ''} · {objLabel}</Text></Card></>);
    }
    case 'recap_debt': {
      const { bal, pay, rate, months, interestOnly } = debtPayoff(a);
      const totalPaid = pay * months;
      const debtFree = months > 0 ? new Date(Date.now() + months * 30.44 * 86400000) : null;
      return (<><Header emoji="💳" title="Your payoff plan" />
        <Card>
          <RecapStat label={a.debtName || 'Debt'} value={money(bal)} />
          <RecapStat plain label="Monthly payment" value={`${money(pay)}/month`} />
          <RecapStat plain label="Interest rate" value={`${(rate * 100).toFixed(2)}%`} />
          {months > 0 && (<>
            <View style={s.divider} />
            <RecapStat label="Debt-free" value={debtFree ? `${MONTHS[debtFree.getMonth()]} ${debtFree.getFullYear()}` : '—'} color={Colors.primary} />
            <RecapStat plain label="Total interest" value={money(Math.max(0, totalPaid - bal))} />
          </>)}
        </Card>
        {interestOnly
          ? <Callout warn text="This payment never clears the balance" sub="It barely covers interest — even a little extra each month changes everything. The Goals & Debt tab compares avalanche vs snowball plans." />
          : months > 0
            ? <Callout text={`${months >= 12 ? `${(months / 12).toFixed(1)} years` : `${months} months`} to debt-free`} sub="Add every debt in the Goals & Debt tab to build a full avalanche/snowball payoff order." />
            : <Callout text="Add a monthly payment to see your debt-free date" />}
      </>);
    }
    case 'recap_goals': {
      const goals = (a.goals ?? []) as any[];
      const { capMo: capRaw, investMo } = goalCapacity(a);
      const capMo = capRaw >= 25 ? capRaw : 0;   // a few leftover dollars is NOT a funding plan
      // SEQUENTIAL funding — one pot, one goal at a time: goal 2's clock starts when goal 1 is done.
      // (Computing each goal with the FULL capacity would spend the same dollars once per goal.)
      let cumMonths = 0;
      return (<><Header emoji="🎯" title="Your goals" sub={capMo > 0 ? 'Funded one at a time from your monthly free cash.' : undefined} />
        <Card>{goals.length === 0 ? <Text style={s.note}>No goals added.</Text> : goals.map((g, i) => {
          let label = money(num(g.target));
          if (capMo > 0) {
            cumMonths += Math.ceil(num(g.target) / capMo);
            label = cumMonths <= 600 ? `${money(num(g.target))} · done in ~${cumMonths} mo` : `${money(num(g.target))} · 50+ yrs`;
          }
          return <RecapStat key={i} label={g.label || 'Goal'} value={label} />;
        })}</Card>
        {capMo > 0
          ? <Callout text={`You have about ${money(capMo)}/month for goals`}
              sub={`That's the surplus of your income after taxes, expenses, your 401(k)${investMo > 0 ? `, and the ${money(investMo * 12)}/year you're investing` : ''}. Timelines fund one goal at a time, in this order.`} />
          : investMo > 0
            ? <Callout warn text="There is no surplus for these goals right now"
                sub={`Your investing plan (${money(investMo * 12)}/year) uses all your free cash. To fund goals, dial the investing number down — it's the same pot of money.`} />
            : <Callout warn text="No free cash for these goals yet"
                sub="After taxes, expenses and your 401(k), nothing is left this year. The goals stay on your list — fund them when your cash flow allows." />}
      </>);
    }
    default:
      return (<><Header emoji="🛠" title={String(step)} /><Card><Text style={s.note}>Coming soon.</Text></Card></>);
  }
}

// Equity-based compensation — add one row per grant (RSUs or stock options), each valued
// by its own rule, summed into annual equity income. Refreshers stack up over time.
export function RsuEditor({ ctx }: { ctx: StepCtx }) {
  const a = ctx.answers;
  const rows = (a.rsuGrants ?? []) as any[];
  const type = a.equityType ?? 'rsu';
  const isOpt = type === 'option';
  const [extra, setExtra] = React.useState(0);

  React.useEffect(() => { if (a.equityType == null) ctx.setAnswer('equityType', 'rsu'); }, []);

  // B47 finding 1: the award has a SYMBOL — capture it, and let a known live price seed new rows
  const ticker = String(a.equityTicker ?? '').trim().toUpperCase();
  const livePrice = React.useMemo(() => {
    if (!ticker) return null;
    try {
      const { useStore } = require('../store/useStore');
      const series = (useStore.getState().priceCache ?? {})[ticker];
      const pts = series?.points ?? [];
      return pts.length ? pts[pts.length - 1].close : null;
    } catch { return null; }
  }, [ticker, rows.length]);

  const setCell = (i: number, key: string, val: string) => {
    const next = rows.slice();
    while (next.length <= i) next.push({});
    next[i] = { ...next[i], [key]: val };
    // seed a fresh RSU row's price from the live symbol price — editable, never forced
    if (!isOpt && livePrice != null && key !== 'price' && (next[i].price == null || next[i].price === '')) {
      next[i] = { ...next[i], price: String(livePrice) };
    }
    ctx.setAnswer('rsuGrants', next);
  };
  const removeRow = (i: number) => ctx.setAnswer('rsuGrants', rows.filter((_, idx) => idx !== i));

  // columns adapt to the award type; options carry a single grant-level strike & market.
  const cols = isOpt
    ? [{ key: 'shares', label: 'Options', ph: '100', kb: 'number-pad' as const }, { key: 'date', label: 'Vest date', ph: 'YYYY-MM', kb: 'default' as const }]
    : [{ key: 'shares', label: 'Shares', ph: '100', kb: 'number-pad' as const },
       { key: 'price', label: "Today's price", ph: `${currencySymbol()}0`, kb: 'decimal-pad' as const },
       { key: 'date', label: 'Vest date', ph: 'YYYY-MM', kb: 'default' as const }];

  const visible = Math.max(3, rows.length + 1) + extra;
  const flow = equityCashFlow(a);
  const flowMax = flow.reduce((m, f) => Math.max(m, f.amount), 0);
  const totalAnnual = rsuAnnual(a);

  return (<>
    <Header emoji="📈" title="Equity-based compensation" sub="RSUs or stock options — add your vesting schedule." />
    <Card>
      <Text style={s.label}>What kind of award is it?</Text>
      <Segmented ctx={ctx} k="equityType" defaultValue="rsu" options={[
        { value: 'rsu', label: 'Restricted Stock' }, { value: 'option', label: 'Stock Options' }]} />
      <Text style={s.note2}>{isOpt
        ? 'Value = (market − strike) × number of options. Each option = 1 share — enter your grant count, NOT 100-share trading contracts.'
        : 'Value = shares × price per share'}</Text>
      {/* B47 finding 1: no place to enter the stock/option symbol — now there is */}
      <Text style={s.label}>Company stock symbol (optional)</Text>
      <TextInput style={s.input} autoCapitalize="characters" autoCorrect={false} placeholder="e.g. AAPL"
        placeholderTextColor={Colors.textTertiary} value={a.equityTicker ?? ''}
        onChangeText={(t) => ctx.setAnswer('equityTicker', t)} accessibilityLabel="Company stock symbol" />
      {ticker.length > 0 && (
        <Text style={s.note2}>{livePrice != null
          ? `${ticker}: ${currencySymbol()}${livePrice} (live) — new rows start at it, edit freely`
          : `${ticker} saved — live re-marking of your grants arrives with the price provider`}</Text>
      )}
      {isOpt && (
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Strike price</Text>
            <TextInput style={s.input} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
              value={a.optStrike ?? ''} onChangeText={(t) => ctx.setAnswer('optStrike', t)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Market price</Text>
            <TextInput style={s.input} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
              value={a.optMarket ?? ''} onChangeText={(t) => ctx.setAnswer('optMarket', t)} />
          </View>
        </View>
      )}
    </Card>

    <Card>
      <Text style={s.cap}>Vesting schedule</Text>
      <View style={s.schedRow}>
        {cols.map((c) => <Text key={c.key} style={[s.schedHeadTxt, { flex: 1 }]}>{c.label}</Text>)}
        <View style={{ width: 24 }} />
      </View>
      {Array.from({ length: visible }).map((_, i) => {
        const r = rows[i] ?? {};
        const filled = Object.values(r).some((v) => String(v ?? '').trim() !== '');
        return (
          <View key={i} style={s.schedRow}>
            {cols.map((c) => (c.key === 'date'
              ? <MonthYearCell key={c.key} value={r.date} onChange={(v) => setCell(i, 'date', v)} style={[s.schedCell, { flex: 1, justifyContent: 'center' }]} />
              : <TextInput key={c.key} style={[s.schedCell, { flex: 1 }]} keyboardType={c.kb}
                  placeholder={c.ph} placeholderTextColor={Colors.textTertiary}
                  value={r[c.key] ?? ''} onChangeText={(t) => setCell(i, c.key, t)} />
            ))}
            <TouchableOpacity style={{ width: 24, alignItems: 'center' }} disabled={!filled}
              onPress={() => removeRow(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.removeX}>{filled ? '✕' : ''}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
      <TouchableOpacity style={s.addBtn} onPress={() => setExtra((e) => e + 1)}>
        <Text style={s.addBtnT}>+ Add row</Text></TouchableOpacity>
    </Card>

    {/* annual vesting cash-flow — chart + table */}
    {flow.length > 0 && (
      <Card>
        <Text style={s.cap}>Annual vesting cash flow</Text>
        {flow.map((f) => (
          <View key={f.year} style={s.flowRow}>
            <Text style={s.flowYear}>{f.year}</Text>
            <View style={s.flowBarTrack}><View style={[s.flowBarFill, { width: `${flowMax > 0 ? Math.max(4, (f.amount / flowMax) * 100) : 0}%` }]} /></View>
            <Text style={s.flowAmt}>{money(f.amount)}</Text>
          </View>
        ))}
      </Card>
    )}

    {totalAnnual > 0 && <Callout text={`${money(totalAnnual)}/year average while vesting`}
      sub={isOpt && totalAnnual === 0 ? 'Underwater — strike is at or above market.' : 'Taxed as ordinary income at vesting, like salary.'} />}
  </>);
}

// Income recap — line-item breakdown, gross→net→available per year, plus a lumpy monthly
// cash-flow chart/table that you can flip between gross, net, and available.
function IncomeRecap({ ctx }: { ctx: StepCtx }) {
  const a = ctx.answers;
  const [view, setView] = React.useState<'chart' | 'table'>('chart');
  const [mode, setMode] = React.useState<'gross' | 'net' | 'available'>('available');

  const ex = extraIncome(a);
  const scholarshipAnnual = Array.isArray(a.scholarships)
    ? a.scholarships.reduce((t: number, x: any) => t + (x?.freq === 'monthly' ? num(x?.amount) * 12 : num(x?.amount)), 0)
    : (a.scholarshipFreq === 'monthly' ? num(a.scholarshipAmount) * 12 : num(a.scholarshipAmount));
  // every source, annualized — listed so the line items visibly add up to the total
  const lines: { label: string; value: number; once?: boolean }[] = [
    { label: 'Job (salary/wages)', value: salaryAnnual(a) },
    { label: 'Tips', value: num(a.tipsMonthly) * 12 },
    // current income only when actually receiving it now — future SS (outlook editor) excluded
    { label: 'Retirement income', value: (!Array.isArray(a.incomeSources) || a.incomeSources.includes('retirement_income')) ? retirementMonthlyIncome(a) * 12 : 0 },
    { label: 'Bonus', value: num(a.bonusAnnual) },
    { label: 'Signing bonus', value: num(a.signingOnetime), once: true },
    { label: 'Equity (vesting)', value: rsuAnnual(a) },
    { label: 'Rental income (net)', value: rentalNetAnnual(a) },
    { label: 'Self-employment', value: a.seFreq === 'annual' ? num(a.seAmount) : num(a.seAmount) * 12 },
    { label: 'Interest & dividends', value: num(a.invAnnual) },
    { label: 'Benefits', value: benefitAnnual(a) },
    { label: 'Child support / alimony', value: num(a.supportMonthly) * 12 },
    { label: 'Scholarships & grants', value: scholarshipAnnual },
    { label: 'Other income', value: a.otherFreq === 'annual' ? num(a.otherAmount) : a.otherFreq === 'onetime' ? num(a.otherAmount) : num(a.otherAmount) * 12 },
  ].filter((l) => l.value > 0);

  const total = totalGrossAnnual(a);              // sum of all the lines above
  const rate = incomeTaxRate(a);
  const tax = taxableAnnual(a) * rate;            // tax applies to the taxable part only
  const net = total - tax;
  const k401 = num(a.c_401k) * 12;
  const availableYr = net - k401;
  const nonTaxable = ex.nontaxMonthly * 12 + ex.onetimeNontax;   // benefits + support + scholarships + gifts

  const grid = incomeMonthlyGrid(a, mode);
  const gridMax = Math.max(...grid.map((g) => g.amount), 1);
  const gridMin = Math.min(...grid.map((g) => g.amount), 0);
  const modeLabel = mode === 'gross' ? 'Total' : mode === 'net' ? 'Net (after tax)' : 'Take-home';   // 'available' = canonical take-home (after tax & 401k)

  // insight: the typical (most-common) month, plus the lean stretch and the windfall months —
  // each described by its month range, e.g. "$19k most months · lower May–Jul (~$10k)".
  const availGrid = incomeMonthlyGrid(a, 'available');
  const labels = availGrid.map((g) => g.label);
  const amounts = availGrid.map((g) => g.amount);
  const avgMo = domainTakeHomeMonthly(a);   // single source — identical to availableYr/12, shared with the expenses-plan screen
  // most-common month = mode of the rounded amounts (ties → the higher value)
  const round100 = (x: number) => Math.round(x / 100) * 100;
  const freq: Record<number, number> = {};
  amounts.forEach((x) => { const k = round100(x); freq[k] = (freq[k] ?? 0) + 1; });
  const typical = Number(Object.keys(freq).sort((p, q) => (freq[+q] - freq[+p]) || (+q - +p))[0] ?? 0);
  const lowMo = amounts.map((x, i) => ({ x, i })).filter((o) => o.x < typical * 0.9);
  const highMo = amounts.map((x, i) => ({ x, i })).filter((o) => o.x > typical * 1.1);
  const minLow = lowMo.length ? Math.min(...lowMo.map((o) => o.x)) : 0;
  const maxHigh = highMo.length ? Math.max(...highMo.map((o) => o.x)) : 0;

  return (<>
    <Header emoji="📊" title="Your income" sub="Here's what you actually have to work with." />

    {/* hero — what you actually have to use */}
    <View style={s.heroCard}>
      <Text style={s.heroCardLabel}>Take-home / year</Text>
      <Text style={s.heroCardValue}>{money(availableYr)}</Text>
      <Text style={s.heroCardSub}>≈ {money(avgMo)}/month average</Text>
    </View>

    {/* insight: typical month + the lean stretch + the windfall months */}
    {availableYr > 0 && (() => {
      const steady = lowMo.length === 0 && highMo.length === 0;
      const pieces: string[] = [];
      if (highMo.length) pieces.push(`extra in ${monthRanges(highMo.map((o) => o.i), labels)} (+${money(maxHigh - typical)}, ~${money(maxHigh)}/month)`);
      if (lowMo.length) pieces.push(`lower in ${monthRanges(lowMo.map((o) => o.i), labels)} (~${money(Math.max(0, minLow))}/month)`);
      return (
        <Callout
          text={steady ? `About ${money(Math.max(0, avgMo))}/month, steady all year` : `About ${money(Math.max(0, typical))} most months`}
          sub={steady ? 'Your income is steady month to month.' : `${pieces.join('; ')} — plan ahead for those.`} />
      );
    })()}

    {/* full breakdown — every source adds up to the total */}
    <Card>
      <Text style={s.sectionLabel}>WHERE IT COMES FROM</Text>
      {lines.map((l) => (
        <RecapStat key={l.label} plain label={l.label} value={`${money(l.value)}${l.once ? ' once' : '/year'}`} />
      ))}
      <RecapBox label="Total income /year" value={money(total)} />

      <Text style={[s.sectionLabel, { marginTop: Spacing.md }]}>WHAT'S TAKEN OUT</Text>
      <RecapStat plain label={`Tax (~${Math.round(rate * 100)}% on taxable income)`} value={`-${money(tax)}`} color={Colors.amber} />
      {nonTaxable > 0 && <RecapStat plain label="Tax-free (benefits, support, gifts…)" value={money(nonTaxable)} color={Colors.textTertiary} />}
      {k401 > 0 && <RecapStat plain label="401(k), locked to retirement" value={`-${money(k401)}`} color={Colors.amber} />}
      <RecapBox label="Available /year" value={money(availableYr)} tone="green" />
    </Card>

    {/* monthly cash flow — lumpy, with mode + view toggles */}
    <Card>
      <Text style={s.cap}>Monthly cash flow</Text>
      <Segmented ctx={{ ...ctx, answers: { m: mode }, setAnswer: (_, v) => setMode(v as any) }} k="m"
        options={[{ value: 'gross', label: 'Gross' }, { value: 'net', label: 'Net' }, { value: 'available', label: 'Take-home' }]} />
      <View style={{ marginTop: 6 }}>
        <Segmented ctx={{ ...ctx, answers: { v: view }, setAnswer: (_, v) => setView(v as any) }} k="v"
          options={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]} />
      </View>

      {view === 'chart' ? (
        <View style={{ marginTop: Spacing.sm }}>
          {grid.map((g) => (
            <View key={g.label} style={s.flowRow}>
              <Text style={s.flowYear}>{g.label}</Text>
              <View style={s.flowBarTrack}>
                <View style={[s.flowBarFill, { width: `${Math.max(3, ((g.amount - Math.min(0, gridMin)) / (gridMax - Math.min(0, gridMin))) * 100)}%`, backgroundColor: g.amount < 0 ? Colors.red : Colors.primary }]} />
              </View>
              <Text style={s.flowAmt}>{money(g.amount)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ marginTop: Spacing.sm }}>
          {grid.map((g) => (
            <View key={g.label} style={s.tableRow}>
              <Text style={s.tableCell}>{g.label}</Text>
              <Text style={[s.tableCell, { textAlign: 'right', fontWeight: '700', color: g.amount < 0 ? Colors.red : Colors.textPrimary }]}>{money(g.amount)}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={s.note2}>{modeLabel}. {(() => {
        const why: string[] = [];
        if (num(a.bonusAnnual) > 0) why.push(`a bonus lands in ${MONTHS3[Math.min(11, Math.max(0, (num(a.bonusMonth) || 12) - 1))]}`);
        if (num(a.signingOnetime) > 0 || ex.onetimeTaxable + ex.onetimeNontax > 0) why.push('one-time payments land in their month');
        if (rsuAnnual(a) > 0) why.push('equity follows your vesting months');
        if (Array.isArray(a.scholarships) && a.scholarships.some((x: any) => num(x?.amount) > 0 && x?.freq !== 'monthly')) why.push('scholarships land when they\'re disbursed');
        return why.length ? `Some months differ because ${why.join('; ')}.` : 'Your income is the same every month.';
      })()}</Text>
    </Card>
  </>);
}

// Expenses categories. `tier` = priority (how the screen is grouped: Critical → Important →
// Nice-to-have). `bucket` = frequency for the budget math (fixed/flexible = monthly, nonmonthly =
// yearly/per-semester) — the budget domain reads this. `stages` limits a category to a life stage.
type Tier = 'critical' | 'important' | 'flex';
const SPEND_CATS: { id: string; label: string; tier: Tier; bucket: 'fixed' | 'nonmonthly' | 'flexible'; icon: string; stages?: Status[] }[] = [
  // Critical — must-pay
  { id: 'rent', label: 'Rent / Mortgage', tier: 'critical', bucket: 'fixed', icon: '🏠' },   // #16: one label across onboarding/budget/add-expense
  { id: 'tuition', label: 'Tuition & fees', tier: 'critical', bucket: 'nonmonthly', icon: '🎓', stages: ['student'] },
  { id: 'mealplan', label: 'Meal plan', tier: 'critical', bucket: 'nonmonthly', icon: '🍽️', stages: ['student'] },
  { id: 'utilities', label: 'Utilities', tier: 'critical', bucket: 'fixed', icon: '⚡' },
  { id: 'groceries', label: 'Groceries', tier: 'critical', bucket: 'flexible', icon: '🛒' },
  // Important
  { id: 'phone', label: 'Phone / Internet', tier: 'important', bucket: 'fixed', icon: '📶' },
  { id: 'insurance', label: 'Insurance', tier: 'important', bucket: 'fixed', icon: '🛡️' },
  { id: 'gas', label: 'Gas / Transport', tier: 'important', bucket: 'flexible', icon: '⛽' },
  { id: 'books', label: 'Books & supplies', tier: 'important', bucket: 'nonmonthly', icon: '📚', stages: ['student'] },
  { id: 'repairs', label: 'Repairs / maintenance', tier: 'important', bucket: 'nonmonthly', icon: '🔧' },
  // Nice-to-have — wants
  { id: 'dining', label: 'Dining out', tier: 'flex', bucket: 'flexible', icon: '🍔' },
  { id: 'fun', label: 'Entertainment', tier: 'flex', bucket: 'flexible', icon: '🎉' },
  { id: 'shopping', label: 'Shopping', tier: 'flex', bucket: 'flexible', icon: '🛍️' },
  { id: 'subs', label: 'Subscriptions', tier: 'flex', bucket: 'fixed', icon: '📺' },
  { id: 'travel', label: 'Travel / holidays', tier: 'flex', bucket: 'nonmonthly', icon: '✈️' },
  { id: 'gifts', label: 'Gifts', tier: 'flex', bucket: 'nonmonthly', icon: '🎁' },
];
const TIERS: { key: Tier; title: string; note: string }[] = [
  { key: 'critical', title: 'Critical', note: 'must-pay' },
  { key: 'important', title: 'Important', note: 'needed' },
  { key: 'flex', title: 'Nice-to-have', note: 'wants' },
];
// distinct color per tier for the spectrum bar + legend dots; green reserved for "left to save"
const TIER_COLOR: Record<string, string> = { critical: Colors.blue, important: Colors.amber, flex: '#7A5AA7' };
const BUCKET_COLOR = TIER_COLOR;   // legacy alias (kept for any older refs)
const SAVE_COLOR = Colors.primary;

// Final cash-flow recap — hero totals (gross/net/spend/save), an insight, and a stacked
// monthly column chart showing where each month's gross splits: tax · expenses · savings.
function CashflowRecap({ ctx }: { ctx: StepCtx }) {
  const a = ctx.answers;
  const [chartMode, setChartMode] = React.useState<'amount' | 'percent'>('amount');
  const retired = ctx.status === 'retired';
  const grossYrGate = grossAnnual(a);

  // retired / no-accumulation-income → simple income-vs-expenses recap
  if (retired || grossYrGate <= 0) {
    // take-home via the canonical takeHomeMonthly (after tax AND 401k) — same helper every screen uses
    const incMo = domainTakeHomeMonthly(a) || retirementMonthlyIncome(a);   // labeled "Take-Home" → use the canonical helper
    const spendMo = Math.max(spendBuckets(a).monthly_total, num(a.monthlySpending));
    const left = incMo - spendMo;
    return (<>
      <Header emoji="📊" title="Your cash flow" sub="Take-home income vs expenses each month." />
      <Card>
        <RecapStat label="Take-home" value={`${money(incMo)}/month`} />
        <RecapStat plain label="Expenses" value={`-${money(spendMo)}/month`} color={Colors.amber} />
        <RecapBox label="Surplus /month" value={money(left)} tone={left >= 0 ? 'green' : 'neutral'} />
      </Card>
    </>);
  }

  // #6: derive EVERY annual figure from the one grid-based roll-up, so "Free to save /year" reconciles
  // exactly with the savings-plan screen's monthly average × 12 (they used to disagree — the recap
  // annualized income flatly while the savings plan summed month-by-month).
  const cf = annualCashflow(a);
  const grossYr = cf.grossYr;                                                 // grid-summed gross → waterfall adds up exactly
  const taxYr = cf.taxYr;
  const netYr = cf.netYr;
  const spendYr = cf.spendYr;
  const spendMo = spendYr / 12;
  const k401Yr = cf.k401Yr;
  const k401Mo = k401Yr / 12;
  const availableYr = cf.availableYr;
  const saveYr = cf.saveYr;                                                   // FREE to save — === Σ savingsByMonth
  const totalSaveYr = saveYr + k401Yr;            // all savings incl. 401(k) — a deficit NETS against it (no floor)
  const keep = grossYr > 0 ? Math.round((netYr / grossYr) * 100) : 0;        // take-home per $100
  const taxPct = grossYr > 0 ? Math.round((taxYr / grossYr) * 100) : 0;       // effective tax rate
  const savePctGross = grossYr > 0 ? Math.max(0, Math.round((totalSaveYr / grossYr) * 100)) : 0;
  const C401 = Colors.primaryDark;
  const spendPct = grossYr > 0 ? Math.round((spendYr / grossYr) * 100) : 0;
  const grossGrid = incomeMonthlyGrid(a, 'gross');
  const netGrid = incomeMonthlyGrid(a, 'net');    // per-month net → per-month tax is EXACT, not rate×gross
  const maxG = Math.max(...grossGrid.map((m) => m.amount), 1);

  return (<>
    <Header emoji="📊" title="Your full recap" sub="Your full-year picture." />

    {/* hero — donut on top, then a full-width waterfall: Gross − Tax − 401(k) = Take-home − Expenses = Surplus */}
    <View style={s.heroCard}>
      <Donut segments={[
        { value: taxYr, color: Colors.amber },
        { value: k401Yr, color: C401 },
        { value: spendYr, color: Colors.blue },
        { value: Math.max(0, saveYr), color: Colors.primary },
      ]}>
        <Text style={s.ringPct}>{savePctGross}%</Text>
        <Text style={s.ringPctSub}>to savings</Text>
      </Donut>
      <View style={{ width: '100%', marginTop: Spacing.md }}>
        <WfRow label="Gross income /year" value={money(grossYr)} />
        <WfRow dot={Colors.amber} label={`Tax · ~${taxPct}% of gross`} value={`−${money(taxYr)}`} />
        {k401Yr > 0 && <WfRow dot={C401} label="401(k) · locked for retirement" value={`−${money(k401Yr)}`} />}
        <WfRow label="Take-home /year" value={money(availableYr)} strong color={Colors.primaryDark} topline />
        <WfRow dot={Colors.blue} label={`Expenses · ${spendPct}% of gross`} value={`−${money(spendYr)}`} />
        <WfRow dot={saveYr >= 0 ? Colors.primary : Colors.red} label="Surplus /year" value={money(saveYr)} strong
          color={saveYr >= 0 ? Colors.primary : Colors.red} topline />
      </View>
    </View>

    {/* insight: keep-per-$100, effective tax, savings rate */}
    <Callout text={`You keep ${currencySymbol()}${keep} of every ${currencySymbol()}100 you earn`}
      sub={saveYr < 0
        ? `~${taxPct}% goes to tax — and your expenses are more than you keep. Trim a category.`
        : `~${taxPct}% goes to tax.`}
      warn={saveYr < 0} />

    {/* stacked monthly column chart, $ or % */}
    <Card>
      <Text style={s.cap}>Each month: tax · expenses · savings</Text>
      <View style={{ marginTop: 6, marginBottom: 4 }}>
        <Segmented ctx={{ ...ctx, answers: { cm: chartMode }, setAnswer: (_, v) => setChartMode(v as any) }} k="cm"
          options={[{ value: 'amount', label: 'Amount' }, { value: 'percent', label: 'Percent' }]} />
      </View>
      <View style={s.colChart}>
        {grossGrid.map((m, mi) => {
          const g = m.amount, tax = Math.max(0, g - netGrid[mi].amount);   // exact monthly tax (non-taxable months untouched)
          const k4 = Math.min(k401Mo, Math.max(0, g - tax));
          const sp = Math.min(spendMo, Math.max(0, g - tax - k4));
          const sv = Math.max(0, g - tax - k4 - spendMo);
          const h = chartMode === 'percent' ? (g > 0 ? 100 : 0) : (g / maxG) * 100;
          // month's gross magnitude, no "$" so it fits a narrow column (e.g. 8.2K, 18K)
          const k = g / 1000;
          const lbl = g <= 0 ? '' : `${k >= 10 ? Math.round(k) : k.toFixed(1)}K`;
          return (
            <View key={m.label} style={s.colItem}>
              <View style={s.colBarWrap}>
                {!!lbl && <Text style={s.colVal} numberOfLines={1}>{lbl}</Text>}
                <View style={[s.stackCol, { height: `${h}%` }]}>
                  <View style={{ flex: Math.max(0.0001, sv), backgroundColor: Colors.primary }} />
                  <View style={{ flex: Math.max(0.0001, k4), backgroundColor: C401 }} />
                  <View style={{ flex: Math.max(0.0001, sp), backgroundColor: Colors.blue }} />
                  <View style={{ flex: Math.max(0.0001, tax), backgroundColor: Colors.amber }} />
                </View>
              </View>
              <Text style={s.colLabel}>{m.label[0]}</Text>
            </View>
          );
        })}
      </View>
      <View style={s.legendWrap}>
        <Legend color={Colors.amber} label="Tax" value={`${money(taxYr)} · ${taxPct}%`} />
        {k401Yr > 0 && <Legend color={C401} label="401(k)" value={money(k401Yr)} />}
        <Legend color={Colors.blue} label="Expenses" value={`${money(spendYr)} · ${spendPct}%`} />
        <Legend color={Colors.primary} label="Surplus" value={money(Math.max(0, saveYr))} />
      </View>
    </Card>
  </>);
}

// Savings plan — column chart of what's free to save each month (income after tax/401k − expenses),
// a table you can keep or override per month, a hero annual total, and an insight.
function SavingsEditor({ ctx }: { ctx: StepCtx }) {
  const a = ctx.answers;
  const suggested = savingsByMonth(a);                 // [{label, amount}] × 12
  const mode = a.savingsMode ?? 'auto';
  const overrides = (a.savingsByMonth ?? []) as string[];
  const amountOf = (i: number) =>
    mode === 'custom' && overrides[i] != null && overrides[i] !== '' ? num(overrides[i]) : suggested[i].amount;
  const months = suggested.map((m, i) => ({ label: m.label, amount: amountOf(i) }));
  const annual = months.reduce((t, m) => t + m.amount, 0);
  const avg = annual / 12;
  const net = domainTakeHomeMonthly(a);   // "% of take-home" must use true take-home (after 401k), same as every other screen
  const pct = net > 0 ? Math.round((avg / net) * 100) : 0;
  const maxA = Math.max(...months.map((m) => m.amount), 1);

  const setMonth = (i: number, val: string) => {
    const next = overrides.slice(); while (next.length < 12) next.push('');
    next[i] = val; ctx.setAnswer('savingsByMonth', next);
  };

  const baseline = Math.min(...months.map((m) => m.amount));
  const spikes = months.map((m) => ({ label: m.label, extra: m.amount - baseline }))
    .filter((sp) => sp.extra > Math.max(500, Math.abs(baseline) * 0.15))
    .sort((x, y) => y.extra - x.extra).slice(0, 2);

  return (<>
    <Header emoji="🐷" title="How much can you save?" sub="From your income and expenses — month by month." />

    {/* hero — total annual savings */}
    <View style={s.heroCard}>
      <Text style={s.heroCardLabel}>Surplus / year</Text>
      <Text style={[s.heroCardValue, annual < 0 && { color: Colors.red }]}>{money(annual)}</Text>
      <Text style={s.heroCardSub}>≈ {money(avg)}/month average{net > 0 ? ` · ${pct}% of take-home` : ''}</Text>
    </View>

    {/* column chart of monthly savable amount */}
    <Card>
      <Text style={s.cap}>Surplus by month</Text>
      <View style={s.colChart}>
        {months.map((m) => (
          <View key={m.label} style={s.colItem}>
            <View style={s.colBarWrap}>
              {m.amount !== 0 && <Text style={[s.colVal, m.amount < 0 && { color: Colors.red }]} numberOfLines={1}>{moneyShort(m.amount)}</Text>}
              <View style={[s.colBar, { height: `${Math.max(2, (Math.max(0, m.amount) / maxA) * 100)}%`, backgroundColor: m.amount < 0 ? Colors.red : Colors.primary }]} />
            </View>
            <Text style={s.colLabel}>{m.label[0]}</Text>
          </View>
        ))}
      </View>
      <Text style={s.note2}>Net of tax, 401(k), and your expenses — each in the month it actually happens. Big one-time bills (like tuition) show up as a dip in that month, not spread across the year.</Text>
    </Card>

    {/* keep the suggested amounts, or edit any month */}
    <Card>
      <Text style={s.sectionLabel}>MONTHLY PLAN</Text>
      <View style={{ marginTop: 6, marginBottom: 4 }}>
        <Segmented ctx={{ ...ctx, answers: { sm: mode }, setAnswer: (_, v) => ctx.setAnswer('savingsMode', v) }} k="sm"
          options={[{ value: 'auto', label: 'Use suggested' }, { value: 'custom', label: 'Customize' }]} />
      </View>
      {months.map((m, i) => (
        <View key={m.label} style={s.savingsRow}>
          <Text style={s.savingsMonth}>{m.label}</Text>
          {mode === 'custom'
            ? <TextInput style={s.savingsInput} keyboardType="decimal-pad" placeholder={money(suggested[i].amount)} placeholderTextColor={Colors.textTertiary}
                value={overrides[i] ?? ''} onChangeText={(t) => setMonth(i, t)} />
            : <Text style={[s.savingsVal, m.amount < 0 && { color: Colors.red }]}>{money(m.amount)}</Text>}
        </View>
      ))}
    </Card>

    {annual !== 0 && <Callout text={`Saving about ${money(annual)} this year`}
      sub={annual < 0 ? "Your expenses are more than you bring in — trim a category or lower a month."
        : spikes.length ? `Set more aside in ${spikes.map((sp) => sp.label).join(' & ')} — your equity & bonus months.`
          : `Steady at about ${money(avg)}/month.`}
      warn={annual < 0} />}
  </>);
}

// Donut ring — colored arc per segment (value+color), with content in the center hole.
function Donut({ segments, size = 116, stroke = 16, children }: {
  segments: { value: number; color: string }[]; size?: number; stroke?: number; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((t, sg) => t + Math.max(0, sg.value), 0) || 1;
  let acc = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.bgTertiary} strokeWidth={stroke} fill="none" />
          {segments.map((sg, i) => {
            const dash = (Math.max(0, sg.value) / total) * c;
            const el = (
              <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={sg.color} strokeWidth={stroke} fill="none"
                strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc} strokeLinecap="butt" />
            );
            acc += dash;
            return el;
          })}
        </G>
      </Svg>
      <View style={{ alignItems: 'center' }}>{children}</View>
    </View>
  );
}

// Waterfall row — full-width, dot column + label + right-aligned tabular amount. Used by the
// full-recap hero so every number lines up in one clean column. `onPress` makes the row a
// tappable editor entry (link-styled value + chevron).
function WfRow({ dot, label, value, strong, color, topline, onPress }: {
  dot?: string; label: string; value: string; strong?: boolean; color?: string; topline?: boolean; onPress?: () => void;
}) {
  const body = (
    <>
      <View style={[s.dot, { backgroundColor: dot ?? 'transparent' }]} />
      <Text style={[s.wfLabel, strong && { fontWeight: '800', color: color ?? Colors.textPrimary }]}>{label}</Text>
      <Text style={[s.wfVal, strong && { fontSize: 15, fontWeight: '800' }, color ? { color } : null,
        onPress ? { color: Colors.primary, fontWeight: '800' } : null]}>{value}{onPress ? ' ›' : ''}</Text>
    </>
  );
  if (onPress) return <TouchableOpacity style={[s.wfRow, topline && s.wfTopline]} onPress={onPress}>{body}</TouchableOpacity>;
  return <View style={[s.wfRow, topline && s.wfTopline]}>{body}</View>;
}

// ONE free-cash measure for goal capacity — the SAME month-aware number the save-plan screen
// shows (income placed in its months, net of tax/401(k)/expenses), minus the investing plan.
// Two screens disagreeing about the same pool is how dollars get counted twice.
function goalCapacity(a: Record<string, any>): { capMo: number; investMo: number; hasCashflow: boolean } {
  const investMo = num(a.c_roth) + num(a.c_invest) + num(a.c_property);
  const hasCashflow = num(a.monthlySpending) > 0 || spendBuckets(a).monthly_total > 0;
  const freeMo = hasCashflow
    ? savingsByMonth(a).reduce((t, m) => t + m.amount, 0) / 12
    : monthlyIncome(a) - num(a.monthlySpending) - num(a.c_401k);
  const capMo = num(a.monthlySavingsCapacity) || Math.max(0, freeMo - investMo);
  return { capMo, investMo, hasCashflow };
}

// Retirement outlook recap (accumulation) — amortization-based "needed" with the math on-screen.
// All in TODAY'S dollars: real returns = nominal − live inflation (BLS CPI), so the user's
// "expenses in today's dollars" needs no separate escalator and the answer reads naturally.
// The guaranteed-income row opens an inline editor (Social Security / pension) — the recap
// recomputes live as it's set.
function RetireOutlook({ ctx }: { ctx: StepCtx }) {
  const a = ctx.answers;
  const [giOpen, setGiOpen] = React.useState(false);
  const age = ageOrDefault(a);
  const rAge = num(a.targetRetirementAge) || 65;
  const years = Math.max(1, rAge - age);
  const horizon = num(a.horizonAge) || 90;                          // plan-to age (asked in drawdown flows; default 90)
  const infl = (useStore.getState() as any).inflationRate ?? 2.4;   // live BLS CPI, % YoY
  const realAcc = Math.max(0.01, 0.07 - infl / 100);                // accumulation: 7% nominal − inflation
  const realDraw = Math.max(0.005, 0.055 - infl / 100);             // drawdown: 5.5% nominal (balanced) − inflation
  const guaranteedMo = retirementMonthlyIncome(a);
  const bequest = num(a.legacyTarget);                              // explicit; 0 = spend down to zero
  const need = capitalNeeded({
    monthlySpend: num(a.expectedRetirementSpending), guaranteedMonthly: guaranteedMo,
    retireAge: rAge, horizonAge: horizon, realReturn: realDraw, bequest,
  });
  const otherSavings = num(a.investmentHoldings) + num(a.currentSavingsPortfolio);   // captured only in some flows
  const monthlyContrib = monthlyContributions(a);
  const retireStart = num(a.currentRetirementSavings) + num(a.currentRetirementSavingsRoth);   // #8: Traditional + Roth
  const projected = fv(retireStart + otherSavings, monthlyContrib, years, realAcc);
  const gap = projected - need.needed;
  return (<><Header emoji="🏖️" title="Your retirement outlook" sub="In today's dollars — here's the math, line by line." />
    <Card>
      <RecapStat label={`Needed at ${rAge} (to age ${horizon})`} value={money(need.needed)} />
      <RecapStat label={`Projected by ${rAge}`} value={money(projected)} color={Colors.primary} />
      <View style={s.divider} />
      <RecapStat label={gap >= 0 ? 'Surplus' : 'Gap'} value={money(Math.abs(gap))} color={gap >= 0 ? Colors.primary : Colors.red} />
      <Bar aPct={need.needed > 0 ? (projected / need.needed) * 100 : 0} color={gap >= 0 ? Colors.primary : Colors.red} />
      <Text style={[s.hint, { marginTop: 8 }]}>
        Projected {money(projected)} = your {money(retireStart)} retirement savings
        {otherSavings > 0 ? ` + ${money(otherSavings)} investments` : ''}
        {monthlyContrib > 0 ? ` + ${money(monthlyContrib)}/month you add` : ''}, growing ≈{(realAcc * 100).toFixed(2)}%/year
        after inflation for {plural(years, 'year')}.
        {otherSavings <= 0 ? " It does NOT include other investments, property, or accounts not captured yet — add them in Net Worth and this updates." : ''}
      </Text>
    </Card>
    <Card>
      <Text style={s.sectionLabel}>HOW "NEEDED" IS CALCULATED</Text>
      <WfRow label="Expenses in retirement" value={`${money(num(a.expectedRetirementSpending))}/month`} />
      <WfRow label="Guaranteed income (Social Security, pension)" onPress={() => setGiOpen(true)}
        value={guaranteedMo > 0 ? `−${money(guaranteedMo)}/month` : 'Set it'} />
      <WfRow label="To fund from savings" value={`${money(need.netAnnual)}/year`} topline />
      <WfRow label={`Funded years (${rAge} → ${horizon})`} value={`× ${need.years} yrs`} />
      <WfRow label={`Savings keep earning ~${(realDraw * 100).toFixed(2)}%/year real`} value={`→ × ${need.annuityFactor}`} />
      {bequest > 0 && <WfRow label="Leave behind (your legacy goal)" value={`+${money(need.pvBequest)}`} />}
      <WfRow label="Capital needed" value={money(need.needed)} strong color={Colors.primaryDark} topline />
      <Text style={s.hint}>
        Real returns = growth minus {infl.toFixed(2)}% inflation (live CPI): ~7% growth (≈{(realAcc * 100).toFixed(2)}% real) while saving,
        a conservative ~5.5% (≈{(realDraw * 100).toFixed(2)}% real) while retired.
        {bequest <= 0 ? ' Assumes the money is spent down to zero — add a "leave money to family" goal to plan a bequest.' : ''}
        {otherSavings <= 0 ? ' Counts only retirement savings + your investing plan; add other accounts in Net Worth to complete the picture.' : ''}
      </Text>
    </Card>

    <Modal visible={giOpen} transparent animationType="fade" onRequestClose={() => setGiOpen(false)}>
      <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setGiOpen(false)}>
        <View style={s.modalCard} onStartShouldSetResponder={() => true}>
          <Text style={s.cap}>Guaranteed retirement income</Text>
          <Text style={[s.hint, { marginBottom: 8 }]}>Monthly amounts, today's dollars. Every dollar here lowers what your savings must cover.</Text>
          <MoneyRow ctx={ctx} k="ri_ss" label="Social Security (your estimate from ssa.gov)" />
          <MoneyRow ctx={ctx} k="ri_pension" label="Pension" />
          <MoneyRow ctx={ctx} k="ri_annuities" label="Annuity / other" />
          {guaranteedMo > 0 && <Callout text={`−${money(guaranteedMo)}/month off your savings target`}
            sub={`Capital needed drops to ${money(need.needed)}.`} />}
          <TouchableOpacity style={s.addBtn} onPress={() => setGiOpen(false)}><Text style={s.addBtnT}>Done</Text></TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  </>);
}

// Savings plan — ONE allocation question on top of the month-by-month free-cash picture:
// "of your free cash, how much will you invest per year?" ($ or %). The Roth/brokerage/property
// SPLIT is deliberately NOT asked here (false precision at onboarding) — it lives in-app where it
// has consequences (Retirement tax-smart moves, Net Worth accounts). Stored as monthly dollars in
// c_invest (the canonical contribution key all projections read); goals draw from the REMAINDER.
function SavePlanScreen({ ctx }: { ctx: StepCtx }) {
  const a = ctx.answers;
  const [view, setView] = React.useState<'chart' | 'table'>('chart');
  const hasCashflow = num(a.monthlySpending) > 0 || spendBuckets(a).monthly_total > 0;
  const sug = savingsByMonth(a);                              // [{label, amount}] × 12, net of tax+401(k)+expenses
  const annualSave = sug.reduce((t, m) => t + m.amount, 0);
  const base = Math.max(0, annualSave);
  const maxA = Math.max(...sug.map((m) => m.amount), 1);
  const investMo = num(a.c_roth) + num(a.c_invest) + num(a.c_property);   // legacy keys still counted
  const leanIdx = sug.map((m, i) => ({ m, i })).filter((x) => x.m.amount < investMo).map((x) => x.i);

  const unit = base > 0 ? (a.investUnit ?? 'dollar') : 'dollar';
  const raw = a.investRaw ?? (investMo > 0 ? String(investMo * 12) : '');
  const setVal = (t: string, u: string) => {
    ctx.setAnswer('investRaw', t);
    ctx.setAnswer('investUnit', u);
    const annual = u === 'pct' ? (num(t) / 100) * base : num(t);
    ctx.setAnswer('c_invest', String(Math.round(annual / 12)));
    ctx.setAnswer('c_roth', ''); ctx.setAnswer('c_property', '');   // this screen owns ONE number now
  };

  return (<>
    <Header emoji="📥" title="What you can save — and invest"
      sub="Your free cash month by month, and how much of it you'll invest each year." />
    {hasCashflow && (<>
      <View style={s.heroCard}>
        <Text style={s.heroCardLabel}>Surplus / year</Text>
        <Text style={[s.heroCardValue, annualSave < 0 && { color: Colors.red }]}>{money(annualSave)}</Text>
        <Text style={s.heroCardSub}>≈ {money(annualSave / 12)}/month average — but it varies, see below</Text>
      </View>
      <Card>
        <Text style={s.cap}>Surplus by month</Text>
        <View style={{ marginTop: 4, marginBottom: 4 }}>
          <Segmented ctx={{ ...ctx, answers: { v: view }, setAnswer: (_, v) => setView(v as any) }} k="v"
            options={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]} />
        </View>
        {view === 'chart' ? (
          <View style={s.colChart}>
            {sug.map((m) => (
              <View key={m.label} style={s.colItem}>
                <View style={s.colBarWrap}>
                  {m.amount !== 0 && <Text style={[s.colVal, m.amount < 0 && { color: Colors.red }]} numberOfLines={1}>{moneyShort(m.amount)}</Text>}
                  <View style={[s.colBar, { height: `${Math.max(2, (Math.max(0, m.amount) / maxA) * 100)}%`, backgroundColor: m.amount < 0 ? Colors.red : Colors.primary }]} />
                </View>
                <Text style={s.colLabel}>{m.label[0]}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ marginTop: Spacing.sm }}>
            {sug.map((m) => (
              <View key={m.label} style={s.tableRow}>
                <Text style={s.tableCell}>{m.label}</Text>
                <Text style={[s.tableCell, { textAlign: 'right', fontWeight: '700', color: m.amount < 0 ? Colors.red : Colors.textPrimary }]}>{money(m.amount)}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={s.note2}>Net of tax, 401(k), and expenses — each in the month it actually happens (a gift month spikes, months without pay dip).</Text>
      </Card>
    </>)}
    <Card>
      <Text style={s.sectionLabel}>HOW MUCH WILL YOU INVEST PER YEAR?</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <TextInput style={[s.input, { flex: 1 }]} keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary}
          placeholder={unit === 'pct' ? 'e.g. 80' : `${currencySymbol()}0 /year`} value={String(raw)} onChangeText={(t) => setVal(t, unit)} />
        {base > 0 && [{ v: 'dollar', l: `${currencySymbol()}/year` }, { v: 'pct', l: '%' }].map((o) => {
          const on = unit === o.v;
          return (
            <TouchableOpacity key={o.v} style={[s.unitBtn, on && s.unitBtnOn]} onPress={() => setVal(String(raw), o.v)}>
              <Text style={[s.unitTxt, on && s.unitTxtOn]}>{o.l}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {num(raw) > 0 && (unit === 'pct'
        ? <Text style={s.hint}>{num(raw)}% of your yearly free cash = {money(investMo * 12)}/year (≈ {money(investMo)}/month)</Text>
        : <Text style={s.hint}>≈ {money(investMo)}/month</Text>)}
      <Text style={s.hint}>What's left funds your goals and cash buffer. The Roth-vs-brokerage split comes later — the Retirement tab walks you through the tax-smart way.</Text>
    </Card>
    {investMo > 0 && (() => {
      const investYr = investMo * 12;
      const leftover = annualSave - investYr;
      if (!hasCashflow) return <Callout text={`Investing ${money(investYr)}/year (≈ ${money(investMo)}/month)`} />;
      // GENUINELY over the year's net free cash → the only case where "less" is the answer
      if (investYr > annualSave) {
        return <Callout warn text={`${money(investYr)}/year is more than your ${money(annualSave)} of free cash`}
          sub="The year doesn't generate that much after expenses — this plan spends down savings. Lower it to fit." />;
      }
      // Funded over the year — lean months are a TIMING note, not a shortfall
      if (leanIdx.length > 0) {
        return <Callout text={`Funded for the year — timing matters`}
          sub={`In ${monthRanges(leanIdx, sug.map((m) => m.label))} free cash runs below ${money(investMo)}/month, so those deposits come from the surplus you bank in the strong months — keep that surplus in cash until then. ${leftover > 0 ? `${money(leftover)}/year is left for goals and buffer.` : 'At 100%, nothing is left for goals or emergencies — any surprise breaks the plan.'}`} />;
      }
      return <Callout text={`Investing ${money(investYr)}/year (≈ ${money(investMo)}/month)`}
        sub={`Covered by your free cash in every month; ${money(Math.max(0, leftover))}/year is left for goals and your cash buffer.`} />;
    })()}
  </>);
}

// One legend row for the expenses spectrum bar: colored dot + label + value.
function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={s.legendRow}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={s.legendLabel}>{label}</Text>
      <Text style={s.legendVal}>{value}</Text>
    </View>
  );
}

// Group your expenses — common categories grouped into the three buckets; amount in $ or % of
// take-home; non-monthly entered yearly. Totals roll up live with a "% of take-home" insight.
const MONTHS3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Turn month indices into readable ranges: [4,5,6] → "May–Jul"; [0,4] → "Jan, May".
function monthRanges(idxs: number[], labels: string[]): string {
  const sorted = [...idxs].sort((a, b) => a - b);
  if (!sorted.length) return '';
  const parts: string[] = [];
  let start = sorted[0], prev = sorted[0];
  for (let k = 1; k < sorted.length; k++) {
    if (sorted[k] === prev + 1) { prev = sorted[k]; continue; }
    parts.push(start === prev ? labels[start] : `${labels[start]}–${labels[prev]}`);
    start = prev = sorted[k];
  }
  parts.push(start === prev ? labels[start] : `${labels[start]}–${labels[prev]}`);
  return parts.join(', ');
}
// Multi-select of calendar months (1-12) — used for "when is this due / when does this land".
function MonthMultiSelect({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const sel = Array.isArray(value) ? value : [];
  const toggle = (m: number) => onChange(sel.includes(m) ? sel.filter((x) => x !== m) : [...sel, m].sort((a, b) => a - b));
  return (
    <View style={s.monthGrid}>
      {MONTHS3.map((lbl, i) => {
        const m = i + 1, on = sel.includes(m);
        return (
          <TouchableOpacity key={m} style={[s.monthChip, on && s.monthChipOn]} onPress={() => toggle(m)}>
            <Text style={[s.monthTxt, on && s.monthTxtOn]}>{lbl}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Optional exact day + year for a disbursement. Blank day → assume the 1st; blank year → the next
// time that month comes around. A day makes the bill-calendar "what to ask, by when" precise.
function WhenField({ day, year, onDay, onYear }: { day?: string; year?: string; onDay: (v: string) => void; onYear: (v: string) => void }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={s.dueLabel}>Exact day & year (optional)</Text>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <TextInput style={[s.input, { flex: 1 }]} keyboardType="number-pad" placeholder="Day (e.g. 15)" placeholderTextColor={Colors.textTertiary}
          value={day ?? ''} onChangeText={onDay} maxLength={2} />
        <TextInput style={[s.input, { flex: 1 }]} keyboardType="number-pad" placeholder="Year (e.g. 2027)" placeholderTextColor={Colors.textTertiary}
          value={year ?? ''} onChangeText={onYear} maxLength={4} />
      </View>
      <Text style={s.hint}>Add the day so we can tell you exactly how much to have — and ask for — before it's due.</Text>
    </View>
  );
}

function SpendingEditor({ ctx }: { ctx: StepCtx }) {
  const a = ctx.answers;
  const cats = (a.spendCats ?? []) as any[];
  const net = domainTakeHomeMonthly(a);   // #BUG: true take-home (after tax AND 401k) — was monthlyIncome (before 401k), which disagreed with the income screen by the 401(k)
  const get = (id: string) => cats.find((c) => c.id === id) ?? {};
  const upsert = (id: string, patch: any, seed: any) => {
    const i = cats.findIndex((c) => c.id === id);
    const next = cats.slice();
    if (i >= 0) next[i] = { ...next[i], ...patch };
    else next.push({ id, ...seed, ...patch });
    ctx.setAnswer('spendCats', next);
  };
  const remove = (id: string) => ctx.setAnswer('spendCats', cats.filter((c) => c.id !== id));
  const addCustom = (tier: Tier) =>
    ctx.setAnswer('spendCats', [...cats, { id: 'c' + Date.now(), label: '', tier, bucket: 'fixed', amount: '', unit: 'dollar', custom: true }]);

  const monthlyOf = (c: any) => {
    const amt = num(c.amount); if (amt <= 0) return 0;
    const pct = c.unit === 'pct';
    if (c.bucket === 'nonmonthly') return (pct ? (amt / 100) * net * 12 : amt) / 12;
    return pct ? (amt / 100) * net : amt;
  };
  const tierOf = (c: any): Tier => c.tier ?? (SPEND_CATS.find((x) => x.id === c.id)?.tier) ?? 'flex';
  const tierTotal = (t: Tier) => cats.filter((c) => tierOf(c) === t).reduce((s, c) => s + monthlyOf(c), 0);
  const critT = tierTotal('critical'), impT = tierTotal('important'), flexT = tierTotal('flex');
  const totalMo = critT + impT + flexT;
  const estimated = num(a.monthlySpending);                 // the single number from the prior screen
  const uncategorized = Math.max(0, estimated - totalMo);   // estimate not yet broken into categories
  const spend = totalMo + uncategorized;                    // = max(itemized, estimate) — don't ignore the estimate
  const pctOfNet = net > 0 ? Math.round((spend / net) * 100) : 0;
  const save = net - spend;
  const denom = Math.max(net, spend, 1);
  const seg = (v: number): any => `${(v / denom) * 100}%`;

  // NOTE: a plain function we CALL (not a <Component/>), so the TextInputs aren't remounted
  // on every keystroke — that remount is what made the box lose focus after one digit.
  const renderRow = (cat: any, custom: boolean) => {
    const e = get(cat.id);
    const unit = e.unit ?? 'dollar';
    const bucket = e.bucket ?? cat.bucket ?? 'fixed';
    const seed = { label: cat.label, tier: cat.tier ?? tierOf(e), bucket: cat.bucket ?? bucket, unit, amount: e.amount, custom };
    const isNonMonthly = bucket === 'nonmonthly';
    const months: number[] = Array.isArray(e.months) ? e.months : [];
    return (
      <View key={cat.id} style={{ paddingVertical: 3 }}>
        <View style={s.spendRow}>
          {custom
            ? <TextInput style={[s.spendName, s.spendNameInput]} placeholder="Category" placeholderTextColor={Colors.textTertiary}
                value={e.label ?? ''} onChangeText={(t) => upsert(cat.id, { label: t }, seed)} />
            : <Text style={s.spendName} numberOfLines={1}>{cat.icon}  {cat.label}{isNonMonthly ? <Text style={s.perYr}>  /year</Text> : null}</Text>}
          <TextInput style={s.spendAmt} keyboardType="decimal-pad" placeholder={unit === 'pct' ? '0' : `${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
            value={e.amount ?? ''} onChangeText={(t) => upsert(cat.id, { amount: t }, seed)} />
          <TouchableOpacity style={s.unitToggle} onPress={() => upsert(cat.id, { unit: unit === 'pct' ? 'dollar' : 'pct' }, seed)}>
            <Text style={s.unitToggleTxt}>{unit === 'pct' ? '%' : currencySymbol()}</Text>
          </TouchableOpacity>
          {custom && <TouchableOpacity onPress={() => remove(cat.id)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}><Text style={s.removeX}>✕</Text></TouchableOpacity>}
        </View>
        {custom && (
          <View style={{ flexDirection: 'row', gap: 8, marginLeft: 2, marginTop: 6 }}>
            {[{ v: 'fixed', l: 'Monthly' }, { v: 'nonmonthly', l: 'Yearly' }].map((o) => (
              <TouchableOpacity key={o.v} style={[s.cadChip, bucket === o.v && s.cadChipOn]} onPress={() => upsert(cat.id, { bucket: o.v }, seed)}>
                <Text style={[s.cadTxt, bucket === o.v && s.cadTxtOn]}>{o.l}</Text>
              </TouchableOpacity>
            ))}
            <Text style={s.cadHint}>{isNonMonthly ? 'Enter the full yearly amount' : 'Enter the monthly amount'}</Text>
          </View>
        )}
        {isNonMonthly && num(e.amount) > 0 && (
          <View style={{ marginLeft: 2, marginTop: 2 }}>
            <Text style={s.dueLabel}>When is it due? (pick the months)</Text>
            <MonthMultiSelect value={months} onChange={(v) => upsert(cat.id, { months: v }, seed)} />
            {months.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 8 }}>
                <Text style={s.dueLabel}>Due day (optional)</Text>
                <TextInput style={[s.input, { width: 90 }]} keyboardType="number-pad" placeholder="e.g. 15" placeholderTextColor={Colors.textTertiary}
                  value={e.dueDay ?? ''} onChangeText={(t) => upsert(cat.id, { dueDay: t }, seed)} maxLength={2} />
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (<>
    <Header emoji="🪣" title="Your budget" sub="Add what you spend by category — we'll budget it for you." />

    {/* running total — spectrum bar across the three buckets + the surplus to save */}
    <Card>
      <View style={s.sumHeader}>
        <View style={s.sumStat}><Text style={s.sumLabel}>Take-home</Text><Text style={s.sumValue}>{money(net)}</Text></View>
        <View style={s.sumStat}><Text style={s.sumLabel}>Spend (est.)</Text><Text style={s.sumValue}>{money(estimated)}</Text></View>
        <View style={[s.sumStat, { alignItems: 'flex-end' }]}><Text style={s.sumLabel}>Itemized</Text><Text style={[s.sumValue, totalMo > net && net > 0 && { color: Colors.red }]}>{money(totalMo)}</Text></View>
      </View>
      <View style={s.sumBar}>
        <View style={{ width: seg(critT), backgroundColor: TIER_COLOR.critical }} />
        <View style={{ width: seg(impT), backgroundColor: TIER_COLOR.important }} />
        <View style={{ width: seg(flexT), backgroundColor: TIER_COLOR.flex }} />
        {uncategorized > 0 && <View style={{ width: seg(uncategorized), backgroundColor: Colors.textTertiary }} />}
        {save > 0 && <View style={{ width: seg(save), backgroundColor: SAVE_COLOR }} />}
      </View>
      <View style={s.legendWrap}>
        <Legend color={TIER_COLOR.critical} label="Critical" value={money(critT)} />
        <Legend color={TIER_COLOR.important} label="Important" value={money(impT)} />
        <Legend color={TIER_COLOR.flex} label="Nice-to-have" value={money(flexT)} />
        {uncategorized > 0 && <Legend color={Colors.textTertiary} label="Uncategorized (from your estimate)" value={money(uncategorized)} />}
        <Legend color={SAVE_COLOR} label={save >= 0 ? 'Surplus' : 'Over budget'} value={money(Math.abs(save))} />
      </View>
      {estimated > 0 && (
        <Text style={s.note2}>
          You estimated {money(estimated)}/month earlier — {totalMo === 0
            ? 'itemize it below (we\'re counting the full estimate until you do).'
            : Math.abs(totalMo - estimated) <= 50
              ? 'your categories match nicely.'
              : totalMo < estimated
                ? `${money(uncategorized)}/month still to categorize — counted in "Uncategorized" for now.`
                : `${money(totalMo - estimated)}/month over your estimate.`}
        </Text>
      )}
    </Card>

    {/* green insight, right under the bar */}
    {totalMo > 0 && <Callout text={net > 0 ? `${pctOfNet}% of your take-home is spoken for` : `${money(totalMo)}/month total expenses`}
      sub={net > 0
        ? `${money(Math.max(0, save))}/month left to save${save < 0 ? ' — you\'re over by ' + money(-save) : ''}.`
        : `About ${money(totalMo * 12)}/year.`}
      warn={net > 0 && save < 0} />}

    {TIERS.map((tk) => {
      const tot = tierTotal(tk.key);
      return (
        <Card key={tk.key}>
          <View style={s.dotRow}>
            <View style={[s.dot, { backgroundColor: TIER_COLOR[tk.key] }]} />
            <Text style={s.sectionLabel}>{tk.title.toUpperCase()} · {tk.note}</Text>
          </View>
          {SPEND_CATS.filter((c) => c.tier === tk.key && (!c.stages || c.stages.includes(ctx.status as Status))).map((c) => renderRow(c, false))}
          {cats.filter((c) => c.custom && tierOf(c) === tk.key).map((c) => renderRow(c, true))}
          <TouchableOpacity style={s.addRow} onPress={() => addCustom(tk.key)}><Text style={s.addRowTxt}>+ Add {tk.title.toLowerCase()}</Text></TouchableOpacity>
          {tot > 0 && (
            <View style={s.bucketTotalRow}>
              <Text style={s.bucketTotalLabel}>{tk.title} total</Text>
              <Text style={s.bucketTotalVal}>{money(tot)}/month</Text>
            </View>
          )}
        </Card>
      );
    })}
  </>);
}

// WHICH PROPERTY IS IT? (DEC-4327, 2026-10-11, "1: yes"): the properties already held in Net worth when the rent
// step is reached — the same list the Income screen picks from (IncomeManagerScreen, Rent).
export function rentProperties(accounts: any[] | null | undefined): any[] {
  return ((accounts ?? []) as any[]).filter((a) => assetClassOf(a) === 'real_estate');
}
/** (DEC-4327, 2026-10-11) With at least one property held, every rent entry with a figure typed must name one of them
 *  before the rent step continues; with none held, the step continues as before (the question waits for the Income screen). */
export function rentStepReady(answers: Record<string, any>, properties: any[]): boolean {
  if (!properties.length) return true;
  const ids = new Set(properties.map((a) => String(a.asset_id)));
  return ((answers.rentals ?? []) as any[])
    .filter((r) => rentIn(r) > 0 || rentOut(r) > 0)
    .every((r) => ids.has(String(r?.property_id ?? '')));
}
/** A RENT OR RUNNING-COST FIGURE AT SIGN-UP IS READ BY THE ONE STRICT READER (DEC-3768c, 2026-10-10): "about 2k" is not a
 *  number, so it reads as not entered — never as $2. The step used the lenient reader, which keeps the digits, so a
 *  pasted "about 2k" showed "Net $2/month" while what is counted (rentalList) read it as nothing. Fixed 2026-10-20:
 *  the step asks rentEntryMonthly, which reads with the same strict reader rentalList counts with. */
const rentIn = (r: any): number => rentEntryMonthly(r).income;
const rentOut = (r: any): number => rentEntryMonthly(r).expenses;

// Rental properties — one editable card each, type toggle on top, summed into net income.
export function RentalEditor({ ctx }: { ctx: StepCtx }) {
  const properties = rentProperties((useStore() as any).assetAccounts);   // (DEC-4327, 2026-10-11)
  const router = useRouter();   // the "Add the property first ›" door (DEC-4350, 2026-10-11)
  const stored = (ctx.answers.rentals ?? []) as any[];
  const list = stored.length ? stored : [{}];   // always show at least one to fill in
  const write = (next: any[]) => ctx.setAnswer('rentals', next);
  const setProp = (i: number, key: string, val: string) => {
    const base = list.slice();
    base[i] = { ...base[i], [key]: val };
    write(base);
  };
  const addProp = () => write([...list, {}]);
  const removeProp = (i: number) => write(list.filter((_, idx) => idx !== i));
  // WHAT WAS TYPED, NOT WHAT IS COUNTED (DEC-4059d, 2026-10-10): a rent entry counts only once it names its property
  // in Net worth. With no property held yet this step cannot ask — so the sum shown here is the typed one, and says it
  // is not counted yet. With one or more held, the step asks "Which property is it?" right here (DEC-4327, 2026-10-11).
  const named = (r: any) => properties.some((a) => String(a.asset_id) === String(r?.property_id ?? ''));
  const allNamed = list.filter((r) => rentIn(r) > 0 || rentOut(r) > 0).every(named);
  const netMonthly = list.reduce((t, r) => t + rentEntryMonthly(r).net, 0);
  const count = list.filter((r) => rentIn(r) > 0).length;

  return (<>
    <Header emoji="🏠" title="Rental property" sub="Income net of what it costs to run." />
    {list.map((r, i) => (
      <Card key={i}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={s.label}>Property {i + 1}</Text>
          {list.length > 1 && (
            <TouchableOpacity onPress={() => removeProp(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.removeX}>✕</Text></TouchableOpacity>
          )}
        </View>
        <Segmented ctx={{ ...ctx, answers: { rt: r.type ?? 'long' }, setAnswer: (_, v) => setProp(i, 'type', v) }}
          k="rt" defaultValue="long" options={[{ value: 'long', label: 'Long-term' }, { value: 'short', label: 'Short-term' }]} />
        {/* #3: short-term (Airbnb/VRBO) income is seasonal — capture a monthly AVERAGE, and say so, rather
            than implying a fixed rent. Same data model (monthly), just an honest label + guidance. */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{(r.type ?? 'long') === 'short' ? 'Avg rent /month' : 'Rent /month'}</Text>
            <TextInput style={s.input} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
              value={r.income ?? ''} onChangeText={(t) => setProp(i, 'income', t)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Operating expense /month</Text>
            <TextInput style={s.input} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
              value={r.expenses ?? ''} onChangeText={(t) => setProp(i, 'expenses', t)} />
          </View>
        </View>
        {(r.type ?? 'long') === 'short' && <Text style={s.hint}>Short-term income varies by season — enter a typical month, or your annual total ÷ 12.</Text>}
        {rentIn(r) > 0 && <Text style={s.note2}>Net <Text style={{ fontWeight: '700' }}>{money(rentEntryMonthly(r).net)}/month{(r.type ?? 'long') === 'short' ? ' avg' : ''}</Text></Text>}
        {/* WHICH PROPERTY IS IT? (DEC-4327, 2026-10-11, "1: yes") — the Income screen's question and pick, asked here
            when a property is already held; picking saves property_id on the entry, so the rent counts at once. */}
        {properties.length > 0 && (<>
          <Text style={[s.label, { marginTop: Spacing.sm }, !named(r) && { color: Colors.amber }]}>Which property is it?</Text>
          {!named(r) && <Text style={[s.hint, { color: Colors.amber }]}>Not counted as rent until you pick its property.</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {properties.map((a) => {
              const on = String(r.property_id ?? '') === String(a.asset_id);
              return (
                <TouchableOpacity key={String(a.asset_id)} accessibilityRole="button" accessibilityState={{ selected: on }}
                  accessibilityLabel={`Property ${i + 1} is ${a.label}`} onPress={() => setProp(i, 'property_id', String(a.asset_id))}
                  style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: Radii.md, borderWidth: 1,
                    borderColor: on ? Colors.primary : Colors.border, backgroundColor: on ? Colors.primaryLight : Colors.bgSecondary }}>
                  <Text style={{ fontSize: 13, color: Colors.textPrimary }}>{on ? '✓ ' : ''}🏠 {a.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>)}
      </Card>
    ))}
    {/* ADD THE PROPERTY FIRST (DEC-4350, 2026-10-11, "A - approved."): sign-up takes no property, so with none held
        the rent step could not ask which property the rent is from. This door opens Add an account on Real estate
        (the same door the Income screen's rent entry uses). Add an account is pushed ON TOP of this step, so the step
        stays mounted with the rent typed; saving or cancelling goes back here, and once saved "Which property is it?"
        shows above. from=onboarding tells Add an account not to seed Net worth from a half-finished setup. */}
    {properties.length === 0 && (
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add the property first"
        onPress={() => router.push('/add-account?cls=property&from=onboarding' as any)}
        style={{ minHeight: 44, justifyContent: 'center', marginTop: Spacing.sm }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.primary }}>Add the property first ›</Text>
      </TouchableOpacity>
    )}
    <TouchableOpacity style={s.addBtn} onPress={addProp}><Text style={s.addBtnT}>+ Add property</Text></TouchableOpacity>
    {count > 0 && <Callout text={`${money(netMonthly)}/month net rental income`}
      sub={`About ${money(netMonthly * 12)}/year across ${plural(count, 'property')} after costs.${properties.length === 0 ? ' The rent is counted once you pick its property on the Income screen.'
        : allNamed ? '' : ' The rent is counted once you pick its property above.'}`} warn={netMonthly < 0} />}
  </>);
}

// Spouse invite — creates a real shareable invite code (invites/{code} → this household's shared
// data doc) and hands it to the system share sheet. The spouse enters the code at sign-up and
// lands in the SAME household: both see and edit the same accounts, plans and goals.
function InvitePartner({ ctx }: { ctx: StepCtx }) {
  const code = ctx.answers.inviteCode as string | undefined;
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const shareCode = (c: string) =>
    Share.share({ message: `Join me on MoneyKeel so we can plan our money together! Get the app, create your account, and enter invite code ${c} on the sign-up screen.` });
  const createAndShare = async () => {
    setErr('');
    const st = useStore.getState() as any;
    const uid = st.user?.uid;
    if (!uid) { setErr('Create your account first — it holds the plan you two will share.'); return; }
    try {
      setBusy(true);
      const c = code ?? await createInvite(st.householdId ?? uid, st.user?.name ?? null);
      if (!code) ctx.setAnswer('inviteCode', c);
      await shareCode(c);
    } catch {
      setErr("Couldn't create the invite — check your connection and try again.");
    } finally { setBusy(false); }
  };
  return (<>
    <Header emoji="✉️" title="Invite your spouse (optional)" sub="They'll see and manage the same accounts, plans and goals as you." />
    <Card>
      {code ? (<>
        <Text style={s.heroLabel}>Their invite code</Text>
        <Text style={{ fontSize: 30, fontWeight: '800', textAlign: 'center', letterSpacing: 6, color: Colors.textPrimary, paddingVertical: 8 }}>{code}</Text>
        <Text style={[s.hint, { textAlign: 'center' }]}>They enter this on the sign-up screen. Re-share it anytime.</Text>
      </>) : (
        <Text style={s.note}>We'll create a one-time code your spouse enters when they sign up — no email needed, share it however you like.</Text>
      )}
      <TouchableOpacity style={[s.addBtn, busy && { opacity: 0.5 }]} disabled={busy}
        onPress={code ? () => shareCode(code) : createAndShare}>
        <Text style={s.addBtnT}>{busy ? 'Creating…' : code ? 'Share the code' : '✉️ Create & share invite code'}</Text>
      </TouchableOpacity>
      {!!err && <Text style={[s.hint, { color: Colors.red, textAlign: 'center' }]}>{err}</Text>}
    </Card>
  </>);
}

// Email verification step — the link is sent at sign-up; this surfaces it, lets the user re-check
// after clicking, and resend. Soft (skippable): the app works unverified and Settings nudges later.
function VerifyEmail({ ctx }: { ctx: StepCtx }) {
  const email = (useStore.getState() as any).user?.email as string | undefined;
  const [verified, setVerified] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState('');
  React.useEffect(() => {
    refreshEmailVerified().then((v) => v && setVerified(true)).catch(() => { /* offline — they can check later */ });
  }, []);
  const check = async () => {
    setNote(''); setBusy(true);
    try {
      const v = await refreshEmailVerified();
      setVerified(v);
      if (!v) setNote('Not verified yet — open the link in your email (check spam), then tap this again.');
    } catch { setNote("Couldn't check just now — try again in a moment."); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    setNote(''); setBusy(true);
    try { await resendVerification(); setNote(`Sent! Check ${email ?? 'your inbox'} (and spam).`); }
    catch { setNote("Couldn't resend — check your connection."); }
    finally { setBusy(false); }
  };
  return (<>
    <Header emoji="📧" title="Verify your email" sub="Confirm your email so you can recover your account and sign in on any device." />
    <Card>
      {verified ? (
        <Text style={[s.note, { color: Colors.primary, fontWeight: '700', textAlign: 'center' }]}>✓ Your email is verified — you're all set.</Text>
      ) : (<>
        <Text style={s.note}>We sent a verification link to <Text style={{ fontWeight: '800' }}>{email ?? 'your email'}</Text>. Open it, then come back and tap the button below.</Text>
        <TouchableOpacity style={[s.addBtn, busy && { opacity: 0.5 }]} disabled={busy} onPress={check}>
          <Text style={s.addBtnT}>{busy ? 'Checking…' : "I've clicked the link — check"}</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={busy} onPress={resend}>
          <Text style={[s.hint, { textAlign: 'center', marginTop: 10, textDecorationLine: 'underline' }]}>Resend the link</Text>
        </TouchableOpacity>
        {!!note && <Text style={[s.hint, { textAlign: 'center', marginTop: 8 }]}>{note}</Text>}
        <Text style={[s.hint, { textAlign: 'center', marginTop: 12 }]}>No rush — you can keep setting up and verify later from Settings.</Text>
      </>)}
    </Card>
  </>);
}

// Goals editor — starter chips seed common goals; Add stays disabled until name + target exist.
const GOAL_STARTERS = ['Emergency fund', 'House down payment', 'New car', 'Vacation', 'Wedding'];
function GoalsEditor({ ctx }: { ctx: StepCtx }) {
  const goals = (ctx.answers.goals ?? []) as any[];
  const [label, setLabel] = React.useState(''); const [target, setTarget] = React.useState(''); const [year, setYear] = React.useState('');
  const canAdd = !!label.trim() && num(target) > 0;
  const add = () => {
    if (!canAdd) return;
    ctx.setAnswer('goals', [...goals, { label: label.trim(), target, year }]);
    setLabel(''); setTarget(''); setYear('');
  };
  const { capMo: goalCapRaw, investMo: investMo0 } = goalCapacity(ctx.answers);
  const goalCap = goalCapRaw >= 25 ? goalCapRaw : 0;
  return (<><Header emoji="🎯" title="What are you saving for?" sub="Add a goal — target amount and when." />
    {investMo0 > 0 && (goalCap > 0
      ? <Callout text={`You have about ${money(goalCap)}/month for goals`}
          sub={`What's left of your income after taxes, expenses, your 401(k), and the ${money(investMo0 * 12)}/year you're investing.`} />
      : <Callout warn text="There is no surplus for goals right now"
          sub={`Your investing plan (${money(investMo0 * 12)}/year) uses all your free cash — goals here would need that number dialed down. It's one pot of money.`} />)}
    <Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm }}>
        {GOAL_STARTERS.filter((g) => !goals.some((x) => x.label === g)).map((g) => {
          const on = label === g;
          return <TouchableOpacity key={g} style={[s.chip, on && s.chipOn]} onPress={() => setLabel(g)}>
            <Text style={[s.chipTxt, on && s.chipTxtOn]}>{g}</Text></TouchableOpacity>;
        })}
      </View>
      <TextInput style={s.input} placeholder="Goal (e.g. House down payment)" placeholderTextColor={Colors.textTertiary} value={label} onChangeText={setLabel} />
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
        <TextInput style={[s.input, { flex: 1 }]} placeholder={`${currencySymbol()} target`} keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} value={target} onChangeText={setTarget} />
        <TextInput style={[s.input, { flex: 1 }]} placeholder="By year" keyboardType="number-pad" placeholderTextColor={Colors.textTertiary} value={year} onChangeText={setYear} />
      </View>
      <TouchableOpacity style={[s.addBtn, !canAdd && { opacity: 0.4 }]} disabled={!canAdd} onPress={add}><Text style={s.addBtnT}>+ Add goal</Text></TouchableOpacity>
      {!canAdd && (label.trim() !== '' || target !== '') && <Text style={[s.hint, { textAlign: 'center' }]}>Give it a name and a target amount to add it.</Text>}
    </Card>
    {goals.map((g, i) => (
      <View key={i} style={s.goalRow}><Text style={s.goalLabel}>{g.label}</Text><Text style={s.goalVal}>{money(num(g.target))}{g.year ? ` · ${g.year}` : ''}</Text></View>
    ))}</>);
}

const s = StyleSheet.create({
  head: { alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  sub: { fontSize: 15, color: Colors.primaryDark, textAlign: 'center', marginTop: 6 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  hint: { fontSize: 11, color: Colors.textTertiary, marginTop: 6, lineHeight: 15 },
  workedRow: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  workedTot: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  srcCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: 8, borderWidth: 1.5, borderColor: Colors.border },
  srcCardOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  srcIcon: { fontSize: 24 },
  srcTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  srcTitleOn: { color: Colors.primaryDark },
  srcSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  srcCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  srcCheckOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  srcCheckMark: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  cap: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, padding: Spacing.md, fontSize: 17, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  note: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  note2: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  segRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm },
  seg: { flex: 1, paddingVertical: 9, paddingHorizontal: 4, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, alignItems: 'center' },
  segOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  segTxt: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  segTxtOn: { color: Colors.primary, fontWeight: '700' },
  heroLabel: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, marginBottom: 4 },
  heroInput: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 2, borderBottomColor: Colors.border, marginBottom: Spacing.sm },
  callout: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  calloutWarn: { backgroundColor: '#FBE9E7' },
  calloutIcon: { fontSize: 15, lineHeight: 20 },
  calloutTxt: { fontSize: 15, fontWeight: '700', color: Colors.primaryDark, lineHeight: 20 },
  calloutTxtWarn: { color: Colors.red },
  calloutSub: { fontSize: 13, color: Colors.primaryDark, marginTop: 4, opacity: 0.85 },
  // rounded corners, not semicircle ends — the one shape of a choice (DEC-0231, 2026-09-25; corrected 2026-10-20)
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTxtOn: { color: Colors.primary, fontWeight: '700' },
  readout: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xs },
  readoutTxt: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  unitBtn: { paddingHorizontal: 12, height: 44, minWidth: 44, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgSecondary },
  unitBtnOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  unitTxt: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary },
  unitTxtOn: { color: Colors.primary },
  choice: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 2, borderColor: 'transparent' },
  choiceOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  choiceTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  choiceTitleOn: { color: Colors.primary },
  choiceSub: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border },
  radioOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkBoxOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  checkMark: { color: Colors.white, fontSize: 15, fontWeight: '900' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  stepBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  stepBtnT: { fontSize: 24, color: Colors.primary, fontWeight: '700' },
  stepVal: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, minWidth: 44, textAlign: 'center' },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  recapLabel: { flex: 1, fontSize: 15, color: Colors.textSecondary, marginRight: 10 },
  recapVal: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  recapValPlain: { fontSize: 15, fontWeight: '500', color: Colors.textSecondary },
  recapBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: Radii.md, marginTop: Spacing.sm },
  recapBoxNeutral: { backgroundColor: Colors.bgTertiary },
  recapBoxGreen: { backgroundColor: Colors.primaryLight },
  recapBoxLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  recapBoxVal: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.bgTertiary, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  addBtn: { marginTop: Spacing.sm, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radii.md, backgroundColor: Colors.primaryLight },
  addBtnT: { color: Colors.primary, fontWeight: '700' },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.sm },
  goalLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  goalVal: { fontSize: 15, color: Colors.textSecondary },
  removeX: { fontSize: 17, color: Colors.textTertiary, fontWeight: '700' },
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  schedHeadTxt: { fontSize: 11, fontWeight: '600', color: Colors.textTertiary },
  schedCell: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.sm, paddingHorizontal: 8, paddingVertical: 9, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.lg },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  monthChip: { width: '22%', paddingVertical: 10, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.bgSecondary },
  monthChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  monthTxt: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  monthTxtOn: { color: Colors.primary, fontWeight: '700' },
  yearChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.bgSecondary, marginRight: 8 },
  flowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  flowYear: { fontSize: 13, color: Colors.textSecondary, width: 38 },
  flowBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.bgTertiary, overflow: 'hidden' },
  flowBarFill: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  flowAmt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, width: 72, textAlign: 'right' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableCell: { flex: 1, fontSize: 15, color: Colors.textSecondary },
  heroCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.primary },
  heroCardLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  heroCardValue: { fontSize: 38, fontWeight: '800', color: Colors.primary, marginTop: 2 },
  heroCardSub: { fontSize: 13, color: Colors.primaryDark, marginTop: 4, textAlign: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 2 },
  bucketHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  bucketTot: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  sumHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sumStat: { flex: 1 },
  sumLabel: { fontSize: 13, color: Colors.textSecondary },
  sumValue: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  sumBar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: Colors.bgTertiary, marginBottom: Spacing.sm },
  legendWrap: { marginTop: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  legendLabel: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  legendVal: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  bucketTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  bucketTotalLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  bucketTotalVal: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  colChart: { flexDirection: 'row', alignItems: 'flex-end', height: 134, gap: 2, marginTop: Spacing.sm },
  colItem: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  colBarWrap: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  colVal: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 2 },
  colBar: { width: '72%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  colLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 3 },
  stackCol: { width: '72%', borderTopLeftRadius: 3, borderTopRightRadius: 3, overflow: 'hidden' },
  recapGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  recapCell: { width: '50%', paddingVertical: 8 },
  recapCellLabel: { fontSize: 13, color: Colors.textSecondary },
  recapCellVal: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  heroRingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, width: '100%' },
  wfRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  wfTopline: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 3, paddingTop: 8 },
  wfLabel: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  wfVal: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', fontVariant: ['tabular-nums'] },
  ringPct: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  ringPctSub: { fontSize: 11, color: Colors.textSecondary, marginTop: -2 },
  savingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  savingsMonth: { fontSize: 15, color: Colors.textSecondary },
  savingsVal: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  savingsInput: { width: 110, backgroundColor: Colors.bgSecondary, borderRadius: Radii.sm, paddingHorizontal: 10, paddingVertical: 7, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, textAlign: 'right' },
  spendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  spendName: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  perYr: { fontSize: 11, color: Colors.textTertiary, fontWeight: '600' },
  dueLabel: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
  spendNameInput: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 4 },
  spendAmt: { width: 78, backgroundColor: Colors.bgSecondary, borderRadius: Radii.sm, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, textAlign: 'right' },
  unitToggle: { width: 34, height: 34, borderRadius: Radii.sm, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgSecondary },
  unitToggleTxt: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  addRow: { paddingVertical: 8, marginTop: 2 },
  addAnother: { fontSize: 15, fontWeight: '700', color: Colors.primary, paddingVertical: 8 },
  cadChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radii.md /* DEC-0231: 14 on a 28.5-point chip drew semicircle ends */, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  cadChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  cadTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  cadTxtOn: { color: Colors.primaryDark },
  cadHint: { fontSize: 11, color: Colors.textTertiary, alignSelf: 'center', flex: 1 },
  salMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  salMonthLbl: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, width: 44 },
  salMonthInputWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 10 },
  salPre: { fontSize: 13, color: Colors.textTertiary, fontWeight: '700' },
  salMonthInput: { flex: 1, paddingVertical: 9, paddingHorizontal: 4, fontSize: 15, color: Colors.textPrimary },
  addRowTxt: { fontSize: 13, fontWeight: '600', color: Colors.primary },
});
