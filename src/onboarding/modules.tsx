import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Card } from '../components/UI';
import { Colors, Spacing, Radii } from '../utils/theme';
import { Status, Track, StepId, incomeSourceOptionsFor } from './engine';
import Mascot from './Mascot';
import { estimateEffectiveTaxRate, TAX_YEAR, grossSalaryMonthly, annualizedEnteredSalary, marginalBracket, rsuAnnual, equityRowValue, equityCashFlow, rentalNetAnnual, incomeMonthlyGrid, totalGrossAnnual, taxableAnnual, extraIncome, salaryAnnual, salaryActiveMonths } from '../domain/income';
import { loanPayment } from '../domain/debt';
import { savingsByMonth, spendBuckets } from '../domain/budget';
import { annual401kLimit, IRS_LIMITS } from '../domain/income/limits';
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
export const money = (n: number) => formatMoney(n);
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
        <Text numberOfLines={1} style={{ fontSize: 14, color: value ? Colors.textPrimary : Colors.textTertiary }}>
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

function NumRow({ ctx, k, label, ph }: { ctx: StepCtx; k: string; label?: string; ph?: string }) {
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <TextInput style={s.input} keyboardType="number-pad" placeholderTextColor={Colors.textTertiary}
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
  return a.taxMode === 'manual' ? num(a.manualTaxRate) / 100 : estimateEffectiveTaxRate(taxableAnnual(a));
}
export function monthlyIncome(a: Record<string, any>): number {
  const total = totalGrossAnnual(a);
  if (total <= 0) return 0;
  return (total - taxableAnnual(a) * incomeTaxRate(a)) / 12;   // tax only the taxable part
}
export function retirementMonthlyIncome(a: Record<string, any>): number {
  return ['ss', 'pension', 'withdrawals', 'rmd', 'annuities', 'other'].reduce((t, k) => t + num(a['ri_' + k]), 0);
}
export function employerMatchMonthly(a: Record<string, any>): number {
  const val = num(a.employerMatchValue);
  return a.employerMatchMode === 'pct' ? (num(a.c_401k) * val) / 100 : val;  // % of YOUR contribution
}
export function monthlyContributions(a: Record<string, any>): number {
  return ['c_401k', 'c_roth', 'c_invest', 'c_property'].reduce((t, k) => t + num(a[k]), 0) + employerMatchMonthly(a);
}
export function currentAge(a: Record<string, any>, fallback = 35): number {
  return num(a.birthYear) ? new Date().getFullYear() - num(a.birthYear) : fallback;
}
export function fv(principal: number, monthly: number, years: number, rate = 0.07): number {
  const m = years * 12, r = rate / 12;
  return principal * Math.pow(1 + r, m) + monthly * ((Math.pow(1 + r, m) - 1) / r);
}

