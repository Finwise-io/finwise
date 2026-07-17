// Net Worth = Assets − Debts. Also the capture surface: every bucket is a section you fill in
// (per-account, with institution), so it works as both first-run setup and ongoing management.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import Svg, { Circle, G, Polyline } from 'react-native-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { buildDatedGrid } from '../domain/grid';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii, ClassMarkColors } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { maskedMoney } from '../components/useMoney';
import { readHistory } from '../domain/history';
import { moneyCompact, currencySymbol } from '../domain/_shared/money';
import { buildAssetsState, ASSET_KINDS, ASSET_SECTIONS, assetKind, assetClassOf, cashTotal, AssetAccount, TaxBucket, assetAllocation, investableAssets, ASSET_CLASS_LABEL, type AssetClass, wrapperAccount, maturityClass, type AddWrapper } from '../domain/assets';
import { buildDebtState, DEBT_KINDS, debtKind, TOXIC_APR, Debt, DebtType } from '../domain/debt';
import { buildNetWorth } from '../domain/networth';
import { plannedMonthlySpend } from '../domain/budget';
import { KeyboardAwareSheet } from '../components/KeyboardAwareSheet';   // Theme 3: shared keyboard-safe sheet
import { InfoDot } from '../components/UI';
import { type GlossaryTerm } from '../domain/glossary';

// asset class → glossary term, so the By-class group headers carry an in-context "what is this?" dot.
const CLASS_TO_TERM: Partial<Record<AssetClass, GlossaryTerm>> = {
  cash: 'cash', stocks_etf: 'stocks', bonds: 'bonds', alternatives: 'alternatives', real_estate: 'realEstate', personal_property: 'personalProperty',
};
const SECTION_COLOR: Record<string, string> = { Cash: Colors.primary, Investments: Colors.purple, Retirement: Colors.blue, Property: Colors.gold };
// #19: the donut groups assets by ASSET CLASS (the taxonomy), not the old section/wrapper axis.
// Labels come from the canonical ASSET_CLASS_LABEL (single source) — only color lives here.
// #10: 'mixed' = a 401(k)/IRA/brokerage we don't know the holdings of — shown honestly, NOT as stocks.
const CLASS_META: { key: AssetClass; label: string; color: string }[] = (
  Object.entries(ClassMarkColors) as [AssetClass, string][]
).map(([key, color]) => ({ key, label: ASSET_CLASS_LABEL[key], color }));
// #10/#14: the asset-class options offered when classifying a wrapper account (what it HOLDS). 'auto'
// leaves it Unclassified (mixed); the rest set an explicit class so the donut is accurate.
const WRAPPER_CLASS_CHOICES: { key: AssetClass | 'auto'; label: string }[] = [
  { key: 'auto', label: 'Mixed / not sure' },
  { key: 'stocks_etf', label: 'Stocks / ETFs' },
  { key: 'bonds', label: 'Bonds' },
  { key: 'cash', label: 'Cash' },
  { key: 'alternatives', label: 'Alternatives' },
];
const SECTION_ICON: Record<string, string> = { Cash: '💵', Investments: '📈', Retirement: '🏛️', Property: '🏠' };
const CLASS_ICON: Record<AssetClass, string> = { cash: '💵', stocks_etf: '📈', bonds: '📜', alternatives: '🪙', real_estate: '🏠', personal_property: '🚗', mixed: '🧩' };
const bucketSection = (b: TaxBucket) => (b === 'CASH' ? 'Cash' : b === 'PROPERTY' ? 'Property' : b === 'TAXABLE' ? 'Investments' : 'Retirement');
const sectionOf = (a: AssetAccount) => assetKind(a.kind)?.section ?? bucketSection(a.tax_bucket);
const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
// B-21: an asset can be saved at $0 (placeholder), but the amount field must be filled in — a typed
// "0" is allowed, a blank field is not (prevents accidental empty adds). A kind must also be picked.
export const assetSheetReady = (kind: string, bal: string) => !!kind && bal.trim() !== '' && num(bal) >= 0;
const shortMoney = (n: number) => {
  if (Math.abs(n) >= 1000) return moneyCompact(n, 'MM');   // $2.43MM / $182K (currency-aware)
  return maskedMoney(n);
};

// Donut ring (react-native-svg) with content in the center hole.
function Donut({ segments, size = 124, stroke = 16, children, label }: { segments: { value: number; color: string }[]; size?: number; stroke?: number; children?: React.ReactNode; label?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const total = segments.reduce((t, s) => t + Math.max(0, s.value), 0) || 1;
  let acc = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible accessibilityRole="image" accessibilityLabel={label}>{/* VoiceOver: summarize the chart */}
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.bgTertiary} strokeWidth={stroke} fill="none" />
          {segments.map((s, i) => {
            const dash = (Math.max(0, s.value) / total) * c; const el = (
              <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={s.color} strokeWidth={stroke} fill="none" strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc} />
            ); acc += dash; return el;
          })}
        </G>
      </Svg>
      <View style={{ alignItems: 'center' }}>{children}</View>
    </View>
  );
}

// You CAPTURE money by account (how it's held); the donut REGROUPS by asset class (what it is). These
// display labels make the capture axis read as account/tax-bucket framing so it never sounds like it's
// contradicting the donut's class words (Option B, 2026-06-24). Keys stay stable for grouping.
const SECTION_LABEL: Record<string, string> = {
  Cash: 'Cash',
  Investments: 'Taxable accounts',
  Retirement: 'Retirement accounts',
  Property: 'Real estate & personal property',
};
const secLabel = (s: string) => SECTION_LABEL[s] ?? s;
const WIZ_HINT: Record<string, string> = {
  Cash: 'Checking, savings, emergency fund.',
  Investments: 'Brokerage & other taxable accounts — stocks/ETFs, bonds, crypto.',
  Retirement: '401(k), IRAs, HSA.',
  Property: 'Home & other real estate, vehicles, valuables.',
  Debts: 'Mortgage, loans, credit cards — with their rates.',
};

