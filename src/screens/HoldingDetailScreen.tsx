// Holding detail — stock / fund (FCC detailed design v1.1, Invest sheet r20-r31): one ticker's
// full story — what you own, what you paid, what it's worth, how it compares, and the tax facts
// if you sold (clearly an estimate). Every number is the SAME helper the Invest main list uses;
// nothing is recomputed differently here (r24: same row object, no recomputation).
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { maskedMoney, maskedMoney2, spokenMoney } from '../components/useMoney';
import { realizedFromLedger } from '../domain/performance/realized';
import { InfoDot } from '../components/UI';
import { priceFreshness } from '../services/marketData';
import {
  buildPerformance, totalShares, costBasis, avgCost, capGains, capGainsTax, benchmarkTicker,
  latestClose, type Position, type PerformanceRow,
} from '../domain/performance';
import { HoldingEditor, TransactionSheet, HistorySheet } from './PerformanceScreen';
import { userCapGainsRates } from '../domain/income';
import type { AssetAccount } from '../domain/assets';

const pct = (v: number | null | undefined) => (v == null ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v * 1000) / 10)}%`);
const dateWords = (iso: string) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return m >= 1 && m <= 12 ? `${MO[m - 1]} ${d}, ${y}` : String(iso);
};

export default function HoldingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ account?: string; position?: string; period?: string }>();
  // walk row 16 (audit Design ICP #6): the page opens on the period you had selected on Invest
  const period = (['1M', '3M', '6M', 'YTD', '1Y', '3Y'] as const).includes(params.period as any) ? (params.period as any) : '1Y';
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
        <Text style={s.sub}>It may have been deleted. Your investments live on the Invest tab.</Text>
        <TouchableOpacity accessibilityRole="button" style={s.cta} onPress={() => router.replace('/(tabs)/invest')} accessibilityLabel="Open the Invest tab">
          <Text style={s.ctaTxt}>Open Invest ›</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const ticker = position.ticker;
  const name = position.label?.trim() || ticker;
  const shares = totalShares(position);
  const basis = costBasis(position);
  const hasPrice = row.price != null;
  const closed = shares <= 0;
  const value = hasPrice ? row.marketValue : basis;      // r30: no price → show what you paid
  const gain = hasPrice ? row.gain : null;
  const roi = hasPrice ? row.totalROI : null;
  const fresh = priceFreshness(store.pricesFetchedAt, Date.now());

  // r26: the tax card — per-lot long/short split; the two gains sum to the header gain by construction
  const cg = hasPrice ? capGains(position, row.price) : null;
  const cgRates = userCapGainsRates(store.onboardingProfile ?? null);   // PRD F3#17: THEIR rates, not 15/24 flat
  const tax = cg ? capGainsTax(cg.longGain, cg.shortGain, cgRates.lt, cgRates.st) : null;

  // r29: dividends received — this ticker's DIVIDEND rows in the ONE ledger
  const dividends = useMemo(() => {
    const rows = ((store.transactions ?? []) as any[]).filter((t) => t.type === 'DIVIDEND' && String(t.ticker).toUpperCase() === ticker.toUpperCase());
    const year = String(new Date().getFullYear());
    const sum = (list: any[]) => list.reduce((t, x) => t + (x.amount || 0), 0);
    return { thisYear: sum(rows.filter((t) => String(t.date).startsWith(year))), allTime: sum(rows) };
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
      </View>
      <Text style={s.h1}>{name}{name !== ticker ? ` (${ticker})` : ''}</Text>
      <Text style={s.sub}>in {account.institution?.trim() || account.label}</Text>

      {/* value + gain header — r22 */}
      <View style={s.card} accessible accessibilityLabel={headerA11y}>
        {closed ? (
          <>
            <Text style={s.big}>{maskedMoney(0)}</Text>
            <Text style={s.gainLine}>Position closed — all shares sold. Its history is kept below.</Text>
          </>
        ) : (
          <>
            <Text style={s.big}>{maskedMoney2(value)}</Text>
            {gain != null && (
              <Text style={[s.gainLine, { color: gain >= 0 ? Colors.gainText : Colors.red }]}>
                {gain >= 0 ? '▲ Up +' : '▼ Down −'}{maskedMoney2(Math.abs(gain))}{roi != null ? ` (${pct(roi)})` : ''} since purchase
              </Text>
            )}
            <Text style={s.metaLine}>{shares} share{shares === 1 ? '' : 's'} · average cost {maskedMoney2(avgCost(position))}</Text>
            {hasPrice ? (
              <Text style={[s.metaLine, fresh.stale && s.warn]}>Price {money(row.price as number)} · {fresh.stale ? `prices may be out of date (${fresh.label})` : `updated ${fresh.label}`}</Text>
            ) : (
              <Text style={[s.metaLine, s.warn]}>no current price — showing what you paid</Text>
            )}
          </>
        )}
      </View>

      {/* vs the stock market — r24; hides when no honest comparison exists (r30) */}
      {hasPrice && !closed && (row.periodReturn != null && row.benchReturn != null ? (
        <View style={s.card} accessible
          accessibilityLabel={`Versus the stock market over one year: ${ticker} ${row.periodReturn >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(row.periodReturn * 1000) / 10)} percent, market ${Math.abs(Math.round(row.benchReturn * 1000) / 10)} percent, ${(row.beatBy ?? 0) >= 0 ? 'ahead' : 'behind'} by ${Math.abs(Math.round((row.beatBy ?? 0) * 1000) / 10)} points`}>
          <Text style={s.kicker}>VS THE STOCK MARKET (1 yr)</Text>
          <Text style={s.line}>{ticker} {row.periodReturn >= 0 ? 'up' : 'down'} {pct(row.periodReturn)} · market {pct(row.benchReturn)}</Text>
          {row.beatBy != null && (
            <Text style={[s.line, { fontWeight: '800', color: row.beatBy >= 0 ? Colors.gainText : Colors.red }]}>
              {row.beatBy >= 0 ? 'Ahead' : 'Behind'} by {Math.abs(Math.round(row.beatBy * 1000) / 10)} points
            </Text>
          )}
          {isBondFund && <Text style={s.note}>Bond funds fall when interest rates rise — that's the mechanism, not a prediction.</Text>}
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.kicker}>VS THE STOCK MARKET</Text>
          <Text style={s.note}>Not enough price history for a fair one-year comparison — check back as prices fill in.</Text>
        </View>
      ))}

      {/* what you bought — r25: the lots ARE the cost basis */}
      <View style={s.card}>
        <Text style={s.kicker}>WHAT YOU BOUGHT</Text>
        {position.lots.map((l) => (
          <TouchableOpacity accessibilityRole="button" key={l.lot_id} style={s.lotRow} onPress={() => setEditOpen(true)}
            accessibilityLabel={`${l.shares} shares at ${spokenMoney(l.cost_per_share)} on ${dateWords(l.purchase_date)}. Opens the editor.`}>
            <Text style={s.lotShares}>{l.shares} share{l.shares === 1 ? '' : 's'} at {maskedMoney2(l.cost_per_share)}</Text>
            <Text style={s.lotDate}>{dateWords(l.purchase_date)}</Text>
          </TouchableOpacity>
        ))}
        <Text style={s.note}>These purchases are the cost basis — they explain the average cost above.</Text>
      </View>

      {/* if you sold today — r26, estimate labeled in real text */}
      {cg && !closed && (
        <View style={s.card}>
          <View style={s.kickerRow}>
            <Text style={s.kicker}>IF YOU SOLD TODAY</Text>
            <InfoDot term="capitalGains" />
          </View>
          <Text style={s.estimate}>Estimate, not tax advice</Text>
          <Text style={s.line}>Held over a year: {cg.longGain >= 0 ? '+' : '−'}{maskedMoney2(Math.abs(cg.longGain))} — taxed at the lower rate</Text>
          <Text style={s.line}>Held under a year: {cg.shortGain >= 0 ? '+' : '−'}{maskedMoney2(Math.abs(cg.shortGain))}</Text>
          {tax != null && tax > 0 && <Text style={[s.line, { fontWeight: '800' }]}>Estimated tax: ~{maskedMoney(Math.round(tax))}</Text>}
        </View>
      )}

      {/* realized gains from sales — PRD Invest r3 + NW r43 (founder-asked; built 2026-07-18) */}
      {realized.sellsCounted > 0 && (
        <View style={s.card}>
          <Text style={s.kicker}>REALIZED FROM SALES</Text>
          <Text style={s.line}>
            {realized.realizedAllTime >= 0 ? '+' : '−'}{maskedMoney2(Math.abs(realized.realizedAllTime))} all time
            {` · ${realized.realizedThisYear >= 0 ? '+' : '−'}${maskedMoney2(Math.abs(realized.realizedThisYear))} this year`}
          </Text>
          <Text style={s.noteLine}>From your recorded buys and sells (oldest shares sold first).{realized.sellsWithoutBasis > 0 ? ` ${realized.sellsWithoutBasis} sale${realized.sellsWithoutBasis === 1 ? '' : 's'} had no recorded purchase, so its gain isn't counted.` : ''}</Text>
        </View>
      )}

      {/* dividends received — r29 */}
      {dividends.allTime > 0 && (
        <View style={s.card}>
          <Text style={s.kicker}>DIVIDENDS RECEIVED</Text>
          <Text style={s.line}>{maskedMoney2(dividends.thisYear)} this year · {maskedMoney2(dividends.allTime)} all time</Text>
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
        <TouchableOpacity accessibilityRole="button" style={s.btn} onPress={() => setHistoryOpen(true)} accessibilityLabel={`See ${ticker}'s transaction history`}>
          <Text style={s.btnTxt}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={s.btn} onPress={() => setEditOpen(true)} accessibilityLabel="Edit this holding">
          <Text style={s.btnTxt}>Edit holding</Text>
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
  topRow: { flexDirection: 'row', marginBottom: Spacing.sm },
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