// ── must-have validation ────────────────────────────────────────────────────
const REQUIRED: Partial<Record<StepId, (a: Record<string, any>) => boolean>> = {
  income_sources: a => Array.isArray(a.incomeSources) && a.incomeSources.length > 0,
  income_salary: a => num(a.baseSalary) > 0 || (Array.isArray(a.salaryByMonth) && a.salaryByMonth.some((x: any) => num(x) > 0)),
  income_self: a => num(a.seAmount) > 0,
  income_investment: a => num(a.invAnnual) > 0,
  income_benefits: a => num(a.benefitMonthly) > 0,
  income_support: a => num(a.supportMonthly) > 0,
  income_scholarship: a => Array.isArray(a.scholarships) ? a.scholarships.some((x: any) => num(x?.amount) > 0) : num(a.scholarshipAmount) > 0,
  income_loans: a => Array.isArray(a.loans) && a.loans.some((x: any) => num(x?.amount) > 0),
  income_retirement: a => retirementMonthlyIncome(a) > 0,
  income_other: a => num(a.otherAmount) > 0,
  income_tax: a => a.taxMode !== 'manual' || num(a.manualTaxRate) > 0,
  monthlySpending: a => num(a.monthlySpending) > 0,
  birth: a => !!a.birthYear && !!a.birthMonth,
  currentRetirementSavings: a => a.currentRetirementSavings != null && a.currentRetirementSavings !== '',
  contributionsByType: a => ['c_401k', 'c_roth', 'c_invest', 'c_property'].some(k => num(a[k]) >= 0) && (a.c_touched ?? true),
  targetRetirementAge: a => num(a.targetRetirementAge) > 0,
  expectedRetirementSpending: a => num(a.expectedRetirementSpending) > 0,
  currentSavingsPortfolio: a => a.currentSavingsPortfolio != null && a.currentSavingsPortfolio !== '',
  retirementIncomeSources: a => retirementMonthlyIncome(a) > 0,
  horizonAge: a => num(a.horizonAge) > 0,
  investObjective: a => !!a.investObjective,
  trackingLevel: a => !!a.trackingLevel,
  investmentHoldings: a => num(a.investmentHoldings) > 0,
  goals_detail: a => Array.isArray(a.goals) && a.goals.length > 0,
  monthlySavingsCapacity: a => num(a.monthlySavingsCapacity) > 0,
  hasPartner: a => !!a.hasPartner,
  dependentsCount: a => a.dependentsCount != null && a.dependentsCount !== '',
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
          <Text style={s.hint}>Enter what's left after business costs, before income tax. A rough number is fine.</Text>
        </Card>
      </>);
    }

    case 'income_investment': {
      return (<>
        <Header emoji="💵" title="Interest & dividends" sub="Money your savings and investments pay you." />
        <Card>
          <Text style={s.heroLabel}>About how much per year</Text>
          <TextInput style={s.heroInput} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
            value={a.invAnnual ?? ''} onChangeText={(t) => ctx.setAnswer('invAnnual', t)} />
          <Text style={s.hint}>Interest from savings accounts plus dividends from stocks or funds, in a typical year.</Text>
        </Card>
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
          <Text style={s.hint}>Heads up: some benefits can only be spent on certain things (like SNAP on food), and a few have limits on how much you can save. We won't tax this income.</Text>
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

    case 'income_retirement': {
      const tot = retirementMonthlyIncome(a);
      return (<>
        <Header emoji="🏖️" title="Retirement income" sub="What you receive each month in retirement." />
        <Card>
          <MoneyRow ctx={ctx} k="ri_ss" label="Social Security" />
          <MoneyRow ctx={ctx} k="ri_pension" label="Pension" />
          <MoneyRow ctx={ctx} k="ri_withdrawals" label="401(k) / IRA withdrawals" />
          <MoneyRow ctx={ctx} k="ri_annuities" label="Annuity / other" />
        </Card>
        {tot > 0 && <Callout text={`${money(tot)}/mo in retirement income`} sub={`About ${money(tot * 12)} a year. We'll use this in your cash flow and taxes.`} />}
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
                  return <Text style={s.note2}>≈ <Text style={{ fontWeight: '800' }}>{money(lp.monthly)}/mo</Text> for {num(row.termYears)} years · {money(lp.totalInterest)} total interest.</Text>;
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
                <Text style={s.calloutTxt}>{money(borrowed)} borrowed{repay > 0 ? ` · ≈ ${money(repay)}/mo after graduation` : ''}</Text>
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
      return (<>
        <Header emoji="🧾" title="Other income" sub="Anything else — a gift, royalties, a one-off payment." />
        <Card>
          <Text style={s.label}>What is it? (optional)</Text>
          <TextInput style={s.input} value={a.otherLabel ?? ''} onChangeText={(t) => ctx.setAnswer('otherLabel', t)} placeholder="e.g. tutoring, a gift" placeholderTextColor={Colors.textTertiary} />
          <Text style={s.label}>How often?</Text>
          <Segmented ctx={ctx} k="otherFreq" defaultValue="monthly" options={[{ value: 'monthly', label: 'Per month' }, { value: 'annual', label: 'Per year' }, { value: 'onetime', label: 'One time' }]} />
          <Text style={s.heroLabel}>How much ({freqLabel})</Text>
          <TextInput style={s.heroInput} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
            value={a.otherAmount ?? ''} onChangeText={(t) => ctx.setAnswer('otherAmount', t)} />
        </Card>
      </>);
    }

    case 'income_salary': {
      const mode = a.salaryMode ?? 'gross';
      const FREQ_LABEL: Record<string, string> = { hourly: 'hour', weekly: 'week', biweekly: '2 weeks', monthly: 'month' };
      const freq = a.salaryFreq ?? 'monthly';
      const FREQ_MULT: Record<string, number> = { weekly: 52 / 12, biweekly: 26 / 12, monthly: 1 };
      const enteredMonthly = freq === 'hourly'
        ? num(a.baseSalary) * (num(a.hoursPerWeek) || 40) * 52 / 12
        : num(a.baseSalary) * (FREQ_MULT[freq] ?? 1);   // entered base expressed per month (gross-or-takehome terms)
      const byMonth = a.salaryMonthMode === 'months';
      const tbl: string[] = Array.isArray(a.salaryByMonth) && a.salaryByMonth.length === 12 ? a.salaryByMonth : new Array(12).fill('');
      const setMonth = (i: number, v: string) => { const arr = [...tbl]; arr[i] = v; ctx.setAnswer('salaryByMonth', arr); };
      const goSame = () => { ctx.setAnswer('salaryMonthMode', 'same'); ctx.setAnswer('salaryByMonth', undefined); };
      const goMonths = () => { ctx.setAnswer('salaryMonthMode', 'months'); ctx.setAnswer('salaryByMonth', new Array(12).fill(enteredMonthly > 0 ? String(Math.round(enteredMonthly)) : '')); };
      const annualGross = salaryAnnual(a);
      const bracketPct = Math.round(marginalBracket(annualGross) * 100);
      const hasAmt = annualGross > 0;
      return (<>
        <Header emoji="💵" title="Base salary" sub="Just your base pay — bonuses, equity & other income come on the next screens." />
        <Card>
          {household && (
            <>
              <Text style={s.label}>Who earns this income?</Text>
              <Segmented ctx={ctx} k="whoEarns" defaultValue="you" options={[
                { value: 'you', label: 'You' }, { value: 'partner', label: 'Partner' }, { value: 'both', label: 'Both' }]} />
            </>
          )}
          <Text style={s.label}>How are you paid?</Text>
          <Segmented ctx={ctx} k="salaryFreq" defaultValue="monthly" options={[
            { value: 'hourly', label: 'Hourly' }, { value: 'weekly', label: 'Weekly' },
            { value: 'biweekly', label: 'Bi-weekly' }, { value: 'monthly', label: 'Monthly' }]} />

          {freq === 'hourly' && (
            <>
              <Text style={s.label}>Hours per week</Text>
              <TextInput style={s.input} keyboardType="decimal-pad" placeholder="e.g. 20" placeholderTextColor={Colors.textTertiary}
                value={a.hoursPerWeek ?? ''} onChangeText={(t) => ctx.setAnswer('hoursPerWeek', t)} />
            </>
          )}

          <Text style={s.heroLabel}>Base pay (per {FREQ_LABEL[freq] ?? 'month'})</Text>
          <TextInput style={s.heroInput} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
            value={a.baseSalary ?? ''} onChangeText={(t) => ctx.setAnswer('baseSalary', t)} />
          <Segmented ctx={ctx} k="salaryMode" defaultValue="gross" options={[
            { value: 'gross', label: 'Gross' }, { value: 'takehome', label: 'Take-home' }]} />

          {freq === 'hourly' && (
            <>
              <Text style={s.label}>Tips, on average (per month) — optional</Text>
              <TextInput style={s.input} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
                value={a.tipsMonthly ?? ''} onChangeText={(t) => ctx.setAnswer('tipsMonthly', t)} />
            </>
          )}

          {/* same every month, or a per-month table (handles raises, gaps, seasonal work) */}
          <Text style={[s.label, { marginTop: 12 }]}>Is your base pay the same every month?</Text>
          <View style={s.segRow}>
            <TouchableOpacity style={[s.seg, !byMonth && s.segOn]} onPress={goSame}><Text style={[s.segTxt, !byMonth && s.segTxtOn]}>Same each month</Text></TouchableOpacity>
            <TouchableOpacity style={[s.seg, byMonth && s.segOn]} onPress={goMonths}><Text style={[s.segTxt, byMonth && s.segTxtOn]}>Set by month</Text></TouchableOpacity>
          </View>

          {byMonth && (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <Text style={s.dueLabel}>{mode === 'gross' ? 'Gross' : 'Take-home'} pay each month</Text>
                {enteredMonthly > 0 && <TouchableOpacity onPress={() => ctx.setAnswer('salaryByMonth', new Array(12).fill(String(Math.round(enteredMonthly))))}><Text style={s.addAnother}>Fill all · {money(enteredMonthly)}</Text></TouchableOpacity>}
              </View>
              {MONTHS3.map((lbl, i) => (
                <View key={lbl} style={s.salMonthRow}>
                  <Text style={s.salMonthLbl}>{lbl}</Text>
                  <View style={s.salMonthInputWrap}>
                    <Text style={s.salPre}>{currencySymbol()}</Text>
                    <TextInput style={s.salMonthInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary}
                      value={tbl[i] ?? ''} onChangeText={(t) => setMonth(i, t)} />
                  </View>
                </View>
              ))}
              <Text style={s.hint}>Set $0 for months you're not working (a gap, summer off), or raise a month after a pay bump.</Text>
            </>
          )}
        </Card>

        {hasAmt && (
          <View style={s.callout}>
            <Text style={s.calloutIcon}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.calloutTxt}>≈ {money(annualGross)} base{mode === 'takehome' ? ' (gross, grossed up from take-home)' : ''} this year</Text>
              <Text style={s.calloutSub}>{byMonth ? `${salaryActiveMonths(a)} month${salaryActiveMonths(a) !== 1 ? 's' : ''} of pay` : 'Same each month'} · {bracketPct}% federal bracket ({TAX_YEAR}). Bonuses & equity are added on the next screens.</Text>
            </View>
          </View>
        )}
      </>);
    }

    case 'income_401k': {
      const monthly401k = num(a.c_401k);
      const annual401k = monthly401k * 12;
      const limit = annual401kLimit(currentAge(a));
      const overLimit = annual401k > limit;
      const matchMode = a.employerMatchMode ?? 'pct';
      const matchMonthly = matchMode === 'pct' ? (monthly401k * num(a.employerMatchValue)) / 100 : num(a.employerMatchValue);
      return (<>
        <Header emoji="🏦" title="401(k) contributions" sub="Locked until retirement — we track it separately." />
        <Card>
          <HeroAmount ctx={ctx} k="c_401k" label="Your contribution (per month)" />
          <View style={s.divider} />
          <AmountUnitRow ctx={ctx} k="employerMatchValue" modeK="employerMatchMode" label="Employer match (of your contribution)" />
        </Card>
        {monthly401k > 0 && (overLimit
          ? <Callout warn text={`${money(annual401k)}/yr — over the ${IRS_LIMITS.year} limit by ${money(annual401k - limit)}`}
              sub={`Limit is ${money(limit)}.${matchMonthly > 0 ? ` Employer adds ≈ ${money(matchMonthly)}/mo.` : ''}`} />
          : <Callout text={`${money(annual401k)}/yr — within the ${IRS_LIMITS.year} limit of ${money(limit)}`}
              sub={`Room for ${money(limit - annual401k)} more this year.${matchMonthly > 0 ? ` Employer adds ≈ ${money(matchMonthly)}/mo.` : ''}`} />)}
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

    case 'income_tax': {
      const gross = grossAnnual(a);
      const estPct = Math.round(estimateEffectiveTaxRate(gross) * 100);
      const brkPct = Math.round(marginalBracket(gross) * 100);
      return (<>
        <Header emoji="🧾" title="Taxes" sub="How should we handle your taxes?" />
        {gross > 0 && <Callout text={`~${estPct}% effective rate · ${brkPct}% bracket (${TAX_YEAR})`}
          sub={`On ~${money(gross)} gross, from the IRS schedule after the standard deduction.`} />}
        <Card>
          <Choice ctx={ctx} k="taxMode" options={[
            { value: 'system', title: `Use this estimate (~${estPct}%)`, sub: 'From the IRS bracket schedule' },
            { value: 'manual', title: 'Enter my own rate', sub: 'e.g. from last year’s tax return' }]} />
          {a.taxMode === 'manual' && <NumRow ctx={ctx} k="manualTaxRate" label="Effective tax rate % — from last year’s return (optional)" ph="22" />}
        </Card>
      </>);
    }

    case 'recap_income':
      return <IncomeRecap ctx={ctx} />;

    case 'monthlySpending': {
      const spend = num(a.monthlySpending);
      const inc = monthlyIncome(a) || retirementMonthlyIncome(a);
      const pct = inc > 0 ? Math.round((spend / inc) * 100) : 0;
      return (<><Header emoji="🧾" title={retired ? 'Your monthly spending' : "What's your average monthly spending?"}
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
      return (<><Header emoji="🎂" title="When were you born?" sub="Month and year." />
        <Card><View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}><NumRow ctx={ctx} k="birthMonth" label="Month" ph="MM" /></View>
          <View style={{ flex: 1.4 }}><NumRow ctx={ctx} k="birthYear" label="Year" ph="YYYY" /></View>
        </View></Card></>);

    case 'currentRetirementSavings':
      return (<><Header emoji="🏦" title="Current retirement savings" sub="401(k), IRA, and similar." />
        <Card><HeroAmount ctx={ctx} k="currentRetirementSavings" label="Total saved today" /></Card></>);

    case 'contributionsByType': {
      const extra = num(a.c_roth) + num(a.c_invest) + num(a.c_property);
      return (<><Header emoji="📥" title="Other contributions" sub="Beyond your 401(k) — how much you add each month." />
        <Card>
          <MoneyRow ctx={ctx} k="c_roth" label="Roth IRA" />
          <MoneyRow ctx={ctx} k="c_invest" label="Investments / brokerage" />
          <MoneyRow ctx={ctx} k="c_property" label="Property / real estate" />
        </Card>
        {extra > 0 && <Callout text={`${money(extra)}/mo beyond your 401(k)`} sub={`About ${money(extra * 12)} a year invested.`} />}
      </>);
    }

    case 'employerContribution':
      return (<><Header emoji="🏢" title="Employer contribution" sub="Match or contribution your employer adds monthly." />
        <Card><HeroAmount ctx={ctx} k="employerContribution" label="Employer adds / month" /></Card></>);

    case 'targetRetirementAge': {
      const tgt = num(a.targetRetirementAge), age = currentAge(a), yrs = tgt - age;
      return (<><Header emoji="🏖️" title="When do you hope to retire?" sub="Your target age." />
        <Card><HeroAmount ctx={ctx} k="targetRetirementAge" label="Target age" ph="65" kind="number" /></Card>
        {tgt > 0 && a.birthYear && yrs > 0 && <Callout text={`${yrs} years from now`} sub="That's your runway to save and invest." />}
      </>);
    }

    case 'expectedRetirementSpending': {
      const rs = num(a.expectedRetirementSpending), now = num(a.monthlySpending);
      return (<><Header emoji="💸" title="Expected spending in retirement" sub="Per month, in today's dollars." />
        <Card><HeroAmount ctx={ctx} k="expectedRetirementSpending" label="Monthly (retirement)" /></Card>
        {rs > 0 && <Callout text={now > 0 ? `${Math.round((rs / now) * 100)}% of what you spend today` : `${money(rs * 12)} a year`}
          sub={`About ${money(rs * 12)} a year in today's dollars.`} />}
      </>);
    }

    case 'currentSavingsPortfolio':
      return (<><Header emoji="🏦" title="Your savings & investments" sub="Everything you can draw on in retirement." />
        <Card><HeroAmount ctx={ctx} k="currentSavingsPortfolio" label="Total portfolio" /></Card></>);

    case 'retirementIncomeSources': {
      const tot = retirementMonthlyIncome(a);
      return (<><Header emoji="📨" title="Retirement income" sub="Monthly income from each source." />
        <Card>
          <MoneyRow ctx={ctx} k="ri_ss" label="Social Security" />
          <MoneyRow ctx={ctx} k="ri_pension" label="Pension" />
          <MoneyRow ctx={ctx} k="ri_withdrawals" label="401(k)/IRA withdrawals" />
          <MoneyRow ctx={ctx} k="ri_rmd" label="RMDs" />
          <MoneyRow ctx={ctx} k="ri_annuities" label="Annuities" />
          <MoneyRow ctx={ctx} k="ri_other" label="Dividends / rental / other" />
        </Card>
        {tot > 0 && <Callout text={`${money(tot)}/mo in retirement income`} sub={`About ${money(tot * 12)} a year before drawing on savings.`} />}
      </>);
    }

    case 'horizonAge': {
      const h = num(a.horizonAge), r = num(a.targetRetirementAge);
      return (<><Header emoji="🛟" title="How long should your money last?" sub="Plan to what age?" />
        <Card><HeroAmount ctx={ctx} k="horizonAge" label="To age" ph="90" kind="number" /></Card>
        {h > 0 && r > 0 && h > r && <Callout text={`${h - r} years of retirement to fund`} />}
      </>);
    }

    case 'retLocation':
      return (<><Header emoji="🌍" title={retired ? 'Where do you live in retirement?' : 'Where do you plan to retire?'} sub="Affects cost of living (optional)." />
        <Card><TextRow ctx={ctx} k="retLocation" label="Country / region" ph="e.g. USA" /></Card></>);

    case 'travelBudget':
      return (<><Header emoji="✈️" title="Travel budget (optional)" sub="Extra you'd budget for travel in retirement." />
        <Card><HeroAmount ctx={ctx} k="travelBudget" label="Per year" /></Card></>);

    case 'medicalBudget':
      return (<><Header emoji="🩺" title="Medical / long-term care (optional)" sub="Yearly health costs you want to plan for." />
        <Card><HeroAmount ctx={ctx} k="medicalBudget" label="Per year" /></Card></>);

    case 'spendingChangeLater':
      return (<><Header emoji="📉" title="Spending later in retirement (optional)"
        sub={retired ? 'Do you expect it to change as you age?' : 'About the same, less, or more than today?'} />
        <Card><Choice ctx={ctx} k="spendingChangeLater" options={[
          { value: 'same', title: 'About the same' }, { value: 'less', title: 'Less' }, { value: 'more', title: 'More' }]} /></Card></>);

    case 'investObjective':
      return (<><Header emoji="📈" title="What's your investing goal?" />
        <Card><Choice ctx={ctx} k="investObjective" options={[
          { value: 'pnl', title: 'Monitor performance', sub: 'Realized & unrealized P&L' },
          { value: 'networth', title: 'Track everything in one place', sub: 'Net worth, MoM / YoY change' }]} /></Card></>);

    case 'trackingLevel':
      return (<><Header emoji="🔎" title="How detailed do you want to track?" />
        <Card><Choice ctx={ctx} k="trackingLevel" options={[
          { value: 'account', title: 'By account' }, { value: 'asset', title: 'By asset type' },
          { value: 'holding', title: 'Each individual holding' }]} /></Card></>);

    case 'investmentHoldings':
      return (<><Header emoji="📊" title="Your investments" sub="Total value for now — add detail in the app later." />
        <Card><HeroAmount ctx={ctx} k="investmentHoldings" label="Total portfolio value" /></Card></>);

    case 'investRefine':
      return (<><Header emoji="⚙️" title="Refine (optional)" sub="Allocation, cost basis & risk — set later in the app." />
        <Card><Text style={s.note}>Skip for now.</Text></Card></>);

    case 'goals_detail':
      return <GoalsEditor ctx={ctx} />;

    case 'monthlySavingsCapacity': {
      const cap = num(a.monthlySavingsCapacity);
      return (<><Header emoji="💪" title="How much can you save each month?" sub="Toward your goals." />
        <Card><HeroAmount ctx={ctx} k="monthlySavingsCapacity" label="Monthly" /></Card>
        {cap > 0 && <Callout text={`${money(cap * 12)} a year toward your goals`} />}
      </>);
    }

    case 'hasPartner':
      return (<><Header emoji="👫" title="Tell us about your partner" />
        <Card><Choice ctx={ctx} k="hasPartner" options={[
          { value: 'yes', title: 'I have a partner' }, { value: 'no', title: 'Just me for now' }]} />
          {a.hasPartner === 'yes' && <TextRow ctx={ctx} k="partnerName" label="Partner's name (optional)" ph="Name" />}</Card></>);

    case 'invitePartner':
      return (<><Header emoji="✉️" title="Invite your partner (optional)" sub="Manage money together." />
        <Card><TextRow ctx={ctx} k="partnerEmail" label="Partner's email" ph="partner@email.com" /></Card></>);

    case 'dependentsCount':
      return (<><Header emoji="👨‍👩‍👧" title="How many kids or dependents?" />
        <Card><Stepper ctx={ctx} k="dependentsCount" /></Card></>);

    case 'debts': {
      const bal = num(a.debtBalance), pay = num(a.debtPayment), rate = num(a.debtRate) / 100;
      const mRate = rate / 12, interestOnly = pay <= bal * mRate;
      let months = 0;
      if (bal > 0 && pay > 0 && !interestOnly) {
        months = mRate > 0 ? Math.ceil(Math.log(pay / (pay - bal * mRate)) / Math.log(1 + mRate)) : Math.ceil(bal / pay);
      }
      const payoff = months >= 12 ? `${(months / 12).toFixed(1)} years` : `${months} months`;
      return (<><Header emoji="🎓" title="Your debt" sub="Biggest balance to start — add more in the app." />
        <Card><TextRow ctx={ctx} k="debtName" label="What is it?" ph="e.g. Student loan" />
          <MoneyRow ctx={ctx} k="debtBalance" label="Balance" />
          <NumRow ctx={ctx} k="debtRate" label="Interest rate %" ph="6.5" />
          <MoneyRow ctx={ctx} k="debtPayment" label="Monthly payment" /></Card>
        {bal > 0 && pay > 0 && (interestOnly
          ? <Callout warn text="Your payment barely covers the interest" sub="At this rate the balance won't go down — worth paying more." />
          : <Callout text={`Paid off in ~${payoff}`} sub={`At ${money(pay)}/mo and ${(rate * 100).toFixed(1)}% interest.`} />)}
      </>);
    }

    case 'legacyTarget':
      return (<><Header emoji="🎁" title="What would you like to leave?" sub="A target for your estate / heirs." />
        <Card><HeroAmount ctx={ctx} k="legacyTarget" label="Legacy target" /></Card></>);

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
        const startAge = currentAge(a, 65);
        const lastsToAge = Math.round(startAge + lastsYears);
        return (<><Header emoji="🛟" title="Will your money last?" />
          <Card>
            <RecapStat label="Portfolio" value={money(pool)} />
            <RecapStat label="Income" value={money(incAnnual) + '/yr'} />
            <RecapStat label="Spending" value={'-' + money(spendAnnual) + '/yr'} />
            <View style={s.divider} />
            <RecapStat label="Projected to last to age" value={lastsYears >= 99 ? '90+' : String(lastsToAge)}
              color={lastsToAge >= num(a.horizonAge || 90) ? Colors.primary : Colors.red} />
          </Card></>);
      }
      const age = currentAge(a);
      const years = Math.max(1, num(a.targetRetirementAge) - age);
      const monthlyContrib = monthlyContributions(a);
      const projected = fv(num(a.currentRetirementSavings), monthlyContrib, years);
      const needed = num(a.expectedRetirementSpending) * 12 * 25; // 4% rule proxy
      const gap = projected - needed;
      return (<><Header emoji="🏖️" title="Your retirement outlook" />
        <Card>
          <RecapStat label={`Needed to retire at ${num(a.targetRetirementAge) || 65}`} value={money(needed)} />
          <RecapStat label={`Projected by then (~7%/yr)`} value={money(projected)} color={Colors.primary} />
          <View style={s.divider} />
          <RecapStat label={gap >= 0 ? 'Surplus' : 'Gap'} value={money(Math.abs(gap))} color={gap >= 0 ? Colors.primary : Colors.red} />
          <Bar aPct={needed > 0 ? (projected / needed) * 100 : 0} color={gap >= 0 ? Colors.primary : Colors.red} />
        </Card></>);
    }
    case 'recap_invest': {
      const total = num(a.investmentHoldings);
      return (<><Header emoji="📈" title="Your portfolio" />
        <Card><RecapStat label="Total value" value={money(total)} color={Colors.primary} />
          <Text style={s.note}>Tracking {a.trackingLevel ? `by ${a.trackingLevel}` : ''} · {a.investObjective === 'pnl' ? 'performance / P&L' : 'net worth over time'}</Text></Card></>);
    }
    case 'recap_goals': {
      const goals = (a.goals ?? []) as any[];
      const cap = num(a.monthlySavingsCapacity) || (monthlyIncome(a) - num(a.monthlySpending));
      return (<><Header emoji="🎯" title="Your goals" />
        <Card>{goals.length === 0 ? <Text style={s.note}>No goals added.</Text> : goals.map((g, i) => {
          const months = cap > 0 ? Math.ceil(num(g.target) / cap) : 0;
          return <RecapStat key={i} label={g.label || 'Goal'} value={months ? `~${months} mo` : money(num(g.target))} />;
        })}</Card></>);
    }
    default:
      return (<><Header emoji="🛠" title={String(step)} /><Card><Text style={s.note}>Coming soon.</Text></Card></>);
  }
}

// Equity-based compensation — add one row per grant (RSUs or stock options), each valued
// by its own rule, summed into annual equity income. Refreshers stack up over time.
function RsuEditor({ ctx }: { ctx: StepCtx }) {
  const a = ctx.answers;
  const rows = (a.rsuGrants ?? []) as any[];
  const type = a.equityType ?? 'rsu';
  const isOpt = type === 'option';
  const [extra, setExtra] = React.useState(0);

  React.useEffect(() => { if (a.equityType == null) ctx.setAnswer('equityType', 'rsu'); }, []);

  const setCell = (i: number, key: string, val: string) => {
    const next = rows.slice();
    while (next.length <= i) next.push({});
    next[i] = { ...next[i], [key]: val };
    ctx.setAnswer('rsuGrants', next);
  };
  const removeRow = (i: number) => ctx.setAnswer('rsuGrants', rows.filter((_, idx) => idx !== i));

  // columns adapt to the award type; options carry a single grant-level strike & market.
  const cols = isOpt
    ? [{ key: 'shares', label: 'Options', ph: '100', kb: 'number-pad' as const }, { key: 'date', label: 'Vest date', ph: 'YYYY-MM', kb: 'default' as const }]
    : [{ key: 'shares', label: 'Shares', ph: '100', kb: 'number-pad' as const },
       { key: 'price', label: 'Price/sh', ph: `${currencySymbol()}0`, kb: 'decimal-pad' as const },
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
      <Text style={s.note2}>{isOpt ? 'Value = (market − strike) × count' : 'Value = shares × price per share'}</Text>
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

    {totalAnnual > 0 && <Callout text={`${money(totalAnnual)}/yr average while vesting`}
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
    { label: 'Retirement income', value: retirementMonthlyIncome(a) * 12 },
    { label: 'Bonus', value: num(a.bonusAnnual) },
    { label: 'Signing bonus', value: num(a.signingOnetime), once: true },
    { label: 'Equity (vesting)', value: rsuAnnual(a) },
    { label: 'Rental income (net)', value: rentalNetAnnual(a) },
    { label: 'Self-employment', value: a.seFreq === 'annual' ? num(a.seAmount) : num(a.seAmount) * 12 },
    { label: 'Interest & dividends', value: num(a.invAnnual) },
    { label: 'Benefits', value: num(a.benefitMonthly) * 12 },
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
  const nonTaxable = ex.nontaxMonthly * 12;       // benefits + support + scholarships

  const grid = incomeMonthlyGrid(a, mode);
  const gridMax = Math.max(...grid.map((g) => g.amount), 1);
  const gridMin = Math.min(...grid.map((g) => g.amount), 0);
  const modeLabel = mode === 'gross' ? 'Total' : mode === 'net' ? 'Net (after tax)' : (k401 > 0 ? 'Available (after tax & 401(k))' : 'Available (after tax)');

  // insight: the typical (most-common) month, plus the lean stretch and the windfall months —
  // each described by its month range, e.g. "$19k most months · lower May–Jul (~$10k)".
  const availGrid = incomeMonthlyGrid(a, 'available');
  const labels = availGrid.map((g) => g.label);
  const amounts = availGrid.map((g) => g.amount);
  const avgMo = availableYr / 12;
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
      <Text style={s.heroCardLabel}>Available to use / year</Text>
      <Text style={s.heroCardValue}>{money(availableYr)}</Text>
      <Text style={s.heroCardSub}>≈ {money(avgMo)}/mo average</Text>
    </View>

    {/* insight: typical month + the lean stretch + the windfall months */}
    {availableYr > 0 && (() => {
      const steady = lowMo.length === 0 && highMo.length === 0;
      const pieces: string[] = [];
      if (lowMo.length) pieces.push(`lower in ${monthRanges(lowMo.map((o) => o.i), labels)} (~${money(Math.max(0, minLow))}/mo)`);
      if (highMo.length) pieces.push(`more in ${monthRanges(highMo.map((o) => o.i), labels)} (~${money(maxHigh)}/mo)`);
      return (
        <Callout
          text={steady ? `About ${money(Math.max(0, avgMo))} a month, steady all year` : `About ${money(Math.max(0, typical))} most months`}
          sub={steady ? 'Your income is steady month to month.' : `${pieces.join('; ')} — plan ahead for those.`} />
      );
    })()}

    {/* full breakdown — every source adds up to the total */}
    <Card>
      <Text style={s.sectionLabel}>WHERE IT COMES FROM</Text>
      {lines.map((l) => (
        <RecapStat key={l.label} plain label={l.label} value={`${money(l.value)}${l.once ? ' once' : '/yr'}`} />
      ))}
      <RecapBox label="Total income / yr" value={money(total)} />

      <Text style={[s.sectionLabel, { marginTop: Spacing.md }]}>WHAT'S TAKEN OUT</Text>
      <RecapStat plain label={`Tax (~${Math.round(rate * 100)}% on taxable income)`} value={`-${money(tax)}`} color={Colors.amber} />
      {nonTaxable > 0 && <RecapStat plain label="Tax-free (benefits, support, scholarships)" value={money(nonTaxable)} color={Colors.textTertiary} />}
      {k401 > 0 && <RecapStat plain label="401(k), locked to retirement" value={`-${money(k401)}`} color={Colors.amber} />}
      <RecapBox label="Available / yr" value={money(availableYr)} tone="green" />
    </Card>

    {/* monthly cash flow — lumpy, with mode + view toggles */}
    <Card>
      <Text style={s.cap}>Monthly cash flow</Text>
      <Segmented ctx={{ ...ctx, answers: { m: mode }, setAnswer: (_, v) => setMode(v as any) }} k="m"
        options={[{ value: 'gross', label: 'Gross' }, { value: 'net', label: 'Net' }, { value: 'available', label: 'Available' }]} />
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
        if (num(a.signingOnetime) > 0 || ex.onetimeJan > 0) why.push('one-time payments land in their month');
        if (rsuAnnual(a) > 0) why.push('equity follows your vesting months');
        if (Array.isArray(a.scholarships) && a.scholarships.some((x: any) => num(x?.amount) > 0 && x?.freq !== 'monthly')) why.push('scholarships land when they\'re disbursed');
        if (a.jobType === 'temporary') why.push('your job runs only part of the year');
        return why.length ? `Some months differ because ${why.join('; ')}.` : 'Your income is the same every month.';
      })()}</Text>
    </Card>
  </>);
}

