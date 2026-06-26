// Net Worth = Assets − Debts. Also the capture surface: every bucket is a section you fill in
// (per-account, with institution), so it works as both first-run setup and ongoing management.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { moneyCompact, currencySymbol } from '../domain/_shared/money';
import { buildAssetsState, ASSET_KINDS, ASSET_SECTIONS, assetKind, assetClassOf, cashTotal, AssetAccount, TaxBucket, assetAllocation, ASSET_CLASS_LABEL, type AssetClass } from '../domain/assets';
import { buildDebtState, DEBT_KINDS, debtKind, TOXIC_APR, Debt, DebtType } from '../domain/debt';
import { buildNetWorth } from '../domain/networth';
import { plannedMonthlySpend } from '../domain/budget';
import { KeyboardAwareSheet } from '../components/KeyboardAwareSheet';   // Theme 3: shared keyboard-safe sheet

const SECTION_COLOR: Record<string, string> = { Cash: '#178F6B', Investments: '#7A5AA7', Retirement: '#185FA5', Property: '#EBB23A' };
// #19: the donut groups assets by ASSET CLASS (the taxonomy), not the old section/wrapper axis.
// Labels come from the canonical ASSET_CLASS_LABEL (single source) — only color lives here.
// #10: 'mixed' = a 401(k)/IRA/brokerage we don't know the holdings of — shown honestly, NOT as stocks.
const CLASS_META: { key: AssetClass; label: string; color: string }[] = ([
  ['cash', '#178F6B'], ['stocks_etf', '#7A5AA7'], ['bonds', '#185FA5'], ['alternatives', '#C77DBB'],
  ['real_estate', '#EBB23A'], ['personal_property', '#9E9E9E'], ['mixed', '#B0846A'],
] as [AssetClass, string][]).map(([key, color]) => ({ key, label: ASSET_CLASS_LABEL[key], color }));
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
const bucketSection = (b: TaxBucket) => (b === 'CASH' ? 'Cash' : b === 'PROPERTY' ? 'Property' : b === 'TAXABLE' ? 'Investments' : 'Retirement');
const sectionOf = (a: AssetAccount) => assetKind(a.kind)?.section ?? bucketSection(a.tax_bucket);
const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
// B-21: an asset can be saved at $0 (placeholder), but the amount field must be filled in — a typed
// "0" is allowed, a blank field is not (prevents accidental empty adds). A kind must also be picked.
export const assetSheetReady = (kind: string, bal: string) => !!kind && bal.trim() !== '' && num(bal) >= 0;
const shortMoney = (n: number) => {
  if (Math.abs(n) >= 1000) return moneyCompact(n, 'MM');   // $2.43MM / $182K (currency-aware)
  return money(n);
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

  const sectionTotals = ASSET_SECTIONS.map((sec) => ({ sec, total: assets.filter((a) => sectionOf(a) === sec).reduce((t, a) => t + a.balance, 0) }));
  const alloc = assetAllocation(assets);   // #19: assets grouped by ASSET CLASS (the taxonomy)
  const classRows = CLASS_META.map((m) => ({ ...m, total: alloc[m.key] })).filter((r) => r.total > 0);
  const costliest = dState.highest_rate_debt && dState.highest_rate_debt.interest_rate_apr > TOXIC_APR ? dState.highest_rate_debt : null;
  const totalAssets = aState.total_asset_value;
  const topCat = [...sectionTotals].filter((s) => s.total > 0).sort((a, b) => b.total - a.total)[0];
  const debtRatio = totalAssets > 0 ? dState.total_debt_balance / totalAssets : 0;
  const pctOf = (v: number) => (totalAssets > 0 ? Math.round((v / totalAssets) * 100) : 0);

  // ── shared section renderers (used by both the manager and the guided wizard) ──
  const curYm = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const assetRow = (a: AssetAccount, i: number, title: string, sub: string) => {
    const ch = a.change_month === curYm ? (a.change_amount ?? 0) : 0;
    const up = ch > 0;
    return (
      <TouchableOpacity key={a.asset_id} style={[styles.row, i > 0 && styles.divider]} onPress={() => setAssetSheet({ open: true, edit: a })}>
        <Text style={styles.rowIcon}>{assetKind(a.kind)?.icon ?? '💼'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            {ch !== 0 && <Text style={[styles.chArrow, { color: up ? Colors.primary : Colors.red }]}>{up ? '▲' : '▼'}</Text>}
            <Text style={styles.rowVal}>{money(a.balance)}</Text>
          </View>
          {ch !== 0 && <Text style={[styles.chDelta, { color: up ? Colors.primary : Colors.red }]}>{up ? '+' : '−'}{money(Math.abs(ch))} this mo</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderAssetSection = (sec: string) => {
    const rows = assets.filter((a) => sectionOf(a) === sec);
    const total = rows.reduce((t, a) => t + a.balance, 0);
    const head = (
      <View style={styles.secHead}>
        <Text style={styles.secTitle}>{SECTION_ICON[sec]}  {secLabel(sec).toUpperCase()}{total > 0 ? ` · ${money(total)}` : ''}</Text>
        <TouchableOpacity onPress={() => setAssetSheet({ open: true, section: sec })}><Text style={styles.add}>+ Add</Text></TouchableOpacity>
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
              <TouchableOpacity key={g} style={[styles.invTab, invGroup === g && styles.invTabOn]} onPress={() => setInvGroup(g)}>
                <Text style={[styles.invTabTxt, invGroup === g && styles.invTabTxtOn]}>{g === 'type' ? 'By class' : 'By institution'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {Object.entries(groups).map(([g, items]) => (
            <View key={g}>
              <View style={styles.groupHead}><Text style={styles.groupName}>{g}</Text><Text style={styles.groupVal}>{money(items.reduce((t, a) => t + a.balance, 0))}</Text></View>
              <View style={styles.card}>
                {items.map((a, i) => assetRow(a, i,
                  a.label,
                  withTickers(a, invGroup === 'type' ? (a.institution?.trim() || '') : classLabel(a))))}
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
            ? <TouchableOpacity onPress={() => setAssetSheet({ open: true, section: sec })}><Text style={styles.empty}>Add a {sec.toLowerCase()} account →</Text></TouchableOpacity>
            : rows.map((a, i) => assetRow(a, i, a.label, `${assetKind(a.kind)?.label ?? a.tax_bucket}${a.institution ? ` · ${a.institution}` : ''}`))}
        </View>
      </View>
    );
  };

  const renderDebtSection = () => (
    <View>
      <View style={styles.secHead}>
        <Text style={styles.secTitle}>💳  DEBTS{dState.total_debt_balance > 0 ? ` · ${money(dState.total_debt_balance)}` : ''}</Text>
        <TouchableOpacity onPress={() => setDebtSheet({ open: true })}><Text style={styles.add}>+ Add</Text></TouchableOpacity>
      </View>
      <View style={styles.card}>
        {liabilities.length === 0
          ? <TouchableOpacity onPress={() => setDebtSheet({ open: true })}><Text style={styles.empty}>Add a debt →</Text></TouchableOpacity>
          : (<>
            {liabilities.map((d, i) => {
              const hot = d.interest_rate_apr > TOXIC_APR;
              return (
                <TouchableOpacity key={d.debt_id} style={[styles.row, i > 0 && styles.divider]} onPress={() => setDebtSheet({ open: true, edit: d })}>
                  <Text style={styles.rowIcon}>{debtKind(d.debt_type)?.icon ?? '🧾'}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.rowTitle}>{d.label}</Text>
                      {costliest?.debt_id === d.debt_id && <View style={styles.hotPill}><Text style={styles.hotPillTxt}>pay first</Text></View>}
                    </View>
                    <Text style={[styles.rowSub, hot && { color: Colors.red }]}>{(d.interest_rate_apr * 100).toFixed(1)}% APR · {money(d.minimum_monthly_payment)}/mo</Text>
                  </View>
                  <Text style={styles.rowVal}>{money(d.remaining_balance)}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={[styles.row, styles.divider]}><Text style={[styles.rowSub, { flex: 1 }]}>Monthly debt payments</Text><Text style={styles.rowVal}>{money(dState.total_monthly_debt_service)}/mo</Text></View>
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
          <View style={styles.wizTotal}><Text style={styles.wizTotalL}>Net worth so far</Text><Text style={styles.wizTotalV}>{money(nw.net_worth)}</Text></View>
          <Text style={styles.nwIdentity}>
            Assets {money(Math.round(totalAssets))} − Debts {money(Math.round(dState.total_debt_balance))} ={' '}
            <Text style={{ fontWeight: '800', color: nw.net_worth < 0 ? Colors.red : Colors.textPrimary }}>Net worth {money(Math.round(nw.net_worth))}</Text>
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
    // ── manager (self-serve / ongoing) ──
    body = (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* hero: donut of assets BY ASSET CLASS (#19) + net worth (red if negative, #18) in center */}
        <View style={styles.nwHero}>
          <Donut size={118} stroke={15} segments={classRows.map((r) => ({ value: r.total, color: r.color }))}
            label={store.hideBalances ? 'Net worth hidden' : `Net worth ${shortMoney(nw.net_worth)}. By asset class: ${classRows.map((r) => `${r.label} ${pctOf(r.total)} percent`).join(', ') || 'none yet'}.`}>
            <Text style={[styles.donutVal, nw.net_worth < 0 && !store.hideBalances && { color: Colors.red }]}>{store.hideBalances ? '••••' : shortMoney(nw.net_worth)}</Text>
            <Text style={styles.donutLbl}>net worth</Text>
          </Donut>
          <View style={styles.nwLegend}>
            {classRows.map((r) => (
              <View key={r.key} style={styles.lgRow}>
                <View style={[styles.dot, { backgroundColor: r.color }]} />
                <Text style={[styles.lgName, { color: r.color }]} numberOfLines={1}>{r.label}</Text>
                <Text style={styles.lgVal}>{shortMoney(r.total)}</Text>
                <Text style={styles.lgPct}>{pctOf(r.total)}%</Text>
              </View>
            ))}
            {dState.total_debt_balance > 0 && (
              <View style={styles.lgRow}>
                <View style={[styles.dot, { backgroundColor: Colors.red }]} />
                <Text style={[styles.lgName, { color: Colors.red }]} numberOfLines={1}>Debts</Text>
                <Text style={[styles.lgVal, { color: Colors.red }]}>-{shortMoney(dState.total_debt_balance)}</Text>
                <Text style={styles.lgPct} />
              </View>
            )}
          </View>
        </View>
        {/* #19: the explicit total — Assets − Debts = Net worth (so the math is never "missing") */}
        <Text style={styles.nwIdentity}>
          Assets {money(Math.round(totalAssets))} − Debts {money(Math.round(dState.total_debt_balance))} ={' '}
          <Text style={{ fontWeight: '800', color: nw.net_worth < 0 ? Colors.red : Colors.textPrimary }}>Net worth {money(Math.round(nw.net_worth))}</Text>
        </Text>
        {/* caption (#4 transparency rule): what the slices mean, across all account types */}
        <Text style={styles.nwCaption}>You add money by account above; here it's regrouped by asset class — what it actually is (a 401(k) or brokerage splits into the classes it holds).</Text>
        {/* #10: don't pretend a wrapper's contents are stocks — show "Unclassified" and nudge the user to set the mix */}
        {alloc.mixed > 0 && (
          <Text style={styles.nwNudge}>
            {money(Math.round(alloc.mixed))} is in accounts whose holdings aren't set yet — tap an account to choose stocks / bonds / cash for a true allocation.
          </Text>
        )}

        {/* emergency-fund runway */}
        {runwayMonths != null && (
          <View style={[styles.runway, { backgroundColor: runwayMonths >= 6 ? Colors.primaryLight : runwayMonths >= 3 ? '#FFF7E6' : '#FBE9E7' }]}>
            <Text style={styles.runwayIcon}>🛟</Text>
            <View style={{ flex: 1 }}>
              {/* B-44: plain wording for the no-cash case (a "~0.0 months" reads as a glitch and alarms
                  someone with plenty in investments — which this cash-only runway deliberately excludes). */}
              <Text style={styles.runwayTitle}>{runwayMonths < 0.05 ? 'No cash set aside for emergencies' : `Your cash covers ~${runwayMonths.toFixed(1)} month${runwayMonths >= 1.95 || runwayMonths < 1 ? 's' : ''} of spending`}</Text>
              <Text style={styles.runwaySub}>{money(cashOnHand)} cash ÷ {money(monthlySpend)}/mo · {runwayMonths >= 6 ? 'a strong cushion.' : runwayMonths >= 3 ? 'aim for 3–6 months.' : 'build toward 3–6 months (investments aren\'t counted here).'}</Text>
              <TouchableOpacity onPress={() => router.push('/stress-test')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={styles.runwayLink}>Stress-test an emergency →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* explore your holdings — three launchers grouped into one box */}
        <View style={styles.exploreCard}>
          <Text style={styles.exploreHdr}>EXPLORE YOUR HOLDINGS</Text>
          {/* #13: import is a primary action for building your portfolio — surface it here, not buried in Performance */}
          <TouchableOpacity style={styles.exploreRow} onPress={() => router.push('/import-holdings')} accessibilityRole="button" accessibilityLabel="Import holdings from a brokerage file">
            <Text style={styles.exploreRowT}>📄  Import holdings from a brokerage file</Text>
            <Text style={styles.perfBtnArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.exploreDiv} />
          <TouchableOpacity style={styles.exploreRow} onPress={() => router.push('/performance')}>
            <Text style={styles.exploreRowT}>📈  Stocks / ETFs — performance vs benchmark</Text>
            <Text style={styles.perfBtnArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.exploreDiv} />
          <TouchableOpacity style={styles.exploreRow} onPress={() => router.push('/bonds')}>
            <Text style={styles.exploreRowT}>📜  Bonds — coupons, maturity & yield</Text>
            <Text style={styles.perfBtnArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.exploreDiv} />
          <TouchableOpacity style={styles.exploreRow} onPress={() => router.push('/other-investments')}>
            <Text style={styles.exploreRowT}>🪙  Alternatives — crypto, PE, commodities</Text>
            <Text style={styles.perfBtnArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* insight */}
        {totalAssets > 0 && (
          <View style={styles.insight}>
            <Text style={styles.insightIcon}>💎</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightTxt}>{topCat ? `${secLabel(topCat.sec)} is your largest holding — ${pctOf(topCat.total)}% of total assets` : 'Your wealth at a glance'}</Text>
              <Text style={styles.insightSub}>{dState.total_debt_balance > 0 ? `Debt is ${Math.round(debtRatio * 100)}% of your assets.` : 'You carry no debt — it\'s all yours.'}</Text>
            </View>
          </View>
        )}

        {ASSET_SECTIONS.map(renderAssetSection)}
        {renderDebtSection()}
        {costliest && (
          <View style={styles.callout}>
            <Text style={styles.calloutIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.calloutTxt}>{money(costliest.remaining_balance)} on {costliest.label} at {(costliest.interest_rate_apr * 100).toFixed(1)}% is your costliest debt</Text>
              <Text style={styles.calloutSub}>Paying it down first saves the most interest.</Text>
            </View>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
      {body}
      <AssetSheet state={assetSheet} onClose={() => setAssetSheet({ open: false })} />
      <DebtSheet state={debtSheet} onClose={() => setDebtSheet({ open: false })} />
    </View>
  );
}

// ── asset add/edit sheet ──────────────────────────────────────────────────────
function AssetSheet({ state, onClose }: { state: { open: boolean; section?: string; edit?: AssetAccount }; onClose: () => void }) {
  const store = useStore() as any;
  const editing = state.edit;
  const kindsForSection = state.section ? ASSET_KINDS.filter((k) => k.section === state.section) : ASSET_KINDS;
  const [kind, setKind] = useState(''); const [inst, setInst] = useState(''); const [bal, setBal] = useState('');
  const [cls, setCls] = useState<AssetClass | 'auto'>('auto');   // #10/#14: what a wrapper holds

  useEffect(() => {
    if (!state.open) return;
    setKind(editing?.kind ?? kindsForSection[0]?.id ?? 'brokerage');
    setInst(editing?.institution ?? ''); setBal(editing ? String(editing.balance) : '');
    setCls((editing?.asset_class as AssetClass) ?? 'auto');
  }, [state.open]);

  const k = assetKind(kind);
  const amt = num(bal);
  const ready = assetSheetReady(kind, bal);
  // A wrapper (401k/IRA/brokerage) has no inherent asset class — offer to set what it HOLDS so the
  // donut is accurate (#10) and the user classifies the existing account instead of adding a parallel,
  // double-counting one (#14). Class-specific kinds (cash, a bond, a home) don't need this.
  const isWrapper = !!k && assetClassOf({ kind: k.id, tax_bucket: k.bucket } as AssetAccount) === 'mixed';
  const save = () => {
    if (!ready || !k) return;
    const label = inst.trim() || k.label;
    const patch: Partial<AssetAccount> = { label, institution: inst.trim(), kind: k.id, tax_bucket: k.bucket as TaxBucket, balance: amt, target_return: k.ret };
    patch.asset_class = isWrapper && cls !== 'auto' ? cls : undefined;   // set holdings if chosen; else auto-derive
    if (editing) store.updateAsset?.(editing.asset_id, patch); else store.addAsset?.(patch);
    onClose();
  };
  const remove = () => { if (editing) store.deleteAsset?.(editing.asset_id); onClose(); };

  return (
    <KeyboardAwareSheet open={state.open} onClose={onClose} title={editing ? 'Edit asset' : `Add ${state.section ? secLabel(state.section).toLowerCase() : 'asset'}`}>
      <View style={sh.chips}>
        {kindsForSection.map((ko) => (
          <TouchableOpacity key={ko.id} style={[sh.chip, kind === ko.id && sh.chipOn]} onPress={() => setKind(ko.id)}>
            <Text style={sh.chipTxt}>{ko.icon} {ko.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={sh.input} placeholder="Institution / name (e.g. Chase)" placeholderTextColor={Colors.textTertiary} value={inst} onChangeText={setInst} />
      {isWrapper && (
        <>
          <Text style={sh.clsLabel}>What's it invested in?</Text>
          <View style={sh.chips}>
            {WRAPPER_CLASS_CHOICES.map((c) => (
              <TouchableOpacity key={c.key} style={[sh.chip, cls === c.key && sh.chipOn]} onPress={() => setCls(c.key)}>
                <Text style={sh.chipTxt}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      <View style={sh.amtRow}><Text style={sh.amtPre}>{currencySymbol()}</Text><TextInput style={sh.amtIn} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} value={bal} onChangeText={setBal} /></View>
      <TouchableOpacity style={[sh.save, !ready && { opacity: 0.4 }]} disabled={!ready} onPress={save}><Text style={sh.saveTxt}>{editing ? 'Save' : 'Add'} {amt > 0 ? money(amt) : 'asset'}</Text></TouchableOpacity>
      {editing && <TouchableOpacity onPress={remove}><Text style={sh.remove}>Remove</Text></TouchableOpacity>}
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
    const patch = { label, institution: inst.trim(), debt_type: kind, remaining_balance: amt, interest_rate_apr: num(apr) / 100, minimum_monthly_payment: num(pay), monthly_payment: num(monthly) || num(pay), due_day: dd };
    if (editing) store.updateLiability?.(editing.debt_id, patch); else store.addLiability?.(patch);
    onClose();
  };
  const remove = () => { if (editing) store.deleteLiability?.(editing.debt_id); onClose(); };

  return (
    <KeyboardAwareSheet open={state.open} onClose={onClose} title={editing ? 'Edit debt' : 'Add debt'}>
      <View style={sh.chips}>
        {DEBT_KINDS.map((ko) => (
          <TouchableOpacity key={ko.id} style={[sh.chip, kind === ko.id && sh.chipOn]} onPress={() => setKind(ko.id)}>
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
      <TouchableOpacity style={[sh.save, !ready && { opacity: 0.4 }]} disabled={!ready} onPress={save}><Text style={sh.saveTxt}>{editing ? 'Save' : 'Add'} debt</Text></TouchableOpacity>
      {editing && <TouchableOpacity onPress={remove}><Text style={sh.remove}>Remove</Text></TouchableOpacity>}
    </KeyboardAwareSheet>
  );
}

// (the local Sheet was replaced by the shared, keyboard-aware <KeyboardAwareSheet/> — Theme 3)

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  nwHero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md },
  donutVal: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  donutLbl: { fontSize: 10, color: Colors.textSecondary, marginTop: -2 },
  nwIdentity: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 2 },
  nwCaption: { fontSize: 10.5, color: Colors.textTertiary, textAlign: 'center', marginBottom: 4, lineHeight: 14 },
  nwNudge: { fontSize: 11, color: '#9A6B4F', textAlign: 'center', marginBottom: 6, lineHeight: 15, paddingHorizontal: 8 },
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
  exploreHdr: { fontSize: 9, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4, marginTop: Spacing.sm, marginBottom: 2 },
  exploreRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  exploreRowT: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  exploreDiv: { height: 1, backgroundColor: Colors.bgTertiary },
  insight: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  insightIcon: { fontSize: 15, lineHeight: 20 },
  insightTxt: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark, lineHeight: 20 },
  insightSub: { fontSize: 12, color: Colors.primaryDark, opacity: 0.85, marginTop: 2 },
  hero: { backgroundColor: Colors.primaryDark, borderRadius: Radii.lg, padding: Spacing.lg },
  heroLabel: { color: '#BEE7D8', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  heroValue: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  heroSub: { color: '#BEE7D8', fontSize: 12, marginTop: 6 },
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
  empty: { fontSize: 13, color: Colors.primary, fontWeight: '600', paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 9 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  rowSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1, fontWeight: '600' },
  rowVal: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  chArrow: { fontSize: 11, fontWeight: '800' },
  chDelta: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  hotPill: { backgroundColor: '#FCEBEB', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  hotPillTxt: { fontSize: 9, fontWeight: '800', color: Colors.red },
  intro: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  introEmoji: { fontSize: 48, textAlign: 'center', marginBottom: Spacing.sm },
  introTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  introSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: Spacing.lg, lineHeight: 21 },
  introPrimary: { backgroundColor: Colors.primary, borderRadius: Radii.lg, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.sm },
  introPrimaryTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  introBtnSub: { color: '#E1F5EE', fontSize: 12, marginTop: 2 },
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
  callout: { flexDirection: 'row', gap: 8, backgroundColor: '#FBE9E7', borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.md },
  calloutIcon: { fontSize: 15, lineHeight: 20 },
  calloutTxt: { fontSize: 14, fontWeight: '700', color: Colors.red, lineHeight: 20 },
  calloutSub: { fontSize: 12, color: Colors.red, opacity: 0.85, marginTop: 2 },
});

const sh = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  card: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 32 },
  grip: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
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
});
