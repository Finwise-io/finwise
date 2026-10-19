// Net Worth = Assets − Debts. Also the capture surface: every bucket is a section you fill in
// (per-account, with institution), so it works as both first-run setup and ongoing management.
import { plural } from '../domain/_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, RefreshControl, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { SectionBand } from '../components/SectionBand';
import { fig, figPer, figSaid, figWords } from '../components/figure';
import { selectWillItLast } from '../domain/retirement/willItLast';
import { simulate } from '../domain/retirement';
import { onCourseSentence, shortfallAgeFromBand, planDoor, sampleAskLine, oddsLine, sampleOddsLine } from '../domain/planning/hub';
import { resolveLens } from '../domain/profile/lens';
// THE CALCULATION MODULE — how far back our record goes, said in words to the person.
// Founder question 2026-08-18: the retention rule was a comment for a developer; nobody using the
// app was told it has a memory limit. A figure that never says what it is measured FROM is how
// "+2.0%" stood for a year in which the account actually fell 4.2%.
import { measuredFromLabel } from '../../Calculation Module code/engines/coverage';
import { DataGapsBanner } from '../components/DataGapsBanner';
import { ChangeWalkSheet } from '../components/ChangeWalkSheet';
import { dataGaps } from '../domain/gaps';
import { Colors, Spacing, Radii, ClassMarkColors, ChartPalette, DebtRamp } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { maskedMoney, spokenMoney, typedAmount } from '../components/useMoney';
import { trendPoints, buildChangeWalk } from '../domain/history';
import { personalFlowTotals } from '../../Calculation Module code/engines/ledger';
import { connectionFreshness } from '../services/sync';
import { moneyCompact, currencySymbol } from '../domain/_shared/money';
import { buildAssetsState, ASSET_KINDS, ASSET_SECTIONS, assetKind, assetClassOf, AssetAccount, TaxBucket, assetAllocation, investableAssets, ASSET_CLASS_LABEL, type AssetClass, wrapperAccount, maturityClass, accountDisplayNames, accountClassBreakdown, classPortionLabel, type AddWrapper, sourceWording, CASH_GROUP_LABEL, isCashKind, uberGroupRows, type UberGroup, uberGroupOf, asksCashOrInvestments, CASH_OR_INVESTMENTS_ASK, TAX_TYPE_NOT_STATED } from '../domain/assets';
import { buildDebtState, debtKind, TOXIC_APR, Debt } from '../domain/debt';
// ONE DOOR (MK-NW-O-003 theNetWorth, Q-NW-1 ruled 2026-09-27). This tab and Home each built
// their own net worth; they read one answer now.
import { theNetWorth, ledgerGroups } from '../../MoneyKeel/functions/networth-and-performance/net-worth';
import { plannedMonthlySpend } from '../domain/budget';
// ONE DOOR (MK-NW-O-004 theEmergencyFund, Q-NW-5). FOUNDER 2026-09-28, settling the number change
// I had stopped on: "give both numbers" — the screen shows the runway on essentials AND the runway
// at the life you plan to live, so nothing is hidden behind one divisor. Both now carry the debt
// minimums, which were in neither figure until he asked.
import { theEmergencyFund } from '../../MoneyKeel/functions/networth-and-performance/emergency-fund';
import { willItLastInputs } from '../domain/retirement/willItLast';
import { projectNestEgg } from '../domain/retirement';
import { KeyboardAwareSheet } from '../components/KeyboardAwareSheet';   // Theme 3: shared keyboard-safe sheet
import { InfoDot, EmptyNote } from '../components/UI';
import { ADD_ACCOUNT_DOORS, ADD_ACCOUNT_QUESTION, EMPTY_DOORS } from '../constants/doors';
// the empty-debts door's words, without the arrow (the row draws its own ›) — one wording everywhere (DEC-4528, 2026-10-11)
const DEBTS_DOOR_WORDS = EMPTY_DOORS.debts.label.replace(/ ›$/, '');
import { type GlossaryTerm } from '../domain/glossary';
import { HeroAmount } from '../components/HeroAmount';
import { HiddenBalancesBanner } from '../components/HiddenBalancesBanner';
import { modalAnimation } from '../hooks/reducedMotion';
import { DotJoined } from '../components/SepDot';
import { SourceChip } from '../components/SourceChip';
import { DebtEditorSheet } from '../components/DebtEditorSheet';   // B47 finding 11: THE one debt editor
import { isoLocalDate } from '../domain/_shared/dates';
import { DateField } from '../components/DateField';   // (DEC-4059b, 2026-10-10) bond and CD dates are picked, never typed

// asset class → glossary term, so the By-class group headers carry an in-context "what is this?" dot.
const CLASS_TO_TERM: Partial<Record<AssetClass, GlossaryTerm>> = {
  cash: 'cash', stocks_etf: 'stocks', bonds: 'bonds', alternatives: 'alternatives', real_estate: 'realEstate', personal_property: 'personalProperty',
};
const SECTION_COLOR: Record<string, string> = { Cash: Colors.primary, Investments: Colors.purple, Retirement: Colors.blue, Property: Colors.gold };
// #19: the composition bar groups assets by ASSET CLASS (the taxonomy), not the old section/wrapper axis.
// Labels come from the canonical ASSET_CLASS_LABEL (single source) — only color lives here.
// #10: 'mixed' = a 401(k)/IRA/brokerage we don't know the holdings of — shown honestly, NOT as stocks.
// pre-48 audit A7: the approved mocks order classes by LIQUIDITY (Cash first), not by palette order
const CLASS_ORDER: AssetClass[] = ['cash', 'bonds', 'stocks_etf', 'alternatives', 'real_estate', 'personal_property', 'mixed'];
const CLASS_META: { key: AssetClass; label: string; color: string }[] =
  CLASS_ORDER.filter((k) => k in ClassMarkColors)
    .map((key) => ({ key, label: ASSET_CLASS_LABEL[key], color: (ClassMarkColors as any)[key] }));
// #10/#14: the asset-class options offered when classifying a wrapper account (what it HOLDS). 'auto'
// leaves it Unclassified (mixed); the rest set an explicit class so the split is accurate.
const WRAPPER_CLASS_CHOICES: { key: AssetClass | 'auto'; label: string }[] = [
  { key: 'auto', label: 'Mixed / not sure' },
  { key: 'stocks_etf', label: 'Stocks / Funds' },
  { key: 'bonds', label: 'Bonds' },
  { key: 'cash', label: 'Cash' },
  { key: 'alternatives', label: 'Alternatives' },
];
const SECTION_ICON: Record<string, string> = { Cash: '💵', Investments: '📈', Retirement: '🏛️', Property: '🏠' };
const CLASS_ICON: Record<AssetClass, string> = { cash: '💵', stocks_etf: '📈', bonds: '📜', alternatives: '🪙', real_estate: '🏠', personal_property: '🚗', mixed: '🧩' };
// no tax type stated is not Retirement: only a PRE_TAX or ROTH bucket says retirement (DEC-4036f, 2026-10-10); an
// account with none (the old sign-up answer "savings or portfolio", DEC-4036g) sits with Investments, Unclassified
const bucketSection = (b: TaxBucket | undefined) => (b === 'CASH' ? 'Cash' : b === 'PROPERTY' ? 'Property' : b === 'PRE_TAX' || b === 'ROTH' ? 'Retirement' : 'Investments');
const sectionOf = (a: AssetAccount) => assetKind(a.kind)?.section ?? bucketSection(a.tax_bucket);
const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
// B-21: an asset can be saved at $0 (placeholder), but the amount field must be filled in — a typed
// "0" is allowed, a blank field is not (prevents accidental empty adds). A kind must also be picked.
export const assetSheetReady = (kind: string, bal: string) => !!kind && bal.trim() !== '' && num(bal) >= 0;
// `shortMoney` is gone (2026-10-01). Shortening a figure is part of the tag contract now —
// MK-NW-M-063 is declared as money-compact — so the screen no longer keeps a formatter of its own
// for the one line that needs it.
// THE ONE trailing arrow column. Every ledger row reserves it — a row that navigates fills it with
// "›", a row that doesn't leaves it empty, and a section band adds it to its total's right margin.
// That is what puts every number on the screen on ONE right edge (founder gap 4, 2026-08-10).
const ARROW = 16;
// …but a row also carries a gap between its value and that arrow, and the band did not, so band
// totals sat 8 points RIGHT of every row value (founder, 2026-08-11). The band's total must clear
// BOTH. This is the number every band on this screen passes as `trailing`.
const RIGHT_SLOT = ARROW + Spacing.sm;
// The debt bar's ramp lives in the theme (DebtRamp): ONE hue in four lightness steps, so the
// segments are told apart by light-vs-dark rather than by hue — readable with any colour blindness,
// and in a greyscale screenshot. Every segment is still named with its percent in the legend too.
// The emergency fund bar fills against the top of the usual 3-6 month guide, so a full bar means "covered".
const CUSHION_FULL_MONTHS = 6;

// (The donut ring that used to live here was removed 2026-08-11 — founder Q6: "bar replaces donut".
//  The composition bar below is the one picture of what you own; the cockpit keeps its own chart.)

// THE COMPOSITION BAR (founder decision 2026-08-11, Q6: "add both. Bar replaces donut."). One thin
// stacked bar plus a wrapping legend, used for BOTH what you own and what you owe — one shape, so
// the two sections read as the same kind of picture. Every segment is named with its percent in the
// legend, so colour is never the only signal (the colourblind rule).
//
// The percentages ALWAYS total 100: whole-percent rounding leaves a remainder, and the remainder is
// given to the largest segment rather than left to make the bar over- or under-run. A segment that
// rounds to 0% still appears in the legend as <1% — never silently dropped.
const BAR_MIN_W = 1.5;   // % width floor, so a sliver is still visible as a mark
export function barSegments<T extends { key: string; label: string; color: string; total: number }>(rows: T[]) {
  const sum = rows.reduce((t, r) => t + Math.max(0, r.total), 0);
  if (sum <= 0) return [] as (T & { pct: number; width: number })[];
  const raw = rows.map((r) => ({ ...r, exact: (Math.max(0, r.total) / sum) * 100 }));
  const out = raw.map((r) => ({ ...r, pct: Math.round(r.exact) }));
  const drift = 100 - out.reduce((t, r) => t + r.pct, 0);
  if (drift !== 0) {
    const biggest = out.reduce((a, b) => (b.exact > a.exact ? b : a));
    biggest.pct += drift;                      // the largest bucket absorbs the rounding remainder
  }
  return out.map((r) => ({ ...r, width: Math.max(BAR_MIN_W, r.exact) }));
}