// Spending categories. `tier` = priority (how the screen is grouped: Critical → Important →
// Nice-to-have). `bucket` = frequency for the budget math (fixed/flexible = monthly, nonmonthly =
// yearly/per-semester) — the budget domain reads this. `stages` limits a category to a life stage.
type Tier = 'critical' | 'important' | 'flex';
const SPEND_CATS: { id: string; label: string; tier: Tier; bucket: 'fixed' | 'nonmonthly' | 'flexible'; icon: string; stages?: Status[] }[] = [
  // Critical — must-pay
  { id: 'rent', label: 'Rent / Housing', tier: 'critical', bucket: 'fixed', icon: '🏠' },
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
// monthly column chart showing where each month's gross splits: tax · spending · savings.
function CashflowRecap({ ctx }: { ctx: StepCtx }) {
  const a = ctx.answers;
  const [chartMode, setChartMode] = React.useState<'amount' | 'percent'>('amount');
  const retired = ctx.status === 'retired';
  const grossYr = grossAnnual(a);

  // retired / no-accumulation-income → simple income-vs-spending recap
  if (retired || grossYr <= 0) {
    const incMo = retirementMonthlyIncome(a) || monthlyIncome(a);
    const spendMo = num(a.monthlySpending);
    const left = incMo - spendMo;
    return (<>
      <Header emoji="📊" title="Your cash flow" sub="Income vs spending each month." />
      <Card>
        <RecapStat label="Income" value={`${money(incMo)}/mo`} />
        <RecapStat plain label="Spending" value={`-${money(spendMo)}/mo`} color={Colors.amber} />
        <RecapBox label="Left over / mo" value={money(left)} tone={left >= 0 ? 'green' : 'neutral'} />
      </Card>
    </>);
  }

  const rate = incomeTaxRate(a);
  const netYr = grossYr * (1 - rate);
  const taxYr = grossYr - netYr;
  const spendMo = spendBuckets(a).monthly_total;
  const spendYr = spendMo * 12;
  const saveYr = netYr - spendYr;
  const keep = grossYr > 0 ? Math.round((netYr / grossYr) * 100) : 0;        // take-home per $100
  const taxPct = grossYr > 0 ? Math.round((taxYr / grossYr) * 100) : 0;       // effective tax rate
  const saveRateNet = netYr > 0 ? Math.round((saveYr / netYr) * 100) : 0;     // savings rate of take-home
  const savePctGross = grossYr > 0 ? Math.max(0, Math.round((saveYr / grossYr) * 100)) : 0;
  const spendPct = grossYr > 0 ? Math.round((spendYr / grossYr) * 100) : 0;
  const grossGrid = incomeMonthlyGrid(a, 'gross');
  const maxG = Math.max(...grossGrid.map((m) => m.amount), 1);

  return (<>
    <Header emoji="📊" title="Your full recap" sub="Your full-year picture." />

    {/* hero — ring of where gross goes, with the four totals beside it */}
    <View style={s.heroCard}>
      <View style={s.heroRingRow}>
        <Donut segments={[
          { value: taxYr, color: Colors.amber },
          { value: spendYr, color: Colors.blue },
          { value: Math.max(0, saveYr), color: Colors.primary },
        ]}>
          <Text style={s.ringPct}>{savePctGross}%</Text>
          <Text style={s.ringPctSub}>to savings</Text>
        </Donut>
        <View style={{ flex: 1 }}>
          <View style={s.legendRow}><Text style={s.legendLabel}>Gross / yr</Text><Text style={s.legendVal}>{money(grossYr)}</Text></View>
          <View style={s.legendRow}><Text style={s.legendLabel}>Net / yr</Text><Text style={s.legendVal}>{money(netYr)}</Text></View>
          <Legend color={Colors.amber} label="Tax" value={`${money(taxYr)} · ${taxPct}%`} />
          <Legend color={Colors.blue} label="Spending" value={`${money(spendYr)} · ${spendPct}%`} />
          <Legend color={Colors.primary} label="Savings" value={`${money(saveYr)} · ${savePctGross}%`} />
        </View>
      </View>
    </View>

    {/* insight: keep-per-$100, effective tax, savings rate */}
    <Callout text={`You keep ${currencySymbol()}${keep} of every ${currencySymbol()}100 you earn`}
      sub={saveYr < 0
        ? `~${taxPct}% goes to tax — and you're spending more than you keep. Trim a category.`
        : `~${taxPct}% goes to tax · you save ${Math.max(0, saveRateNet)}% of take-home${saveRateNet >= 20 ? ' — above the 20% goal' : ''}.`}
      warn={saveYr < 0} />

    {/* stacked monthly column chart, $ or % */}
    <Card>
      <Text style={s.cap}>Each month: tax · spending · savings</Text>
      <View style={{ marginTop: 6, marginBottom: 4 }}>
        <Segmented ctx={{ ...ctx, answers: { cm: chartMode }, setAnswer: (_, v) => setChartMode(v as any) }} k="cm"
          options={[{ value: 'amount', label: 'Amount' }, { value: 'percent', label: 'Percent' }]} />
      </View>
      <View style={s.colChart}>
        {grossGrid.map((m) => {
          const g = m.amount, tax = g * rate, sp = Math.min(spendMo, Math.max(0, g - tax)), sv = Math.max(0, g - tax - spendMo);
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
        <Legend color={Colors.blue} label="Spending" value={`${money(spendYr)} · ${spendPct}%`} />
        <Legend color={Colors.primary} label="Savings" value={`${money(saveYr)} · ${savePctGross}%`} />
      </View>
    </Card>
  </>);
}

// Savings plan — column chart of what's free to save each month (income after tax/401k − spending),
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
  const net = monthlyIncome(a);
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
    <Header emoji="🐷" title="How much can you save?" sub="From your income and spending — month by month." />

    {/* hero — total annual savings */}
    <View style={s.heroCard}>
      <Text style={s.heroCardLabel}>You can save / year</Text>
      <Text style={[s.heroCardValue, annual < 0 && { color: Colors.red }]}>{money(annual)}</Text>
      <Text style={s.heroCardSub}>≈ {money(avg)}/mo average{net > 0 ? ` · ${pct}% of take-home` : ''}</Text>
    </View>

    {/* column chart of monthly savable amount */}
    <Card>
      <Text style={s.cap}>Available to save by month</Text>
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
      <Text style={s.note2}>Net of tax, 401(k), and your spending — each in the month it actually happens. Big one-off bills (like tuition) show up as a dip in that month, not spread across the year.</Text>
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
      sub={annual < 0 ? "You're spending more than you bring in — trim a category or lower a month."
        : spikes.length ? `Set more aside in ${spikes.map((sp) => sp.label).join(' & ')} — your equity & bonus months.`
          : `Steady at about ${money(avg)}/mo.`}
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

// One legend row for the spending spectrum bar: colored dot + label + value.
function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={s.legendRow}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={s.legendLabel}>{label}</Text>
      <Text style={s.legendVal}>{value}</Text>
    </View>
  );
}

// Group your spending — common categories grouped into the three buckets; amount in $ or % of
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
  const net = monthlyIncome(a);   // net monthly income, for % conversion + the insight
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
            : <Text style={s.spendName} numberOfLines={1}>{cat.icon}  {cat.label}{isNonMonthly ? <Text style={s.perYr}>  /yr</Text> : null}</Text>}
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
    <Header emoji="🪣" title="Your spending plan" sub="Add what you spend by category — we'll budget it for you." />

    {/* running total — spectrum bar across the three buckets + what's left to save */}
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
        <Legend color={SAVE_COLOR} label={save >= 0 ? 'Left to save' : 'Over budget'} value={money(Math.abs(save))} />
      </View>
      {estimated > 0 && (
        <Text style={s.note2}>
          You estimated {money(estimated)}/mo earlier — {totalMo === 0
            ? 'itemize it below (we\'re counting the full estimate until you do).'
            : Math.abs(totalMo - estimated) <= 50
              ? 'your categories match nicely.'
              : totalMo < estimated
                ? `${money(uncategorized)}/mo still to categorize — counted in "Uncategorized" for now.`
                : `${money(totalMo - estimated)}/mo over your estimate.`}
        </Text>
      )}
    </Card>

    {/* green insight, right under the bar */}
    {totalMo > 0 && <Callout text={net > 0 ? `${pctOfNet}% of your take-home is spoken for` : `${money(totalMo)}/mo total spending`}
      sub={net > 0
        ? `${money(Math.max(0, save))}/mo left to save${save < 0 ? ' — you\'re over by ' + money(-save) : ''}.`
        : `About ${money(totalMo * 12)} a year.`}
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
              <Text style={s.bucketTotalVal}>{money(tot)}/mo</Text>
            </View>
          )}
        </Card>
      );
    })}
  </>);
}

