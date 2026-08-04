// Holding detail — stock / fund (FCC detailed design v1.1, Invest sheet r20-r31): one ticker's
// full story — what you own, what you paid, what it's worth, how it compares, and the tax facts
// if you sold (clearly an estimate). Every number is the SAME helper the Invest main list uses;
// nothing is recomputed differently here (r24: same row object, no recomputation).
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { maskedMoney, maskedMoney2, maskedPrice3, spokenMoney } from '../components/useMoney';
import { realizedFromLedger } from '../domain/performance/realized';
import { InfoDot } from '../components/UI';
import { priceFreshness } from '../services/marketData';
import {
  buildPerformance, totalShares, costBasis, capGains, capGainsTax, benchmarkTicker,
  PERIODS, startDateFor, type Period, type Position, type PerformanceRow,
} from '../domain/performance';
import { HoldingEditor, TransactionSheet, HistorySheet } from './PerformanceScreen';
import { userCapGainsRates } from '../domain/income';
import type { AssetAccount } from '../domain/assets';

const pct = (v: number | null | undefined) => (v == null ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v * 1000) / 10)}%`);
const PERIOD_WORDS: Record<string, string> = { '1M': 'month', '3M': '3 months', '6M': '6 months', YTD: 'year so far', '1Y': 'year', '3Y': '3 years' };

/** The hero sparkline — the period's daily closes, nothing smoothed or invented. */
function PriceGraph({ pts, up }: { pts: { date: string; close: number }[]; up: boolean }) {
  const W = 300, H = 84;
  const lo = Math.min(...pts.map((x) => x.close)), hi = Math.max(...pts.map((x) => x.close));
  const span = hi - lo || 1;
  const line = pts.map((x, i) => `${(i / (pts.length - 1)) * W},${H - 6 - ((x.close - lo) / span) * (H - 12)}`).join(' ');
  return (
    <View style={{ marginTop: 10 }} accessible accessibilityLabel={`Price graph, ${pts.length} points, ${up ? 'up' : 'down'} over the window`}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Polyline points={line} fill="none" stroke={up ? Colors.successGreen : Colors.red} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}
const dateWords = (iso: string) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return m >= 1 && m <= 12 ? `${MO[m - 1]} ${d}, ${y}` : String(iso);
};

export default function HoldingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ account?: string; position?: string; period?: string }>();
  // walk row 16 (audit Design ICP #6): the page opens on the period you had selected on Invest;
  // finding 6 (approved mock v2): the chips now live on this page too, driving the graph + compare
  const [period, setPeriod] = useState<Period>(
    (PERIODS as readonly string[]).includes(String(params.period)) ? (params.period as Period) : '1Y');
  const store = useStore() as any;
  const accounts: AssetAccount[] = store.assetAccounts ?? [];
  const account = accounts.find((a) => a.asset_id === String(params.account));
  const position: Position | undefined = (account?.positions ?? []).find((p: Position) => p.position_id === String(params.position));
  const [editOpen, setEditOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);   // B47 finding 4: silent exit after delete
  const [txnOpen, setTxnOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const priceCache = store.priceCache ?? {};
  const priceOf = (t: string) => priceCache[t.trim().toUpperCase()];

  // r24: the SAME row the Invest main list computes for this holding — one helper, one number
  const row: PerformanceRow | null = useMemo(
    () => (position ? buildPerformance([position], priceOf, period)[0] : null),
    [position, priceCache, period],
  );

  // B47 finding 4: deleting re-renders BEFORE router.back() finishes — the not-found screen
  // flashed as an "error" while the (correct) deletion exited. Leaving = render nothing, quietly.
  if (leaving) return null;
  if (!account || !position || !row) {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        <Text style={s.h1}>This holding isn't here any more</Text>
        <Text style={s.sub}>It may have been deleted. Your investments live on the Performance tab.</Text>
        <TouchableOpacity accessibilityRole="button" style={s.cta} onPress={() => router.replace('/(tabs)/invest')} accessibilityLabel="Open the Performance tab">
          <Text style={s.ctaTxt}>Open Performance ›</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const ticker = position.ticker;
  const name = position.label?.trim() || ticker;
  const shares = totalShares(position);
  const basis = costBasis(position);
  const rawAvg = shares > 0 ? basis / shares : 0;   // unrounded — avgCost() clips $1.132 to $1.13
  const hasPrice = row.price != null;
  const closed = shares <= 0;
  const value = hasPrice ? row.marketValue : basis;      // r30: no price → show what you paid
  const gain = hasPrice ? row.gain : null;
  const roi = hasPrice ? row.totalROI : null;
  const fresh = priceFreshness(store.pricesFetchedAt, Date.now());

  // finding 6 (approved mock v2): the price series drives the hero graph and the change line.
  const series = hasPrice ? priceOf(ticker) : null;
  const graphPts = useMemo(() => {
    const pts = (series?.points ?? []).filter((x: any) => x.close > 0);
    const startIso = startDateFor(period, new Date()).toISOString().slice(0, 10);
    const inWindow = pts.filter((x: any) => String(x.date) >= startIso);
    return inWindow.length >= 2 ? inWindow : pts.slice(-2);      // thin history: show what exists
  }, [series, period]);
  const dayChange = useMemo(() => {
    const pts = series?.points ?? [];
    if (pts.length < 2) return null;
    const last = pts[pts.length - 1].close, prev = pts[pts.length - 2].close;
    return prev > 0 ? { d: last - prev, p: (last - prev) / prev } : null;
  }, [series]);

  // r26: the tax card — per-lot long/short split; the two gains sum to the header gain by construction
  const cg = hasPrice ? capGains(position, row.price) : null;
  const cgRates = userCapGainsRates(store.onboardingProfile ?? null);   // PRD F3#17: THEIR rates, not 15/24 flat
  const tax = cg ? capGainsTax(cg.longGain, cg.shortGain, cgRates.lt, cgRates.st) : null;

  // r29: dividends received — this ticker's DIVIDEND rows in the ONE ledger
  const dividends = useMemo(() => {
    const rows = ((store.transactions ?? []) as any[]).filter((t) => t.type === 'DIVIDEND' && String(t.ticker).toUpperCase() === ticker.toUpperCase());
    const cutoff = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const sum = (list: any[]) => list.reduce((t, x) => t + (x.amount || 0), 0);
    return { trailing12: sum(rows.filter((t) => String(t.date) >= cutoff)), allTime: sum(rows) };
  }, [store.transactions, ticker]);

  // r162: a bond FUND (ticker'd, bond benchmark) gets the general mechanism sentence — never a
  // live claim about what rates did this year
  const isBondFund = benchmarkTicker(position.kind) === 'AGG';

  const headerA11y = closed
    ? `${name}, position closed, all shares sold`
    : `${name}, worth ${maskedMoney(Math.round(value))}${gain != null ? `, ${gain >= 0 ? 'up' : 'down'} ${maskedMoney(Math.abs(Math.round(gain)))}${roi != null ? `, ${Math.abs(Math.round(roi * 100))} percent since purchase` : ''}` : ''}`;

  const tickerTxns = ((store.transactions ?? []) as any[]).filter((t) => String(t.ticker ?? '').toUpperCase() === ticker.toUpperCase());
  const realized = realizedFromLedger(store.transactions ?? [], { ticker, accountId: account.asset_id });

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.topRow}>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} accessibilityLabel="Back" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.back}>‹ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={() => setEditOpen(true)} accessibilityLabel="Edit this holding" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.back}>✎ Edit</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.h1}>{name}{name !== ticker ? ` (${ticker})` : ''}</Text>
      <Text style={s.sub}>in {account.institution?.trim() || account.label}</Text>

      {/* finding 6 (approved mock v2): price hero → graph → the position as a table */}
      <View style={s.card} accessible accessibilityLabel={headerA11y}>
        {closed ? (
          <>
            <Text style={s.big}>{maskedMoney(0)}</Text>
            <Text style={s.gainLine}>Position closed — all shares sold. Its history is kept below.</Text>
          </>
        ) : hasPrice ? (
          <>
            <Text style={s.kicker}>CURRENT PRICE{fresh.stale ? '' : ' · LIVE'}</Text>
            <Text style={s.big}>{money(row.price as number)}</Text>
            {dayChange != null && (
              <Text style={[s.gainLine, { color: dayChange.d >= 0 ? Colors.gainText : Colors.red }]}>
                {dayChange.d >= 0 ? '▲ up ' : '▼ down '}{maskedMoney2(Math.abs(dayChange.d))} ({Math.abs(Math.round(dayChange.p * 1000) / 10)}%) {fresh.stale ? 'last market day' : 'today'}
              </Text>
            )}
            {fresh.stale && <Text style={[s.metaLine, s.warn]}>prices may be out of date ({fresh.label})</Text>}
            {graphPts.length >= 2 && (
              <>
                <PriceGraph pts={graphPts} up={graphPts[graphPts.length - 1].close >= graphPts[0].close} />
                <View style={s.chipRow}>
                  {PERIODS.map((pd) => (
                    <TouchableOpacity key={pd} accessibilityRole="button" accessibilityState={{ selected: period === pd }} accessibilityLabel={`Show ${pd}`}
                      style={[s.chip, period === pd && s.chipOn]} onPress={() => setPeriod(pd)}>
                      <Text style={[s.chipTxt, period === pd && s.chipTxtOn]}>{pd}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <View style={s.tblTop}>
              <View style={s.tRow}><Text style={s.tL}>Current value</Text><Text style={s.tV}>{maskedMoney2(value)}</Text></View>
              {gain != null && (
                <View style={s.tRow}><Text style={s.tL}>Change since purchase</Text>
                  <Text style={[s.tV, { color: gain >= 0 ? Colors.gainText : Colors.red }]}>{gain >= 0 ? '▲ +' : '▼ −'}{maskedMoney2(Math.abs(gain))}{roi != null ? ` (${pct(roi)})` : ''}</Text></View>
              )}
              <View style={s.tRow}><Text style={s.tL}>Quantity</Text><Text style={s.tV}>{shares} share{shares === 1 ? '' : 's'}</Text></View>
              <View style={s.tRow}><Text style={s.tL}>Price paid (average)</Text><Text style={s.tV}>{maskedPrice3(rawAvg)}</Text></View>
            </View>
          </>
        ) : (
          <>
            <Text style={[s.kicker, s.warn]}>NO LIVE PRICE — SHOWING WHAT YOU PAID</Text>
            <Text style={s.big}>{maskedMoney2(value)}</Text>
            <Text style={s.metaLine}>⏱ live pricing arrives with the price provider</Text>
            <View style={s.tblTop}>
              <View style={s.tRow}><Text style={s.tL}>Quantity</Text><Text style={s.tV}>{shares} share{shares === 1 ? '' : 's'}</Text></View>
              <View style={s.tRow}><Text style={s.tL}>Price paid (average)</Text><Text style={s.tV}>{maskedPrice3(rawAvg)}</Text></View>
            </View>
            <Text style={s.note}>No market compare, dividends or tax estimate without a live price — sections appear when pricing does. Nothing invented.</Text>
          </>
        )}
      </View>

      {/* vs the stock market — SAME DATES (r24); window words match the math (capped at purchase) */}
      {hasPrice && !closed && (row.periodReturn != null && row.benchReturn != null ? (
        <View style={s.card} accessible
          accessibilityLabel={`Versus the stock market, same dates: your return ${row.periodReturn >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(row.periodReturn * 1000) / 10)} percent, the market ${Math.abs(Math.round(row.benchReturn * 1000) / 10)} percent, you are ${(row.beatBy ?? 0) >= 0 ? 'ahead' : 'behind'} by ${Math.abs(Math.round((row.beatBy ?? 0) * 1000) / 10)} points`}>
          <Text style={s.kicker}>VS THE STOCK MARKET · SAME DATES</Text>
          <View style={s.tRow}><Text style={s.tL}>{row.cappedSince ? 'Your return since purchase' : `Your return, past ${PERIOD_WORDS[period]}`}</Text><Text style={s.tV}>{pct(row.periodReturn)}</Text></View>
          <View style={s.tRow}><Text style={s.tL}>The market, same dates</Text><Text style={s.tV}>{pct(row.benchReturn)}</Text></View>
          {row.beatBy != null && (
            <View style={s.tRow}><Text style={s.tL}>You are</Text>
              <Text style={[s.tV, { color: row.beatBy >= 0 ? Colors.gainText : Colors.red }]}>{row.beatBy >= 0 ? 'ahead' : 'behind'} by {Math.abs(Math.round(row.beatBy * 1000) / 10)} points</Text></View>
          )}
          <View style={s.kickerRow}><Text style={s.note}>price changes only — dividends not included</Text><InfoDot term="benchmark" /></View>
          {isBondFund && <Text style={s.note}>Bond funds fall when interest rates rise — that's the mechanism, not a prediction.</Text>}
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.kicker}>VS THE STOCK MARKET</Text>
          <Text style={s.note}>Not enough price history for a fair comparison — check back as prices fill in.</Text>
        </View>
      ))}

      {/* what you bought — r25: the lots ARE the cost basis */}
      <View style={s.card}>
        <Text style={s.kicker}>WHAT YOU BOUGHT</Text>
        {position.lots.map((l) => (
          <TouchableOpacity accessibilityRole="button" key={l.lot_id} style={s.lotRow} onPress={() => setEditOpen(true)}
            accessibilityLabel={`${l.shares} shares at ${spokenMoney(l.cost_per_share)} on ${dateWords(l.purchase_date)}. Opens the editor.`}>
            <Text style={s.lotDate}>{dateWords(l.purchase_date)}</Text>
            <Text style={s.lotShares}>{l.shares} sh @ {maskedMoney2(l.cost_per_share)}</Text>
          </TouchableOpacity>
        ))}
        <View style={[s.tRow, s.tTotal]}><Text style={[s.tL, { fontWeight: '800', color: Colors.textPrimary }]}>Total paid</Text><Text style={s.tV}>{maskedMoney2(basis)}</Text></View>
        <Text style={s.note}>These purchases are the cost basis — they explain the average cost above.</Text>
      </View>

      {/* dividends & realized — one card (mock v2); facts from the ledger, zeros said plainly */}
      {hasPrice && !closed && (
        <View style={s.card}>
          <Text style={s.kicker}>DIVIDENDS & REALIZED</Text>
          <View style={s.tRow}><Text style={s.tL}>Dividends received (12 mo)</Text><Text style={s.tV}>{maskedMoney2(dividends.trailing12)}</Text></View>
          <View style={s.tRow}><Text style={s.tL}>Realized from sales</Text>
            <Text style={s.tV}>{realized.sellsCounted > 0
              ? `${realized.realizedAllTime >= 0 ? '+' : '−'}${maskedMoney2(Math.abs(realized.realizedAllTime))} all time`
              : `${maskedMoney2(0)} — nothing sold`}</Text></View>
          {realized.sellsCounted > 0 && (
            <Text style={s.noteLine}>From your recorded buys and sells (oldest shares sold first).{realized.sellsWithoutBasis > 0 ? ` ${realized.sellsWithoutBasis} sale${realized.sellsWithoutBasis === 1 ? '' : 's'} had no recorded purchase, so its gain isn't counted.` : ''}</Text>
          )}
        </View>
      )}

      {/* if you sold today — r26, table grammar; the estimate labeled in real text */}
      {cg && !closed && (
        <View style={s.card}>
          <Text style={s.kicker}>IF YOU SOLD TODAY</Text>
          <View style={s.tRow}><Text style={s.tL}>Gain — long-term (held over 1 yr)</Text><Text style={s.tV}>{cg.longGain >= 0 ? '+' : '−'}{maskedMoney2(Math.abs(cg.longGain))}</Text></View>
          {cg.shortGain !== 0 && <View style={s.tRow}><Text style={s.tL}>Gain — short-term (under 1 yr)</Text><Text style={s.tV}>{cg.shortGain >= 0 ? '+' : '−'}{maskedMoney2(Math.abs(cg.shortGain))}</Text></View>}
          {tax != null && tax > 0 && (
            <View style={s.tRow}><Text style={s.tL}>~ Tax at your own rate ({Math.round(cgRates.lt * 100)}%)</Text><Text style={s.tV}>{maskedMoney(Math.round(tax))}</Text></View>
          )}
          <Text style={s.note}>an estimate from your filing status — not advice</Text>
        </View>
      )}

      {/* look back entry — r27; hides with no price (no honest counterfactual) */}
      {hasPrice && !closed && (
        <TouchableOpacity accessibilityRole="button" style={s.entryCard}
          onPress={() => router.push(`/look-back?from=${encodeURIComponent(ticker)}&amount=${Math.round(value)}` as any)}
          accessibilityLabel={`Look back: what if I'd sold ${ticker} a year ago? Opens the look-back page pre-filled.`}>
          <Text style={s.entryTitle}>LOOK BACK: what if I'd sold a year ago? ›</Text>
          <Text style={s.note}>Real past prices — a fact about the past, not a suggestion.</Text>
        </TouchableOpacity>
      )}

      <View style={s.btnRow}>
        <TouchableOpacity accessibilityRole="button" style={s.btn} onPress={() => setTxnOpen(true)} accessibilityLabel={`Record a buy or sell for ${ticker}`}>
          <Text style={s.btnTxt}>Record buy/sell</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={s.btn} onPress={() => setHistoryOpen(true)} accessibilityLabel={`See ${ticker}'s activity`}>
          <Text style={s.btnTxt}>Activity</Text>
        </TouchableOpacity>
      </View>

      <HoldingEditor
        open={editOpen} accounts={accounts} existing={{ accountId: account.asset_id, position }}
        onClose={() => setEditOpen(false)}
        onSave={(accountId: string, p: Position, isNew: boolean) => {
          if (isNew) store.addPosition(accountId, p);
          else store.updatePosition(accountId, p.position_id, p);
          setEditOpen(false);
        }}
        onDelete={() => { setEditOpen(false); setLeaving(true); store.deletePosition(account.asset_id, position.position_id); router.back(); }}
      />
      <TransactionSheet open={txnOpen} accounts={accounts} prefill={{ accountId: account.asset_id, ticker }}
        onClose={() => setTxnOpen(false)}
        onSave={(t: any) => { store.recordTransaction(t); setTxnOpen(false); }} />
      <HistorySheet open={historyOpen} transactions={tickerTxns} accounts={accounts}
        onClose={() => setHistoryOpen(false)} onDelete={(id: string) => store.deleteTransaction(id)} />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  back: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  big: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary },
  gainLine: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  metaLine: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  warn: { color: Colors.amber },
  kicker: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 6 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  line: { fontSize: 15, color: Colors.textPrimary, marginTop: 3 },
  noteLine: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  note: { fontSize: 12, color: Colors.textTertiary, marginTop: 6 },
  estimate: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, marginBottom: 4 },
  lotRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, minHeight: 44, alignItems: 'center' },
  tblTop: { marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  tRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, gap: 12 },
  tL: { fontSize: 14, color: Colors.textSecondary, flexShrink: 1 },
  tV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'], textAlign: 'right' },
  tTotal: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  chip: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipOn: { borderColor: Colors.textPrimary, backgroundColor: Colors.textPrimary },
  chipTxt: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTxtOn: { color: Colors.cardBg },
  lotShares: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  lotDate: { fontSize: 13, color: Colors.textSecondary },
  entryCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  entryTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  btn: { flex: 1, backgroundColor: Colors.cardBg, borderRadius: Radii.md, paddingVertical: 12, alignItems: 'center', minHeight: 44 },
  btnTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.lg },
  ctaTxt: { color: Colors.white, fontSize: 15, fontWeight: '800' },
});