function CompositionBar<T extends { key: string; label: string; color: string; total: number }>(
  { rows, spoken }: { rows: T[]; spoken: string },
) {
  const segs = barSegments(rows);
  if (!segs.length) return null;
  const scale = 100 / segs.reduce((t, s) => t + s.width, 0);   // re-normalise after the sliver floor
  return (
    <View style={styles.compWrap} accessible
      accessibilityLabel={`${spoken}: ${segs.map((s) => `${s.label} ${s.pct} percent`).join(', ')}.`}>
      <View style={styles.compBar}>
        {segs.map((s) => (
          <View key={s.key} style={{ width: `${s.width * scale}%`, backgroundColor: s.color }} />
        ))}
      </View>
      <View style={styles.compLegend}>
        {segs.map((s) => (
          <View key={s.key} style={styles.compLegendItem}>
            <View style={[styles.compSwatch, { backgroundColor: s.color }]} />
            <Text style={styles.compLegendTxt}>{s.label} {s.pct < 1 ? '<1' : s.pct}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// You CAPTURE money by account (how it's held); the bar REGROUPS by asset class (what it is). These
// display labels make the capture axis read as account/tax-bucket framing so it never sounds like it's
// contradicting the bar's class words (Option B, 2026-06-24). Keys stay stable for grouping.
const SECTION_LABEL: Record<string, string> = {
  Cash: 'Cash',
  Investments: 'Taxable accounts',
  Retirement: 'Retirement accounts',
  Property: 'Real estate & personal property',
};
const secLabel = (s: string) => SECTION_LABEL[s] ?? s;
const WIZ_HINT: Record<string, string> = {
  Cash: 'Checking, savings, emergency fund.',
  Investments: 'Brokerage & other taxable accounts — stocks and funds, bonds, crypto.',
  Retirement: '401(k), IRAs, HSA.',
  Property: 'Home & other real estate, vehicles, valuables.',
  Debts: 'Mortgage, loans, credit cards — with their rates.',
};

export default function NetWorthScreen() {
  const router = useRouter();
  const store = useStore() as any;

  // Build-47 walk row 13 (audit Home·NW #12): pull down = refresh prices AND connected accounts.
  const [refreshing, setRefreshing] = React.useState(false);
  const onPull = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const { runSnapTradeSync } = require('../services/sync/snaptradeSync');
      await Promise.allSettled([store.refreshPrices?.(), runSnapTradeSync({ force: true })]);
    } finally { setRefreshing(false); }
  }, []);
  useEffect(() => { store.maybeRefreshPrices?.(); }, []);   // keep balances live with the market
  const op = store.onboardingProfile;
  const uid = store.user?.uid ?? 'local';
  const assets: AssetAccount[] = store.assetAccounts ?? [];
  const liabilities: Debt[] = store.liabilities ?? [];
  // existing users (accounts already set up, e.g. seeded) skip the intro and go straight to the manager
  const choice = (store.nwSetupChoice as ('guided' | 'self' | null)) ?? ((assets.length || liabilities.length || store.nwSeeded) ? 'self' : null);
  const worth = useMemo(() => theNetWorth({ uid, accounts: assets, debts: liabilities }),
    [uid, assets, liabilities]);
  const aState = useMemo(() => buildAssetsState(uid, assets), [assets]);
  const dState = useMemo(() => buildDebtState(uid, liabilities), [liabilities]);
  // emergency-fund runway: cash ÷ monthly expenses
  const cashOnHand = worth.cash;   // the ONE cash figure (Q-NW-1) — Insights shows this same one
  // G21 / Q21 / Q47 (2026-09-08): ONE essentials figure (MK-CF-F-190) — the average of logged expenses
  // over the months logged, labelled "N month average"; the typed plan only when nothing is logged.
  const emergencyFund = useMemo(() => theEmergencyFund({
    accounts: assets, expenses: store.expenses ?? [], profile: op, debts: liabilities,
  }), [assets, store.expenses, op, liabilities]);
  const essentials = { monthly: emergencyFund.essentialsMonthly, label: emergencyFund.essentialsBasis };
  const monthlySpend = emergencyFund.essentialsMonthly;
  const runwayMonths = emergencyFund.monthsCovered;
  const runwayAtPlannedSpend = emergencyFund.monthsCoveredAtPlannedSpend;
  // RENT FROM A PROPERTY KEEPS ARRIVING (founder, 2026-10-04: "add it to the cash as losing job does
  // not mean loosing rental income too"). With none, every line below reads exactly as drawn (v08).
  const rentArriving = emergencyFund.rentalIncomeMonthly;
  const lessRent = rentArriving > 0 ? ` − ${figPer('MK-NW-M-064', rentArriving)} rent from your property` : '';

  const nw = { gross_assets: worth.assets, gross_debt: worth.debts, net_worth: worth.netWorth };

  const [assetSheet, setAssetSheet] = useState<{ open: boolean; section?: string; edit?: AssetAccount }>({ open: false });
  const [debtSheet, setDebtSheet] = useState<{ open: boolean; edit?: Debt }>({ open: false });
  const [step, setStep] = useState(0);
  const [invGroup, setInvGroup] = useState<'type' | 'account'>('type');
  const [expanded, setExpanded] = useState(false);        // legacy editors section (kept for edit flows)
  const [showAllClassRows, setShowAllClassRows] = useState<Record<string, boolean>>({});
  const [openClasses, setOpenClasses] = useState<Record<string, boolean>>({});
  // FINAL mock (mockup-vf/networth-FINAL): the three uber-groups, collapsible, remembered per session
  const [openUber, setOpenUber] = useState<Record<string, boolean>>({ cash: true, investments: true, property: true });
  // handoff 2026-08-10: By institution collapses too, and keeps its OWN memory — closing Vanguard
  // here must not close the Investments group over on By category. Two views, two sets of flags.
  const [openInst, setOpenInst] = useState<Record<string, boolean>>({});
  const [walkOpen, setWalkOpen] = useState(false);   // the change tap → the walk sheet (final mock State E)   // v4: per-class expand, default collapsed
  const [addChooser, setAddChooser] = useState(false);    // the one add-or-connect button's three paths
  // Walk row 8 (v7 FINAL, audit Home·NW #13): the inventory grouping — class is the approved default
  const [nwGrouping, setNwGrouping] = useState<'class' | 'institution' | 'type'>('class');

  // Walk row 7 (v7 FINAL + doc, audit Home·NW #15): the Plan's projection for the path-ahead row.
  // Number only when the plan is computable AND retirement is still ahead — never an invented figure.
  const pathAhead = useMemo(() => {
    const inputs = willItLastInputs({ op, accounts: assets, assumptions: store.retirementAssumptions ?? {}, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus });
    if (!inputs || inputs.start_balance <= 0 || inputs.retire_age <= inputs.current_age) return null;
    const egg = Math.round(projectNestEgg(inputs).will_have);
    return egg > 0 ? { egg, age: inputs.retire_age } : null;
  }, [op, assets, store.retirementAssumptions, store.inflationRate, store.employmentStatus]);

  // FCC: the Account detail screen's Edit button lands here with ?edit=<id> → open the one editor
  const { edit: editParam } = useLocalSearchParams<{ edit?: string }>();
  useEffect(() => {
    if (!editParam) return;
    const target = assets.find((a) => String(a.asset_id) === String(editParam));
    if (target) setAssetSheet({ open: true, edit: target });
    router.setParams({ edit: undefined } as any);   // consume the param so back/refocus doesn't reopen
  }, [editParam]);

  const sectionTotals = ASSET_SECTIONS.map((sec) => ({ sec, total: assets.filter((a) => sectionOf(a) === sec).reduce((t, a) => t + (a.balance != null && Number.isFinite(a.balance) ? a.balance : 0), 0) }));   // a missing balance is left out (DEC-3279e)
  const alloc = assetAllocation(assets);   // #19: assets grouped by ASSET CLASS (the taxonomy)
  // FOUNDER DECISION 2026-08-11 (audit Q2) — supersedes the pre-48 audit A7 liquidity order:
  // categories read BIGGEST FIRST, in the bar and in the list alike, so the two always tell the
  // same story in the same order. The three uber-groups keep their fixed Cash → Investments →
  // Personal property order; only the categories inside them are sorted.
  const classRows = CLASS_META.map((m) => ({ ...m, total: alloc[m.key] })).filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
  // THE LIST ALSO SHOWS A CLASS WHOSE ONLY ACCOUNTS HAVE NO BALANCE, reading 'Value not entered' (DEC-3657) — the bar and
  // the percents count only what is known (OpenAI final, 2026-10-09, DEC-3279e: a missing balance is left out
  // of the total and named, never dropped from view)
  const noBal = (a: AssetAccount) => a.balance == null || !Number.isFinite(a.balance as number);
  const unvaluedClasses = new Set(assets.filter(noBal).map((a) => assetClassOf(a)));
  const listRows = [...classRows, ...CLASS_META.filter((m) => !(alloc[m.key] > 0) && unvaluedClasses.has(m.key))
    .map((m) => ({ ...m, total: 0, unvalued: true as const }))];
  const displayNames = accountDisplayNames(assets);   // masks only when real digits; twins get " · 1/2"
  // the same accounts, grouped by who holds them — biggest first, so the bar and the list beneath
  // it read in the same order. Colours come from the validated categorical palette.
  const institutionRows = useMemo(() => {
    const by = new Map<string, number>();
    for (const a of assets) {
      const k = a.institution?.trim() || 'No institution';
      by.set(k, (by.get(k) ?? 0) + (a.balance || 0));
    }
    return [...by.entries()]
      .filter(([, total]) => total > 0)
      .sort((x, y) => y[1] - x[1])
      .map(([label, total], i) => ({ key: label, label, color: ChartPalette[i % ChartPalette.length], total }));
  }, [assets]);
  const costliest = dState.highest_rate_debt && dState.highest_rate_debt.interest_rate_apr > TOXIC_APR ? dState.highest_rate_debt : null;
  const totalAssets = aState.total_asset_value;
  // NW-9: the headline insight names the largest asset CLASS (matches the bar), not the account section.
  const topClass = [...classRows].sort((a, b) => b.total - a.total)[0];
  const investable = worth.investable;   // NW-12: cash + investments (excludes home & belongings) — the ONE figure (Q-NW-1)
  const debtRatio = totalAssets > 0 ? dState.total_debt_balance / totalAssets : 0;
  const pctOf = (v: number) => (totalAssets > 0 ? Math.round((v / totalAssets) * 100) : 0);

  // Legacy helper: jump to the accounts that make up a class.
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});
  const scrollToSection = (sec: string) => { const y = sectionY.current[sec]; if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true }); };
  const scrollToClass = (cls: AssetClass) => {
    const target = ASSET_SECTIONS.find((sec) => assets.some((a) => sectionOf(a) === sec && assetClassOf(a) === cls));
    if (target) scrollToSection(target);
  };

  // ONE class-row renderer — used inside every uber-group (and by the legacy path), so a row can
  // never look different depending on where it is drawn.
  // the retirement line: the SAME function + the SAME approved words as the Plan hub
  const nwWil = selectWillItLast({ op: op ?? {}, accounts: assets, assumptions: store.retirementAssumptions ?? {}, bigCosts: store.bigCosts, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus, withBand: true });
  const nwSim = nwWil.inputs ? simulate({ ...nwWil.inputs, with_band: true }) : null;
  const nwLens = resolveLens(op ?? {}, store.lensOverride);
  // which of the three answers are still missing (age · what you spend · what you have)
  const nwDoor = planDoor(op, assets);
  const nwOnCourse = onCourseSentence({
    lens: resolveLens(op ?? {}, store.lensOverride), chance: nwWil.chance,
    retireAge: Math.round(Number(store.retirementAssumptions?.retireAge ?? op?.targetRetirementAge ?? 67)),
    horizonAge: nwWil.horizonAge,
    potAtRetire: nwSim?.projected_at_retirement ?? null,
    leftoverAtHorizon: nwSim?.band?.length ? nwSim.band[nwSim.band.length - 1].p50 : null,
    shortfallAge: shortfallAgeFromBand(nwSim?.band),
    money: maskedMoney,
  });
  // how many accounts actually sit inside a class (the same member rule the rows use)
  const membersOf = (cls: AssetClass) => assets.filter((a) => {
    const b = accountClassBreakdown(a);
    return b ? !!b[cls] : assetClassOf(a) === cls;
  }).length;
  // the closed-group count, worded the way the approved mock words it: CASH · 2 accounts,
  // INVESTMENTS · 2 categories, PERSONAL PROPERTY · 1 item. It names what is really behind the bar.
  const collapsedCount = (g: { group: UberGroup; label: string; classes: { key: AssetClass; label: string }[] }) => {
    const accounts = g.classes.reduce((t, c) => t + membersOf(c.key), 0);
    if (g.group === 'property') return plural(accounts, 'item');
    if (g.classes.length > 1) return `${g.classes.length} categories`;
    return plural(accounts, 'account');
  };

  const renderClassRow = (r: { key: AssetClass; label: string; color: string; total: number }, i: number, hideHeader = false) => {
    const members = assets
      .map((a) => {
        const b = accountClassBreakdown(a);
        // an account whose balance is missing stays under its class, reading 'Value not entered' (DEC-3657) — it used to drop
        // out of the list as if it held nothing (OpenAI final, 2026-10-09, DEC-3279e)
        const missing = a.balance == null || !Number.isFinite(a.balance as number);
        const portion: number | null = missing ? (assetClassOf(a) === r.key ? null : 0)
          : b ? b[r.key] : assetClassOf(a) === r.key ? (a.balance as number) : 0;
        return { a, portion, split: !!b && !missing };
      })
      .filter((m) => m.portion !== 0)
      .sort((x, y) => (y.portion ?? -Infinity) - (x.portion ?? -Infinity));
    // approved v4 rule kept: a LONE class auto-expands — hiding the only account behind a tap
    // would obscure, not glance.
    const isOpen = hideHeader || classRows.length === 1 || !!openClasses[r.key];
    const shownMembers = !isOpen ? [] : showAllClassRows[r.key] ? members : members.slice(0, 5);
    return (
      <View key={r.key}>
        {/* founder gap 3 (2026-08-10): no "Cash" heading inside the Cash group — the group bar
            already said it. A single same-named class renders its accounts directly. */}
        {!hideHeader && <TouchableOpacity style={styles.ledgerRow} accessibilityRole="button"
          onPress={() => setOpenClasses((m) => ({ ...m, [r.key]: !isOpen }))}
          accessibilityLabel={`${r.label}, ${(r as any).unvalued ? 'value not entered' : figSaid('MK-NW-M-007', Math.round(r.total))}. ${isOpen ? 'Collapses' : 'Expands'} its ${plural(members.length, 'account')}.${r.key === 'mixed' ? ' Tap an account to say what is inside.' : ''}`}>
          <Text style={styles.classCaret}>{isOpen ? '▾' : '▸'}</Text>
          <View style={[styles.dot, { backgroundColor: r.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{r.label}</Text>
            {r.key === 'mixed' && isOpen && <Text style={styles.rowSub}>tap an account to say what's inside</Text>}
          </View>
          <Text style={styles.rowVal}>{(r as any).unvalued ? figWords('MK-NW-M-007', 'Value not entered') : fig('MK-NW-M-007', Math.round(r.total))}</Text>
          {/* the empty arrow column: a row that doesn't navigate still holds the slot open, so its
              number lands on the same right edge as one that does (founder gap 4) */}
          <View style={styles.arrowGap} />
        </TouchableOpacity>}
        {shownMembers.map(({ a, portion, split }) => (
          <TouchableOpacity accessibilityRole="button" key={a.asset_id} style={[styles.ledgerRow, styles.ledgerChild]}
            onPress={() => router.push((split ? `/account-detail?id=${a.asset_id}&class=${r.key}` : `/account-detail?id=${a.asset_id}`) as any)}
            accessibilityLabel={`${displayNames.get(a.asset_id)}${split ? `, ${classPortionLabel(a, r.key)}` : ''}, ${portion == null ? 'value not entered' : figSaid('MK-NW-M-008', Math.round(portion))}. Opens its page.`}>
            <View style={{ flex: 1 }}>
              <Text style={styles.acctRowLabel} numberOfLines={1}>{displayNames.get(a.asset_id)}</Text>
              {split && <Text style={styles.acctRowSub}>{classPortionLabel(a, r.key)}</Text>}
              {/* the old sign-up answer "savings or portfolio" is asked about in its own words (DEC-4036g, 2026-10-10) */}
              {!split && asksCashOrInvestments(a) && <Text style={styles.acctRowSub}>{CASH_OR_INVESTMENTS_ASK} Tap to say.</Text>}
              <SourceChip account={a} paused={!!(a.connection_id && (store.snaptradeConnections ?? []).find((c: any) => c.id === a.connection_id && c.disabled))} />
            </View>
            <Text style={styles.acctRowVal}>{portion == null ? figWords('MK-NW-M-008', 'Value not entered') : fig('MK-NW-M-008', Math.round(portion))}</Text>
            <Text style={styles.arrowSlot}>›</Text>
          </TouchableOpacity>
        ))}
        {isOpen && members.length > 5 && !showAllClassRows[r.key] && (
          <TouchableOpacity accessibilityRole="button" onPress={() => setShowAllClassRows((m) => ({ ...m, [r.key]: true }))}
            accessibilityLabel={`Show all ${members.length} ${r.label} accounts`}>
            <Text style={styles.acctMore}>all {members.length} ›</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── shared section renderers (used by both the manager and the guided wizard) ──
  const curYm = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const assetRow = (a: AssetAccount, i: number, title: string, sub: string, amount?: number, rowKey?: string) => {
    const shown = amount ?? a.balance;
    // a missing balance says 'Value not entered' (DEC-3657), never $0 or the refusal sentence (outside review OpenAI final, 2026-10-09, DEC-3279e)
    const has = shown != null && Number.isFinite(shown as number);
    const ch = a.change_month === curYm ? (a.change_amount ?? 0) : 0;
    const up = ch > 0;
    // FCC: every row says where its number comes from and how fresh it is
    const stamp = sourceWording(a);   // walk row 8: the ONE source sentence
    sub = sub ? `${sub} · ${stamp}` : stamp;
    // FCC: a row opens the account's DETAIL page; Edit still reaches this screen's sheet via ?edit=
    return (
      <TouchableOpacity key={rowKey ?? a.asset_id} style={[styles.row, i > 0 && styles.divider]} accessibilityRole="button" accessibilityLabel={`Open ${title}, ${has ? figSaid('MK-NW-M-008', shown) : 'value not entered'}`} onPress={() => router.push(`/account-detail?id=${a.asset_id}` as any)}>
        <Text style={styles.rowIcon}>{assetKind(a.kind)?.icon ?? '💼'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            {ch !== 0 && <Text style={[styles.chArrow, { color: up ? Colors.gainText : Colors.red }]}>{up ? '▲' : '▼'}</Text>}
            <Text style={styles.rowVal}>{has ? fig('MK-NW-M-008', shown) : figWords('MK-NW-M-008', 'Value not entered')}</Text>
          </View>
          {ch !== 0 && <Text style={[styles.chDelta, { color: up ? Colors.gainText : Colors.red }]}>{up ? '+' : '−'}{fig('MK-NW-M-001', Math.abs(ch))} this mo</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderAssetSection = (sec: string) => {
    const rows = assets.filter((a) => sectionOf(a) === sec);
    const total = rows.reduce((t, a) => t + (a.balance != null && Number.isFinite(a.balance) ? a.balance : 0), 0);   // a missing balance is left out (DEC-3279e)
    const head = (
      <View style={styles.secHead}>
        <SectionBand light title={`${SECTION_ICON[sec]}  ${secLabel(sec).toUpperCase()}`} value={total > 0 ? fig('MK-NW-M-006', total) : undefined} />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Add to ${secLabel(sec)}`} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => setAssetSheet({ open: true, section: sec })}><Text style={styles.add}>+ Add</Text></TouchableOpacity>
      </View>
    );

    // Investments: group by asset CLASS (what it is) or by INSTITUTION (where it's held). The row always
    // names the account/holding; the secondary line shows the OTHER axis. (Fixes: Alternatives showing as
    // "Other" — that was the KIND label; and "by account" showing classes instead of institutions.)
    if (sec === 'Investments' && rows.length > 0) {
      const classLabel = (a: AssetAccount) => ASSET_CLASS_LABEL[assetClassOf(a)] ?? 'Unclassified';
      const keyOf = (a: AssetAccount) => invGroup === 'type' ? classLabel(a) : (a.institution?.trim() || 'No institution set');
      // Surface the tickers inside a brokerage account (e.g. an imported "Imported holdings" account that
      // holds LCTX, AAPL…) on the row's secondary line, so individual securities aren't buried.
      const tickersOf = (a: AssetAccount) => ((a as any).positions ?? []).map((p: any) => p.ticker).filter(Boolean) as string[];
      const withTickers = (a: AssetAccount, base: string) => {
        const t = tickersOf(a); if (!t.length) return base;
        const shown = t.slice(0, 4).join(' · ') + (t.length > 4 ? ` +${t.length - 4}` : '');
        return base ? `${base} · ${shown}` : shown;
      };
      // THE DOOR GROUPS AND ADDS UP, NOT THIS SCREEN (Net worth pass 1, 2026-09-30). This built the
      // groups itself and totalled each with an inline reduce over balances; MK-NW-M-006's own row on
      // the master said so — "this section total is computed on the screen itself". A money figure is
      // never re-derived on a screen, so both figures come from ledgerGroups now.
      const byId = new Map(rows.map((a) => [String(a.asset_id), a]));
      const ledger = ledgerGroups(rows, invGroup === 'type' ? 'class' : 'institution', classLabel, assetClassOf);
      const groups: Record<string, AssetAccount[]> = {};
      const amountOf: Record<string, Map<string, number | null>> = {};   // each account's part in this group (his ruling, 2026-10-07); null = no balance entered (DEC-3279e)
      const totalOf: Record<string, number> = {};
      const mixOf: Record<string, { key: string; total: number }[]> = {};
      for (const g of ledger) {
        groups[g.label] = g.accountIds.map((id) => byId.get(id)!).filter(Boolean);
        amountOf[g.label] = new Map(g.rows.map((r) => [r.accountId, r.amount]));
        totalOf[g.label] = g.total;
        mixOf[g.label] = g.mix;
      }
      return (
        <View key={sec}>
          {head}
          <View style={styles.invToggle}>
            {(['type', 'account'] as const).map((g) => (
              <TouchableOpacity key={g} style={[styles.invTab, invGroup === g && styles.invTabOn]} accessibilityRole="button" accessibilityState={{ selected: invGroup === g }} accessibilityLabel={g === 'type' ? 'Group by class' : 'Group by institution'} hitSlop={{ top: 8, bottom: 8 }} onPress={() => setInvGroup(g)}>
                <Text style={[styles.invTabTxt, invGroup === g && styles.invTabTxtOn]}>{g === 'type' ? 'By class' : 'By institution'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {Object.entries(groups).map(([g, items]) => (
            <View key={g}>
              <View style={styles.groupHead}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.groupName}>{g}</Text>
                  {invGroup === 'type' && CLASS_TO_TERM[assetClassOf(items[0])] && <InfoDot term={CLASS_TO_TERM[assetClassOf(items[0])]!} />}
                </View>
                <Text style={styles.groupVal}>{fig('MK-NW-M-007', totalOf[g])}</Text>
              </View>
              {/* Mock A: under each institution, an at-a-glance class mix (so a "Chase" with mixed holdings
                  reads as a roll-up, not just a flat list). */}
              {invGroup === 'account' && (() => {
                const mix = mixOf[g] ?? [];      // the door's own mix, so the line and the band agree
                return mix.length > 1 ? <Text style={styles.classMix}>{mix.map((x) => `${CLASS_ICON[x.key as AssetClass]} ${fig('MK-NW-M-063', x.total)}`).join('   ·   ')}</Text> : null;
              })()}
              <View style={styles.card}>
                {items.map((a, i) => {
                  // HIS RULING, 2026-09-30 (master Q14): "Call an account by it's name - no need to label it unless
                  // it is checking or savings account." An account that holds several classes carries no class
                  // word under its name; it used to read "Unclassified".
                  const base = invGroup === 'type' ? (a.institution?.trim() || '') : (assetClassOf(a) === 'mixed' ? '' : classLabel(a));
                  const t = withTickers(a, base);
                  // NW-15: an Unclassified account has no holdings set — invite a tap to classify it.
                  // the old sign-up answer "savings or portfolio" is asked about in its own words (DEC-4036g, 2026-10-10)
                  const sub0 = asksCashOrInvestments(a) ? `${CASH_OR_INVESTMENTS_ASK} Tap to say.`
                    : assetClassOf(a) === 'mixed' && !tickersOf(a).length ? (t ? `${t} · tap to set holdings` : 'Tap to set what\'s inside') : t;
                  // by class, an account in several classes shows only its part here, and says which part
                  const part = amountOf[g]?.get(String(a.asset_id)) ?? (a.balance || 0);
                  const isPart = invGroup === 'type' && Math.abs(part - (a.balance || 0)) > 0.005;
                  const key = (Object.keys(ASSET_CLASS_LABEL) as AssetClass[]).find((k) => ASSET_CLASS_LABEL[k] === g);
                  const sub = isPart && key ? classPortionLabel(a, key) : sub0;
                  return assetRow(a, i, displayNames.get(a.asset_id) ?? a.label, sub, isPart ? part : undefined, `${a.asset_id}-${g}`);
                })}
              </View>
            </View>
          ))}
        </View>
      );
    }

    return (
      <View key={sec}>
        {head}
        <View style={styles.card}>
          {rows.length === 0
            ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Add a ${secLabel(sec)} account`} onPress={() => setAssetSheet({ open: true, section: sec })}><Text style={styles.empty}>Add a {sec.toLowerCase()} account →</Text></TouchableOpacity>
            : rows.map((a, i) => assetRow(a, i, a.label, asksCashOrInvestments(a) ? `${CASH_OR_INVESTMENTS_ASK} Tap to say.`   // (DEC-4036g, 2026-10-10)
              : `${assetKind(a.kind)?.label ?? a.tax_bucket ?? TAX_TYPE_NOT_STATED}${a.institution ? ` · ${a.institution}` : ''}`))}
        </View>
      </View>
    );
  };

  const renderDebtSection = () => (
    <View>
      <View style={styles.secHead}>
        <SectionBand light title="💳  DEBTS" value={dState.total_debt_balance > 0 ? fig('MK-NW-M-009', dState.total_debt_balance) : undefined} />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add a debt" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => setDebtSheet({ open: true })}><Text style={styles.add}>+ Add</Text></TouchableOpacity>
      </View>
      <View style={styles.card}>
        {liabilities.length === 0
          ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={DEBTS_DOOR_WORDS} onPress={() => setDebtSheet({ open: true })}><Text style={styles.empty}>{EMPTY_DOORS.debts.label}</Text></TouchableOpacity>   /* was "Add a debt →" (DEC-4528, 2026-10-11) */
          : (<>
            {liabilities.map((d, i) => {
              const hot = d.interest_rate_apr > TOXIC_APR;
              return (
                <TouchableOpacity key={d.debt_id} style={[styles.row, i > 0 && styles.divider]} accessibilityRole="button" accessibilityLabel={`Edit ${d.label}, ${figSaid('MK-NW-M-010', d.remaining_balance)}`} onPress={() => setDebtSheet({ open: true, edit: d })}>
                  <Text style={styles.rowIcon}>{debtKind(d.debt_type)?.icon ?? '🧾'}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.rowTitle}>{d.label}</Text>
                      {costliest?.debt_id === d.debt_id && <View style={styles.hotPill}><Text style={styles.hotPillTxt}>pay first</Text></View>}
                    </View>
                    <Text style={[styles.rowSub, hot && { color: Colors.red }]}>{(d.interest_rate_apr * 100).toFixed(2)}% APR · {figPer('MK-NW-M-011', d.minimum_monthly_payment)}</Text>
                  </View>
                  <Text style={styles.rowVal}>{fig('MK-NW-M-010', d.remaining_balance)}</Text>
                </TouchableOpacity>
              );
            })}
            {/* MK-NW-M-012 — HIS RULING ON Q53 (2026-09-30): "what actually leaves". This line showed
                the MINIMUM each debt obliges; it now shows what leaves the account, which counts a
                payment set above the minimum. On a card with a $200 minimum paid at $600 it read $200
                and now reads $600 — the words say "payments", and what a person pays is what they pay.
                The minimum is still on the door (monthlyDebtMinimum) for debt-to-income, where the
                obligation is the right figure. */}
            <View style={[styles.row, styles.divider]}><Text style={[styles.rowSub, { flex: 1 }]}>Monthly debt payments</Text><Text style={styles.rowVal}>{figPer('MK-NW-M-012', worth.monthlyDebtPayments)}</Text></View>
          </>)}
      </View>
    </View>
  );

  // "AUG 11, 2026" — today, the day these numbers are true as of. One definition, so the hero and
  // anything else that stamps the screen can never print two different todays.
  const asOfToday = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

  // ONE definition of the grouping buttons — the first-day screen and the full screen render the
  // same control (founder Q4, 2026-08-11), so the two can never drift apart.
  const groupingPills = (
    <View style={styles.groupPills}>
      {([['class', 'By category'], ['institution', 'By institution']] as const).map(([key, label]) => (
        <TouchableOpacity key={key} accessibilityRole="button"
          accessibilityLabel={`Group what you own ${label.toLowerCase()}${nwGrouping === key ? ', selected' : ''}`}
          style={[styles.groupPill, nwGrouping === key && styles.groupPillOn]}
          onPress={() => setNwGrouping(key)}>
          <Text style={[styles.groupPillTxt, nwGrouping === key && styles.groupPillTxtOn]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  let body: React.ReactNode;

  if (!choice) {
    // ── FIRST DAY — the approved State C (mockup-vf/networth-FINAL, founder rule 2026-08-04):
    // keep the FULL layout with honest zeros so a new person sees exactly what this screen becomes,
    // and show THE ONE app-wide retirement sample (identical to Home's) — never a reinvented one.
    body = (
      <ScrollView contentContainerStyle={styles.contentFlat} showsVerticalScrollIndicator={false}>
        {/* the same full-width green banners the with-data screen wears (founder 2026-08-11) — one
            titling treatment, whatever state the screen is in. No date: nothing has been measured yet. */}
        <View style={styles.heroBlock}>
          <SectionBand infoTerm="netWorth" title="YOUR NET WORTH" />
          <View style={styles.blockBody}>
            <Text style={styles.ownOweLine}>Own {fig('MK-NW-M-004', 0)} − Owe {fig('MK-NW-M-009', 0)}</Text>
            <HeroAmount style={styles.glanceVal}>{fig('MK-XS-M-001', 0)}</HeroAmount>
            <EmptyNote door="accounts" onPress={() => setAddChooser(true)} />   {/* Q48; Net worth v08: opens the add sheet */}
          </View>
        </View>

        <View style={styles.heroBlock}>
          <SectionBand title="YOUR RETIREMENT PLAN" />
          <View style={styles.blockBody}>
            <Text style={styles.sampleLine}><Text style={styles.sampleNum}>{sampleOddsLine()}</Text></Text>
            <Text style={styles.rowSub}>a sample, not your number — 3 answers make it yours</Text>
          </View>
        </View>

        {/* the same flat ledger the with-data screen uses, at honest zeros — so a new person sees
            exactly what this screen becomes. No bar and no percentages: nothing is invented. */}
        {/* founder Q4 (2026-08-11): the grouping buttons show on day one too — "it will give the user
            a view of what they can do in the app". By institution then says what it will hold rather
            than drawing three $0 banks that don't exist. */}
        {groupingPills}
        <View style={styles.ledger}>
          <SectionBand title="WHAT YOU OWN" value={fig('MK-NW-M-004', 0)} trailing={RIGHT_SLOT} />
          {nwGrouping === 'class' ? (<>
            <SectionBand light title="💵 CASH" value={fig('MK-NW-M-005', 0)} trailing={RIGHT_SLOT} />
            <SectionBand light title="📈 INVESTMENTS" value={fig('MK-XS-M-003', 0)} trailing={RIGHT_SLOT} />
            <SectionBand light title="🏠 PERSONAL PROPERTY" value={fig('MK-NW-M-006', 0)} trailing={RIGHT_SLOT} />
          </>) : (
            <Text style={[styles.empty, styles.ledgerPad]}>Your banks and brokerages will be listed here, each with what it holds.</Text>
          )}
          {/* THE WAYS TO ADD AN ACCOUNT (Net worth v08, approved 2026-09-14): one line and the three doors,
              once. It used to repeat "Add your accounts ›" under every empty group and then add a heading
              over the doors — founder: "too much duplication". */}
          <Text style={[styles.firstDayAsk, styles.ledgerPad]}>Nothing entered yet.{' '}<Text style={styles.firstDayAskQ}>{ADD_ACCOUNT_QUESTION}</Text></Text>
          {ADD_ACCOUNT_DOORS.map((d) => (
            <TouchableOpacity key={d.route} style={styles.ledgerRow} accessibilityRole="button" accessibilityLabel={d.title}
              onPress={() => { store.seedNetWorth?.(op); store.setNwSetupChoice?.('self'); router.push(d.route as any); }}>
              <Text style={styles.doorTxt}>{d.title}</Text>
              <Text style={styles.arrowSlot}>›</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.ledgerRow} accessibilityRole="button" accessibilityLabel="Guided setup — walk through each bucket"
            onPress={() => { store.seedNetWorth?.(op); store.setNwSetupChoice?.('guided'); setStep(0); }}>
            <Text style={styles.doorTxtQuiet}>or walk through it step by step</Text>
            <Text style={styles.arrowSlot}>›</Text>
          </TouchableOpacity>

          <SectionBand title="DEBTS" infoTerm="debt" value={fig('MK-NW-M-009', 0)} trailing={RIGHT_SLOT} />
          {/* the same one line: the door is the row right below it, so it is not repeated (v08) */}
          <Text style={[styles.firstDayAsk, styles.ledgerPad]}>Nothing entered yet.</Text>
          {/* the debts door reads the one wording every empty-debts door uses: "Add your debts ›" — it read
              "Add a mortgage, card, or loan" (DEC-4528, 2026-10-11) */}
          <TouchableOpacity style={styles.ledgerRow} accessibilityRole="button" accessibilityLabel={DEBTS_DOOR_WORDS}
            onPress={() => setDebtSheet({ open: true })}>
            <Text style={styles.doorTxt}>{DEBTS_DOOR_WORDS}</Text>
            <Text style={styles.arrowSlot}>›</Text>
          </TouchableOpacity>

          <SectionBand title="EMERGENCY FUND" trailing={RIGHT_SLOT} />
          <View style={styles.ledgerPad}>
            <Text style={styles.cushionEmpty}>— months</Text>
            <Text style={styles.rowSub}>appears with your first cash account + monthly expenses</Text>
          </View>
        </View>
      </ScrollView>
    );
  } else if (choice === 'guided') {
    // ── guided wizard: one bucket per step ──
    const steps = [...ASSET_SECTIONS, 'Debts'];
    const cur = steps[Math.min(step, steps.length - 1)];
    const last = step >= steps.length - 1;
    body = (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.wizStep}>Step {step + 1} of {steps.length}</Text>
          <Text style={styles.wizTitle}>Add your {secLabel(cur).toLowerCase()}</Text>
          <Text style={styles.wizSub}>{WIZ_HINT[cur]}</Text>
          {cur === 'Debts' ? renderDebtSection() : renderAssetSection(cur)}
          {/* #9: never show the aggregate without its components — the running total carries the
              Assets − Debts identity so it's clear WHY it differs from what's on this one step. */}
          <View style={styles.wizTotal}><Text style={styles.wizTotalL}>Net worth so far</Text><Text style={styles.wizTotalV}>{fig('MK-NW-M-016', nw.net_worth)}</Text></View>
          {/* MK-NW-M-017 "Assets $X − Debts $Y = Net worth $Z" under its own identifier (inputs-and-use audit, 2026-10-11): the
              whole line is one figure; its three amounts keep MK-NW-M-004, MK-NW-M-009 and MK-XS-M-001, and the net worth half stays bold */}
          {(() => {
            // recorded whole under MK-NW-M-017, drawn in the same pieces as before
            const a = fig('MK-NW-M-004', Math.round(totalAssets)), d = fig('MK-NW-M-009', Math.round(dState.total_debt_balance));
            const n = fig('MK-XS-M-001', Math.round(nw.net_worth));
            figWords('MK-NW-M-017', `Assets ${a} − Debts ${d} = Net worth ${n}`);
            return (
              <Text style={styles.nwIdentity}>
                Assets {a} − Debts {d} ={' '}
                <Text style={{ fontWeight: '800', color: nw.net_worth < 0 ? Colors.red : Colors.textPrimary }}>Net worth {n}</Text>
              </Text>
            );
          })()}
        </ScrollView>
        <View style={styles.footer}>
          {step > 0 && <TouchableOpacity style={styles.btnSec} onPress={() => setStep((s) => s - 1)}><Text style={styles.btnSecTxt}>← Back</Text></TouchableOpacity>}
          <TouchableOpacity style={styles.btnPri} onPress={() => (last ? store.setNwSetupChoice?.('self') : setStep((s) => s + 1))}>
            <Text style={styles.btnPriTxt}>{last ? 'Finish' : 'Next →'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  } else {
    // ── manager: the FCC glance-that-expands (approved wireframe, Net worth sheet) ──
    // One number, its yearly change, a simple trend — then WHAT YOU OWN / DEBTS rows,
    // the own−owe math line, a collapsed accounts-and-detail expander, the tiny cash-flow
    // glance, and ONE add-or-connect button with three honest paths. Calm by design: the
    // captions, explore box and insight cards moved off this screen (Home's insights
    // function owns the nudges; class rows carry the allocation story).
    // APPROVED 2026-07-19 (daily snapshots): the trend draws from monthly snapshots PLUS the daily
    // net-worth points captured at app open — a real line within days of first use, never invented.
    const series = trendPoints(store.monthlySnapshots, store.nwDaily)
      .map((h) => ({ month: h.key, nw: h.nw })).slice(-60);   // ~2 months of dailies / 5 years of monthlies
    const jan = `${new Date().getFullYear()}-01`;
    const janPoint = series.find((pt) => pt.month >= jan && pt.month !== series[series.length - 1]?.month);
    const changeThisYear = janPoint ? nw.net_worth - janPoint.nw : null;
    // B45 founder finding ("up $0 this year"): the label must tell the truth about the SPAN. A young
    // history's baseline isn't January — it's the first snapshot ("since Jul 19") — and an unchanged
    // value reads "no change", never "up $0".
    // WHAT THE FIGURE IS REALLY MEASURED FROM, and one plain sentence where the window asked for
    // reaches further back than anything we hold. A month-only point is read as its first day.
    const historyDates = series.map((pt) => ({ date: pt.month.length === 7 ? `${pt.month}-01` : pt.month }));
    const windowStart = `${new Date().getFullYear()}-01-01`;
    const measuredFrom = measuredFromLabel(historyDates, windowStart);
    // FOUNDER DECISION 2026-08-18: the label now ALWAYS names the date it is measured from, with the
    // year, rather than saying "this year" when the record began in July. The function writes it.
    const sinceLabel = !janPoint ? '' : measuredFrom;
    // founder rule 2026-08-04: the change PERCENT is measured on cash + investments only —
    // property moves only when retyped, so a total-NW percent is noise. Appears only once the
    // invDaily history exists (never back-guessed).
    // asked of the door, with the baseline day this screen has just calculated. The door hands a
    // RATE (0…1); this line has always printed a percentage, so it multiplies once, here.
    const invRate = janPoint
      ? theNetWorth({ uid, accounts: assets, debts: liabilities, snapshotDays: (store as any).snapshotDays, transactions: store.transactions, since: janPoint.month }).investableChangePct
      : null;
    const invPct = invRate == null ? null : invRate * 100;
    // Founder wording 2026-08-10: the two halves are NAMED — the dollar move is the change in net
    // worth, the percent is a RETURN and it is measured on cash + investments only. Spelled out in
    // full on both sides (no "NW"), so the line never needs a decoder.
    const pctText = invPct == null ? ''
      : ` · Return on cash + investments ${invPct > 0 ? '+' : invPct < 0 ? '−' : ''}${fig('MK-NW-M-002', Math.abs(invPct) / 100)}`   /* founder 2026-09-14: "Return on cash - use 2 decimals" */;
    // B45 rule, re-broken and re-fixed 2026-08-10: ONE rounded value drives the words, the arrow and
    // the colour — so "up $0" / "down $0" can never be rendered again by any path.
    // a NaN slipped past the zero check and printed "down $0" — guard for finiteness too
    const deltaRounded = changeThisYear == null || !Number.isFinite(changeThisYear) ? null : Math.round(changeThisYear);
    const deltaZero = deltaRounded === 0;   // a non-finite value renders the tracking line instead
    // the change line carries the MOVE only; the line beneath carries the date (never repeated).
    // Founder 2026-08-10: a zero net change still says "$0" and stays TAPPABLE — $0 can hide real
    // motion (a $500 contribution offset by $500 of expenses), and the walk sheet shows exactly that.
    // Founder wording 2026-08-10: "Change in net worth <signed $> · Return on cash + investments <signed %>".
    const deltaText = deltaRounded == null ? null
      : `Change in net worth ${deltaZero ? figSaid('MK-NW-M-001', 0) : `${deltaRounded > 0 ? '+' : '−'}${figSaid('MK-NW-M-001', Math.abs(deltaRounded))}`}${pctText}`;
    // Founder colour rule 2026-08-10: zero and up are GREEN; only a fall is amber (never red — amber
    // is this app's one warning hue, and red/green alone can't be read by everyone).
    const deltaDown = deltaRounded != null && deltaRounded < 0;
    // the true measured-from date, always with day AND year
    const sinceDate = janPoint
      ? new Date(janPoint.month.length === 7 ? `${janPoint.month}-01T12:00:00` : `${janPoint.month}T12:00:00`)
          .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;
    // FINAL mock: the missing-data banner — computed against the SAME window the change line
    // above it reports, so the depth check can never imply older income sits inside the change.
    const gaps = dataGaps(assets, janPoint?.month ?? null, Date.now(), (store.transactions ?? []) as any, (store.syncFailures ?? []) as any, liabilities as any);   // a debt with no balance is named too (OpenAI final, 2026-10-09, DEC-3279e)
    // FINAL mock State E: tapping the change opens the walk. Built from the SAME window the line
    // reports and the SAME ledger the account pages show — the rows sum to the headline by design.
    const inWindow = (t: any) => !janPoint || String(t.date ?? '').slice(0, 10) >= String(janPoint.month).slice(0, 10);
    const led = ((store.transactions ?? []) as any[]).filter(inWindow);
    // ONE flows function (Track 1 step 3) — the abs-sum this replaces made a reversal ADD instead of
    // cancel, the $2,387 class at the screen layer.
    const flows = personalFlowTotals(led);
    const changeWalk = janPoint && changeThisYear != null ? buildChangeWalk({
      beginning: janPoint.nw, ending: nw.net_worth,
      // the two days as the approved walk writes them (Net worth v08, state E): "Aug 3" and "Aug 4",
      // one form for both ends. The beginning used to read "25 September 2026" beside an ending of
      // "Oct 3" — two spellings of a date on one card. A beginning in an earlier year keeps its year.
      fromLabel: (() => {
        const d = new Date(janPoint.month.length === 7 ? `${janPoint.month}-01T12:00:00` : `${janPoint.month}T12:00:00`);
        return d.toLocaleDateString('en-US', d.getFullYear() === new Date().getFullYear() ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
      })(),
      toLabel: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      contributions: flows.contributions.toNumber(2), withdrawals: flows.withdrawals.toNumber(2),
      dividends: flows.dividends.toNumber(2), interest: flows.interest.toNumber(2),
      debtPrincipal: flows.debtPrincipal.toNumber(2),
    }) : null;

    body = (
      <ScrollView ref={scrollRef} contentContainerStyle={styles.contentFlat} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPull} />}>
        <View style={styles.inset}><HiddenBalancesBanner /></View>
        {/* HERO (founder notes 2026-08-10): the band title carries ONLY the info dot — the date lives
            once, on the since line. Own−Owe, the one number, the change, the date. Then it ENDS:
            the green trend line that used to sit under it is gone. */}
        {/* Founder 2026-08-11: the hero's title is a FULL-WIDTH green banner, the same one WHAT YOU
            OWN wears — every section on this screen is now titled the same way, edge to edge. */}
        <View style={styles.heroBlock} accessible
          accessibilityLabel={store.hideBalances
            ? 'Net worth hidden'
            : `Net worth ${figSaid('MK-XS-M-001', Math.round(nw.net_worth))}${nw.net_worth < 0 ? ', negative' : ''}${deltaText ? `, ${deltaText}` : ''}. By asset class: ${classRows.map((r) => `${r.label} ${pctOf(r.total)} percent`).join(', ') || 'none yet'}.`}>
          {/* Founder 2026-08-11: TODAY's date rides the title bar — it stamps when these numbers were
              true. It is a different fact from the "since" line beneath the change, which names the
              day the change is measured FROM; both dates earn their place. */}
          <SectionBand infoTerm="nwChange" title={`YOUR NET WORTH · ${asOfToday}`} />
          <View style={styles.blockBody}>
            {/* FINAL mock: the arithmetic sits small ABOVE the hero, so the one number leads */}
            {(totalAssets > 0 || dState.total_debt_balance > 0) && (
              <Text style={styles.ownOweTop}>
                Own {fig('MK-NW-M-004', Math.round(totalAssets))} − Owe {fig('MK-NW-M-009', Math.round(dState.total_debt_balance))}
              </Text>
            )}
            <HeroAmount style={[styles.glanceVal, nw.net_worth < 0 && !store.hideBalances && { color: Colors.red }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {store.hideBalances ? '••••' : fig('MK-XS-M-001', Math.round(nw.net_worth))}{nw.net_worth < 0 && !store.hideBalances ? '  (negative)' : ''}
            </HeroAmount>
            {/* Build-43 feedback #3: change + date render ALWAYS, matching the approved mock — an
                honest first-day line instead of a bare number when history hasn't built yet */}
            {deltaText != null ? (
              <TouchableOpacity accessibilityRole="button" onPress={() => setWalkOpen(true)}
                accessibilityLabel={`${deltaText}. ${deltaZero ? 'A flat total can hide offsetting moves — opens' : 'Opens'} what drove this change.`}>
                <Text style={[styles.glanceDelta, { color: deltaDown ? Colors.amber : Colors.gainText }]}>
                  {deltaZero ? '' : deltaRounded! > 0 ? '▲ ' : '▼ '}{deltaText} ›
                </Text>
              </TouchableOpacity>
            ) : (
              (assets.length + liabilities.length === 0)
                ? <EmptyNote door="accounts" onPress={() => setAddChooser(true)} />   /* Q48 mock frame 1: $0, the one line, the door */
                : <Text style={[styles.glanceDelta, { color: Colors.textSecondary }]}>tracking starts today — change shows as history builds</Text>
            )}
            {/* the mock's second line: the TRUE date the change is measured from — never "as of today".
                Founder 2026-08-10: the date reads as a plain line, not another bold figure. */}
            {sinceDate != null && <Text style={styles.glanceSince}>since {sinceDate}</Text>}
            {/* THE DATE ABOVE IS THE WHOLE STATEMENT (Net worth v08, approved 2026-09-14). A second
                sentence used to follow it, saying the figure was measured from the record's first day and
                not from 1 January — written when the label still said "this year". The label has named
                its own date, with the year, since his decision of 2026-08-18, so the sentence was
                correcting a claim the screen no longer makes, and the approved drawing does not carry it. */}
            {/* the stale-connection warning moved OFF the hero (founder 2026-08-10) — the missing-data
                banner below already names stale accounts with a fix button; saying it twice is noise.
                The trend sparkline is gone too (founder 2026-08-10: "the green line at the bottom —
                delete it"); the hero ENDS at the since line. */}
          </View>
        </View>

        {/* FINAL mock: the banner sits INLINE under the hero — never a pop-up */}
        <ChangeWalkSheet visible={walkOpen} onClose={() => setWalkOpen(false)} walk={changeWalk} />
        <View style={styles.inset}><DataGapsBanner gaps={gaps} /></View>

        {/* THE RETIREMENT CARD (approved final mock + the approved words, 2026-08-04): banded, and it
            speaks the same sentence the Plan hub speaks — never the old "path ahead by 92" wording. */}
        {/* Founder 2026-08-11: full-width green banner here too — one titling treatment for every
            section on the screen. */}
        <TouchableOpacity accessibilityRole="button" style={styles.heroBlock} activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/plan')}
          accessibilityLabel={nwOnCourse ? `Your retirement plan: ${nwOnCourse}. Opens the Plan tab.` : 'Your retirement plan. Opens the Plan tab.'}>
          <SectionBand title="YOUR RETIREMENT PLAN" />
          {/* Founder rule 2026-08-11: when the real verdict cannot be computed, show THE one app-wide
              sample — labelled as a sample — and name the answers still missing, whether that is one
              of them or all three. A bare "See your plan ›" told the person nothing about why. */}
          {!nwOnCourse && nwDoor.count > 0 && (
            <View style={styles.blockBody}>
              <Text style={styles.sampleLine}><Text style={styles.sampleNum}>{sampleOddsLine()}</Text></Text>
              {/* Founder finding 2026-08-11: this line NAMES one missing answer, so it must land on
                  that answer — not on the Plan hub, and not on the seven-item completeness list two
                  hops further on. Same rule the fix-it sheet already holds itself to. */}
              <TouchableOpacity accessibilityRole="button"
                onPress={(e: any) => { e?.stopPropagation?.(); router.push(`/(tabs)/plan${nwDoor.count === 1 ? `?focus=${encodeURIComponent(nwDoor.missing[0])}` : ''}` as any); }}
                accessibilityLabel={`${sampleAskLine(nwDoor.missing)}. Opens ${nwDoor.count === 1 ? 'that question' : 'the questions'}.`}>
                <Text style={styles.rowSub}>{sampleAskLine(nwDoor.missing)} ›</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={[styles.blockBody, { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
            !nwOnCourse && nwDoor.count > 0 && { paddingTop: 0 }]}>
            {(nwOnCourse || nwDoor.count === 0) && (<Text style={styles.rowTitle}>
              {/* FOUNDER FINDING 2026-08-11 ("what does uncertain mean?"): this was the ONLY screen
                  showing the verdict WORD with no number beside it — Home says "78% odds", the Plan
                  hub says "84 in 100". A bare adjective is not a verdict. The number travels with it. */}
              {nwOnCourse
                ? <Text><Text style={{ fontWeight: '800' }}>{oddsLine(nwLens, nwWil.chance!, nwWil.horizonAge)}</Text> · {nwOnCourse} ›</Text>
                : 'See your plan ›'}
            </Text>)}
            <InfoDot term="nestEggMath" />
          </View>
        </TouchableOpacity>

        {/* WHAT YOU OWN — the composition bar (founder Q6, 2026-08-11: the bar replaces the donut)
            then the three uber-groups. The legend names every slice with its percent, so colour is
            never the only signal (colorblind rule, UX doc). */}
        {/* Walk row 8 (v7 FINAL): the grouping pills — ABOVE the lists, per the approved final mock (founder gap 5) */}
        {groupingPills}
        {/* THE LEDGER (Quiet Instrument direction, founder handoff 2026-08-10): one flat table, no
            floating cards. Bands bleed edge to edge and rows carry the SAME horizontal inset, so
            every number on the screen — band totals included — resolves to ONE right edge, each row
            reserving the same trailing arrow column. */}
        <View style={styles.ledger}>
        <SectionBand title="WHAT YOU OWN" value={fig('MK-NW-M-004', Math.round(totalAssets))} trailing={RIGHT_SLOT} />
          {/* Q48: nothing entered is said row by row below (the one line and the door), not here */}
          {/* Founder finding 2026-08-11: the bar used to stay by category even on the institution
              tab, so the picture and the list underneath answered different questions. It follows
              the toggle now — same totals, regrouped the way you asked to see them. */}
          {classRows.length > 0 && (nwGrouping === 'class'
            ? <CompositionBar rows={classRows} spoken="What you own by category" />
            : <CompositionBar rows={institutionRows} spoken="What you own by institution" />)}
          {/* By institution (handoff, 2026-08-10): the same collapsible shape as By category, biggest
              first. An institution's row is what it HOLDS — a debt at the same bank never merges into
              it; the Chase Visa stays under DEBTS. Open/closed is remembered per view. */}
          {nwGrouping === 'institution' && (() => {
            // a bank whose every balance is missing reads 'Value not entered' (DEC-3657), never "$0" (OpenAI final, 2026-10-09, DEC-3279e)
            const groups = new Map<string, { total: number; known: number; members: AssetAccount[] }>();
            for (const a of assets) {
              const k = a.institution?.trim() || 'No institution';
              const g = groups.get(k) ?? { total: 0, known: 0, members: [] };
              const has = a.balance != null && Number.isFinite(a.balance as number);
              g.total += has ? (a.balance as number) : 0; g.known += has ? 1 : 0; g.members.push(a);
              groups.set(k, g);
            }
            return [...groups.entries()].sort((x, y) => y[1].total - x[1].total).map(([label, g]) => {
              const open = openInst[label] !== false;
              const n = g.members.length;
              const count = plural(n, 'account');
              return (
                <View key={label}>
                  <TouchableOpacity accessibilityRole="button" activeOpacity={0.8}
                    onPress={() => setOpenInst((m) => ({ ...m, [label]: !open }))}
                    accessibilityLabel={`${label}, ${g.known ? figSaid('MK-NW-M-007', Math.round(g.total)) : 'value not entered'}, ${count}. ${open ? 'Collapses' : 'Expands'} them.`}>
                    <SectionBand light trailing={RIGHT_SLOT} title={`${open ? '▾' : '▸'} ${label}${open ? '' : ` · ${count}`}`}
                      value={g.known ? fig('MK-NW-M-007', Math.round(g.total)) : figWords('MK-NW-M-007', 'Value not entered')} />
                  </TouchableOpacity>
                  {/* A MISSING BALANCE IS NOT $0: the row says 'not entered', the word the bond rows use
                      (outside review OpenAI final, 2026-10-09, DEC-3279e) */}
                  {open && g.members.map((a) => { const has = a.balance != null && Number.isFinite(a.balance as number); return (
                    <TouchableOpacity accessibilityRole="button" key={a.asset_id} style={[styles.ledgerRow, styles.ledgerChild]}
                      onPress={() => router.push(`/account-detail?id=${a.asset_id}` as any)}
                      accessibilityLabel={`${displayNames.get(a.asset_id)}, ${has ? figSaid('MK-NW-M-008', Math.round(a.balance)) : 'value not entered'}. Opens its page.`}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.acctRowLabel} numberOfLines={1}>{displayNames.get(a.asset_id)}</Text>
                        <SourceChip account={a} paused={!!(a.connection_id && (store.snaptradeConnections ?? []).find((c: any) => c.id === a.connection_id && c.disabled))} />
                      </View>
                      <Text style={styles.acctRowVal}>{has ? fig('MK-NW-M-008', Math.round(a.balance)) : figWords('MK-NW-M-008', 'Value not entered')}</Text>
                      <Text style={styles.arrowSlot}>›</Text>
                    </TouchableOpacity>
                  ); })}
                </View>
              );
            });
          })()}
          {/* v4 mock APPROVED 2026-07-19: class rows expand/collapse (default collapsed, caret ▸/▾
              word+motion never color alone); a lone class auto-expands — hiding the only account
              behind a tap would obscure, not glance. */}
          {/* FINAL mock: classes sit INSIDE the three uber-groups (Cash · Investments · Personal
              property). The group bar carries its own total and collapses; a closed group says how
              many rows are behind it. Investments == the Performance total, by definition. */}
          {nwGrouping === 'class' && uberGroupRows(listRows).map((g) => {
            const gUnvalued = g.classes.every((c) => (c as any).unvalued);
            const gOpen = openUber[g.group] !== false;
            // the closed count names what is ACTUALLY behind the bar (approved final mock): a group
            // whose one class collapses straight to accounts counts accounts, property counts items,
            // and a group holding several classes counts categories.
            const count = collapsedCount(g);
            return (
              <View key={g.group}>
                <TouchableOpacity accessibilityRole="button" activeOpacity={0.8}
                  onPress={() => setOpenUber((m) => ({ ...m, [g.group]: !gOpen }))}
                  accessibilityLabel={`${g.label}, ${gUnvalued ? 'value not entered' : figSaid('MK-NW-M-007', Math.round(g.total))}, ${count}. ${gOpen ? 'Collapses' : 'Expands'} them.`}>
                  <SectionBand light trailing={RIGHT_SLOT} title={`${gOpen ? '▾' : '▸'} ${g.icon} ${g.label}${gOpen ? '' : ` · ${count}`}`}
                    value={gUnvalued ? figWords('MK-NW-M-007', 'Value not entered') : fig('MK-NW-M-007', Math.round(g.total))} />
                </TouchableOpacity>
                {gOpen && g.classes.map((r, i) => renderClassRow(
                  r, i, g.classes.length === 1 && r.label.trim().toLowerCase() === g.label.trim().toLowerCase(),
                ))}
              </View>
            );
          })}
          {/* Q48 mock frame 2: a group with nothing behind it still shows, at $0, with the one line and the door */}
          {nwGrouping === 'class' && [{ group: 'cash', icon: '💵', label: 'Cash' }, { group: 'investments', icon: '📈', label: 'Investments' }]
            .filter((e) => !uberGroupRows(listRows).some((g) => g.group === e.group))
            .map((e) => {
              // an account entered at $0 is a real zero: the band shows a plain $0 and no line (mock frame 2, note 5)
              const entered = assets.some((a) => uberGroupOf(assetClassOf(a)) === e.group);
              return (
                <View key={`empty-${e.group}`}>
                  <SectionBand light trailing={RIGHT_SLOT} title={`${e.icon} ${e.label}`} value={fig('MK-NW-M-006', 0)} />
                  {!entered && <View style={styles.ledgerPad}><EmptyNote door="accounts" onPress={() => setAddChooser(true)} /></View>}
                </View>
              );
            })}

        {/* DEBTS — minus numbers, the word carries the meaning */}
        <SectionBand title="DEBTS" infoTerm="debt" trailing={RIGHT_SLOT}
          value={dState.total_debt_balance > 0 ? `−${fig('MK-NW-M-009', Math.round(dState.total_debt_balance))}`
            // nothing entered: the figure stays $0 with the line under it (Q48 empty-state mock frame 1, and v08 state C
            // "DEBTS $0"). It printed no figure at all once any account was entered (mock-match audit v02, 2026-10-11).
            : liabilities.length === 0 ? fig('MK-NW-M-009', 0) : undefined} />
          {liabilities.length === 0 && <View style={styles.ledgerPad}><EmptyNote door="debts" onPress={() => setDebtSheet({ open: true })} /></View>}   {/* Q48: nothing entered — a "no debts" answer does not exist yet, so an entered none cannot be told apart (question for the founder) */}
          {/* the debts' own composition bar (founder Q6, 2026-08-11) — the same shape as the assets
              bar above, in the warning family so the two sections can never be misread for each other */}
          {liabilities.length > 0 && (
            <CompositionBar spoken="What you owe" rows={liabilities.map((d, i) => ({
              key: String(d.debt_id), label: d.label, color: DebtRamp[i % DebtRamp.length], total: d.remaining_balance || 0,
              known: d.remaining_balance != null && Number.isFinite(d.remaining_balance),
            // the bar and its percents count only known balances — Net worth v08, READ THIS FIRST, 2026-10-09:
            // a debt with no balance is named in the amber box, never drawn here as "<1%"
            })).filter((r) => r.known)} />
          )}
          {liabilities.map((d) => (
            <TouchableOpacity key={d.debt_id} style={styles.ledgerRow} accessibilityRole="button"
              accessibilityLabel={`${d.label}, ${d.remaining_balance == null || !Number.isFinite(d.remaining_balance) ? 'value not entered' : `you owe ${figSaid('MK-NW-M-010', Math.round(d.remaining_balance))}`}. Opens the editor.`}
              onPress={() => setDebtSheet({ open: true, edit: d })}>
              <Text style={styles.rowIcon}>{debtKind(d.debt_type)?.icon ?? '🧾'}</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.rowTitle}>{d.label}</Text>
                {costliest?.debt_id === d.debt_id && <View style={styles.hotPill}><Text style={styles.hotPillTxt}>pay first</Text></View>}
              </View>
              {/* a debt with no balance reads 'Value not entered' (DEC-3657), never −$0 (OpenAI final, 2026-10-09, DEC-3279e) */}
              {d.remaining_balance == null || !Number.isFinite(d.remaining_balance)
                ? <Text style={styles.rowVal}>{figWords('MK-NW-M-010', 'Value not entered')}</Text>
                : <Text style={[styles.rowVal, { color: Colors.red }]}>−{fig('MK-NW-M-010', Math.round(d.remaining_balance))}</Text>}
              <Text style={styles.arrowSlot}>›</Text>
            </TouchableOpacity>
          ))}

        {/* EVERY MORTGAGE IS ON A PROPERTY (his rule, 2026-10-04, DEC-1925). One that is on none is named
            here, and a tap opens it so the person can say which property it is on. */}
        {/* A HOLDING NOTHING COULD CLASS IS ASKED ABOUT, NOT GUESSED (his ruling, 2026-09-30, master Q11:
            "Refuse the line and ask"). A tap opens the holding, where the person says what it is. */}
        {worth.unclassed.length > 0 && (
          <TouchableOpacity accessibilityRole="button" style={styles.ledgerPad}
            accessibilityLabel={`${worth.unclassedSentence} Opens that holding.`}
            onPress={() => router.push(`/holding-detail?account=${worth.unclassed[0].accountId}&position=${worth.unclassed[0].positionId}` as any)}>
            <Text style={[styles.cushionMath, { color: Colors.amber }]}>{worth.unclassedSentence}</Text>
          </TouchableOpacity>
        )}
        {!worth.mortgageCheck.ok && (
          <TouchableOpacity accessibilityRole="button" style={styles.ledgerPad}
            accessibilityLabel={`${worth.mortgageCheck.sentence} Opens that mortgage.`}
            onPress={() => { const d = liabilities.find((x: any) => String(x.debt_id) === worth.mortgageCheck.unmatched[0]?.id); if (d) setDebtSheet({ open: true, edit: d }); }}>
            <Text style={[styles.cushionMath, { color: Colors.amber }]}>{worth.mortgageCheck.sentence}</Text>
          </TouchableOpacity>
        )}

        {/* EMERGENCY FUND (mock approved 2026-07-31): cash ÷ monthly essentials, the math on the
            card, word + icon always; no expenses captured → a door, never a made-up number */}
        {monthlySpend > 0 && runwayMonths != null ? (() => {
          // ONE figure drives the words AND the bar: the bar must never be drawn from a number the
          // person cannot see (2.0 months on the label and 1.96 in the bar is two truths).
          // one decimal, stated (Q49): a tenth of a month is about three days — finer would be false precision
          const shownMonths = Math.round(runwayMonths * 10) / 10;
          return (
          <View>
            <SectionBand title="EMERGENCY FUND" trailing={RIGHT_SLOT} />
            <View style={styles.ledgerPad}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <Text style={styles.cushionMonths}>{fig('MK-NW-M-013', shownMonths)}</Text>
                <Text style={[styles.cushionWord, { color: shownMonths < 3 ? Colors.amber : Colors.gainText }]}>
                  {shownMonths < 3 ? 'Tight ⚠' : 'Comfortable ✓'}
                </Text>
              </View>
              {/* RENT NOT KNOWN (DEC-3769, 2026-10-10): a property's rent is blank or not a plain number, so the
                  months above are counted without it — the card says so beside them, with the same months
                  figure, and the words open the rent editor on the Income screen */}
              {emergencyFund.rentNotKnown && (
                <TouchableOpacity accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => router.push('/income-manager?open=rental' as any)}
                  accessibilityLabel={`${figSaid('MK-NW-M-013', shownMonths)}, rent not included. Enter rent to include. Opens Income.`}>
                  <Text style={styles.cushionMath}>{fig('MK-NW-M-013', shownMonths)}, rent not included. <Text style={{ color: Colors.primary, fontWeight: '700' }}>Enter rent to include.</Text></Text>
                </TouchableOpacity>
              )}
              {/* the emergency fund's progress bar (founder Q6, 2026-08-11): it fills against the top of the
                  3-6 month guide the note beneath names, so a full bar means "covered" — never an
                  unlabelled meter (the word and the figure above always carry the meaning too) */}
              <View style={styles.cushionTrack}>
                <View style={[styles.cushionFill, {
                  width: `${Math.min(100, (shownMonths / CUSHION_FULL_MONTHS) * 100)}%`,
                  backgroundColor: shownMonths < 3 ? Colors.amber : Colors.gainText,
                }]} />
              </View>
              {/* MK-NW-M-014 under its own identifier (inputs-and-use audit, 2026-10-11); cash and essentials inside it keep MK-NW-M-005 and MK-NW-M-048 */}
              <Text style={styles.cushionMath}>{(() => {
                // the line is recorded whole under MK-NW-M-014 and drawn in the same pieces as before, so what a person reads does not move
                const c = fig('MK-NW-M-005', Math.round(cashOnHand)), e = figPer('MK-NW-M-048', Math.round(monthlySpend));
                figWords('MK-NW-M-014', `of essentials covered by your cash — ${c} cash ÷ ${lessRent ? '(' : ''}${e} essentials${lessRent}${lessRent ? ')' : ''} — ${essentials?.label ?? ''}`);
                return <>of essentials covered by your cash — {c} cash ÷ {lessRent ? '(' : ''}{e} essentials{lessRent}{lessRent ? ')' : ''} — {essentials?.label}</>;
              })()}</Text>
              {/* BOTH NUMBERS (founder, 2026-09-28). The figure above is what you could not stop paying;
                  this one is the life you plan to live. Neither is the whole truth on its own. */}
              {runwayAtPlannedSpend != null && (
                <Text style={styles.cushionMath}>
                  {fig('MK-NW-M-046', runwayAtPlannedSpend)} at your planned spend — {fig('MK-NW-M-005', cashOnHand)} cash ÷ {lessRent ? '(' : ''}{figPer('MK-NW-M-048', emergencyFund.plannedSpendMonthly)}{lessRent}{lessRent ? ')' : ''}
                </Text>
              )}
              {emergencyFund.debtMinimums > 0 && (
                <Text style={styles.cushionMath}>Both include {figPer('MK-NW-M-047', emergencyFund.debtMinimums)} of debt payments you cannot stop.</Text>
              )}
              {rentArriving > 0 && (
                <Text style={styles.cushionMath}>Both count {figPer('MK-NW-M-064', rentArriving)} of rent from your property, which keeps arriving if your pay stops.</Text>
              )}
              {!!emergencyFund.budgetSentence && <Text style={styles.cushionMath}>{emergencyFund.budgetSentence}</Text>}
              <DotJoined style={styles.cushionNote} parts={['3–6 months is the usual guide', 'an estimate from your own numbers']} />
            </View>
          </View>
          );
        })() : emergencyFund.rentCoversEssentials ? (
          // THE RENT PAYS FOR THE WHOLE MONTH: there is no count of months to state, and the door to
          // "tell us your expenses" below would be the wrong thing to say to someone who has
          <View>
            <SectionBand title="EMERGENCY FUND" trailing={RIGHT_SLOT} />
            <View style={styles.ledgerPad}>
              <Text style={styles.cushionMath}>Rent from your property ({figPer('MK-NW-M-064', rentArriving)}) pays for your essentials ({figPer('MK-NW-M-048', Math.round(monthlySpend))}), so your cash is not drawn on if your pay stops.</Text>
            </View>
          </View>
        ) : cashOnHand > 0 ? (
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/cashflow')}
            accessibilityLabel={`Emergency fund: your cash is ${figSaid('MK-NW-M-005', Math.round(cashOnHand))} — answer what a typical month costs to see the real number. Opens Cash flow.`}>
            <SectionBand title="EMERGENCY FUND" trailing={RIGHT_SLOT} />
            <View style={styles.ledgerPad}>
              <Text style={styles.cushionMath}>Your cash is {fig('MK-NW-M-005', Math.round(cashOnHand))} — tell us your typical monthly expenses and this becomes a real number.</Text>
              <Text style={styles.link}>Answer one question in Cash flow ›</Text>
            </View>
          </TouchableOpacity>
        ) : null}
        </View>

        {/* the "This month's cash flow" glance was DELETED here (founder Q3, 2026-08-11): this screen
            answers what you own and owe; movement is the Cash flow tab's whole job, and Home already
            carries the monthly glance. The emergency fund's own door still reaches Cash flow when it needs to. */}

        {/* ONE button, three honest paths */}
        <TouchableOpacity accessibilityRole="button" style={[styles.addConnect, styles.inset]} onPress={() => setAddChooser(true)}
          accessibilityLabel="Add an account">
          {/* Net worth v08: "connect" was the old word for linking (one door, one term) */}
          <Text style={styles.addConnectTxt}>＋ Add an account</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
      {body}
      <AssetSheet state={assetSheet} onClose={() => setAssetSheet({ open: false })} />
      <DebtEditorSheet state={debtSheet} onClose={() => setDebtSheet({ open: false })} />

      {/* add-or-connect: three honest paths — manual and file import stay first-class forever */}
      <Modal visible={addChooser} transparent animationType={modalAnimation()} onRequestClose={() => setAddChooser(false)}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" style={styles.chooserBackdrop} activeOpacity={1} onPress={() => setAddChooser(false)}>
          <View style={styles.chooserCard} onStartShouldSetResponder={() => true}>
            <View style={styles.chooserGrip} />
            {/* Net worth v08 (approved 2026-09-14): the sheet names what the three doors are for */}
            <Text style={styles.chooserHead}>{ADD_ACCOUNT_QUESTION}</Text>
            {ADD_ACCOUNT_DOORS.map((d) => (
              <TouchableOpacity key={d.route} accessibilityRole="button" style={styles.chooserRow}
                accessibilityLabel={`${d.title}. ${d.sub}`}
                onPress={() => { setAddChooser(false); if (!choice) { store.seedNetWorth?.(op); store.setNwSetupChoice?.('self'); } router.push(d.route as any); }}>
                <Text style={styles.chooserTitle}>{d.icon}  {d.title}</Text>
                <Text style={styles.chooserSub}>{d.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── asset add/edit sheet (class-first, taxonomy two-axis) ─────────────────────
type AddStep = 'pick' | 'cash' | 'stocks' | 'bonds' | 'alts' | 'realestate' | 'property' | 'retirement' | 'brokerage' | 'quick' | 'edit';
const ADD_CLASS_PICKS = [
  { key: 'cash' as const, icon: '💵', label: `${ASSET_CLASS_LABEL.cash} & equivalents` },
  { key: 'stocks' as const, icon: '📈', label: ASSET_CLASS_LABEL.stocks_etf },
  { key: 'bonds' as const, icon: '📜', label: ASSET_CLASS_LABEL.bonds },
  { key: 'alts' as const, icon: '🪙', label: ASSET_CLASS_LABEL.alternatives },
  { key: 'realestate' as const, icon: '🏠', label: ASSET_CLASS_LABEL.real_estate },
  { key: 'property' as const, icon: '🚗', label: ASSET_CLASS_LABEL.personal_property },
];
const ADD_ACCT_PICKS = [
  { key: 'retirement' as const, icon: '🏛️', label: 'Retirement (401k / IRA / HSA)' },
  { key: 'brokerage' as const, icon: '🗂️', label: 'Brokerage (taxable, a mix)' },
];
const WRAPPER_OPTS: { key: AddWrapper; label: string }[] = [
  { key: 'taxable', label: 'Taxable' }, { key: '401k', label: '401(k)' },
  { key: 'trad_ira', label: 'Trad. IRA' }, { key: 'roth', label: 'Roth IRA' }, { key: 'roth_401k', label: 'Roth 401(k)' }, { key: 'hsa', label: 'HSA' },
];
/** The day a maturity picker opens on when no date is chosen yet: January 1, ten years out — the Bonds editor's and Add an account's (DEC-4059b, 2026-10-10). */
const TEN_YEARS_OUT = () => isoLocalDate(new Date(new Date().getFullYear() + 10, 0, 1));
const RET_OPTS: { key: AddWrapper; label: string }[] = WRAPPER_OPTS.filter((w) => w.key !== 'taxable');
const CASH_OPTS = ['checking', 'savings', 'hysa', 'money_market', 'cd', 'cash_mgmt', 'foreign_currency'];
// Founder 2026-08-04: PE/HF out of phase 1 (keep it simple) — the kinds stay in the data model,
// so anything already saved still renders; only the capture chips are trimmed.
const ALT_OPTS = ['crypto', 'commodities', 'annuities', 'options'];
const PROP_OPTS = ['vehicle', 'other_asset'];
const INSIDE_OPTS: { key: AssetClass | 'mixed'; label: string }[] = [
  { key: 'mixed', label: 'Mixed / not sure' }, { key: 'stocks_etf', label: 'Stocks / Funds' }, { key: 'bonds', label: 'Bonds' }, { key: 'cash', label: 'Cash' },
];

function AssetSheet({ state, onClose }: { state: { open: boolean; section?: string; edit?: AssetAccount }; onClose: () => void }) {
  const store = useStore() as any;
  const router = useRouter();
  const editing = state.edit;
  const [step, setStep] = useState<AddStep>('pick');
  const [sub, setSub] = useState('');                              // cash kind / alt kind / property kind
  // NO HELD-IN CHIP IS CHOSEN FOR THE PERSON (DEC-4036f, 2026-10-10): "An account with no account type chosen is
  // never assumed taxable." Taxable used to be preselected — a default that looked like an answer. Nothing is
  // chosen until they tap; saved untapped, the account has no tax type (MK-NW-F-010 wrapperAccount(null)).
  const [wrapper, setWrapper] = useState<AddWrapper | null>(null);
  const [inside, setInside] = useState<AssetClass | 'mixed'>('mixed');
  const [maturity, setMaturity] = useState(''); const [inst, setInst] = useState(''); const [bal, setBal] = useState('');

  useEffect(() => {
    if (!state.open) return;
    setSub(''); setWrapper(null); setMaturity(editing?.maturity_date ?? '');   // (DEC-4036f, 2026-10-10)
    if (editing) {
      setStep('edit'); setInst(editing.institution ?? ''); setBal(String(editing.balance));
      setInside((editing.asset_class as AssetClass) ?? 'mixed');
    } else {
      // NW-12: a section's "+ Add" jumps straight to that section's form (the cash/retirement forms have a
      // "‹ Back" to the full picker). Investments & Property hold a mix → start at the class picker.
      const initial: AddStep = state.section === 'Cash' ? 'cash' : state.section === 'Retirement' ? 'retirement' : 'pick';
      if (initial === 'cash') setSub('checking');   // a retirement account's kind is the person's tap, never 401(k) for them (DEC-4036f, 2026-10-10)
      setStep(initial); setInside('mixed'); setInst(''); setBal('');
    }
  }, [state.open]);

  const v = num(bal);
  const choose = (key: AddStep) => {
    if (key === 'cash') setSub('checking'); else if (key === 'alts') setSub('crypto');
    else if (key === 'property') setSub('vehicle');   // no retirement kind preselected (DEC-4036f, 2026-10-10)
    setStep(key);
  };
  const lbl = (fallback: string) => inst.trim() || fallback;
  // a retirement account says which kind it is by the person's tap — nothing is chosen for them (DEC-4036f, 2026-10-10)
  const needsKind = step === 'retirement' && !wrapper;
  // A PROPERTY IS NOT INVESTED IN ANYTHING (DEC-4529, 2026-10-11): a home, real estate, land, a vehicle or
  // other personal property is never asked "What's it invested in?", and its edit saves no class from it.
  const isProperty = !!editing && (editing.tax_bucket === 'PROPERTY'
    || assetClassOf(editing) === 'real_estate' || assetClassOf(editing) === 'personal_property');
  const save = () => {
    if (needsKind) return;
    let patch: Partial<AssetAccount> = { institution: inst.trim(), balance: v };
    if (step === 'cash') {
      // founder rule 2026-08-04: CDs → Bonds & CDs (any maturity) · money market → Stocks/ETFs · cash = cash only
      const cls: AssetClass = sub === 'cd' ? 'bonds' : sub === 'money_market' ? 'stocks_etf' : 'cash';
      // a CD or money market fund picked here is asked no tax type, so it has none — never Taxable (DEC-4036f, 2026-10-10)
      patch = { ...patch, asset_class: cls, kind: cls === 'bonds' ? 'fixed_income' : sub, tax_bucket: cls === 'cash' ? 'CASH' : undefined, maturity_date: maturity || undefined, label: lbl(assetKind(sub)?.label ?? 'Cash') };
    } else if (step === 'stocks' || step === 'bonds') {
      const wa = wrapperAccount(wrapper);
      patch = { ...patch, asset_class: step === 'stocks' ? 'stocks_etf' : 'bonds', kind: wa.kind, tax_bucket: wa.tax_bucket, label: lbl(step === 'stocks' ? 'Stocks / Funds' : 'Bonds') };
    } else if (step === 'alts') {
      const wa = wrapperAccount(wrapper);
      patch = { ...patch, asset_class: 'alternatives', kind: sub, tax_bucket: wa.tax_bucket, label: lbl(assetKind(sub)?.label ?? 'Alternatives') };
    } else if (step === 'realestate') {
      patch = { ...patch, asset_class: 'real_estate', kind: 'home', tax_bucket: 'PROPERTY', label: lbl('Real estate') };
    } else if (step === 'property') {
      patch = { ...patch, asset_class: 'personal_property', kind: sub, tax_bucket: 'PROPERTY', label: lbl(assetKind(sub)?.label ?? 'Personal property') };
    } else if (step === 'retirement') {
      const wa = wrapperAccount(wrapper);
      patch = { ...patch, asset_class: inside === 'mixed' ? undefined : inside, kind: wa.kind, tax_bucket: wa.tax_bucket, label: lbl(RET_OPTS.find((r) => r.key === wrapper)?.label ?? 'Retirement') };
    } else if (step === 'brokerage') {
      patch = { ...patch, asset_class: undefined, kind: 'brokerage', tax_bucket: 'TAXABLE', label: lbl('Brokerage') };
    } else if (step === 'quick') {
      // Unclassified — user sorts it later. QUICK ADD ASKS NO TAX TYPE, SO IT STATES NONE (DEC-4036f, 2026-10-10):
      // it used to be saved as a taxable brokerage account; the account page now says "tax type not stated".
      patch = { ...patch, asset_class: 'mixed', kind: undefined, tax_bucket: undefined, label: inst.trim() || 'Account' };
    } else if (step === 'edit' && editing) {
      // B48 finding 6: CDs/bonds edit their maturity here too — the date re-sorts the class
      // (under 1 year = cash equivalent · 1 year or more = bond), same rule as adding one.
      const showsMaturity = editing.kind === 'cd' || assetClassOf(editing) === 'bonds' || !!editing.maturity_date;
      const byDate = showsMaturity && maturity.trim();   // a picked date (DEC-4059b, 2026-10-10)
      // THE PERSON PICKED A CLASS: it is marked theirs, so the class sweep never changes it; a maturity
      // date decides the class instead of the pick (outside review OpenAI final, 2026-10-09, DEC-2748h)
      const picked = !byDate && inside !== 'mixed' && inside !== editing.asset_class;
      if (isProperty) {   // the question is not on a property's sheet, so nothing from it is saved (DEC-4529, 2026-10-11)
        store.updateAsset?.(editing.asset_id, { institution: inst.trim(), balance: v });
        onClose(); return;
      }
      store.updateAsset?.(editing.asset_id, {
        institution: inst.trim(), balance: v, asset_class: inside === 'mixed' ? undefined : inside,
        ...(picked ? { class_source: 'user' as const } : inside === 'mixed' && editing.asset_class ? { class_source: undefined } : {}),
        ...(byDate ? { maturity_date: maturity.trim(), asset_class: maturityClass(maturity.trim()) } : {}),
      });
      onClose(); return;
    }
    // a class the person picked when adding the account is theirs (DEC-2748h); a cash kind's class
    // follows the kind it names, and an unsorted or Unclassified account has no class to keep
    const pickedOnAdd = step === 'stocks' || step === 'bonds' || step === 'alts' || step === 'realestate' || step === 'property'
      || (step === 'retirement' && inside !== 'mixed');
    if (pickedOnAdd && patch.asset_class) patch = { ...patch, class_source: 'user' };
    store.addAsset?.(patch); onClose();
  };
  // Build-47 walk row 23 (B46 finding 5): Remove asks first and names the money leaving.
  const remove = () => {
    if (!editing) { onClose(); return; }
    Alert.alert(
      `Remove ${editing.label}?`,
      `Its ${fig('MK-NW-M-008', Math.round(editing.balance || 0))} leaves your net worth. This can't be undone.`,
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => { store.deleteAsset?.(editing.asset_id); onClose(); } },
      ],
    );
  };
  const TITLES: Record<AddStep, string> = { pick: 'Add to net worth', cash: 'Cash & equivalents', stocks: 'Stocks / Funds', bonds: 'Bonds', alts: 'Alternatives', realestate: 'Real estate', property: 'Personal property', retirement: 'Retirement account', brokerage: 'Brokerage account', quick: 'Quick add', edit: 'Edit account' };
  const Chips = ({ ids }: { ids: string[] }) => (
    <View style={sh.chips}>{ids.map((id) => (
      <TouchableOpacity key={id} accessibilityRole="button" accessibilityLabel={assetKind(id)?.label ?? id} style={[sh.chip, sub === id && sh.chipOn]} onPress={() => setSub(id)}><Text style={sh.chipTxt}>{assetKind(id)?.label ?? id}</Text></TouchableOpacity>
    ))}</View>
  );
  const Wrappers = ({ opts }: { opts: { key: AddWrapper; label: string }[] }) => (
    <View style={sh.chips}>{opts.map((w) => (
      <TouchableOpacity key={w.key} accessibilityRole="button" accessibilityLabel={w.label} style={[sh.chip, wrapper === w.key && sh.chipOn]} onPress={() => setWrapper(w.key)}><Text style={sh.chipTxt}>{w.label}</Text></TouchableOpacity>
    ))}</View>
  );

  return (
    <KeyboardAwareSheet open={state.open} onClose={onClose} title={editing ? 'Edit account' : TITLES[step]}>
      {step === 'pick' ? (
        <>
          <TouchableOpacity style={sh.quickRow} accessibilityRole="button" accessibilityLabel="Quick add" onPress={() => choose('quick')}><Text style={sh.quickTxt}>⚡  Quick add — just a name & value</Text></TouchableOpacity>
          <Text style={sh.pickHdr}>WHAT IT IS</Text>
          {ADD_CLASS_PICKS.map((p) => (
            <TouchableOpacity key={p.key} style={sh.pickRow} accessibilityRole="button" accessibilityLabel={p.label} onPress={() => choose(p.key)}><Text style={sh.pickTxt}>{p.icon}  {p.label}</Text><Text style={sh.pickArrow}>›</Text></TouchableOpacity>
          ))}
          <Text style={sh.pickHdr}>A WHOLE ACCOUNT (holds a mix)</Text>
          {ADD_ACCT_PICKS.map((p) => (
            <TouchableOpacity key={p.key} style={sh.pickRow} accessibilityRole="button" accessibilityLabel={p.label} onPress={() => choose(p.key)}><Text style={sh.pickTxt}>{p.icon}  {p.label}</Text><Text style={sh.pickArrow}>›</Text></TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          {!editing && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" onPress={() => setStep('pick')}><Text style={sh.backLink}>‹ Back</Text></TouchableOpacity>}
          {step === 'cash' && (<>
            <Chips ids={CASH_OPTS} />
            {/* A CD'S MATURITY IS PICKED, NEVER TYPED (DEC-4059b, 2026-10-10) — the date picker Add an account and Bonds use */}
            {sub === 'cd' && (<><Text style={sh.lbl}>Matures (optional)</Text><DateField value={maturity} onChange={setMaturity} label="maturity date" initial={TEN_YEARS_OUT()} minimumDate={new Date(2000, 0, 1)} style={sh.input} /></>)}
          </>)}
          {step === 'alts' && <Chips ids={ALT_OPTS} />}
          {step === 'property' && <Chips ids={PROP_OPTS} />}
          {(step === 'stocks' || step === 'bonds' || step === 'alts') && (<>
            <Text style={sh.clsLabel}>Held in</Text><Wrappers opts={WRAPPER_OPTS} />
            <Text style={sh.note}>{step === 'bonds' ? 'Enter a total value below — or track each bond (coupon, maturity) on the Bonds screen.' : step === 'stocks' ? 'Enter a total value below — or track specific tickers (shares, cost) on the Stocks / Funds screen.' : 'Enter a total value below — or track each holding on the Alternatives screen. Crypto, PE, hedge funds, commodities, annuities, options.'}</Text>
            {/* NW-16: make the "track specifics" path actionable — route to the holdings detail screen */}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add specific holdings" onPress={() => { onClose(); router.push(step === 'stocks' ? '/performance' : step === 'bonds' ? '/bonds' : '/other-investments'); }}>
              <Text style={sh.specifics}>＋ Add specific holdings instead →</Text>
            </TouchableOpacity>
          </>)}
          {step === 'retirement' && (<>
            <Wrappers opts={RET_OPTS} />
            <Text style={sh.clsLabel}>What's inside?</Text>
            <View style={sh.chips}>{INSIDE_OPTS.map((o) => (
              <TouchableOpacity key={o.key} accessibilityRole="button" accessibilityLabel={o.label} style={[sh.chip, inside === o.key && sh.chipOn]} onPress={() => setInside(o.key)}><Text style={sh.chipTxt}>{o.label}</Text></TouchableOpacity>
            ))}</View>
          </>)}
          {step === 'edit' && (<>
            {(editing?.kind === 'cd' || (editing && assetClassOf(editing) === 'bonds') || editing?.maturity_date) && (<>
              {/* PICKED, NEVER TYPED, A FULL DATE (DEC-4059b, 2026-10-10): "Use date picker for date." */}
              <Text style={sh.lbl}>Matures (CDs and dated bonds count under Bonds & CDs)</Text>
              <DateField value={maturity} onChange={setMaturity} label="maturity date" initial={TEN_YEARS_OUT()} minimumDate={new Date(2000, 0, 1)} style={sh.input} />
            </>)}
            {/* not asked of a home, real estate, land, a vehicle or other personal property (DEC-4529, 2026-10-11) */}
            {!isProperty && (<>
            <Text style={sh.clsLabel}>What's it invested in?</Text>
            <View style={sh.chips}>{INSIDE_OPTS.map((o) => (
              <TouchableOpacity key={o.key} accessibilityRole="button" accessibilityLabel={o.label} style={[sh.chip, inside === o.key && sh.chipOn]} onPress={() => setInside(o.key)}><Text style={sh.chipTxt}>{o.label}</Text></TouchableOpacity>
            ))}</View>
            </>)}
            {/* THE ITEMIZE DOOR MOVED TO THE ACCOUNT PORTFOLIO (2026-10-01).
                It used to sit here, in the edit sheet, which could only be reached by tapping an
                account row, opening Account detail and pressing an Edit button that exists in no
                approved design — and that button forks by class, so a bonds or alternatives account
                could never arrive. The door now sits on the screen that answers what is inside an
                account, where the question actually arises. One door, pinned by
                src/__tests__/itemize_has_one_door.test.tsx. */}
          </>)}
          <TextInput style={sh.input} placeholder={step === 'quick' ? 'Name (e.g. My Robinhood)' : 'Institution / name (e.g. Chase)'} placeholderTextColor={Colors.textTertiary} value={inst} onChangeText={setInst} />
          <View style={sh.amtRow}><Text style={sh.amtPre}>{currencySymbol()}</Text><TextInput style={sh.amtIn} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} value={bal} onChangeText={setBal} /></View>
          {needsKind && <Text style={sh.note}>Pick which kind of retirement account it is.</Text>}
          <TouchableOpacity style={[sh.save, needsKind && { opacity: 0.4 }]} disabled={needsKind} accessibilityState={{ disabled: needsKind }} accessibilityRole="button" accessibilityLabel={editing ? 'Save account' : 'Add account'} onPress={save}><Text style={sh.saveTxt}>{editing ? 'Save' : 'Add'} {v > 0 ? typedAmount(v) : ''}</Text></TouchableOpacity>
          {editing && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove account" onPress={remove}><Text style={sh.remove}>Remove</Text></TouchableOpacity>}
        </>
      )}
    </KeyboardAwareSheet>
  );
}

// (the local Sheet was replaced by the shared, keyboard-aware <KeyboardAwareSheet/> — Theme 3)

const styles = StyleSheet.create({
  // ── THE FLAT LEDGER (Quiet Instrument, 2026-08-10) ──────────────────────────────────────────
  // The own/owe lists run edge to edge; only the cards above and below them are inset. Rows carry
  // the SAME horizontal padding a SectionBand carries (Spacing.md), so a band total and a row value
  // land on the identical right edge once both reserve the ARROW column.
  contentFlat: { paddingTop: 0, paddingBottom: 40 },
  inset: { marginHorizontal: Spacing.base },
  // Founder 2026-08-11: the hero and the retirement plan are full-width blocks titled by the SAME
  // green banner WHAT YOU OWN wears — one titling treatment for every section, edge to edge. Their
  // body carries the ledger's own inset, so the text under a banner lines up with the rows under one.
  heroBlock: { backgroundColor: Colors.cardBg, marginBottom: Spacing.sm },
  blockBody: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, alignItems: 'flex-start' },
  ledger: { backgroundColor: Colors.cardBg, marginTop: Spacing.sm },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 10, minHeight: 44,
    borderTopWidth: 1, borderTopColor: Colors.border },
  ledgerChild: { paddingLeft: Spacing.md + 20 },   // one step in — never two
  ledgerPad: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  arrowSlot: { width: ARROW, fontSize: 15, color: Colors.textTertiary, textAlign: 'right' },
  arrowGap: { width: ARROW },
  // FCC glance-that-expands
  glanceCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'flex-start' },
  ownOweTop: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  // the composition bar + its wrapping legend (founder Q6, 2026-08-11 — replaces the donut)
  compWrap: { paddingHorizontal: Spacing.md, paddingTop: 10, paddingBottom: 12 },
  compBar: { flexDirection: 'row', height: 10, borderRadius: 3, overflow: 'hidden', backgroundColor: Colors.bgTertiary },
  compLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  compLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  compSwatch: { width: 8, height: 8, borderRadius: 2 },
  compLegendTxt: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  glanceKickerNW: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 2 },
  acctRowNW: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 34, paddingRight: 2, paddingVertical: 8, minHeight: 44 },
  classCaret: { fontSize: 13, color: Colors.textTertiary, width: 14 },
  acctRowLabel: { fontSize: 15, color: Colors.textPrimary },
  acctRowSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  acctRowVal: { fontSize: 15, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
  acctChev: { fontSize: 15, color: Colors.textTertiary },
  acctMore: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark, paddingLeft: 26, paddingVertical: 13, minHeight: 44 },
  glanceVal: { fontSize: 38, fontWeight: '800', color: Colors.primaryDark },
  glanceDelta: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  // founder note 1 (2026-08-10): the since-date is a plain line, not another bold figure
  glanceSince: { fontSize: 13, fontWeight: '400', color: Colors.textSecondary, marginTop: 4 },
  // the coverage sentence: quieter than the date above it, and it wraps rather than truncating —
  // a limit stated in half a sentence is worse than not stating it.
  glanceCoverage: { fontSize: 11, fontWeight: '400', color: Colors.textTertiary, marginTop: 6, lineHeight: 16 },
  glanceLink: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 10, minHeight: 44, paddingTop: 12 },
  ownHdr: { fontSize: 13, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: 6 },
  chev: { fontSize: 17, color: Colors.textTertiary, marginLeft: 6 },
  expandBtn: { minHeight: 46, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.sm },
  expandTxt: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  // walk row 7: the calm projection line (v7 FINAL position — right under the glance card)
  kickerSm: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: Colors.textSecondary },
  cushionMonths: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  cushionWord: { fontSize: 13, fontWeight: '800' },
  cushionMath: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  cushionTrack: { height: 4, borderRadius: 2, backgroundColor: Colors.bgTertiary, overflow: 'hidden', marginTop: 8 },
  cushionFill: { height: '100%' },
  cushionNote: { fontSize: 11, color: Colors.textTertiary, marginTop: 4 },
  link: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginTop: 8, minHeight: 44, paddingTop: 12 },
  pathAhead: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, paddingHorizontal: Spacing.md, paddingVertical: 12, marginTop: Spacing.sm, minHeight: 44, justifyContent: 'center' },
  pathAheadTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  pathAheadNum: { fontWeight: '800' },
  // walk row 8: the grouping pills (44pt targets — the tap-target rule applies to new controls).
  // Founder note 4 (2026-08-10): LEFT justified, sharing the ledger's left edge.
  groupPills: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm, marginBottom: Spacing.xs,
    justifyContent: 'flex-start', paddingHorizontal: Spacing.base },
  groupPill: { borderWidth: 1, borderColor: Colors.border, borderRadius: 999, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', backgroundColor: Colors.cardBg },
  groupPillOn: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  groupPillTxt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  groupPillTxtOn: { color: Colors.cardBg },
  addConnect: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  addConnectTxt: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  firstDayAsk: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, paddingVertical: Spacing.sm },
  firstDayAskQ: { fontWeight: '700', color: Colors.textPrimary },   // Net worth v08 state C: a plain <b> in the drawing, which draws at 700
  chooserHead: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.md },
  chooserBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  chooserCard: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 34 },
  chooserGrip: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  chooserRow: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: 8, minHeight: 64, justifyContent: 'center' },
  chooserTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  chooserSoon: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary },
  chooserSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  content: { padding: Spacing.lg },
  nwHero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md },
  nwIdentity: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 2 },
  nwInvestable: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center', marginBottom: 4 },
  nwCaption: { fontSize: 11, color: Colors.textSecondary, textAlign: 'left', marginBottom: 4, lineHeight: 15 },
  nwNudge: { fontSize: 11, color: Colors.amber, textAlign: 'left', marginBottom: 6, lineHeight: 15 },
  nwLegend: { flex: 1, gap: 7 },
  lgRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  lgName: { flex: 1, fontSize: 13, fontWeight: '600' },
  lgVal: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, minWidth: 56, textAlign: 'right' },
  lgPct: { fontSize: 13, fontWeight: '600', color: Colors.textTertiary, width: 34, textAlign: 'right' },
  runway: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  runwayIcon: { fontSize: 24 },
  runwayTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  runwaySub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  runwayLink: { fontSize: 13, fontWeight: '800', color: Colors.primary, marginTop: 6 },
  perfBtnArrow: { fontSize: 24, color: Colors.textTertiary, fontWeight: '400' },
  exploreCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingBottom: 4 },
  exploreHdr: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.4, marginTop: Spacing.sm, marginBottom: 2 },
  exploreRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  exploreRowT: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  exploreDiv: { height: 1, backgroundColor: Colors.bgTertiary },
  insight: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  insightIcon: { fontSize: 15, lineHeight: 20 },
  insightTxt: { fontSize: 15, fontWeight: '700', color: Colors.primaryDark, lineHeight: 20 },
  insightSub: { fontSize: 13, color: Colors.primaryDark, opacity: 0.85, marginTop: 2 },
  hero: { backgroundColor: Colors.primaryDark, borderRadius: Radii.lg, padding: Spacing.lg },
  heroLabel: { color: Colors.onDeepTint, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  heroValue: { color: Colors.white, fontSize: 38, fontWeight: '800', marginTop: 4 },
  heroSub: { color: Colors.onDeepTint, fontSize: 13, marginTop: 6 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 6 },
  allocBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: Colors.bgTertiary },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  lg: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  lgTxt: { fontSize: 11, color: Colors.textSecondary },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, marginBottom: 2 },
  secTitle: { fontSize: 13, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5 },
  add: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  invToggle: { flexDirection: 'row', backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, padding: 3, marginTop: 6, alignSelf: 'flex-start' },
  invTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radii.sm },
  invTabOn: { backgroundColor: Colors.cardBg },
  invTabTxt: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  invTabTxtOn: { color: Colors.primary, fontWeight: '800' },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 2, paddingHorizontal: 2 },
  groupName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  groupVal: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  classMix: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, marginTop: 1, marginBottom: 1, paddingHorizontal: 2 },
  empty: { fontSize: 13, color: Colors.primary, fontWeight: '600', paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 9 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1, fontWeight: '600' },
  rowVal: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  chArrow: { fontSize: 11, fontWeight: '800' },
  chDelta: { fontSize: 13, fontWeight: '700', marginTop: 1 },
  hotPill: { backgroundColor: Colors.redLight, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  // P0 (design audit NW-1): the one actionable debt recommendation — never 9pt
  hotPillTxt: { fontSize: 11, fontWeight: '800', color: Colors.red },
  ownOweLine: { fontSize: 13, color: Colors.textSecondary, textAlign: 'left' },
  sampleLine: { fontSize: 15, color: Colors.textPrimary, marginTop: 2 },
  sampleNum: { fontWeight: '800', color: Colors.textTertiary, fontStyle: 'italic' },
  cushionEmpty: { fontSize: 24, fontWeight: '800', color: Colors.textTertiary },
  // first-day doors: the three ways in, as ledger rows on the same left and right edges
  doorTxt: { flex: 1, fontSize: 15, fontWeight: '800', color: Colors.primaryDark },
  doorTxtQuiet: { flex: 1, fontSize: 15, fontWeight: '400', color: Colors.textTertiary },
  intro: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  introEmoji: { fontSize: 38, textAlign: 'center', marginBottom: Spacing.sm },
  introTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  introSub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: Spacing.lg, lineHeight: 21 },
  introPrimary: { backgroundColor: Colors.primary, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.sm },
  introPrimaryTxt: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  introBtnSub: { color: Colors.primaryLight, fontSize: 13, marginTop: 2 },
  introSecondary: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  introSecondaryTxt: { color: Colors.textPrimary, fontSize: 17, fontWeight: '800' },
  introBtnSub2: { color: Colors.textTertiary, fontSize: 13, marginTop: 2 },
  introNote: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.md },
  wizStep: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary },
  wizTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  wizSub: { fontSize: 13, color: Colors.primaryDark, marginTop: 4, marginBottom: Spacing.sm },
  wizTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, paddingHorizontal: 4 },
  wizTotalL: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  wizTotalV: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  footer: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, paddingBottom: 28, backgroundColor: Colors.bgSecondary, borderTopWidth: 1, borderTopColor: Colors.border },
  btnSec: { paddingHorizontal: 18, paddingVertical: Spacing.md, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  btnSecTxt: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  btnPri: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  btnPriTxt: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  callout: { flexDirection: 'row', gap: 8, backgroundColor: Colors.redLight, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.md },
  calloutIcon: { fontSize: 15, lineHeight: 20 },
  calloutTxt: { fontSize: 15, fontWeight: '700', color: Colors.red, lineHeight: 20 },
  calloutSub: { fontSize: 13, color: Colors.red, opacity: 0.85, marginTop: 2 },
});

const sh = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  card: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 32 },
  grip: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  title: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  chip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  clsLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, alignSelf: 'flex-start', marginTop: 4, marginBottom: 8 },
  input: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.md, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.sm },
  lbl: { fontSize: 13, color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: 2 },
  amtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  amtPre: { fontSize: 24, fontWeight: '800', color: Colors.textSecondary },
  amtIn: { fontSize: 38, fontWeight: '800', color: Colors.textPrimary, minWidth: 80, textAlign: 'center', padding: 0 },
  save: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  saveTxt: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  remove: { color: Colors.red, fontWeight: '700', textAlign: 'center', paddingVertical: Spacing.md },
  pickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickTxt: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  pickArrow: { fontSize: 20, color: Colors.textTertiary },
  pickHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: 16, marginBottom: 2 },
  quickRow: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: Radii.md, backgroundColor: Colors.primaryLight, marginBottom: 4 },
  quickTxt: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  backLink: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
  note: { fontSize: 11, color: Colors.textSecondary, marginTop: 8, lineHeight: 16 },
  specifics: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 10, paddingVertical: 4 },
  itemize: { backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.md },
  itemizeT: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  itemizeSub: { fontSize: 13, color: Colors.primaryDark, marginTop: 2 },
});