// Rental properties — one editable card each, type toggle on top, summed into net income.
function RentalEditor({ ctx }: { ctx: StepCtx }) {
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
  const netMonthly = rentalNetAnnual(ctx.answers) / 12;
  const count = list.filter((r) => num(r.income) > 0).length;

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
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Rent / mo</Text>
            <TextInput style={s.input} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
              value={r.income ?? ''} onChangeText={(t) => setProp(i, 'income', t)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Operating expense / mo</Text>
            <TextInput style={s.input} keyboardType="decimal-pad" placeholder={`${currencySymbol()}0`} placeholderTextColor={Colors.textTertiary}
              value={r.expenses ?? ''} onChangeText={(t) => setProp(i, 'expenses', t)} />
          </View>
        </View>
        {num(r.income) > 0 && <Text style={s.note2}>Net <Text style={{ fontWeight: '700' }}>{money(num(r.income) - num(r.expenses))}/mo</Text></Text>}
      </Card>
    ))}
    <TouchableOpacity style={s.addBtn} onPress={addProp}><Text style={s.addBtnT}>+ Add property</Text></TouchableOpacity>
    {count > 0 && <Callout text={`${money(netMonthly)}/mo net rental income`}
      sub={`About ${money(netMonthly * 12)} a year across ${count} propert${count > 1 ? 'ies' : 'y'} after costs.`} warn={netMonthly < 0} />}
  </>);
}