export default function NetWorthScreen() {
  const router = useRouter();
  const store = useStore() as any;
  useEffect(() => { store.maybeRefreshPrices?.(); }, []);   // keep balances live with the market
  const op = store.onboardingProfile;
  const uid = store.user?.uid ?? 'local';
  const assets: AssetAccount[] = store.assetAccounts ?? [];
  const liabilities: Debt[] = store.liabilities ?? [];
  // existing users (accounts already set up, e.g. seeded) skip the intro and go straight to the manager
  const choice = (store.nwSetupChoice as ('guided' | 'self' | null)) ?? ((assets.length || liabilities.length || store.nwSeeded) ? 'self' : null);
  const aState = useMemo(() => buildAssetsState(uid, assets), [assets]);
  const dState = useMemo(() => buildDebtState(uid, liabilities), [liabilities]);
  // emergency-fund runway: cash ÷ monthly spending
  const cashOnHand = cashTotal(assets);   // canonical cash (asset class), single source
  const monthlySpend = plannedMonthlySpend(op);   // B-50: same definition as budget.monthly_spending + the runway insight
  const runwayMonths = monthlySpend > 0 ? cashOnHand / monthlySpend : null;
  const nw = buildNetWorth(uid, aState.total_asset_value, dState.total_debt_balance);

  const [assetSheet, setAssetSheet] = useState<{ open: boolean; section?: string; edit?: AssetAccount }>({ open: false });
  const [debtSheet, setDebtSheet] = useState<{ open: boolean; edit?: Debt }>({ open: false });
  const [step, setStep] = useState(0);
  const [invGroup, setInvGroup] = useState<'type' | 'account'>('type');
  const [expanded, setExpanded] = useState(false);        // legacy editors section (kept for edit flows)
  const [showAllClassRows, setShowAllClassRows] = useState<Record<string, boolean>>({});
  const [addChooser, setAddChooser] = useState(false);    // the one add-or-connect button's three paths

  // FCC: the Account detail screen's Edit button lands here with ?edit=<id> → open the one editor
  const { edit: editParam } = useLocalSearchParams<{ edit?: string }>();
  useEffect(() => {
    if (!editParam) return;
    const target = assets.find((a) => String(a.asset_id) === String(editParam));
    if (target) setAssetSheet({ open: true, edit: target });
    router.setParams({ edit: undefined } as any);   // consume the param so back/refocus doesn't reopen
  }, [editParam]);

  const sectionTotals = ASSET_SECTIONS.map((sec) => ({ sec, total: assets.filter((a) => sectionOf(a) === sec).reduce((t, a) => t + a.balance, 0) }));
  const alloc = assetAllocation(assets);   // #19: assets grouped by ASSET CLASS (the taxonomy)
  const classRows = CLASS_META.map((m) => ({ ...m, total: alloc[m.key] })).filter((r) => r.total > 0);
  const costliest = dState.highest_rate_debt && dState.highest_rate_debt.interest_rate_apr > TOXIC_APR ? dState.highest_rate_debt : null;
  const totalAssets = aState.total_asset_value;
  // NW-9: the headline insight names the largest asset CLASS (matches the donut), not the account section.
  const topClass = [...classRows].sort((a, b) => b.total - a.total)[0];
  const investable = investableAssets(assets);   // NW-12: cash + investments (excludes home & belongings)
  const debtRatio = totalAssets > 0 ? dState.total_debt_balance / totalAssets : 0;
  const pctOf = (v: number) => (totalAssets > 0 ? Math.round((v / totalAssets) * 100) : 0);

  // Tapping a donut-legend item jumps to the accounts that make up that class (feedback: legend is a nav).
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});
  const scrollToSection = (sec: string) => { const y = sectionY.current[sec]; if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true }); };
  const scrollToClass = (cls: AssetClass) => {
    const target = ASSET_SECTIONS.find((sec) => assets.some((a) => sectionOf(a) === sec && assetClassOf(a) === cls));
    if (target) scrollToSection(target);
  };

  // ── shared section renderers (used by both the manager and the guided wizard) ──
  const curYm = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const assetRow = (a: AssetAccount, i: number, title: string, sub: string) => {
    const ch = a.change_month === curYm ? (a.change_amount ?? 0) : 0;
    const up = ch > 0;
    // FCC: every row says where its number comes from and how fresh it is
    const stamp = a.source === 'connected'
      ? `Connected · ${a.last_synced ? String(a.last_synced).slice(0, 10) : 'linked'}`
      : a.source === 'imported' ? `Imported · ${a.last_synced ? String(a.last_synced).slice(0, 10) : ''}`
      : 'Manual · you update it';
    sub = sub ? `${sub} · ${stamp}` : stamp;
    // FCC: a row opens the account's DETAIL page; Edit still reaches this screen's sheet via ?edit=
    return (
      <TouchableOpacity key={a.asset_id} style={[styles.row, i > 0 && styles.divider]} accessibilityRole="button" accessibilityLabel={`Open ${title}, ${maskedMoney(a.balance)}`} onPress={() => router.push(`/account-detail?id=${a.asset_id}` as any)}>
        <Text style={styles.rowIcon}>{assetKind(a.kind)?.icon ?? '💼'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            {ch !== 0 && <Text style={[styles.chArrow, { color: up ? Colors.gainText : Colors.red }]}>{up ? '▲' : '▼'}</Text>}
            <Text style={styles.rowVal}>{maskedMoney(a.balance)}</Text>
          </View>
          {ch !== 0 && <Text style={[styles.chDelta, { color: up ? Colors.gainText : Colors.red }]}>{up ? '+' : '−'}{maskedMoney(Math.abs(ch))} this mo</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderAssetSection = (sec: string) => {
    const rows = assets.filter((a) => sectionOf(a) === sec);
    const total = rows.reduce((t, a) => t + a.balance, 0);
    const head = (
      <View style={styles.secHead}>
        <Text style={styles.secTitle}>{SECTION_ICON[sec]}  {secLabel(sec).toUpperCase()}{total > 0 ? ` · ${maskedMoney(total)}` : ''}</Text>
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
      const groups: Record<string, AssetAccount[]> = {};
      rows.forEach((a) => { (groups[keyOf(a)] ||= []).push(a); });
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
                <Text style={styles.groupVal}>{maskedMoney(items.reduce((t, a) => t + a.balance, 0))}</Text>
              </View>
              {/* Mock A: under each institution, an at-a-glance class mix (so a "Chase" with mixed holdings
                  reads as a roll-up, not just a flat list). */}
              {invGroup === 'account' && (() => {
                const mix = Object.values(items.reduce((m: Record<string, { c: AssetClass; t: number }>, a) => {
                  const c = assetClassOf(a); (m[c] ||= { c, t: 0 }); m[c].t += a.balance; return m;
                }, {})).sort((x, y) => y.t - x.t);
                return mix.length > 1 ? <Text style={styles.classMix}>{mix.map((x) => `${CLASS_ICON[x.c]} ${shortMoney(x.t)}`).join('   ·   ')}</Text> : null;
              })()}
              <View style={styles.card}>
                {items.map((a, i) => {
                  const base = invGroup === 'type' ? (a.institution?.trim() || '') : classLabel(a);
                  const t = withTickers(a, base);
                  // NW-15: an Unclassified account has no holdings set — invite a tap to classify it.
                  const sub = assetClassOf(a) === 'mixed' && !tickersOf(a).length ? (t ? `${t} · tap to set holdings` : 'Tap to set what\'s inside') : t;
                  return assetRow(a, i, a.label, sub);
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
            : rows.map((a, i) => assetRow(a, i, a.label, `${assetKind(a.kind)?.label ?? a.tax_bucket}${a.institution ? ` · ${a.institution}` : ''}`))}
        </View>
      </View>
    );
  };

  const renderDebtSection = () => (
    <View>
      <View style={styles.secHead}>
        <Text style={styles.secTitle}>💳  DEBTS{dState.total_debt_balance > 0 ? ` · ${maskedMoney(dState.total_debt_balance)}` : ''}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add a debt" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={() => setDebtSheet({ open: true })}><Text style={styles.add}>+ Add</Text></TouchableOpacity>
      </View>
      <View style={styles.card}>
        {liabilities.length === 0
          ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add a debt" onPress={() => setDebtSheet({ open: true })}><Text style={styles.empty}>Add a debt →</Text></TouchableOpacity>
          : (<>
            {liabilities.map((d, i) => {
              const hot = d.interest_rate_apr > TOXIC_APR;
              return (
                <TouchableOpacity key={d.debt_id} style={[styles.row, i > 0 && styles.divider]} accessibilityRole="button" accessibilityLabel={`Edit ${d.label}, ${maskedMoney(d.remaining_balance)}`} onPress={() => setDebtSheet({ open: true, edit: d })}>
                  <Text style={styles.rowIcon}>{debtKind(d.debt_type)?.icon ?? '🧾'}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.rowTitle}>{d.label}</Text>
                      {costliest?.debt_id === d.debt_id && <View style={styles.hotPill}><Text style={styles.hotPillTxt}>pay first</Text></View>}
                    </View>
                    <Text style={[styles.rowSub, hot && { color: Colors.red }]}>{(d.interest_rate_apr * 100).toFixed(1)}% APR · {maskedMoney(d.minimum_monthly_payment)}/mo</Text>
                  </View>
                  <Text style={styles.rowVal}>{maskedMoney(d.remaining_balance)}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={[styles.row, styles.divider]}><Text style={[styles.rowSub, { flex: 1 }]}>Monthly debt payments</Text><Text style={styles.rowVal}>{maskedMoney(dState.total_monthly_debt_service)}/mo</Text></View>
          </>)}
      </View>
    </View>
  );

  let body: React.ReactNode;

  if (!choice) {
    // ── first-run: guided vs self ──
    body = (
      <View style={styles.intro}>
        <Text style={styles.introEmoji}>💎</Text>
        <Text style={styles.introTitle}>Let's build your net worth</Text>
        <Text style={styles.introSub}>Add your accounts and debts to see what you're worth — and where your money sits.</Text>
        <TouchableOpacity style={styles.introPrimary} onPress={() => { store.seedNetWorth?.(op); store.setNwSetupChoice?.('guided'); setStep(0); }}>
          <Text style={styles.introPrimaryTxt}>Guided setup  →</Text>
          <Text style={styles.introBtnSub}>Walk through each bucket, step by step</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.introSecondary} onPress={() => { store.seedNetWorth?.(op); store.setNwSetupChoice?.('self'); }}>
          <Text style={styles.introSecondaryTxt}>I'll add my own</Text>
          <Text style={styles.introBtnSub2}>Jump straight in and add accounts</Text>
        </TouchableOpacity>
        {!!op && <Text style={styles.introNote}>We'll start from what you shared in setup.</Text>}
      </View>
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
          <View style={styles.wizTotal}><Text style={styles.wizTotalL}>Net worth so far</Text><Text style={styles.wizTotalV}>{maskedMoney(nw.net_worth)}</Text></View>
          <Text style={styles.nwIdentity}>
            Assets {maskedMoney(Math.round(totalAssets))} − Debts {maskedMoney(Math.round(dState.total_debt_balance))} ={' '}
            <Text style={{ fontWeight: '800', color: nw.net_worth < 0 ? Colors.red : Colors.textPrimary }}>Net worth {maskedMoney(Math.round(nw.net_worth))}</Text>
          </Text>
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
    // One number, its yearly change, a simple trend — then WHAT YOU OWN / WHAT YOU OWE rows,
    // the own−owe math line, a collapsed accounts-and-detail expander, the tiny cash-flow
    // glance, and ONE add-or-connect button with three honest paths. Calm by design: the
    // donut, captions, explore box and insight cards moved off this screen (Home's insights
    // engine owns the nudges; class rows carry the allocation story).
    const series = readHistory(store.monthlySnapshots)
      .map((h) => ({ month: h.month, nw: h.net_worth })).slice(-12);   // typed, normalized, garbage-free (PRD F1#15)
    const jan = `${new Date().getFullYear()}-01`;
    const janPoint = series.find((pt) => pt.month >= jan && pt.month !== series[series.length - 1]?.month);
    const changeThisYear = janPoint ? nw.net_worth - janPoint.nw : null;
    // the tiny cash-flow glance reads the SAME dated grid the Cash flow tab reads (cheap — no simulation)
    const cfCell = buildDatedGrid(op, { liabilities }).cells[0];

    body = (
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* GLANCE: the one number + its year change + the 12-month trend */}
        <View style={styles.glanceCard} accessible
          accessibilityLabel={store.hideBalances
            ? 'Net worth hidden'
            : `Net worth ${maskedMoney(Math.round(nw.net_worth))}${nw.net_worth < 0 ? ', negative' : ''}${changeThisYear != null ? `, ${changeThisYear >= 0 ? 'up' : 'down'} ${maskedMoney(Math.round(Math.abs(changeThisYear)))} this year` : ''}. By asset class: ${classRows.map((r) => `${r.label} ${pctOf(r.total)} percent`).join(', ') || 'none yet'}.`}>
          <Text style={styles.glanceKickerNW}>YOUR NET WORTH</Text>
          <Text style={[styles.glanceVal, nw.net_worth < 0 && !store.hideBalances && { color: Colors.red }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {store.hideBalances ? '••••' : maskedMoney(Math.round(nw.net_worth))}{nw.net_worth < 0 && !store.hideBalances ? '  (negative)' : ''}
          </Text>
          {changeThisYear != null && (
            <Text style={[styles.glanceDelta, { color: changeThisYear >= 0 ? Colors.gainText : Colors.red }]}>
              {changeThisYear >= 0 ? '▲ up' : '▼ down'} {maskedMoney(Math.round(Math.abs(changeThisYear)))} this year
            </Text>
          )}
          {series.length >= 2 && (() => {
            const vals = series.map((pt) => pt.nw);
            const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
            const Wd = 280, Ht = 44;
            const pts = series.map((pt, k) => `${(k / (series.length - 1)) * Wd},${Ht - ((pt.nw - lo) / span) * Ht}`).join(' ');
            return (
              <Svg width={Wd} height={Ht + 4} style={{ marginTop: 10 }}>
                <Polyline points={pts} fill="none" stroke={Colors.primary} strokeWidth={2.5} />
              </Svg>
            );
          })()}
        </View>

        {/* WHAT YOU OWN — one row per asset class; tapping jumps to those accounts */}
        <Text style={styles.ownHdr}>WHAT YOU OWN   {maskedMoney(Math.round(totalAssets))}</Text>
        <View style={styles.card}>
          {classRows.length === 0 && <Text style={styles.empty}>Nothing yet — use the button below to add or import.</Text>}
          {classRows.map((r, i) => {
            const members = assets.filter((a) => assetClassOf(a) === r.key);
            const shownMembers = showAllClassRows[r.key] ? members : members.slice(0, 5);
            return (
              <View key={r.key} style={i > 0 ? styles.divider : undefined}>
                <View style={styles.row} accessible
                  accessibilityLabel={`${r.label}, ${maskedMoney(Math.round(r.total))}${r.key === 'mixed' ? '. Tap an account to say what is inside.' : ''}`}>
                  <View style={[styles.dot, { backgroundColor: r.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{r.label}</Text>
                    {r.key === 'mixed' && <Text style={styles.rowSub}>tap an account to say what's inside</Text>}
                  </View>
                  <Text style={styles.rowVal}>{maskedMoney(Math.round(r.total))}</Text>
                </View>
                {shownMembers.map((a) => (
                  <TouchableOpacity accessibilityRole="button" key={a.asset_id} style={styles.acctRowNW}
                    onPress={() => router.push(`/account-detail?id=${a.asset_id}` as any)}
                    accessibilityLabel={`${a.institution?.trim() ? `${a.institution.trim()} ${a.label}` : a.label}, ${maskedMoney(Math.round(a.balance || 0))}. Opens its page.`}>
                    <Text style={styles.acctRowLabel} numberOfLines={1}>{a.institution?.trim() ? `${a.institution.trim()} ${a.label}` : a.label}</Text>
                    <Text style={styles.acctRowVal}>{maskedMoney(Math.round(a.balance || 0))}</Text>
                    <Text style={styles.acctChev}>›</Text>
                  </TouchableOpacity>
                ))}
                {members.length > 5 && !showAllClassRows[r.key] && (
                  <TouchableOpacity accessibilityRole="button" onPress={() => setShowAllClassRows((m) => ({ ...m, [r.key]: true }))}
                    accessibilityLabel={`Show all ${members.length} ${r.label} accounts`}>
                    <Text style={styles.acctMore}>all {members.length} ›</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* WHAT YOU OWE — minus numbers, the word carries the meaning */}
        <Text style={styles.ownHdr}>WHAT YOU OWE{dState.total_debt_balance > 0 ? `   −${maskedMoney(Math.round(dState.total_debt_balance))}` : ''}</Text>
        <View style={styles.card}>
          {liabilities.length === 0 && <Text style={styles.empty}>No debts — it's all yours.</Text>}
          {liabilities.map((d, i) => (
            <TouchableOpacity key={d.debt_id} style={[styles.row, i > 0 && styles.divider]} accessibilityRole="button"
              accessibilityLabel={`${d.label}, you owe ${maskedMoney(Math.round(d.remaining_balance))}. Opens the editor.`}
              onPress={() => setDebtSheet({ open: true, edit: d })}>
              <Text style={styles.rowIcon}>{debtKind(d.debt_type)?.icon ?? '🧾'}</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.rowTitle}>{d.label}</Text>
                {costliest?.debt_id === d.debt_id && <View style={styles.hotPill}><Text style={styles.hotPillTxt}>pay first</Text></View>}
              </View>
              <Text style={[styles.rowVal, { color: Colors.red }]}>−{maskedMoney(Math.round(d.remaining_balance))}</Text>
              <Text style={styles.chev}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* the arithmetic, spelled out — the headline is never a mystery number */}
        <Text style={styles.nwIdentity}>
          Own {maskedMoney(Math.round(totalAssets))} − Owe {maskedMoney(Math.round(dState.total_debt_balance))} ={' '}
          <Text style={{ fontWeight: '800', color: nw.net_worth < 0 ? Colors.red : Colors.textPrimary }}>Net worth {maskedMoney(Math.round(nw.net_worth))}</Text>
        </Text>


        {/* this month's cash flow — the tiny glance; movement lives on the Cash flow tab */}
        <TouchableOpacity accessibilityRole="button" style={styles.cfGlance} onPress={() => router.push('/(tabs)/cashflow')}
          accessibilityLabel={`This month's cash flow: in ${maskedMoney(Math.round(cfCell?.inflow ?? 0))}, out ${maskedMoney(Math.round(cfCell?.outflow ?? 0))}. Opens the Cash flow tab.`}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>This month's cash flow</Text>
            <Text style={styles.rowSub}>In {maskedMoney(Math.round(cfCell?.inflow ?? 0))} · Out {maskedMoney(Math.round(cfCell?.outflow ?? 0))}</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </TouchableOpacity>

        {/* ONE button, three honest paths */}
        <TouchableOpacity accessibilityRole="button" style={styles.addConnect} onPress={() => setAddChooser(true)}
          accessibilityLabel="Add or connect an account">
          <Text style={styles.addConnectTxt}>＋ Add or connect account</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
      {body}
      <AssetSheet state={assetSheet} onClose={() => setAssetSheet({ open: false })} />
      <DebtSheet state={debtSheet} onClose={() => setDebtSheet({ open: false })} />

      {/* add-or-connect: three honest paths — manual and file import stay first-class forever */}
      <Modal visible={addChooser} transparent animationType="slide" onRequestClose={() => setAddChooser(false)}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" style={styles.chooserBackdrop} activeOpacity={1} onPress={() => setAddChooser(false)}>
          <View style={styles.chooserCard} onStartShouldSetResponder={() => true}>
            <View style={styles.chooserGrip} />
            <TouchableOpacity accessibilityRole="button" style={styles.chooserRow} onPress={() => { setAddChooser(false); router.push('/connect' as any); }}
              accessibilityLabel="Link it, read-only. We can look, never touch your money.">
              <Text style={styles.chooserTitle}>🔗  Link it (read-only)</Text>
              <Text style={styles.chooserSub}>We can look, never touch your money.</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.chooserRow} onPress={() => { setAddChooser(false); router.push('/add-account' as any); }}
              accessibilityLabel="Add by hand">
              <Text style={styles.chooserTitle}>✍️  Add by hand</Text>
              <Text style={styles.chooserSub}>Your home, savings, or any account with no login.</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.chooserRow} onPress={() => { setAddChooser(false); router.push('/import-holdings'); }}
              accessibilityLabel="Import from a file">
              <Text style={styles.chooserTitle}>📄  Import from a file</Text>
              <Text style={styles.chooserSub}>The CSV export from your brokerage.</Text>
            </TouchableOpacity>
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
  { key: 'trad_ira', label: 'Trad. IRA' }, { key: 'roth', label: 'Roth IRA' }, { key: 'hsa', label: 'HSA' },
];
const RET_OPTS: { key: AddWrapper; label: string }[] = WRAPPER_OPTS.filter((w) => w.key !== 'taxable');
const CASH_OPTS = ['checking', 'savings', 'hysa', 'money_market', 'cd', 'cash_mgmt'];
const ALT_OPTS = ['crypto', 'private_equity', 'hedge_funds', 'commodities', 'annuities', 'options'];
const PROP_OPTS = ['vehicle', 'other_asset'];
const INSIDE_OPTS: { key: AssetClass | 'mixed'; label: string }[] = [
  { key: 'mixed', label: 'Mixed / not sure' }, { key: 'stocks_etf', label: 'Stocks / ETFs' }, { key: 'bonds', label: 'Bonds' }, { key: 'cash', label: 'Cash' },
];

function AssetSheet({ state, onClose }: { state: { open: boolean; section?: string; edit?: AssetAccount }; onClose: () => void }) {
  const store = useStore() as any;
  const router = useRouter();
  const editing = state.edit;
  const [step, setStep] = useState<AddStep>('pick');
  const [sub, setSub] = useState('');                              // cash kind / alt kind / property kind
  const [wrapper, setWrapper] = useState<AddWrapper>('taxable');
  const [inside, setInside] = useState<AssetClass | 'mixed'>('mixed');
  const [maturity, setMaturity] = useState(''); const [inst, setInst] = useState(''); const [bal, setBal] = useState('');

  useEffect(() => {
    if (!state.open) return;
    setSub(''); setWrapper('taxable'); setMaturity('');
    if (editing) {
      setStep('edit'); setInst(editing.institution ?? ''); setBal(String(editing.balance));
      setInside((editing.asset_class as AssetClass) ?? 'mixed');
    } else {
      // NW-12: a section's "+ Add" jumps straight to that section's form (the cash/retirement forms have a
      // "‹ Back" to the full picker). Investments & Property hold a mix → start at the class picker.
      const initial: AddStep = state.section === 'Cash' ? 'cash' : state.section === 'Retirement' ? 'retirement' : 'pick';
      if (initial === 'cash') setSub('checking'); else if (initial === 'retirement') setWrapper('401k');
      setStep(initial); setInside('mixed'); setInst(''); setBal('');
    }
  }, [state.open]);

  const v = num(bal);
  const choose = (key: AddStep) => {
    if (key === 'cash') setSub('checking'); else if (key === 'alts') setSub('crypto');
    else if (key === 'property') setSub('vehicle'); else if (key === 'retirement') setWrapper('401k');
    setStep(key);
  };
  const lbl = (fallback: string) => inst.trim() || fallback;
  const save = () => {
    let patch: Partial<AssetAccount> = { institution: inst.trim(), balance: v };
    if (step === 'cash') {
      const cls: AssetClass = sub === 'cd' ? maturityClass(maturity || undefined) : 'cash';
      patch = { ...patch, asset_class: cls, kind: cls === 'bonds' ? 'fixed_income' : sub, tax_bucket: cls === 'bonds' ? 'TAXABLE' : 'CASH', maturity_date: maturity || undefined, label: lbl(assetKind(sub)?.label ?? 'Cash') };
    } else if (step === 'stocks' || step === 'bonds') {
      const wa = wrapperAccount(wrapper);
      patch = { ...patch, asset_class: step === 'stocks' ? 'stocks_etf' : 'bonds', kind: wa.kind, tax_bucket: wa.tax_bucket, label: lbl(step === 'stocks' ? 'Stocks / ETFs' : 'Bonds') };
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
      patch = { ...patch, asset_class: 'mixed', kind: 'brokerage', tax_bucket: 'TAXABLE', label: inst.trim() || 'Account' };   // Unclassified — user sorts it later
    } else if (step === 'edit' && editing) {
      store.updateAsset?.(editing.asset_id, { institution: inst.trim(), balance: v, asset_class: inside === 'mixed' ? undefined : inside });
      onClose(); return;
    }
    store.addAsset?.(patch); onClose();
  };
  const remove = () => { if (editing) store.deleteAsset?.(editing.asset_id); onClose(); };
  const TITLES: Record<AddStep, string> = { pick: 'Add to net worth', cash: 'Cash & equivalents', stocks: 'Stocks / ETFs', bonds: 'Bonds', alts: 'Alternatives', realestate: 'Real estate', property: 'Personal property', retirement: 'Retirement account', brokerage: 'Brokerage account', quick: 'Quick add', edit: 'Edit account' };
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
            {sub === 'cd' && <TextInput style={sh.input} placeholder="Matures YYYY-MM ( < 1yr = cash · ≥ 1yr = bond )" placeholderTextColor={Colors.textTertiary} value={maturity} onChangeText={setMaturity} />}
          </>)}
          {step === 'alts' && <Chips ids={ALT_OPTS} />}
          {step === 'property' && <Chips ids={PROP_OPTS} />}
          {(step === 'stocks' || step === 'bonds' || step === 'alts') && (<>
            <Text style={sh.clsLabel}>Held in</Text><Wrappers opts={WRAPPER_OPTS} />
            <Text style={sh.note}>{step === 'bonds' ? 'Enter a total value below — or track each bond (coupon, maturity) on the Bonds screen.' : step === 'stocks' ? 'Enter a total value below — or track specific tickers (shares, cost) on the Stocks / ETFs screen.' : 'Enter a total value below — or track each holding on the Alternatives screen. Crypto, PE, hedge funds, commodities, annuities, options.'}</Text>
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
            <Text style={sh.clsLabel}>What's it invested in?</Text>
            <View style={sh.chips}>{INSIDE_OPTS.map((o) => (
              <TouchableOpacity key={o.key} accessibilityRole="button" accessibilityLabel={o.label} style={[sh.chip, inside === o.key && sh.chipOn]} onPress={() => setInside(o.key)}><Text style={sh.chipTxt}>{o.label}</Text></TouchableOpacity>
            ))}</View>
            {/* Mock B: break a lump into its real holdings (the donut then splits it accurately) */}
            <TouchableOpacity style={sh.itemize} accessibilityRole="button" accessibilityLabel="Itemize this account into holdings" onPress={() => { onClose(); router.push(`/itemize?accountId=${editing!.asset_id}`); }}>
              <Text style={sh.itemizeT}>🧩  Itemize into holdings →</Text>
              <Text style={sh.itemizeSub}>Break this into specific stocks, bonds, options…</Text>
            </TouchableOpacity>
          </>)}
          <TextInput style={sh.input} placeholder={step === 'quick' ? 'Name (e.g. My Robinhood)' : 'Institution / name (e.g. Chase)'} placeholderTextColor={Colors.textTertiary} value={inst} onChangeText={setInst} />
          <View style={sh.amtRow}><Text style={sh.amtPre}>{currencySymbol()}</Text><TextInput style={sh.amtIn} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} value={bal} onChangeText={setBal} /></View>
          <TouchableOpacity style={sh.save} accessibilityRole="button" accessibilityLabel={editing ? 'Save account' : 'Add account'} onPress={save}><Text style={sh.saveTxt}>{editing ? 'Save' : 'Add'} {v > 0 ? maskedMoney(v) : ''}</Text></TouchableOpacity>
          {editing && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove account" onPress={remove}><Text style={sh.remove}>Remove</Text></TouchableOpacity>}
        </>
      )}
    </KeyboardAwareSheet>
  );
}

// ── debt add/edit sheet ───────────────────────────────────────────────────────
function DebtSheet({ state, onClose }: { state: { open: boolean; edit?: Debt }; onClose: () => void }) {
  const store = useStore() as any;
  const editing = state.edit;
  const [kind, setKind] = useState<DebtType>('CREDIT_CARD'); const [inst, setInst] = useState('');
  const [bal, setBal] = useState(''); const [apr, setApr] = useState(''); const [pay, setPay] = useState('');
  const [due, setDue] = useState(''); const [monthly, setMonthly] = useState('');

  useEffect(() => {
    if (!state.open) return;
    setKind((editing?.debt_type as DebtType) ?? 'CREDIT_CARD'); setInst(editing?.institution ?? '');
    setBal(editing ? String(editing.remaining_balance) : ''); setApr(editing ? String(editing.interest_rate_apr * 100) : '');
    setPay(editing ? String(editing.minimum_monthly_payment) : '');
    setDue(editing?.due_day ? String(editing.due_day) : ''); setMonthly(editing?.monthly_payment ? String(editing.monthly_payment) : '');
  }, [state.open]);

  const amt = num(bal);
  const ready = amt > 0;
  const save = () => {
    if (!ready) return;
    const label = inst.trim() || debtKind(kind)?.label || 'Debt';
    const dd = Math.min(31, Math.max(0, Math.round(num(due)))) || undefined;
    const patch = { label, institution: inst.trim(), debt_type: kind, remaining_balance: amt, interest_rate_apr: num(apr) / 100, minimum_monthly_payment: num(pay), monthly_payment: monthly.trim() === '' ? undefined : (num(monthly) || num(pay)), due_day: dd };
    if (editing) store.updateLiability?.(editing.debt_id, patch); else store.addLiability?.(patch);
    onClose();
  };
  const remove = () => { if (editing) store.deleteLiability?.(editing.debt_id); onClose(); };

  return (
    <KeyboardAwareSheet open={state.open} onClose={onClose} title={editing ? 'Edit debt' : 'Add debt'}>
      <View style={sh.chips}>
        {DEBT_KINDS.map((ko) => (
          <TouchableOpacity key={ko.id} style={[sh.chip, kind === ko.id && sh.chipOn]} accessibilityRole="button" accessibilityState={{ selected: kind === ko.id }} accessibilityLabel={ko.label} onPress={() => setKind(ko.id)}>
            <Text style={sh.chipTxt}>{ko.icon} {ko.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={sh.input} placeholder="Lender / name (e.g. Chase Sapphire)" placeholderTextColor={Colors.textTertiary} value={inst} onChangeText={setInst} />
      <View style={sh.amtRow}><Text style={sh.amtPre}>{currencySymbol()}</Text><TextInput style={sh.amtIn} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} value={bal} onChangeText={setBal} /></View>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <View style={{ flex: 1 }}><Text style={sh.lbl}>Interest rate %</Text><TextInput style={sh.input} keyboardType="decimal-pad" placeholder="6.5" placeholderTextColor={Colors.textTertiary} value={apr} onChangeText={setApr} /></View>
        <View style={{ flex: 1 }}><Text style={sh.lbl}>Due day</Text><TextInput style={sh.input} keyboardType="number-pad" placeholder="1–31" placeholderTextColor={Colors.textTertiary} value={due} onChangeText={setDue} /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <View style={{ flex: 1 }}><Text style={sh.lbl}>Min payment /mo</Text><TextInput style={sh.input} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={Colors.textTertiary} value={pay} onChangeText={setPay} /></View>
        <View style={{ flex: 1 }}><Text style={sh.lbl}>You pay /mo</Text><TextInput style={sh.input} keyboardType="decimal-pad" placeholder="≥ min" placeholderTextColor={Colors.textTertiary} value={monthly} onChangeText={setMonthly} /></View>
      </View>
      <TouchableOpacity style={[sh.save, !ready && { opacity: 0.4 }]} disabled={!ready} accessibilityRole="button" accessibilityLabel={editing ? 'Save debt' : 'Add debt'} onPress={save}><Text style={sh.saveTxt}>{editing ? 'Save' : 'Add'} debt</Text></TouchableOpacity>
      {editing && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove debt" onPress={remove}><Text style={sh.remove}>Remove</Text></TouchableOpacity>}
    </KeyboardAwareSheet>
  );
}

// (the local Sheet was replaced by the shared, keyboard-aware <KeyboardAwareSheet/> — Theme 3)

const styles = StyleSheet.create({
  // FCC glance-that-expands
  glanceCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center' },
  glanceKickerNW: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 2 },
  acctRowNW: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 26, paddingRight: 2, paddingVertical: 8, minHeight: 40 },
  acctRowLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  acctRowVal: { fontSize: 14, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
  acctChev: { fontSize: 15, color: Colors.textTertiary },
  acctMore: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark, paddingLeft: 26, paddingVertical: 6 },
  glanceVal: { fontSize: 36, fontWeight: '800', color: Colors.textPrimary },
  glanceDelta: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  glanceLink: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 10, minHeight: 32 },
  ownHdr: { fontSize: 12, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: 6 },
  chev: { fontSize: 18, color: Colors.textTertiary, marginLeft: 6 },
  expandBtn: { minHeight: 46, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.sm },
  expandTxt: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  cfGlance: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  addConnect: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  addConnectTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  chooserBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  chooserCard: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 34 },
  chooserGrip: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  chooserRow: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: 8, minHeight: 64, justifyContent: 'center' },
  chooserTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  chooserSoon: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary },
  chooserSub: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 2 },
  content: { padding: Spacing.lg },
  nwHero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md },
  donutVal: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  donutLbl: { fontSize: 11, color: Colors.textSecondary, marginTop: -2 },
  nwIdentity: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 2 },
  nwInvestable: { fontSize: 11.5, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center', marginBottom: 4 },
  nwCaption: { fontSize: 11, color: Colors.textSecondary, textAlign: 'left', marginBottom: 4, lineHeight: 15 },
  nwNudge: { fontSize: 11, color: Colors.amber, textAlign: 'left', marginBottom: 6, lineHeight: 15 },
  nwLegend: { flex: 1, gap: 7 },
  lgRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  lgName: { flex: 1, fontSize: 13, fontWeight: '600' },
  lgVal: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, minWidth: 56, textAlign: 'right' },
  lgPct: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary, width: 34, textAlign: 'right' },
  runway: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  runwayIcon: { fontSize: 22 },
  runwayTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  runwaySub: { fontSize: 11.5, color: Colors.textSecondary, marginTop: 1 },
  runwayLink: { fontSize: 12, fontWeight: '800', color: Colors.primary, marginTop: 6 },
  perfBtnArrow: { fontSize: 22, color: Colors.textTertiary, fontWeight: '400' },
  exploreCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingBottom: 4 },
  exploreHdr: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.4, marginTop: Spacing.sm, marginBottom: 2 },
  exploreRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  exploreRowT: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  exploreDiv: { height: 1, backgroundColor: Colors.bgTertiary },
  insight: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  insightIcon: { fontSize: 15, lineHeight: 20 },
  insightTxt: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark, lineHeight: 20 },
  insightSub: { fontSize: 12, color: Colors.primaryDark, opacity: 0.85, marginTop: 2 },
  hero: { backgroundColor: Colors.primaryDark, borderRadius: Radii.lg, padding: Spacing.lg },
  heroLabel: { color: Colors.onDeepTint, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  heroValue: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  heroSub: { color: Colors.onDeepTint, fontSize: 12, marginTop: 6 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 6 },
  allocBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: Colors.bgTertiary },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  lg: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  lgTxt: { fontSize: 11, color: Colors.textSecondary },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, marginBottom: 2 },
  secTitle: { fontSize: 12, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5 },
  add: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  invToggle: { flexDirection: 'row', backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, padding: 3, marginTop: 6, alignSelf: 'flex-start' },
  invTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radii.sm },
  invTabOn: { backgroundColor: Colors.cardBg },
  invTabTxt: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  invTabTxtOn: { color: Colors.primary, fontWeight: '800' },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 2, paddingHorizontal: 2 },
  groupName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  groupVal: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  classMix: { fontSize: 11.5, fontWeight: '600', color: Colors.textSecondary, marginTop: 1, marginBottom: 1, paddingHorizontal: 2 },
  empty: { fontSize: 13, color: Colors.primary, fontWeight: '600', paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 9 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  rowSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1, fontWeight: '600' },
  rowVal: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  chArrow: { fontSize: 11, fontWeight: '800' },
  chDelta: { fontSize: 12, fontWeight: '700', marginTop: 1 },
  hotPill: { backgroundColor: Colors.redLight, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  // P0 (design audit NW-1): the one actionable debt recommendation — never 9pt
  hotPillTxt: { fontSize: 11, fontWeight: '800', color: Colors.red },
  intro: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  introEmoji: { fontSize: 48, textAlign: 'center', marginBottom: Spacing.sm },
  introTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  introSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: Spacing.lg, lineHeight: 21 },
  introPrimary: { backgroundColor: Colors.primary, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.sm },
  introPrimaryTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  introBtnSub: { color: Colors.primaryLight, fontSize: 12, marginTop: 2 },
  introSecondary: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  introSecondaryTxt: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  introBtnSub2: { color: Colors.textTertiary, fontSize: 12, marginTop: 2 },
  introNote: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.md },
  wizStep: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary },
  wizTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  wizSub: { fontSize: 13, color: Colors.primaryDark, marginTop: 4, marginBottom: Spacing.sm },
  wizTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, paddingHorizontal: 4 },
  wizTotalL: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  wizTotalV: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  footer: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, paddingBottom: 28, backgroundColor: Colors.bgSecondary, borderTopWidth: 1, borderTopColor: Colors.border },
  btnSec: { paddingHorizontal: 18, paddingVertical: Spacing.md, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  btnSecTxt: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  btnPri: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  btnPriTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  callout: { flexDirection: 'row', gap: 8, backgroundColor: Colors.redLight, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.md },
  calloutIcon: { fontSize: 15, lineHeight: 20 },
  calloutTxt: { fontSize: 14, fontWeight: '700', color: Colors.red, lineHeight: 20 },
  calloutSub: { fontSize: 12, color: Colors.red, opacity: 0.85, marginTop: 2 },
});

const sh = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  card: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 32 },
  grip: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  chip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  clsLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, alignSelf: 'flex-start', marginTop: 4, marginBottom: 8 },
  input: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.md, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.sm },
  lbl: { fontSize: 12, color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: 2 },
  amtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  amtPre: { fontSize: 26, fontWeight: '800', color: Colors.textSecondary },
  amtIn: { fontSize: 38, fontWeight: '800', color: Colors.textPrimary, minWidth: 80, textAlign: 'center', padding: 0 },
  save: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  remove: { color: Colors.red, fontWeight: '700', textAlign: 'center', paddingVertical: Spacing.md },
  pickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickTxt: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  pickArrow: { fontSize: 20, color: Colors.textTertiary },
  pickHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: 16, marginBottom: 2 },
  quickRow: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: Radii.md, backgroundColor: Colors.primaryLight, marginBottom: 4 },
  quickTxt: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  backLink: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
  note: { fontSize: 11.5, color: Colors.textSecondary, marginTop: 8, lineHeight: 16 },
  specifics: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 10, paddingVertical: 4 },
  itemize: { backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.md },
  itemizeT: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  itemizeSub: { fontSize: 12, color: Colors.primaryDark, marginTop: 2 },
});
