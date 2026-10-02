// Portfolio Performance — per-holding actual return vs its SAME-period benchmark (ticker-based, lots).
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, type LayoutChangeEvent, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ValueGraph } from '../components/ValueGraph';
import { DateField } from '../components/DateField';
import { useStore } from '../store/useStore';
import { SectionBand } from '../components/SectionBand';
import { SourceChip } from '../components/SourceChip';
import { DataGapsBanner } from '../components/DataGapsBanner';
import { dataGaps } from '../domain/gaps';
import { thePerformance, categoryEarnings, windowStartKey, pricedGainOf, investmentAccountIdsOf, RATE_STANDS_IN_WORDS } from '../../MoneyKeel/functions/networth-and-performance/performance';
import { personalFlowTotals } from '../../Calculation Module code/engines/ledger';
import { windowBounds } from '../../Calculation Module code/engines/window-return';
import { Dec } from '../../Calculation Module code/engines/decimal';
import { valueOn } from '../../Calculation Module code/engines/snapshots';
import { Colors, Spacing, Radii, Shadows, ClassMarkColors } from '../utils/theme';
import { money, money2 } from '../domain/_shared/num';
import { moneyCompact } from '../domain/_shared/money';
import { ASSET_KINDS, accountAllowsTicker, assetClassOf, ASSET_CLASS_LABEL, investmentsTotal, type AssetAccount, accountDisplayNames, benchmarkReturn } from '../domain/assets';
import { resolveNetWorthRows } from '../domain/snapshot';
import { isBond } from '../domain/bonds';
import { isAlternative } from '../domain/alternatives';
import { valueFreshness } from '../domain/assets';
import { maskedMoney, spokenMoney } from '../components/useMoney';
import { searchTickers } from '../constants/tickers';
import {
  // portfolioPeriodReturn is GONE from this screen (2026-09-30). It was imported and never called:
  // the screen's return has come from the door since B-97 was fixed. It only showed up now because
  // Home stopped calling it too, so the build recategorised it from DISPLAYED to DEPENDENT and the
  // D1 ratchet saw a screen reaching past a door for a figure it does not even use.
  buildPerformance, benchmarkTicker, totalShares, costBasis,
  type Period, type Position, type Lot,
} from '../domain/performance';
import { txnLabel, cashEffect, availableCash, type Transaction, type TxnType } from '../domain/transactions';
// THE CALCULATION MODULE — say plainly when a window reaches further back than our record.
// Founder 2026-08-18: the memory limit was a code comment; nobody using the app was ever told.
import { coverageFor } from '../../Calculation Module code/engines/coverage';
import { EmptyNote } from '../components/UI';
import { ADD_ACCOUNT_DOORS, ADD_ACCOUNT_QUESTION } from '../constants/doors';
import { priceFreshness, isPlausibleTicker } from '../services/marketData';
import { HiddenBalancesBanner } from '../components/HiddenBalancesBanner';
import { modalAnimation } from '../hooks/reducedMotion';
import { BondEditor } from './BondsScreen';
import { AltEditor } from './OtherInvestmentsScreen';
import { isoLocalDate } from '../domain/_shared/dates';
import { rebuiltSentence } from '../../Calculation Module code/engines/rebuild-history';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
// Q49 (founder, 2026-09-09): two decimals on every return — one rounding, at display.
const pct = (v: number | null) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`);
// A holding's TYPE = its instrument class (sets the benchmark) — not an account type (401k/IRA/529/brokerage).
const ACCOUNT_TYPE_IDS = ['brokerage', '401k', 'trad_ira', 'roth_ira', 'hsa', 'college_529', 'checking', 'savings', 'home', 'vehicle'];
const KIND_OPTIONS = ASSET_KINDS.filter((k) => k.section === 'Investments' && !ACCOUNT_TYPE_IDS.includes(k.id));
// types that route to their own editors instead of the ticker form (B46 findings 3+6)
const ALT_ROUTE_KINDS = ['options', 'crypto', 'private_equity', 'hedge_funds', 'commodities', 'annuities'];

export default function PerformanceScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const simple = (store.displayMode ?? 'simple') === 'simple';   // Simple hides technical detail; Advisor shows it
  const accounts: AssetAccount[] = store.assetAccounts ?? [];
  const priceCache = store.priceCache ?? {};
  // mock v14: the screen opens on SINCE — the window our own record actually covers. Build 53
  // opened on the past year and back-solved a beginning for days it never saw (founder screenshot
  // 2026-08-17: "HOW −$448,028 BECAME $362,089").
  const [period, setPeriod] = useState<Period>('SINCE' as any);
  const [openAcctWalk, setOpenAcctWalk] = useState<Record<string, boolean>>({});   // per-account walks (final mock)
  // B46 findings 3+6 router: the non-ticker types open their OWN editors (separate fields)
  const [bondAddOpen, setBondAddOpen] = React.useState(false);
  const [altAddKind, setAltAddKind] = React.useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<{ accountId: string; position: Position } | null>(null);
  const [txnOpen, setTxnOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [addChooser, setAddChooser] = useState(false);   // mock v14 mark 9: the one line opens the three ways to add an account

  // every position across accounts, tagged with its owning account
  const owned = useMemo(() => accounts.flatMap((a) => (a.positions ?? []).map((p) => ({ accountId: a.asset_id, p }))), [accounts]);
  const positions = owned.map((o) => o.p);
  const priceOf = (t: string) => priceCache[t.trim().toUpperCase()];
  // APPROVED invest-v3 FINAL (2026-07-19): purchase dates for the cap — dated lots win; a
  // connected holding's average-cost lot has no date, so the ledger's earliest BUY fills in.
  const earliestBuyByTicker = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of (store.transactions ?? []) as any[]) {
      if (t.type === 'BUY' && t.ticker) {
        const k = String(t.ticker).toUpperCase();
        const d = String(t.date).slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(d) && (!m[k] || d < m[k])) m[k] = d;
      }
    }
    return m;
  }, [store.transactions]);
  const rows = useMemo(
    () => buildPerformance(positions, priceOf, period, new Date(), (p) => earliestBuyByTicker[p.ticker.trim().toUpperCase()] ?? null),
    [owned, priceCache, period, earliestBuyByTicker]);
  const sinceWord = (iso: string) => `since you bought · ${new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  const anyCapped = rows.some((r) => r.cappedSince != null);
  // FINAL mock: every chip shows ITS OWN return — a window with no data shows an em-dash, never a
  // guess. Same rows and function as the headline, just run per period, so chips can't disagree with it.
  // the earliest day we actually have data for — the mock's "Since <date>" chip
  const dataStartLabel = useMemo(() => {
    const keys = Object.keys((store.invDaily ?? {}) as Record<string, number>).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    return keys.length ? new Date(`${keys[0]}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
  }, [store.invDaily]);
  const cashTotal = accounts.reduce((t, a) => t + (a.cash_balance || 0), 0);
  // FCC glance pin: the SAME resolved rows + helper Home's hero uses — the two can never disagree
  const resolvedNwAccounts = resolveNetWorthRows(
    store.user?.uid ?? 'local', store.onboardingProfile, store.nwSeeded ?? false, accounts, store.liabilities ?? [],
  ).accounts;
  const investTotalAll = investmentsTotal(resolvedNwAccounts);
  const investedValue = rows.reduce((t, r) => t + r.marketValue, 0);
  const totalValue = investedValue + cashTotal;
  // WINNERS, LAGGARDS AND THE LIST MODE ARE GONE (2026-09-30). The approved mock v14 removed those
  // sections on 2026-09-25, but the arithmetic behind them stayed: `ranked`, `winners`, `laggards` and
  // a `listMode` selector were still computed on every render and drawn by nothing. Found through his
  // question on DEC-0008 — the decision's own wording cited "the winners and laggards list" as a live
  // example of a dense table, and the list had not existed for five days.
  // capped rows: the dollar is YOUR true gain (value − cost) — same math as unrealized everywhere
  const rowGain = (r: any) => pricedGainOf([r]);                    // the door's own rule, one row at a time
  // ONE definition of a period's start — the walk, the ledger filter and the gap checks all use it.
  // It lives in the door now (MK-NW-F-090), so Home asks the same question of the same window.
  const periodStartKey = (p: string): string =>
    windowStartKey(p, Object.keys((store.invDaily ?? {}) as Record<string, number>), isoLocalDate(new Date()));
  // How far back our record actually reaches, against the window the chosen chip asks for.
  const coverage = useMemo(() => {
    const dates = Object.keys((store.invDaily ?? {}) as Record<string, number>)
      .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).map((date) => ({ date }));
    return coverageFor(dates, periodStartKey(period), isoLocalDate(new Date()));
  }, [store.invDaily, period]);
  const PERIOD_PHRASE: Record<string, string> = { '1M': 'past month', '3M': 'past 3 months', '6M': 'past 6 months', 'YTD': 'this year', '1Y': 'past year', '2Y': 'past 2 years' };
  // FOUND 2026-09-14: tapping "Since <date>" crashed the screen — the phrase table had no entry for it,
  // so the summary title read undefined.toUpperCase(). Every window now has words, the Since one included.
  const phraseFor = (p: string): string => (p === 'SINCE' ? `since ${dataStartLabel ?? 'your records began'}` : PERIOD_PHRASE[p] ?? 'this window');
  const beginLabelFor = (p: string): string => (p === 'SINCE' ? (dataStartLabel ?? 'start') : `${phraseFor(p)} start`);
  // THE FIVE WINDOWS the screen offers (mock v14). "This year" is YTD said in words; 3M and 6M go —
  // Build 53 offered six windows and called YTD "YTD".
  const WINDOWS: { key: string; label: string }[] = [
    { key: 'SINCE', label: dataStartLabel ? `Since ${dataStartLabel}` : 'Since today' },
    { key: '1M', label: '1M' }, { key: 'YTD', label: 'This year' }, { key: '1Y', label: '1Y' }, { key: '2Y', label: '2Y' },
  ];
  // ONE MEANING OF RETURN on this screen (founder, 2026-09-25 — he caught the same disagreement on
  // the account page). It is wealth generated ÷ the money that was working in the window, counting
  // each contribution for the part of the window it was there (Modified Dietz). The old figure came
  // from PRICE CHANGE only, weighted by holding, so it silently disagreed with "Wealth generated"
  // standing beside it, which counts dividends and interest. Same function for the window selector,
  // the summary and the walk, so no two figures on this screen can tell different stories.
  const investIds = useMemo(
    () => investmentAccountIdsOf(resolvedNwAccounts as any, assetClassOf), [resolvedNwAccounts]);
  // ONE DOOR (MK-NW-O-008 thePerformance, Q-PF-1 ruled 2026-09-27: "yes"). This screen worked the
  // whole answer out for itself — the window's records, the flows, the beginning, the walk, the
  // money-weighted return and the yearly-rate rule — while Home printed a return of its own. The
  // four rulings it carries (one meaning of return · the beginning is READ, never back-filled · a
  // rate needs something to stand on · over a year, show both) now live in the door, where a screen
  // cannot lose them.
  const figuresFor = (p: string) => {
    const windowStart = periodStartKey(p);
    const todayKey = isoLocalDate(new Date());
    // what the priced holdings gained: used ONLY to derive a beginning the record cannot reach
    const priced = p === period ? rows : buildPerformance(positions, priceOf, p as Period, new Date(), (q) => earliestBuyByTicker[q.ticker.trim().toUpperCase()]);
    const pricedDollar = pricedGainOf(priced as any);
    const answer = thePerformance({
      windowStart, windowLabel: phraseFor(p), today: todayKey,
      ending: investTotalAll, pricedGain: pricedDollar,
      transactions: (store.transactions ?? []) as any[],
      snapshotDays: (store as any).snapshotDays ?? [],
      investmentAccountIds: investIds,
    });
    return { ...answer, led: answer.ledger, bounds: windowStart ? windowBounds(windowStart, todayKey) : null };
  };
  const windowFigures = useMemo(() => {
    const out: Record<string, ReturnType<typeof figuresFor>> = {};
    for (const w of WINDOWS) out[w.key] = figuresFor(w.key);
    return out;
  }, [store.transactions, store.snapshotDays, investTotalAll, owned, priceCache, period, dataStartLabel]);
  // THE VALUE LINE (mock v14 mark 11). It is read from the daily record — which a linked account's
  // rebuild now fills backwards from its own transactions — between the window's start and today.
  // What it will never do again is take TODAY's share count and price it at past dates: that drew a
  // line that never happened, and it could not match the broker's own statement (founder, 2026-09-25).
  const graphPoints = useMemo(() => {
    const days = ((store as any).snapshotDays ?? []) as any[];
    if (!days.length) return [] as { date: string; value: number }[];
    const start = periodStartKey(period);
    const inWindow = days.filter((d) => d.date >= start).map((d) => d.date).sort();
    const step = Math.max(1, Math.ceil(inWindow.length / 26));
    const out: { date: string; value: number }[] = [];
    for (let i = 0; i < inWindow.length; i += step) {
      const v = valueOn(days, investIds, inWindow[i]);
      if (v != null) out.push({ date: inWindow[i], value: v });
    }
    const last = inWindow[inWindow.length - 1];
    if (last && out[out.length - 1]?.date !== last) {
      const v = valueOn(days, investIds, last);
      if (v != null) out.push({ date: last, value: v });
    }
    return out;
  }, [store.snapshotDays, period, investIds]);
  // The screen has something to say whenever there ARE investments — a balance-only 401(k) with no
  // itemised holdings is still money, and gating on priced rows alone left that person staring at an
  // empty screen while Home showed their total (agreement pin 1).
  const hasInvestments = rows.length > 0 || investTotalAll > 0;
  // WHERE THE HISTORY CAME FROM (mock v14 mark 13). A rebuilt line is not an observation, so the
  // screen names its source and its first day — and says plainly what could not be rebuilt.
  const rebuilt = useMemo(() => {
    const from = (store.rebuiltFrom ?? {}) as Record<string, string>;
    const ids = Object.keys(from);
    if (!ids.length) return null;
    const earliest = ids.map((id) => from[id]).sort()[0];
    const one = ids.length === 1 ? accounts.find((a) => String(a.asset_id) === ids[0]) : null;
    const byHand = accounts.some((a) => a.source !== 'connected' && investIds.has(String(a.asset_id)));
    return { sentence: rebuiltSentence(one?.institution ?? (ids.length > 1 ? 'your linked accounts' : null), earliest), byHand };
  }, [store.rebuiltFrom, accounts, investIds]);
  const freshLine = (() => {
    const f = priceFreshness(store.pricesFetchedAt, Date.now());
    return store.pricesFetchedAt ? `${f.stale ? 'Prices may be out of date — ' : 'Prices updated '}${f.label}` : null;
  })();
  const bondAccts = accounts.filter(isBond);
  const altAccts = accounts.filter(isAlternative);
  // investment ACCOUNTS without tickers (a balance-only 401(k)/brokerage) still belong on this
  // tab — they're inside investmentsTotal, so hiding them would break the Home=Invest pin
  const untracked = accounts.filter((a) => !isBond(a) && !isAlternative(a)
    && (a.positions?.length ?? 0) === 0
    && !['cash', 'real_estate', 'personal_property'].includes(assetClassOf(a)));

  const refresh = async () => {
    setLoading(true);
    try {
      await store.refreshPrices();
      // with fresh daily closes in hand, walk each LINKED account's holdings back through its own
      // transactions so the line starts where the broker's records start (founder approved 2026-09-25)
      store.rebuildLinkedHistory?.();
    } finally { setLoading(false); }
  };
  useEffect(() => { if (positions.length) refresh(); }, [positions.length]);   // fetch on open / when holdings change

  return (
    <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HiddenBalancesBanner />
      {/* Invest (FCC glance-then-drill): title + refresh; the grouped list below owns the total */}
      <View style={styles.headRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.investTitle}>Performance</Text>
          {/* the mock puts today's date on the header row, right-aligned */}
          <Text style={styles.headDate}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={loading ? 'Refreshing prices' : 'Refresh prices'} onPress={refresh} disabled={loading}>
          <Text style={styles.refresh}>{loading ? 'Updating…' : '↻ Refresh'}</Text>
        </TouchableOpacity>
      </View>
      {/* B-18: surface price freshness so stale cached values aren't presented as live. */}
      {positions.length > 0 && (() => {
        const f = priceFreshness(store.pricesFetchedAt, Date.now());
        return <Text style={[styles.freshness, f.stale && { color: Colors.amber }]}>{f.stale ? '⚠ Prices may be out of date' : 'Prices'} · updated {f.label}{f.stale ? ' — tap Refresh' : ''}</Text>;
      })()}

      {positions.length === 0 && bondAccts.length === 0 && altAccts.length === 0 && untracked.length === 0 ? (
        /* DAY ONE (approved performance-FINAL state B + the founder's empty-state rule): the
           structure is IDENTICAL to the rich screen — chips, summary, walk, category table —
           with honest zeros. Nothing hides, nothing is invented, nothing moves position later. */
        <View>
          <WindowSelector windows={WINDOWS} chosen={period as string} figures={windowFigures} onPick={(k) => setPeriod(k as Period)} />

          <View style={styles.card}>
            <SectionBand inCard title="SUMMARY · SINCE TODAY" />
            <View style={styles.trioRow}>
              <View style={styles.trioCell}><Text style={styles.sumLbl}>Ending value</Text><Text style={styles.sumValBig}>{maskedMoney(0)}</Text></View>
              <View style={styles.trioCell}><Text style={styles.sumLbl}>Wealth generated</Text><Text style={[styles.sumValBig, { color: Colors.textTertiary }]}>{maskedMoney(0)}</Text></View>
              <View style={styles.trioCell}><Text style={styles.sumLbl}>Return</Text><Text style={[styles.sumValBig, { color: Colors.textTertiary }]}>—</Text></View>
            </View>
            {/* Q48 (MK-PF-M-005..008): $0 above, the one line, the door. Mock v14 mark 9: the line
                opens the SAME three ways to add an account Net worth opens — the separate
                separate add button and the separate import link are gone. */}
            <EmptyNote door="accounts" onPress={() => setAddChooser(true)} />
            <Text style={styles.sumNote}>Day one: your value is real, your return starts measuring from today. We never back-fill a year we didn't see.</Text>
          </View>

          <View style={styles.card}>
            <SectionBand inCard title="HOW TODAY'S VALUE STANDS · ALL ACCOUNTS" />
            {['Beginning market value (today)', 'Contributions', 'Withdrawals', 'Wealth generated', 'Dividends', 'Interest', 'Change in investment value'].map((l, i) => (
              <View key={l} style={[styles.walkRow, i >= 4 && { paddingLeft: 20 }]}>
                <Text style={[styles.walkL, i >= 4 && { color: Colors.textSecondary }, i === 3 && { fontWeight: '800' }]}>{l}</Text>
                <Text style={[styles.walkV, i === 3 && { fontWeight: '800' }]}>{maskedMoney(0)}</Text>
              </View>
            ))}
            <View style={[styles.walkRow, styles.walkTotal]}>
              <Text style={[styles.walkL, { fontWeight: '800' }]}>Ending market value (today)</Text>
              <Text style={[styles.walkV, { fontWeight: '800', color: Colors.primaryDark }]}>{maskedMoney(0)}</Text>
            </View>
            <Text style={styles.sumNote}>Every line fills in as days pass — the structure never changes.</Text>
          </View>

          <View style={styles.card}>
            <SectionBand inCard title="WHAT EACH CATEGORY EARNED" />
            <Text style={styles.sumNote}>Fills in with your first dividend or interest record. A file import carries no activity — that line will say so rather than show a false $0.</Text>
          </View>

        </View>
      ) : (
        <>
          {/* PERIOD SELECTOR */}
          <WindowSelector windows={WINDOWS} chosen={period as string} figures={windowFigures} onPick={(k) => setPeriod(k as Period)} />
          {/* FOUNDER 2026-08-18: a chip may name a longer window than our record covers. Say so,
              rather than answering a shorter period under the longer label. Silent when covered. */}
          {coverage.sentence !== '' && (
            <Text style={styles.coverageLine} accessibilityLabel={coverage.sentence}>{coverage.sentence}</Text>
          )}

          {/* FINAL mock (mockup-vf/performance-FINAL, founder-approved 2026-08-04): the SUMMARY trio
              and the VALUE WALK. Both read the same rows/breakdown the hero below uses, so the two
              can never disagree; the walk's rows sum to the ending value by construction. */}
          {hasInvestments && (() => {
            const { windowStart, walk, ret: shownReturn, sentence, cumulative, perYear, years, refusedRate } = windowFigures[period] ?? figuresFor(period);
            const yearsWord = years >= 1.9 && years < 2.1 ? 'two years' : `${years.toFixed(1)} years`;
            const gaps = dataGaps(accounts, windowStart, Date.now(), (store.transactions ?? []) as any, (store.syncFailures ?? []) as any);
            return (
              <>
                <View style={styles.card}>
                  <SectionBand inCard title={`SUMMARY · ${phraseFor(period).toUpperCase()}`} />
                  <View style={styles.trioRow}>
                    <View style={styles.trioCell}><Text style={styles.sumLbl}>Ending value</Text><Text style={styles.sumValBig}>{maskedMoney(Math.round(walk.ending))}</Text></View>
                    <View style={styles.trioCell}><Text style={styles.sumLbl}>Wealth generated</Text><Text style={[styles.sumValBig, { color: walk.wealthGenerated >= 0 ? Colors.gainText : Colors.red }]}>{walk.wealthGenerated < 0 ? '−' : ''}{maskedMoney(Math.abs(Math.round(walk.wealthGenerated)))}</Text></View>
                    {/* MARKS 16 AND 18, approved as mock v17 (2026-09-30). 16: where the window return
                        refuses, the EXACT rate per year stands in its place instead of an em-dash — the
                        person actively adding money is the one who most needs a rate and used to get
                        none. 18: this cell prints the plain percent and NOT "/year"; the yearly rate
                        with its words sits under the chosen window above. Measured at the app's type
                        sizes: the three cells need 270 of the card's 334 points that way, against 328
                        with "/year" in here — six points of headroom, which is why it wrapped. */}
                    <View style={styles.trioCell}><Text style={styles.sumLbl}>Return</Text><Text style={[styles.sumValBig, { color: (shownReturn ?? refusedRate ?? 0) >= 0 ? Colors.gainText : Colors.red }]}>{shownReturn != null ? pct(shownReturn) : refusedRate != null ? pct(refusedRate) : '—'}</Text></View>
                  </View>
                  <Text style={styles.sumNote}>
                    {sentence && refusedRate != null
                      /* mark 16: the refusal sentence is replaced by what the figure IS. A person reading
                         a rate has to be told it is a yearly one, counted from when the money went in. */
                      ? RATE_STANDS_IN_WORDS
                      : sentence
                        ? sentence
                        : `Return is for the window you picked (${phraseFor(period)}) — not a yearly rate. Money you added never counts as return.`}
                  </Text>
                  {rebuilt && (
                    <Text style={styles.sumNote}>
                      ↺ {rebuilt.sentence}{rebuilt.byHand ? ' Anything entered by hand starts the day you entered it.' : ''}
                    </Text>
                  )}
                  {/* founder ruling 2026-08-18 annualises the 2Y figure so it sits fairly beside 1Y.
                      Nothing said so until mock v14 mark 15 — a rate nobody can name is a trap. */}
                  {perYear != null && cumulative != null && (
                    <Text style={styles.sumNote}>
                      {pct(cumulative)} over the {yearsWord}, which is {pct(perYear)}/year — a yearly rate, so it sits fairly beside a one-year window.
                    </Text>
                  )}
                  {/* the value graph lives INSIDE the summary card (approved performance-FINAL),
                      now with a Y axis (mock v14 mark 11) and drawn ONLY from days we have a record
                      for — never today's share count priced at old dates */}
                  <ValueGraph points={graphPoints} dayOneNote={hasInvestments ? 'your line starts today' : 'your line starts with your first account'} />
                </View>

                <DataGapsBanner gaps={gaps} />

                <View style={styles.card}>
                  <SectionBand inCard title={`HOW ${maskedMoney(Math.round(walk.beginning))} BECAME ${maskedMoney(Math.round(walk.ending))} · ALL ACCOUNTS`} />
                  {[
                    { l: `Beginning market value (${beginLabelFor(period)})`, v: walk.beginning },
                    { l: 'Contributions', v: walk.contributions },
                    { l: 'Withdrawals', v: -walk.withdrawals },
                    { l: 'Wealth generated', v: walk.wealthGenerated, strong: true },
                    { l: 'Dividends', v: walk.dividends, indent: true },
                    { l: 'Interest', v: walk.interest, indent: true },
                    { l: 'Change in investment value', v: walk.marketChange, indent: true },
                  ].map((r) => (
                    <View key={r.l} style={[styles.walkRow, (r as any).indent && { paddingLeft: 20 }]}>
                      <Text style={[styles.walkL, (r as any).indent && { color: Colors.textSecondary }, (r as any).strong && { fontWeight: '800' }]}>{r.l}</Text>
                      <Text style={[styles.walkV, (r as any).strong && { fontWeight: '800' }, r.v < 0 && { color: Colors.red }]}>
                        {r.v < 0 ? '−' : ''}{maskedMoney(Math.abs(Math.round(r.v)))}
                      </Text>
                    </View>
                  ))}
                  <View style={[styles.walkRow, styles.walkTotal]}>
                    <Text style={[styles.walkL, { fontWeight: '800' }]}>Ending market value (today)</Text>
                    <Text style={[styles.walkV, { fontWeight: '800', color: Colors.primaryDark }]}>{maskedMoney(Math.round(walk.ending))}</Text>
                  </View>
                </View>
              </>
            );
          })()}

          {/* PER-ACCOUNT WALKS (final mock): the same card, one per account, collapsible — a
              person with eight accounts sees a list, not an endless scroll. Every account's walk
              uses the SAME function as the all-accounts walk, so the parts sum to the whole. */}
          {hasInvestments && (() => {
            const windowStart = periodStartKey(period);
            const led = ((store.transactions ?? []) as any[]).filter((t) => !windowStart || String(t.date ?? '').slice(0, 10) >= windowStart);
            const names = accountDisplayNames(accounts);   // one account name, used everywhere
            const byAcct = new Map<string, { label: string; ending: number; gain: number }>();
            for (const r of rows as any[]) {
              const o = owned.find((x) => x.p.position_id === r.position.position_id);
              if (!o) continue;
              const acct = accounts.find((a) => a.asset_id === o.accountId);
              // named by ACCOUNT, the way the approved design draws it ("Vanguard Brokerage",
              // "E*TRADE Account 1"). Build 53 titled the walk with the institution ("VANGUARD"),
              // so two accounts at one broker could not be told apart (founder screenshot 2026-08-17).
              const cur = byAcct.get(o.accountId) ?? { label: names.get(o.accountId) ?? acct?.label ?? 'Account', ending: 0, gain: 0 };
              cur.ending += r.marketValue; cur.gain += rowGain(r);
              byAcct.set(o.accountId, cur);
            }
            // HANDOFF 2026-08-11 + reconciliation: the per-account walks must SUM to the all-accounts
            // walk above them. They were built only from itemised holding rows, so an account with a
            // balance and no holdings (a CD account, anything hand-entered) simply vanished from the
            // list — the parts stopped adding up to the whole with no sign that anything was missing.
            for (const a of (accounts ?? []) as AssetAccount[]) {
              if (byAcct.has(a.asset_id) || !(a.balance > 0)) continue;
              // a home, a car, a chequing account is not an investment and gets no walk here
              if (!investIds.has(String(a.asset_id))) continue;
              byAcct.set(a.asset_id, { label: names.get(a.asset_id) ?? a.label, ending: a.balance, gain: 0 });
            }
            if (byAcct.size < 2) return null;                    // one account → the all-accounts walk already says it
            return [...byAcct.entries()].map(([id, a]) => {
              // Track 1 step 7: read the account's beginning from the record when covered
              // the SAME door, over one account — so an account's walk and the all-accounts walk
              // above it are the same arithmetic, one narrower, and cannot disagree (Q-PF-1)
              const w = thePerformance({
                windowStart, windowLabel: phraseFor(period), today: isoLocalDate(new Date()),
                ending: a.ending, pricedGain: a.gain,
                transactions: ((store.transactions ?? []) as any[]).filter((t) => String(t.account_id) === String(id)),
                snapshotDays: (store as any).snapshotDays ?? [],
                investmentAccountIds: new Set([String(id)]),
              }).walk;
              const isOpen = !!openAcctWalk[id];
              const acctOf = accounts.find((x) => String(x.asset_id) === String(id));
              return (
                <View key={id} style={styles.card}>
                  <TouchableOpacity accessibilityRole="button" activeOpacity={0.85}
                    onPress={() => setOpenAcctWalk((m) => ({ ...m, [id]: !isOpen }))}
                    accessibilityLabel={`${a.label}, ${spokenMoney(Math.round(a.ending))}. ${isOpen ? 'Collapses' : 'Expands'} its walk.`}>
                    <SectionBand inCard title={`${isOpen ? '▾' : '▸'} ${a.label}`} value={maskedMoney(Math.round(a.ending))}
                      onTitlePress={() => router.push(`/account-detail?id=${id}` as any)}
                      titleHint={`Open ${a.label} — this account's own page`} />
                  </TouchableOpacity>
                  {/* the approved design carries ONE quiet line under each account band: where its
                      numbers come from and how fresh they are (mock v14, first phone) */}
                  {!!acctOf && <View style={styles.walkChip}><SourceChip account={acctOf} /></View>}
                  {!isOpen ? (
                    <Text style={styles.sumNote}>
                      wealth generated {w.wealthGenerated < 0 ? '−' : ''}{maskedMoney(Math.abs(Math.round(w.wealthGenerated)))} · tap to see the walk
                    </Text>
                  ) : (
                    <>
                      {[
                        { l: 'Beginning market value', v: w.beginning },
                        { l: 'Contributions', v: w.contributions },
                        { l: 'Withdrawals', v: -w.withdrawals },
                        { l: 'Wealth generated', v: w.wealthGenerated, strong: true },
                        { l: 'Dividends', v: w.dividends, indent: true },
                        { l: 'Interest', v: w.interest, indent: true },
                        { l: 'Change in investment value', v: w.marketChange, indent: true },
                      ].map((r) => (
                        <View key={r.l} style={[styles.walkRow, (r as any).indent && { paddingLeft: 20 }]}>
                          <Text style={[styles.walkL, (r as any).indent && { color: Colors.textSecondary }, (r as any).strong && { fontWeight: '800' }]}>{r.l}</Text>
                          <Text style={[styles.walkV, (r as any).strong && { fontWeight: '800' }, r.v < 0 && { color: Colors.red }]}>
                            {r.v < 0 ? '−' : ''}{maskedMoney(Math.abs(Math.round(r.v)))}
                          </Text>
                        </View>
                      ))}
                      <View style={[styles.walkRow, styles.walkTotal]}>
                        <Text style={[styles.walkL, { fontWeight: '800' }]}>Ending market value</Text>
                        <Text style={[styles.walkV, { fontWeight: '800', color: Colors.primaryDark }]}>{maskedMoney(Math.round(w.ending))}</Text>
                      </View>
                      {/* the approved design's line under an open walk (mock v14, first phone). It is
                          printed only now that both taps are real: the arrow collapses, the name opens
                          the account. A line that promises a tap the screen does not have is a lie. */}
                      <Text style={styles.sumNote}>Tap ▾ to collapse · tap the name to open this account’s portfolio ›</Text>
                    </>
                  )}
                </View>
              );
            });
          })()}

          {/* WHAT EACH CATEGORY EARNED (final mock): dollars received in this window, then the
              rate WITH ITS NAME. Income is ledger-only — a category with no records shows an
              em-dash, never a false $0. Rows sum to the walk's income lines by construction. */}
          {hasInvestments && (() => {
            // THE SCREEN COMPUTES NOTHING (his rule). This block used to filter the records, class
            // each ticker, bucket the dividends and interest and calculate a return per class — four
            // figures' worth of arithmetic with no row, no worked example and nothing able to check
            // it. It is MK-NW-O-008's categoryEarnings now; the screen asks and prints.
            const shown = categoryEarnings({
              transactions: (store.transactions ?? []) as any[],
              windowStart: periodStartKey(period),
              rows: rows as any,
            });
            const total = shown.reduce((n, b) => n + b.earned, 0);
            if (!shown.length) return null;                       // nothing received → no table at all
            return (
              <View style={styles.card}>
                <SectionBand inCard title="WHAT EACH CATEGORY EARNED" value={phraseFor(period)} />
                <View style={styles.catHead}>
                  <Text style={styles.catHeadL}>CATEGORY</Text>
                  <Text style={styles.catHeadV}>EARNED</Text>
                  <Text style={styles.catHeadR}>RETURN</Text>
                </View>
                {shown.map((b) => (
                  <View key={b.key} style={styles.catRow} accessible
                    accessibilityLabel={`${b.label}, earned ${spokenMoney(Math.round(b.earned))}, return ${b.ret == null ? 'not known' : pct(b.ret)}`}>
                    <View style={[styles.catDot, { backgroundColor: (ClassMarkColors as any)[b.key] }]} />
                    <Text style={styles.catL}>{b.label}</Text>
                    <Text style={[styles.catV, { color: Colors.gainText }]}>{maskedMoney(Math.round(b.earned))}</Text>
                    <Text style={styles.catR}>{b.ret == null ? '\u2014' : pct(b.ret)}</Text>
                  </View>
                ))}
                <View style={[styles.catRow, styles.walkTotal]}>
                  <Text style={[styles.catL, { fontWeight: '800', marginLeft: 14 }]}>All categories</Text>
                  <Text style={[styles.catV, { fontWeight: '800' }]}>{maskedMoney(Math.round(total))}</Text>
                  <Text style={styles.catR}> </Text>
                </View>
                <Text style={styles.sumNote}>
                  Earned = dividends + interest received in this window. A category with no records shows —, never a false $0.
                  {windowFigures[period]?.perYear != null ? ' Over a window longer than a year, every return here is a yearly rate.' : ''}
                </Text>
              </View>
            );
          })()}

          {/* NOT IN THE APPROVED DESIGN, so they are gone (founder confirmed the Performance
              FINAL of 2026-08-04 on 2026-09-14, approved mock v14 on 2026-09-25): the older Invest
              screen's Your return hero, Honest comparison, the money-weighted card, Winners &
              laggards, the concentration note, Look ahead / Look back, the plan chip, the Your
              investments list and the Add investment / Import / Record / Activity row. Nothing is
              stranded: What if is reached from Contribution room, Look back from Holding detail and
              Account detail, importing from the add-an-account doors, and every holding, record and
              activity row from its own account page. */
          }
        </>
      )}

      <View style={{ height: 40 }} />
      {/* the three ways to add an account, from the one list every screen reads (founder 2026-09-14) */}
      <Modal visible={addChooser} transparent animationType={modalAnimation()} onRequestClose={() => setAddChooser(false)}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" style={styles.chooserBackdrop} activeOpacity={1} onPress={() => setAddChooser(false)}>
          <View style={styles.chooserCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.chooserHead}>{ADD_ACCOUNT_QUESTION}</Text>
            {ADD_ACCOUNT_DOORS.map((d) => (
              <TouchableOpacity key={d.route} accessibilityRole="button" style={styles.chooserRow}
                accessibilityLabel={`${d.title}. ${d.sub}`}
                onPress={() => { setAddChooser(false); router.push(d.route as any); }}>
                <Text style={styles.chooserTitle}>{d.icon}  {d.title}</Text>
                <Text style={styles.chooserSub}>{d.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
      <HoldingEditor
        open={addOpen || edit != null}
        accounts={accounts}
        existing={edit}
        onRoute={(k) => { setAddOpen(false); setEdit(null); if (k === 'bond') setBondAddOpen(true); else setAltAddKind(k); }}
        onClose={() => { setAddOpen(false); setEdit(null); }}
        onSave={(accountId, position, isNew) => {
          if (isNew) {
            if (accountId === '__new__') {
              store.addAsset({ label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, target_return: 0.08, positions: [], derive_balance: true });
              // newest account is at index 0
              const newId = (useStore.getState() as any).assetAccounts[0].asset_id;
              store.addPosition(newId, position);
            } else {
              store.addPosition(accountId, position);
            }
          } else {
            store.updatePosition(accountId, position.position_id, position);
          }
          setAddOpen(false); setEdit(null); setTimeout(refresh, 50);
        }}
        onDelete={edit ? () => { store.deletePosition(edit.accountId, edit.position.position_id); setEdit(null); } : undefined}
      />
      <TransactionSheet open={txnOpen} accounts={accounts} onClose={() => setTxnOpen(false)}
        onSave={(t) => { store.recordTransaction(t); setTxnOpen(false); setTimeout(refresh, 50); }} />
      <BondEditor bond={null} open={bondAddOpen} onClose={() => setBondAddOpen(false)}
        onSave={(fields) => { store.addAsset({ kind: 'fixed_income', target_return: fields.coupon_rate ?? 0.04, ...fields }); setBondAddOpen(false); }} />
      <AltEditor item={null} open={altAddKind != null} presetKind={altAddKind ?? undefined} onClose={() => setAltAddKind(null)}
        onSave={(fields) => { store.addAsset({ target_return: benchmarkReturn(fields.kind), ...fields }); setAltAddKind(null); }} />
      <HistorySheet open={historyOpen} transactions={store.transactions ?? []} accounts={accounts}
        onClose={() => setHistoryOpen(false)} onDelete={(id) => {
          if (!store.deleteTransaction(id)) Alert.alert(
            'Can\u2019t remove this entry',
            'It was recorded before balance-safe deletes existed, so removing it can\u2019t undo its effect on your balances. Record a correcting entry instead (e.g. a matching deposit or withdrawal).');
        }} />
    </ScrollView>
  );
}

// ───────────────────────── Add / edit holding (ticker + lots) ─────────────────────────
export function HoldingEditor({ open, accounts, existing, onClose, onSave, onDelete, onRoute }: {
  open: boolean; accounts: AssetAccount[]; existing: { accountId: string; position: Position } | null;
  onClose: () => void; onSave: (accountId: string, position: Position, isNew: boolean) => void; onDelete?: () => void;
  onRoute?: (kind: 'bond' | string) => void;   // B46 findings 3+6: non-ticker types open their own editors
}) {
  const isNew = existing == null;
  const investAccts = accounts.filter(accountAllowsTicker);   // only security-eligible accounts (excludes cash/property/529)
  const [accountId, setAccountId] = useState<string>('');
  const [ticker, setTicker] = useState('');
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<string>('stocks_etf');
  const [lots, setLots] = useState<Lot[]>([]);
  const [tickerFocus, setTickerFocus] = useState(false);
  // autocomplete: suggest common tickers as they type (hidden once it's an exact symbol match)
  const suggestions = useMemo(() => {
    const q = ticker.trim().toUpperCase();
    if (!q || !tickerFocus) return [];
    const hits = searchTickers(q);
    return hits.length === 1 && hits[0].sym === q ? [] : hits;
  }, [ticker, tickerFocus]);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setAccountId(existing.accountId); setTicker(existing.position.ticker); setLabel(existing.position.label ?? '');
      setKind(existing.position.kind ?? 'stocks_etf'); setLots(existing.position.lots.length ? existing.position.lots : [blankLot()]);
    } else {
      setAccountId(investAccts[0]?.asset_id ?? '__new__'); setTicker(''); setLabel(''); setKind('stocks_etf'); setLots([blankLot()]);
    }
  }, [open]);

  const setLot = (i: number, patch: Partial<Lot>) => setLots((ls) => ls.map((l, j) => j === i ? { ...l, ...patch } : l));
  // Raw text buffer for the numeric lot fields so an in-progress decimal ("10.") isn't stripped by the
  // parse-on-keystroke (the reported "cost/share only allows integers" bug). Keyed by `${i}-${field}`.
  const [lotRaw, setLotRaw] = useState<Record<string, string>>({});
  const setLotNum = (i: number, field: 'shares' | 'cost_per_share', t: string) => {
    setLotRaw((m) => ({ ...m, [`${i}-${field}`]: t }));
    setLot(i, { [field]: num(t) } as Partial<Lot>);
  };
  const lotVal = (i: number, field: 'shares' | 'cost_per_share', n: number) =>
    lotRaw[`${i}-${field}`] ?? (n ? String(n) : '');
  // new-investor friendly: only ticker + shares are required; cost/share + date are optional
  // (without cost we just can't show return-since-purchase — value & vs-benchmark still work).
  const valid = ticker.trim().length > 0 && lots.some((l) => l.shares > 0);

  const save = () => {
    const clean = lots.filter((l) => l.shares > 0).map((l) => ({ ...l, lot_id: l.lot_id || `lot_${Math.random().toString(36).slice(2, 8)}` }));
    const position: Position = {
      position_id: existing?.position.position_id ?? `pos_${Math.random().toString(36).slice(2, 8)}`,
      ticker: ticker.trim().toUpperCase(), label: label.trim() || undefined, kind, lots: clean,
    };
    onSave(accountId, position, isNew);
  };

  return (
    <Modal visible={open} transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={{ maxHeight: '92%' }}>
          <Text style={styles.sheetT}>{isNew ? 'Add a holding' : 'Edit holding'}</Text>

          <Text style={styles.fieldL}>Ticker</Text>
          <TextInput style={styles.input} value={ticker} onChangeText={setTicker} autoCapitalize="characters" autoCorrect={false}
            onFocus={() => setTickerFocus(true)} onBlur={() => setTimeout(() => setTickerFocus(false), 150)}
            placeholder="e.g. AAPL, VTI, SPY" placeholderTextColor={Colors.textTertiary} />
          {suggestions.length > 0 && (
            <View style={styles.acBox}>
              {suggestions.map((sug) => (
                <TouchableOpacity key={sug.sym} style={styles.acRow} accessibilityRole="button" accessibilityLabel={`${sug.sym}, ${sug.name}`} onPress={() => {
                  setTicker(sug.sym); setKind(sug.kind); if (!label.trim()) setLabel(sug.name); setTickerFocus(false);
                }}>
                  <Text style={styles.acSym}>{sug.sym}</Text>
                  <Text style={styles.acName} numberOfLines={1}>{sug.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* B-18: gently flag a ticker that can't be a symbol so the user fixes a typo instead of
              silently getting no live price. */}
          {ticker.trim().length > 0 && !isPlausibleTicker(ticker) && (
            <Text style={styles.tickerWarn}>That doesn't look like a ticker symbol — check for a typo (e.g. AAPL, VTI).</Text>
          )}
          <Text style={styles.fieldL}>Name (optional)</Text>
          <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g. Apple Inc." placeholderTextColor={Colors.textTertiary} />

          <Text style={styles.fieldL}>Type (sets the benchmark — {benchmarkTicker(kind)})</Text>
          <View style={styles.kindWrap}>
            {KIND_OPTIONS.map((k) => (
              <TouchableOpacity key={k.id} style={[styles.kindChip, kind === k.id && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel={`Type: ${k.label}`}
                onPress={() => {
                  // B46 findings 3+6 (router, approved 2026-07-31): non-ticker types open their OWN
                  // form — separate fields, correct class. Only ticker types stay on this sheet.
                  if (k.id === 'fixed_income') { onRoute?.('bond'); return; }
                  if (ALT_ROUTE_KINDS.includes(k.id)) { onRoute?.(k.id); return; }
                  setKind(k.id);
                }}>
                <Text style={[styles.kindChipT, kind === k.id && styles.kindChipTOn]}>{k.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldL}>Shares you hold</Text>
          <Text style={styles.beginnerHint}>New to this? Just enter shares — cost &amp; date are optional (add them later for return-since-purchase).</Text>
          {lots.map((l, i) => (
            <View key={i} style={styles.lotRow}>
              <View style={styles.lotCell}><Text style={styles.lotL}>Shares</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={lotVal(i, 'shares', l.shares)} onChangeText={(t) => setLotNum(i, 'shares', t)} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Cost / share (opt)</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={lotVal(i, 'cost_per_share', l.cost_per_share)} onChangeText={(t) => setLotNum(i, 'cost_per_share', t)} placeholder="—" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Date (opt)</Text><DateField value={l.purchase_date ?? ''} onChange={(iso) => setLot(i, { purchase_date: iso })} label="purchase date" style={styles.lotIn} /></View>
              {lots.length > 1 && <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={`Remove lot ${i + 1}`} onPress={() => setLots((ls) => ls.filter((_, j) => j !== i))}><Text style={styles.lotDel}>✕</Text></TouchableOpacity>}
            </View>
          ))}
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Add another lot" onPress={() => setLots((ls) => [...ls, blankLot()])}><Text style={styles.addLink}>＋ Add another lot</Text></TouchableOpacity>

          {accounts.length > 0 && (
            <>
              <Text style={styles.fieldL}>Account</Text>
              <View style={styles.kindWrap}>
                {investAccts.map((a) => (
                  <TouchableOpacity key={a.asset_id} style={[styles.kindChip, accountId === a.asset_id && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel={`Account: ${a.institution?.trim() || a.label}`} onPress={() => setAccountId(a.asset_id)}>
                    <Text style={[styles.kindChipT, accountId === a.asset_id && styles.kindChipTOn]}>{a.institution?.trim() || a.label}</Text>
                  </TouchableOpacity>
                ))}
                {isNew && (
                  <TouchableOpacity style={[styles.kindChip, accountId === '__new__' && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel="Add a new account" onPress={() => setAccountId('__new__')}>
                    <Text style={[styles.kindChipT, accountId === '__new__' && styles.kindChipTOn]}>＋ New account</Text>
                  </TouchableOpacity>
                )}
              </View>
              {(() => {
                const sel = accounts.find((a) => a.asset_id === accountId);
                // A manual-balance account keeps its entered total; this holding is tracked for
                // performance only (B-60). A position-derived account is built FROM its holdings.
                if (!sel || sel.derive_balance === true) return null;
                return (
                  <Text style={styles.note}>📊 Tracked for performance — this won't change {sel.institution?.trim() || sel.label}'s {moneyCompact(sel.balance, 'M')} total. Edit the account total in Net Worth.</Text>
                );
              })()}
            </>
          )}

          <TouchableOpacity style={[styles.saveBtn, !valid && { opacity: 0.4 }]} disabled={!valid} accessibilityRole="button" accessibilityLabel={isNew ? 'Add holding' : 'Save holding'} onPress={save}>
            <Text style={styles.saveBtnT}>{isNew ? 'Add holding' : 'Save'}{valid && costBasis({ position_id: '', ticker, lots } as Position) > 0 ? ` · cost ${moneyCompact(costBasis({ position_id: '', ticker, lots } as Position), 'M')}` : ''}</Text>
          </TouchableOpacity>
          {onDelete && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete holding" onPress={onDelete}><Text style={styles.deleteLink}>Delete holding</Text></TouchableOpacity>}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const blankLot = (): Lot => ({ lot_id: `lot_${Math.random().toString(36).slice(2, 8)}`, shares: 0, cost_per_share: 0, purchase_date: isoLocalDate(new Date()) });


/** THE WINDOW SELECTOR — mock v14 (founder-approved 2026-09-25), after three tries.
 *  ONE control, not five buttons: a quiet tray, the chosen window lifted onto a white card, and
 *  hairline dividers only between the windows at rest. Two lines in every segment — the window
 *  with its date above its own return — because five windows carrying returns cannot fit one line
 *  at any readable size (measured: 434–492 points against the 362 a 390-point phone gives).
 *  Shape note worth keeping: a 12-point radius on a 26-point-tall chip IS a semicircle. The app's
 *  radio buttons are 42 tall with that radius, which is why they read as corners; so is a segment. */
function WindowSelector({ windows, chosen, figures, onPick }: {
  windows: { key: string; label: string }[];
  chosen: string;
  figures: Record<string, { ret: number | null; perYear?: number | null; refusedRate?: number | null }>;
  onPick: (key: string) => void;
}) {
  return (
    <View style={styles.segBar}>
      {windows.map((w, i) => {
        const on = w.key === chosen;
        // MARK 16 + 18 (mock v17, approved 2026-09-30). Where the window return refused, the segment
        // carries the EXACT rate per year in its place — and it is always a yearly rate, so "/year"
        // rides under it exactly as it does for a window longer than a year. This is where the yearly
        // rate lives; the summary trio above prints the plain percent so its three cells fit one row.
        const windowRet = figures[w.key]?.ret ?? null;
        const stoodIn = figures[w.key]?.refusedRate ?? null;
        const ret = windowRet ?? stoodIn;
        const perYear = figures[w.key]?.perYear != null || (windowRet == null && stoodIn != null);
        const divider = i > 0 && !on && chosen !== windows[i - 1].key;
        return (
          <React.Fragment key={w.key}>
            {divider && <View style={styles.segDivider} />}
            <TouchableOpacity
              style={[styles.seg, w.key === 'SINCE' && styles.segWide, on && styles.segOn]}
              accessibilityRole="button" accessibilityState={{ selected: on }}
              accessibilityLabel={`Show ${w.label}${ret == null ? ', no data for that window yet' : `, ${pct(ret)}${perYear ? ' a year' : ''}${windowRet == null ? ', counting when you added money' : ''}`}`}
              onPress={() => onPick(w.key)}>
              <Text numberOfLines={1} style={[styles.segK, on && styles.segOnT, ret == null && !on && styles.segRest]}>{w.label}</Text>
              <Text numberOfLines={1} style={[styles.segV, on && styles.segOnT, ret == null && styles.segRest]}>{ret == null ? '—' : pct(ret)}</Text>
              {perYear && (
                <Text numberOfLines={1} style={[styles.segPer, on && styles.segOnT]}>/year</Text>
              )}
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// THE VALUE LINE now lives in src/components/ValueGraph.tsx, shared with the Account portfolio screen.

// ───────────────────────── Record a transaction ─────────────────────────
const TXN_TYPES: { k: TxnType; label: string }[] = [
  { k: 'BUY', label: 'Buy' }, { k: 'SELL', label: 'Sell' }, { k: 'DEPOSIT', label: 'Deposit cash' },
  { k: 'WITHDRAWAL', label: 'Withdraw' }, { k: 'TRANSFER', label: 'Transfer' }, { k: 'DIVIDEND', label: 'Dividend' },
];
export function TransactionSheet({ open, accounts, onClose, onSave, prefill }: {
  open: boolean; accounts: AssetAccount[]; onClose: () => void; onSave: (t: Omit<Transaction, 'id' | 'created_at'>) => void;
  prefill?: { accountId?: string; ticker?: string };
}) {
  const router = useRouter();
  const eligible = accounts.filter(accountAllowsTicker);
  // Cash actions (deposit/withdraw/transfer) on the Stocks screen apply to your EQUITY accounts + plain
  // cash accounts — never bond or alternative accounts (those aren't traded here).
  const cashAccts = accounts.filter((a) => accountAllowsTicker(a) || assetClassOf(a) === 'cash');
  const [type, setType] = useState<TxnType>('BUY');
  const [accountId, setAccountId] = useState('');
  const [counterId, setCounterId] = useState('');
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [reinvest, setReinvest] = useState(false);
  const [date, setDate] = useState(isoLocalDate(new Date()));
  useEffect(() => { if (open) { setType('BUY'); setAccountId(prefill?.accountId ?? (accounts.filter(accountAllowsTicker)[0]?.asset_id) ?? accounts[0]?.asset_id ?? ''); setCounterId(''); setTicker(prefill?.ticker ?? ''); setShares(''); setPrice(''); setAmount(''); setReinvest(false); setDate(isoLocalDate(new Date())); } }, [open]);

  const isTrade = type === 'BUY' || type === 'SELL';
  const isBuy = type === 'BUY';
  const isSell = type === 'SELL';
  const isCash = type === 'DEPOSIT' || type === 'WITHDRAWAL';
  const isTransfer = type === 'TRANSFER';
  const isDiv = type === 'DIVIDEND';
  const acctList = isTrade ? eligible : cashAccts;
  const acct = accounts.find((a) => a.asset_id === accountId);
  const avail = acct ? availableCash(acct) : 0;
  const held = (acct?.positions ?? []).map((p) => p.ticker);          // holdings you can sell / receive dividends from
  useEffect(() => { setTicker(''); }, [accountId, type]);              // don't carry a stale holding across account/type
  // cash guards: can't spend more than the account's available cash
  const cost = num(shares) * num(price);
  const enough = isBuy ? cost <= avail : (type === 'WITHDRAWAL' || isTransfer) ? num(amount) <= avail : true;
  const tickerOk = isBuy ? !!ticker.trim() : (isSell || isDiv) ? held.includes(ticker) : true;
  const ownedShares = isSell ? totalShares((acct?.positions ?? []).find((p) => p.ticker === ticker) ?? { lots: [] } as any) : 0;
  const sellOk = !isSell || num(shares) <= ownedShares;
  const valid = !!accountId && enough && sellOk && (
    isTrade ? (tickerOk && num(shares) > 0 && num(price) > 0) :
    isCash ? num(amount) > 0 :
    isTransfer ? (num(amount) > 0 && !!counterId && counterId !== accountId) :
    isDiv ? (tickerOk && (reinvest ? (num(shares) > 0 && num(price) > 0) : num(amount) > 0)) : false
  );
  const save = () => {
    const base = { date, type, account_id: accountId };
    if (isTrade) onSave({ ...base, ticker: ticker.trim().toUpperCase(), shares: num(shares), price: num(price) });
    else if (isCash) onSave({ ...base, amount: num(amount) });
    else if (isTransfer) onSave({ ...base, counter_account_id: counterId, amount: num(amount) });
    else onSave({ ...base, ticker: ticker.trim().toUpperCase(), reinvested: reinvest, ...(reinvest ? { shares: num(shares), price: num(price) } : { amount: num(amount) }) });
  };
  // Build-47 walk row 22 (B46 finding 4): the picker uses THE shared account naming — real holding
  // names and stable "· 1 / · 2" twins, same as Net worth. The old local rule (institution, then
  // kind on collision) rendered three imported cash accounts as three identical "E*Trade savings"
  // chips. One name system, everywhere; a source pin bans local account naming here.
  const displayNames = accountDisplayNames(accounts);
  const acctName = (a: AssetAccount) => displayNames.get(a.asset_id) ?? (a.institution?.trim() || a.label);

  return (
    <Modal visible={open} transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={{ maxHeight: '92%' }}>
          <Text style={styles.sheetT}>Record a transaction</Text>
          <View style={[styles.kindWrap, { marginTop: 8 }]}>
            {TXN_TYPES.map((t) => (
              <TouchableOpacity key={t.k} style={[styles.kindChip, type === t.k && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel={`Transaction type: ${t.label}`} onPress={() => setType(t.k)}>
                <Text style={[styles.kindChipT, type === t.k && styles.kindChipTOn]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldL}>{isTransfer ? 'From account' : 'Account'}</Text>
          <View style={styles.kindWrap}>
            {acctList.map((a) => (
              <TouchableOpacity key={a.asset_id} style={[styles.kindChip, accountId === a.asset_id && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel={`Account: ${acctName(a)}`} onPress={() => setAccountId(a.asset_id)}>
                <Text style={[styles.kindChipT, accountId === a.asset_id && styles.kindChipTOn]}>{acctName(a)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* B46 finding 6 (router, approved): bonds & alternatives record on their OWN pages —
              labeled doors with their real names, so no one stands here with a CD and no path */}
          {(() => {
            const ba = accounts.filter((a) => assetClassOf(a) === 'bonds' || assetClassOf(a) === 'alternatives');
            if (ba.length === 0) return null;
            const names = accountDisplayNames(accounts);
            return (
              <>
                <Text style={styles.fieldL}>Bonds & alternatives — recorded on their own pages</Text>
                {ba.slice(0, 6).map((a) => (
                  <TouchableOpacity key={a.asset_id} accessibilityRole="button" style={styles.baDoor}
                    onPress={() => { onClose(); router.push((assetClassOf(a) === 'bonds' ? '/bonds' : '/other-investments') as any); }}
                    accessibilityLabel={`${names.get(a.asset_id) ?? a.label}: record a sale, payout or value update on its page`}>
                    <Text style={styles.baDoorTxt}>{assetClassOf(a) === 'bonds' ? '📜' : '🪙'} {names.get(a.asset_id) ?? a.label}</Text>
                    <Text style={styles.baDoorGo}>record a sale / update ›</Text>
                  </TouchableOpacity>
                ))}
              </>
            );
          })()}


          {isTransfer && (
            <>
              <Text style={styles.fieldL}>To account</Text>
              <View style={styles.kindWrap}>
                {cashAccts.filter((a) => a.asset_id !== accountId).map((a) => (
                  <TouchableOpacity key={a.asset_id} style={[styles.kindChip, counterId === a.asset_id && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel={`To account: ${acctName(a)}`} onPress={() => setCounterId(a.asset_id)}>
                    <Text style={[styles.kindChipT, counterId === a.asset_id && styles.kindChipTOn]}>{acctName(a)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* available-cash note for spend actions */}
          {(isBuy || type === 'WITHDRAWAL' || isTransfer) && acct && (
            <Text style={[styles.note, !enough && { color: Colors.red, fontWeight: '700' }]}>Available cash: {money(avail)}{!enough ? '  ⚠ not enough — deposit or transfer cash in first' : ''}</Text>
          )}

          {isBuy && (<><Text style={styles.fieldL}>Ticker</Text>
            <TextInput style={styles.input} value={ticker} onChangeText={setTicker} autoCapitalize="characters" autoCorrect={false} placeholder="e.g. AAPL" placeholderTextColor={Colors.textTertiary} /></>)}

          {(isSell || isDiv) && (<>
            <Text style={styles.fieldL}>Holding</Text>
            {held.length === 0
              ? <Text style={styles.note}>No holdings in this account to {isSell ? 'sell' : 'record a dividend for'}. {isDiv ? 'A dividend can only come from a stock you hold here.' : ''}</Text>
              : <View style={styles.kindWrap}>{held.map((tk) => (
                  <TouchableOpacity key={tk} style={[styles.kindChip, ticker === tk && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel={`Holding: ${tk}`} onPress={() => setTicker(tk)}>
                    <Text style={[styles.kindChipT, ticker === tk && styles.kindChipTOn]}>{tk}</Text>
                  </TouchableOpacity>))}
                </View>}
            {isSell && ticker !== '' && <Text style={[styles.note, !sellOk && { color: Colors.red, fontWeight: '700' }]}>You own {ownedShares} shares{!sellOk ? "  ⚠ can't sell more than you own" : ''}</Text>}
          </>)}

          {isDiv && (
            <View style={[styles.lotRow, { marginTop: 12 }]}>
              <TouchableOpacity style={[styles.kindChip, !reinvest && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel="Dividend paid as cash" onPress={() => setReinvest(false)}><Text style={[styles.kindChipT, !reinvest && styles.kindChipTOn]}>Paid as cash</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.kindChip, reinvest && styles.kindChipOn]} accessibilityRole="button" accessibilityLabel="Dividend reinvested" onPress={() => setReinvest(true)}><Text style={[styles.kindChipT, reinvest && styles.kindChipTOn]}>Reinvested</Text></TouchableOpacity>
            </View>
          )}

          {(isTrade || (isDiv && reinvest)) && (
            <View style={[styles.lotRow, { marginTop: 12 }]}>
              <View style={styles.lotCell}><Text style={styles.lotL}>Shares</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={shares} onChangeText={setShares} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Price / share</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Date</Text><DateField value={date} onChange={setDate} label="transaction date" style={styles.lotIn} /></View>
            </View>
          )}
          {(isCash || isTransfer || (isDiv && !reinvest)) && (
            <View style={[styles.lotRow, { marginTop: 12 }]}>
              <View style={styles.lotCell}><Text style={styles.lotL}>Amount</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Date</Text><DateField value={date} onChange={setDate} label="transaction date" style={styles.lotIn} /></View>
            </View>
          )}

          <TouchableOpacity style={[styles.saveBtn, !valid && { opacity: 0.4 }]} disabled={!valid} accessibilityRole="button" accessibilityLabel={`Record ${txnLabel(type).toLowerCase()}`} onPress={save}><Text style={styles.saveBtnT}>Record {txnLabel(type).toLowerCase()}</Text></TouchableOpacity>
          <View style={{ height: 16 }} />
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────────────────────── Activity / history ─────────────────────────
export function HistorySheet({ open, transactions, accounts, onClose, onDelete }: {
  open: boolean; transactions: Transaction[]; accounts: AssetAccount[]; onClose: () => void; onDelete: (id: string) => void;
}) {
  const acctName = (id?: string) => { const a = accounts.find((x) => x.asset_id === id); return a ? (a.institution?.trim() || a.label) : '—'; };
  return (
    <Modal visible={open} transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <Text style={styles.sheetT}>Activity</Text>
        <Text style={styles.sheetS}>Every transaction you've recorded — your full history.</Text>
        <ScrollView automaticallyAdjustKeyboardInsets style={{ maxHeight: 460 }}>
          {transactions.length === 0 && <Text style={styles.hEmpty}>No transactions yet.</Text>}
          {transactions.map((t) => {
            const eff = cashEffect(t);
            // B47 finding 8: a PRICE is cents-precise — $250.10, never $250 (the B44 precision rule, applied here too)
            const detail = t.ticker ? `${t.ticker}${t.shares ? ` · ${t.shares} sh` : ''}${t.price ? ` @ ${money2(t.price)}` : ''}` : acctName(t.account_id);
            return (
              <View key={t.id} style={styles.hRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hType}>{txnLabel(t.type)} <Text style={styles.hDetail}>{detail}</Text></Text>
                  <Text style={styles.hMeta}>{t.date} · {acctName(t.account_id)}{t.counter_account_id ? ` → ${acctName(t.counter_account_id)}` : ''}{t.reinvested ? ' · reinvested' : ''}</Text>
                </View>
                {eff !== 0 && <Text style={[styles.hAmt, { color: eff >= 0 ? Colors.gainText : Colors.red }]}>{eff >= 0 ? '+' : ''}{money(eff)}</Text>}
                <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={`Delete ${txnLabel(t.type).toLowerCase()}${t.ticker ? ` ${t.ticker}` : ''}`} onPress={() => onDelete(t.id)}><Text style={styles.hDel}>✕</Text></TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={styles.applyBtn2} accessibilityRole="button" accessibilityLabel="Done" onPress={onClose}><Text style={styles.saveBtnT}>Done</Text></TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catHead: { flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingBottom: 2 },
  catHeadL: { flex: 1, fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4 },
  catHeadV: { width: 84, textAlign: 'right', fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4 },
  catHeadR: { width: 64, textAlign: 'right', fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 6 },
  catL: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  catV: { width: 84, textAlign: 'right', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  catR: { width: 64, textAlign: 'right', fontSize: 13, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  headDate: { fontSize: 11, color: Colors.textSecondary },
  trioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingTop: 4 },
  trioCell: { minWidth: 96 },
  sumLbl: { fontSize: 11, color: Colors.textSecondary },
  sumValBig: { fontSize: 20, fontWeight: '800', color: Colors.primaryDark, fontVariant: ['tabular-nums'] },
  sumNote: { fontSize: 11, color: Colors.textTertiary, marginTop: 4, lineHeight: 15 },
  walkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  walkL: { flex: 1, fontSize: 13, color: Colors.textPrimary, paddingRight: 16 },
  walkV: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'], minWidth: 92, textAlign: 'right' },
  walkTotal: { borderTopWidth: 1, borderTopColor: Colors.bgTertiary, marginTop: 4, paddingTop: 10 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5 },
  investTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, flex: 1 },
  heroValue: { fontSize: 38, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  honestBlock: { borderTopWidth: 1, borderTopColor: Colors.bgTertiary, marginTop: 10, paddingTop: 8 },
  honestKicker: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 4 },
  freshInHero: { fontSize: 13, color: Colors.textTertiary, marginTop: 4 },
  glanceKicker: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  glanceBig: { fontSize: 24, fontWeight: '800' },
  bdBlock: { marginTop: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 4 },
  bdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  bdL: { fontSize: 13, color: Colors.textSecondary },
  bdV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  bdNote: { fontSize: 11, color: Colors.textTertiary, marginTop: 5 },
  glancePct: { fontSize: 17, fontWeight: '700', color: Colors.textSecondary },
  glanceLine: { fontSize: 15, color: Colors.textPrimary, marginTop: 4 },
  wlAcctHdr: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.4, marginTop: 8, marginBottom: 2 },
  wlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, minHeight: 42 },
  wlHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4, paddingBottom: 2 },
  wlHeadT: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, color: Colors.textTertiary },
  wlChange: { minWidth: 96, textAlign: 'right', fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  wlTicker: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  wlSince: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  wlPct: { width: 62, fontSize: 13, color: Colors.textSecondary, textAlign: 'right', fontVariant: ['tabular-nums'] },
  concCard: { backgroundColor: Colors.amberLight, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm },
  concTxt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, lineHeight: 19 },
  entryCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.sm, minHeight: 52, justifyContent: 'center' },
  entryTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 0.2 },
  entryTag: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary },
  planChip: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark, backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: 10, marginTop: Spacing.sm, overflow: 'hidden' },
  groupHdrTop: { fontSize: 13, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: 2 },
  groupHdr: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  addInvestBtn: { backgroundColor: Colors.primaryDeep, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  addInvestTxt: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  investFoot: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center', lineHeight: 15, marginTop: Spacing.md },
  freshChip: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  freshChipStale: { borderColor: Colors.amberMid, backgroundColor: Colors.amberLight },
  freshChipTxt: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  baDoor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, paddingHorizontal: 12, minHeight: 44, marginTop: 6 },
  baDoorTxt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  baDoorGo: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  invRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, minHeight: 44 },
  invDivider: { borderTopWidth: 1, borderTopColor: Colors.border },
  invName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },   // matches invVal — one row, one size
  invVal: { minWidth: 78, textAlign: 'right', fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  invWeight: { width: 40, textAlign: 'right', fontSize: 13, color: Colors.textTertiary, fontVariant: ['tabular-nums'] },
  invRet: { fontSize: 13, fontWeight: '700', width: 84, textAlign: 'right' },
  invStamp: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  invChev: { fontSize: 17, color: Colors.textTertiary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  refresh: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  freshness: { fontSize: 11, color: Colors.textTertiary, marginTop: 2, marginBottom: 4 },
  tickerWarn: { fontSize: 11, color: Colors.amber, marginTop: 4 },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyT: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  emptyS: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, paddingHorizontal: 24, marginTop: 20 },
  addBtnT: { color: Colors.white, fontSize: 15, fontWeight: '800' },

  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  // the window selector (mock v14): a tray, the chosen window on a white card, hairline dividers
  segBar: { flexDirection: 'row', backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, padding: 3, marginBottom: 10 },
  seg: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 9, paddingHorizontal: 3 },
  segWide: { flex: 1.55 },                       // the Since window carries a date, so it gets the room
  segOn: { backgroundColor: Colors.white, ...Shadows.card },
  segDivider: { width: 1, marginVertical: 12, backgroundColor: Colors.border },
  segK: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  segV: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  segOnT: { color: Colors.primaryDark },
  segRest: { color: Colors.textTertiary },
  segPer: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginTop: -1 },
  axisDay: { fontSize: 11, color: Colors.textSecondary },
  walkChip: { paddingHorizontal: Spacing.base, paddingTop: 4 },
  // the add-an-account sheet — the same shape Net worth uses, so one question looks like one question
  chooserBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  chooserCard: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 34 },
  chooserHead: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.md },
  chooserRow: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: 8, minHeight: 64, justifyContent: 'center' },
  chooserTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  chooserSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  periodPill: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: Radii.pill, backgroundColor: Colors.cardBg },
  // the coverage sentence: quiet, wraps rather than truncating — a limit stated in half a sentence
  // is worse than not stating it at all.
  coverageLine: { fontSize: 11, color: Colors.textTertiary, lineHeight: 16, marginTop: 8, marginHorizontal: 2 },
  periodPillOn: { backgroundColor: Colors.primary },
  periodT: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  periodTOn: { color: Colors.white },

  summary: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.base, marginTop: 12, alignItems: 'center' },
  sumVal: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary },
  sumLab: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  sumRow: { flexDirection: 'row', marginTop: 14, alignSelf: 'stretch' },
  sumCell: { flex: 1, alignItems: 'center' },
  whatIfRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  whatIfBtn: { flex: 1, backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  whatIfTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  sumCellL: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4 },
  sumCellV: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 3 },

  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 12 },
  tHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tHL: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4 },
  col: { width: 70, textAlign: 'right' },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
  hTicker: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  hName: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  hSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  cellV: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  cellB: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  addLink: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 12 },
  addLink2: { fontSize: 15, fontWeight: '700', color: Colors.primary, paddingVertical: 12, minHeight: 44, textAlignVertical: 'center' },
  primaryAction: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  primaryActionT: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  cgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  cgL: { fontSize: 13, color: Colors.textSecondary },
  cgV: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  trendHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trendChg: { fontSize: 13, fontWeight: '800' },
  trendVs: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legLine: { width: 14, height: 3, borderRadius: 2 },
  legT: { fontSize: 11, color: Colors.textSecondary },
  attrRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
  attrName: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  attrWt: { width: 44, textAlign: 'right', fontSize: 13, color: Colors.textTertiary },
  attrPts: { width: 70, textAlign: 'right', fontSize: 13, fontWeight: '800' },
  tinyFoot: { fontSize: 11, color: Colors.textTertiary, marginTop: 8 },
  allocBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: Colors.bgTertiary, marginBottom: 10 },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  allocDot: { width: 10, height: 10, borderRadius: 3 },
  allocName: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  allocVal: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  allocPct: { width: 48, textAlign: 'right', fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  foot: { fontSize: 11, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 12 },
  applyBtn2: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  hEmpty: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', paddingVertical: 24 },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
  hType: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  hDetail: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  hMeta: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  hAmt: { fontSize: 15, fontWeight: '800' },
  hDel: { fontSize: 15, color: Colors.textTertiary, paddingHorizontal: 4 },

  scrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' } as any,
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  sheetT: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  sheetS: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8, lineHeight: 17 },
  note: { fontSize: 11, color: Colors.textSecondary, marginTop: 8, lineHeight: 15 },
  fieldL: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 14, marginBottom: 5 },
  acBox: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, marginTop: 4, backgroundColor: Colors.cardBg, overflow: 'hidden' },
  acRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
  acSym: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, width: 60 },
  acName: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 11, fontSize: 15, color: Colors.textPrimary },
  kindWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  kindChip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.pill, paddingHorizontal: 11, paddingVertical: 7 },
  kindChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  kindChipT: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  kindChipTOn: { color: Colors.primaryDark },
  lotRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  lotCell: { flex: 1 },
  lotL: { fontSize: 13, color: Colors.textSecondary, marginBottom: 3 },
  beginnerHint: { fontSize: 11, color: Colors.textTertiary, lineHeight: 15, marginBottom: 8 },
  lotIn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8, padding: 8, fontSize: 13, color: Colors.textPrimary },
  lotDel: { fontSize: 17, color: Colors.red, padding: 8 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnT: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  deleteLink: { fontSize: 13, fontWeight: '700', color: Colors.red, textAlign: 'center', marginTop: 14 },
});