// Minimal goals editor
function GoalsEditor({ ctx }: { ctx: StepCtx }) {
  const goals = (ctx.answers.goals ?? []) as any[];
  const [label, setLabel] = React.useState(''); const [target, setTarget] = React.useState(''); const [year, setYear] = React.useState('');
  const add = () => {
    if (!label.trim() || !target) return;
    ctx.setAnswer('goals', [...goals, { label: label.trim(), target, year }]);
    setLabel(''); setTarget(''); setYear('');
  };
  return (<><Header emoji="🎯" title="What are you saving for?" sub="Add a goal — target amount and when." />
    <Card>
      <TextInput style={s.input} placeholder="Goal (e.g. House down payment)" placeholderTextColor={Colors.textTertiary} value={label} onChangeText={setLabel} />
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
        <TextInput style={[s.input, { flex: 1 }]} placeholder="$ target" keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} value={target} onChangeText={setTarget} />
        <TextInput style={[s.input, { flex: 1 }]} placeholder="By year" keyboardType="number-pad" placeholderTextColor={Colors.textTertiary} value={year} onChangeText={setYear} />
      </View>
      <TouchableOpacity style={s.addBtn} onPress={add}><Text style={s.addBtnT}>+ Add goal</Text></TouchableOpacity>
    </Card>
    {goals.map((g, i) => (
      <View key={i} style={s.goalRow}><Text style={s.goalLabel}>{g.label}</Text><Text style={s.goalVal}>{money(num(g.target))}{g.year ? ` · ${g.year}` : ''}</Text></View>
    ))}</>);
}

const s = StyleSheet.create({
  head: { alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: 23, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  sub: { fontSize: 14, color: Colors.primaryDark, textAlign: 'center', marginTop: 6 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  hint: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 6, lineHeight: 15 },
  srcCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: 8, borderWidth: 1.5, borderColor: Colors.border },
  srcCardOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  srcIcon: { fontSize: 24 },
  srcTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  srcTitleOn: { color: Colors.primaryDark },
  srcSub: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 1 },
  srcCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  srcCheckOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  srcCheckMark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  cap: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, padding: Spacing.md, fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  note: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  note2: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  segRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm },
  seg: { flex: 1, paddingVertical: 9, paddingHorizontal: 4, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, alignItems: 'center' },
  segOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  segTxt: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  segTxtOn: { color: Colors.primary, fontWeight: '700' },
  heroLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, marginBottom: 4 },
  heroInput: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 2, borderBottomColor: Colors.border, marginBottom: Spacing.sm },
  callout: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  calloutWarn: { backgroundColor: '#FBE9E7' },
  calloutIcon: { fontSize: 15, lineHeight: 20 },
  calloutTxt: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark, lineHeight: 20 },
  calloutTxtWarn: { color: Colors.red },
  calloutSub: { fontSize: 12, color: Colors.primaryDark, marginTop: 4, opacity: 0.85 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTxtOn: { color: Colors.primary, fontWeight: '700' },
  readout: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xs },
  readoutTxt: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  unitBtn: { paddingHorizontal: 12, height: 44, minWidth: 44, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgSecondary },
  unitBtnOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  unitTxt: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary },
  unitTxtOn: { color: Colors.primary },
  choice: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 2, borderColor: 'transparent' },
  choiceOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  choiceTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  choiceTitleOn: { color: Colors.primary },
  choiceSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border },
  radioOn: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  stepBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  stepBtnT: { fontSize: 24, color: Colors.primary, fontWeight: '700' },
  stepVal: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, minWidth: 44, textAlign: 'center' },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  recapLabel: { fontSize: 14, color: Colors.textSecondary },
  recapVal: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  recapValPlain: { fontSize: 15, fontWeight: '500', color: Colors.textSecondary },
  recapBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: Radii.md, marginTop: Spacing.sm },
  recapBoxNeutral: { backgroundColor: Colors.bgTertiary },
  recapBoxGreen: { backgroundColor: Colors.primaryLight },
  recapBoxLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  recapBoxVal: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.bgTertiary, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  addBtn: { marginTop: Spacing.sm, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radii.md, backgroundColor: Colors.primaryLight },
  addBtnT: { color: Colors.primary, fontWeight: '700' },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.sm },
  goalLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  goalVal: { fontSize: 14, color: Colors.textSecondary },
  removeX: { fontSize: 16, color: Colors.textTertiary, fontWeight: '700' },
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  schedHeadTxt: { fontSize: 11, fontWeight: '600', color: Colors.textTertiary },
  schedCell: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.sm, paddingHorizontal: 8, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
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
  tableCell: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  heroCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.primary },
  heroCardLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  heroCardValue: { fontSize: 38, fontWeight: '800', color: Colors.primary, marginTop: 2 },
  heroCardSub: { fontSize: 13, color: Colors.primaryDark, marginTop: 4, textAlign: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 2 },
  bucketHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  bucketTot: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  sumHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sumStat: { flex: 1 },
  sumLabel: { fontSize: 12, color: Colors.textSecondary },
  sumValue: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
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
  colVal: { fontSize: 8, fontWeight: '700', color: Colors.textSecondary, marginBottom: 2 },
  colBar: { width: '72%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  colLabel: { fontSize: 9, color: Colors.textTertiary, marginTop: 3 },
  stackCol: { width: '72%', borderTopLeftRadius: 3, borderTopRightRadius: 3, overflow: 'hidden' },
  recapGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  recapCell: { width: '50%', paddingVertical: 8 },
  recapCellLabel: { fontSize: 12, color: Colors.textSecondary },
  recapCellVal: { fontSize: 19, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  heroRingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, width: '100%' },
  ringPct: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  ringPctSub: { fontSize: 11, color: Colors.textSecondary, marginTop: -2 },
  savingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  savingsMonth: { fontSize: 14, color: Colors.textSecondary },
  savingsVal: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  savingsInput: { width: 110, backgroundColor: Colors.bgSecondary, borderRadius: Radii.sm, paddingHorizontal: 10, paddingVertical: 7, fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, textAlign: 'right' },
  spendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  spendName: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  perYr: { fontSize: 11, color: Colors.textTertiary, fontWeight: '600' },
  dueLabel: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
  spendNameInput: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 4 },
  spendAmt: { width: 78, backgroundColor: Colors.bgSecondary, borderRadius: Radii.sm, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, textAlign: 'right' },
  unitToggle: { width: 34, height: 34, borderRadius: Radii.sm, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgSecondary },
  unitToggleTxt: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  addRow: { paddingVertical: 8, marginTop: 2 },
  addAnother: { fontSize: 14, fontWeight: '700', color: Colors.primary, paddingVertical: 8 },
  cadChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  cadChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  cadTxt: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  cadTxtOn: { color: Colors.primaryDark },
  cadHint: { fontSize: 11, color: Colors.textTertiary, alignSelf: 'center', flex: 1 },
  salMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  salMonthLbl: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, width: 44 },
  salMonthInputWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 10 },
  salPre: { fontSize: 13, color: Colors.textTertiary, fontWeight: '700' },
  salMonthInput: { flex: 1, paddingVertical: 9, paddingHorizontal: 4, fontSize: 15, color: Colors.textPrimary },
  addRowTxt: { fontSize: 13, fontWeight: '600', color: Colors.primary },
});
