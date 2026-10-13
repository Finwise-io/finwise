// Holding detail — stock / fund (FCC detailed design v1.1, Invest sheet r20-r31): one ticker's
// full story — what you own, what you paid, what it's worth, how it compares, and the tax facts
// if you sold (clearly an estimate). Every number is the SAME helper the Invest main list uses;
// nothing is recomputed differently here (r24: same row object, no recomputation).
import { quantityWithUnit } from '../domain/performance';
import { saleShortOfPurchasesSentence } from '../domain/performance/realized';
import TopBar from '../components/TopBar';
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SectionBand } from '../components/SectionBand';
import Svg, { Polyline } from 'react-native-svg';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
// Say plainly when a window reaches further back than this holding's price history (priceHistoryShortSentence).
// Founder 2026-08-18: a chip may name a longer period than we can actually see.
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { maskedMoney, maskedMoney2, maskedPrice, coinQuantity, spokenMoney } from '../components/useMoney';
import { theHolding } from '../../MoneyKeel/functions/networth-and-performance/holding';
import { windowStartKey } from '../../MoneyKeel/functions/networth-and-performance/performance';
import { fig, figSpoken, figWords } from '../components/figure';   // rule 11: a figure prints with its identifier
import { InfoDot } from '../components/UI';
import { priceFreshness } from '../services/marketData';
import {
  buildPerformance, benchmarkTicker,
  PERIODS, priceHistoryShortSentence, type Period, type Position, type PerformanceRow,
} from '../domain/performance';
import { HoldingEditor, TransactionSheet, HistorySheet } from './PerformanceScreen';
import type { AssetAccount } from '../domain/assets';
import { isoLocalDate } from '../domain/_shared/dates';

// a return is a percent to TWO decimals (precision standard, Q49) — this printed one, and dropped a trailing zero
const pct = (v: number | null | undefined) => (v == null ? '—' : `${v >= 0 ? '+' : '−'}${(Math.abs(v) * 100).toFixed(2)}%`);
const PERIOD_WORDS: Record<string, string> = { '1M': 'month', '3M': '3 months', '6M': '6 months', YTD: 'year so far', '1Y': 'year', '2Y': '2 years' };

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

/** IF YOU SOLD TODAY, A GAIN THAT CANNOT BE WORKED OUT. The section is drawn only when there is a price today, so a
 *  gain is refused here only because a purchase lacks its price paid or share count — and the line says that. It
 *  printed the figure's whole refusal, which begins "No price today", under a live price (mock-match audit v02, 2026-10-11). */
const GAIN_NOT_STATED = 'Not stated — a purchase has no price paid or share count on record.';

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
  // THE WINDOW'S FIRST DAY — the one rule every screen asks (MK-NW-F-090 windowStartKey), which refuses a window
  // name the app does not have (DEC-4640, 2026-10-12). It was calculated here a second way (setMonth, and a
  // name it did not know read as twelve months back).
  const todayKey = isoLocalDate(new Date());
  const windowStart = windowStartKey(period, [], todayKey);
  // The sentence the approved drawing writes when this holding's prices begin after the window opens (holding-detail
  // v02, phone 3) — now from ONE function, the one the Account page asks too (DEC-4641, 2026-10-12).
  const shortBy = useMemo(
    () => priceHistoryShortSentence(position ? priceOf(position.ticker)?.points ?? [] : [], windowStart, period, todayKey),
    [position, priceCache, period, windowStart, todayKey]);

  // B47 finding 4: deleting re-renders BEFORE router.back() finishes — the not-found screen
  // flashed as an "error" while the (correct) deletion exited. Leaving = render nothing, quietly.
  if (leaving) return null;
  if (!account || !position || !row) {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        <TopBar back />
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
  // ONE DOOR (MK-NW-O-006 theHolding, Q-NW-3). The screen assembled this from six functions and its
  // own dividend filter; it asks the question once now, and the two refusals it must honour — no
  // price means what you paid and no gain at all, and a dividend record belongs to this holding only
  // when it names this ticker — live in the door rather than in the screen.
  const answer = theHolding({
    position, accountId: String(account.asset_id), price: row.price ?? null,
    transactions: (store.transactions ?? []) as any[],
  });
  const shares = answer.shares;
  const basis = answer.totalPaid;
  const rawAvg = answer.avgPaidPerShare;   // unrounded — kept at full precision until shown ($1.132, not $1.13)
  const hasPrice = answer.priced;
  const closed = answer.closed;
  const value = answer.value;      // r30: no price → show what you paid
  const gain = hasPrice ? row.gain : null;
  const roi = hasPrice ? row.totalROI : null;
  const fresh = priceFreshness(store.pricesFetchedAt, Date.now());

  // finding 6 (approved mock v2): the price series drives the hero graph and the change line.
  const series = hasPrice ? priceOf(ticker) : null;
  const graphPts = useMemo(() => {
    const pts = (series?.points ?? []).filter((x: any) => x.close > 0);
    const inWindow = windowStart == null ? [] : pts.filter((x: any) => String(x.date) >= windowStart);
    return inWindow.length >= 2 ? inWindow : pts.slice(-2);      // thin history: show what exists
  }, [series, period, windowStart]);
  // THE DAY'S CHANGE COMES FROM THE DOOR (2026-10-01). It was calculated here, from the price series
  // — a money figure derived inline on a screen, which is the one thing the one-door rule forbids.
  // MK-NW-O-006 theHolding computes it from the same closes; the screen only hands it the closes,
  // which it cannot do in the call above because the series depends on that call's own answer.
  const withCloses = useMemo(() => theHolding({
    position, accountId: String(account.asset_id), price: row?.price ?? null,
    transactions: (store.transactions ?? []) as any[],
    recentCloses: (series?.points ?? []).map((pt: any) => pt.close),
  }), [position, account.asset_id, row?.price, store.transactions, series]);
  const dayChange = withCloses.dayChange
    ? { d: withCloses.dayChange.amount, p: withCloses.dayChange.share } : null;

  // r26: per-lot long/short split; the two gains sum to the header gain by construction.
  // The estimated-tax line was CUT by the founder 2026-08-20 (brief §C, Q12): embedded tax on an
  // unrealised gain can't be calculated honestly — the three tax buckets in dollars replace it.
  const cg = answer.capitalGains;

  // r29: dividends received — this ticker's DIVIDEND rows in the ONE ledger
  const dividends = answer.dividends;

  // r162: a bond FUND (ticker'd, bond benchmark) gets the general mechanism sentence — never a
  // live claim about what rates did this year
  // the holding itself is handed over, so a class the person set decides its yardstick (tenet 5; outside review Claude Performance, 2026-10-11)
  const isBondFund = benchmarkTicker(position) === 'AGG';
  // THE QUANTITY WITH ITS UNIT, or its refusal: a share count not on record (or below zero) has no words, and the
  // figure's own refusal is printed — never "0 shares" (tenet 3; outside review Claude Performance, 2026-10-11)
  const quantityWords = quantityWithUnit(position, shares, position.kind === 'crypto' ? coinQuantity : String);

  const headerA11y = closed
    ? `${name}, position closed, all shares sold`
    : `${name}, worth ${figSpoken('MK-NW-M-030', value == null ? null : Math.round(value))}${gain != null ? `, ${gain >= 0 ? 'up' : 'down'} ${figSpoken('MK-NW-M-059', Math.abs(Math.round(gain)))}${roi != null ? `, ${Math.abs(Math.round(roi * 100))} percent since purchase` : ''}` : ''}`;

  const tickerTxns = ((store.transactions ?? []) as any[]).filter((t) => String(t.ticker ?? '').toUpperCase() === ticker.toUpperCase());
  const realized = answer.realised;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
    <TopBar back />
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.topRow}>
        <View />
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
            <Text style={s.big}>{fig('MK-NW-M-030', 0)}</Text>
            {/* Q48 does not apply here: a holding page exists only once a holding was entered, so $0 means sold */}
            <Text style={s.gainLine}>Holding liquidated — all shares sold. Its history is kept below.</Text>
          </>
        ) : null}
        {/* A SOLD HOLDING STILL HAS A PRICE AND A HISTORY (approved drawing holding-detail v02, phone 3):
            the price, the day's change, the graph and its window stay; the position table goes. */}
        {hasPrice ? (
          <>
            <SectionBand inCard inset={20} title={`CURRENT PRICE${fresh.stale ? '' : ' · LIVE'}`} />
            <Text style={s.big}>{fig('MK-NW-M-029', row.price as number)}</Text>
            {dayChange != null && (
              <Text style={[s.gainLine, { color: dayChange.d >= 0 ? Colors.gainText : Colors.red }]}>
                {dayChange.d >= 0 ? '▲ up ' : '▼ down '}{fig('MK-NW-M-060', Math.abs(dayChange.d))} ({(Math.abs(dayChange.p) * 100).toFixed(2)}%) {fresh.stale ? 'last market day' : 'today'}
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
                {/* FOUNDER 2026-08-18: when the price history does not reach back as far as the chip
                    asks for, say so rather than answering a shorter window under the longer label. */}
                {shortBy !== '' && (
                  <Text style={s.coverageLine} accessibilityLabel={shortBy}>{shortBy}</Text>
                )}
              </>
            )}
            {!closed && (
            <View style={s.tblTop}>
              <View style={s.tRow}><Text style={s.tL}>Current value</Text><Text style={s.tV}>{fig('MK-NW-M-030', value)}</Text></View>
              {gain != null && (
                <View style={s.tRow}><Text style={s.tL}>Change since purchase</Text>
                  <Text style={[s.tV, { color: gain >= 0 ? Colors.gainText : Colors.red }]}>{gain >= 0 ? '▲ +' : '▼ −'}{fig('MK-NW-M-059', Math.abs(gain))}{roi != null ? ` (${pct(roi)})` : ''}</Text></View>
              )}
              <View style={s.tRow}><Text style={s.tL}>Quantity</Text><Text style={s.tV}>{quantityWords == null ? fig('MK-NW-M-031', null) : figWords('MK-NW-M-031', quantityWords)}</Text></View>
              <View style={s.tRow}><Text style={s.tL}>Price paid (average)</Text><Text style={s.tV}>{fig('MK-NW-M-032', rawAvg)}</Text></View>
            </View>
            )}
          </>
        ) : closed ? null : (
          <>
            <Text style={[s.kicker, s.warn]}>NO LIVE PRICE — SHOWING WHAT YOU PAID</Text>
            <Text style={s.big}>{fig('MK-NW-M-030', value)}</Text>
            <Text style={s.metaLine}>⏱ live pricing arrives with the price provider</Text>
            <View style={s.tblTop}>
              <View style={s.tRow}><Text style={s.tL}>Quantity</Text><Text style={s.tV}>{quantityWords == null ? fig('MK-NW-M-031', null) : figWords('MK-NW-M-031', quantityWords)}</Text></View>
              <View style={s.tRow}><Text style={s.tL}>Price paid (average)</Text><Text style={s.tV}>{fig('MK-NW-M-032', rawAvg)}</Text></View>
            </View>
            <Text style={s.note}>No market compare, dividends or tax estimate without a live price — sections appear when pricing does. Nothing invented.</Text>
          </>
        )}
      </View>

      {/* vs the stock market — SAME DATES (r24); window words match the math (capped at purchase) */}
      {hasPrice && !closed && (row.periodReturn != null && row.benchReturn != null ? (
        <View style={s.card} accessible
          accessibilityLabel={`Versus the stock market, same dates: your return ${row.periodReturn >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(row.periodReturn * 1000) / 10)} percent, the market ${Math.abs(Math.round(row.benchReturn * 1000) / 10)} percent, you are ${(row.beatBy ?? 0) >= 0 ? 'ahead' : 'behind'} by ${Math.abs(Math.round((row.beatBy ?? 0) * 1000) / 10)} points`}>
          <SectionBand title="VS THE STOCK MARKET · SAME DATES" />
          <View style={s.tRow}><Text style={s.tL}>{row.cappedSince ? 'Your return since purchase' : `Your return, past ${PERIOD_WORDS[period]}`}</Text><Text style={s.tV}>{pct(row.periodReturn)}</Text></View>
          <View style={s.tRow}><Text style={s.tL}>The market, same dates</Text><Text style={s.tV}>{pct(row.benchReturn)}</Text></View>
          {row.beatBy != null && (
            <View style={s.tRow}><Text style={s.tL}>You are</Text>
              <Text style={[s.tV, { color: row.beatBy >= 0 ? Colors.gainText : Colors.red }]}>{row.beatBy >= 0 ? 'ahead' : 'behind'} by {Math.abs(Math.round(row.beatBy * 1000) / 10)} points</Text></View>
          )}
          {/* CORRECTED 2026-10-12 (DEC-4645): this read "price changes only — dividends not included", which was false —
              the holding and its market yardstick (SPY or AGG) are both read from dividend-adjusted closes, so both
              figures include their dividends and interest. The drawing (holding-detail v02) carries a dated line. */}
          <View style={s.kickerRow}><Text style={s.note}>both include dividends and interest</Text><InfoDot term="benchmark" /></View>
          {isBondFund && <Text style={s.note}>Bond funds fall when interest rates rise — that's the mechanism, not a prediction.</Text>}
        </View>
      ) : (
        <View style={s.card}>
          <SectionBand inCard inset={20} title="VS THE STOCK MARKET" />
          <Text style={s.note}>Not enough price history for a fair comparison — check back as prices fill in.</Text>
        </View>
      ))}

      {/* what you bought — r25: the lots ARE the cost basis */}
      {position.lots.length > 0 && (
      <View style={s.card}>
        <SectionBand inCard inset={20} title="WHAT YOU BOUGHT" />
        {position.lots.map((l) => (
          <TouchableOpacity accessibilityRole="button" key={l.lot_id} style={s.lotRow} onPress={() => setEditOpen(true)}
            accessibilityLabel={`${l.shares} shares at ${figSpoken('MK-NW-M-061', l.cost_per_share)} on ${dateWords(l.purchase_date)}. Opens the editor.`}>
            <Text style={s.lotDate}>{dateWords(l.purchase_date)}</Text>
            <Text style={s.lotShares}>{l.shares} sh @ {l.cost_per_share != null && Number.isFinite(l.cost_per_share) ? fig('MK-NW-M-061', l.cost_per_share)
              // a purchase with no price paid says so (READ THIS FIRST 2026-10-11 on holding-detail v02: "each line says
              // what is missing"); it printed the figure's other refusal, "No purchases recorded — the section is not drawn."
              : figWords('MK-NW-M-061', 'no purchase price recorded')}</Text>
          </TouchableOpacity>
        ))}
        <View style={[s.tRow, s.tTotal]}><Text style={[s.tL, { fontWeight: '800', color: Colors.textPrimary }]}>Total paid</Text><Text style={s.tV}>{fig('MK-NW-M-033', basis)}</Text></View>
        <Text style={s.note}>These purchases are the cost basis — they explain the average cost above.</Text>
      </View>
      )}

      {/* dividends & realized — one card (mock v2); facts from the ledger, zeros said plainly */}
      {hasPrice && !closed && (
        <View style={s.card}>
          <SectionBand inCard inset={20} title="DIVIDENDS & REALIZED" />
          <View style={s.tRow}><Text style={s.tL}>Dividends received (12 mo)</Text><Text style={s.tV}>{fig('MK-NW-M-034', dividends.trailing12)}</Text></View>
          <View style={s.tRow}><Text style={s.tL}>Realized from sales</Text>
            <Text style={s.tV}>{realized.sellsCounted > 0
              ? `${realized.realizedAllTime >= 0 ? '+' : '−'}${fig('MK-NW-M-035', Math.abs(realized.realizedAllTime))} all time`
              : realized.shortOfPurchases.length > 0
              // sold, but no purchase on record behind any of it: not "nothing sold" (DEC-4643, 2026-10-12)
              ? figWords('MK-NW-M-035', 'not on record')
              : `${fig('MK-NW-M-035', 0)} — nothing sold`}</Text></View>
          {/* his ruling, 2026-10-04: "$0 — nothing sold" stays; the line about how sales are matched is for when there is a sale */}
          {(realized.sellsCounted > 0 || realized.shortOfPurchases.length > 0) && (
            <Text style={s.noteLine}>From your recorded buys and sells (oldest shares sold first).</Text>
          )}
          {/* A SALE IS COUNTED ONCE (his approval, 2026-10-12, DEC-4643): a sale bigger than the purchases on record
              says what its matched part made and how many shares have no price paid on record — one line per sale.
              It read "1 sale had no recorded purchase" beside a gain counted on the same sale, as if two sales. */}
          {realized.shortOfPurchases.map((sale, i) => (
            <Text key={`${sale.date}-${i}`} style={s.noteLine}>
              {saleShortOfPurchasesSentence(sale, position, (n) => fig('MK-NW-M-035', n), position.kind === 'crypto' ? coinQuantity : String)}
            </Text>
          ))}
        </View>
      )}

      {/* if you sold today — r26, table grammar; the estimate labeled in real text */}
      {cg && !closed && (
        <View style={s.card}>
          <SectionBand inCard inset={20} title="IF YOU SOLD TODAY" />
          <View style={s.tRow}><Text style={s.tL}>Gain — long-term (held over 1 yr)</Text><Text style={s.tV}>{cg.longGain == null ? figWords('MK-NW-M-036', GAIN_NOT_STATED) : `${cg.longGain >= 0 ? '+' : '−'}${fig('MK-NW-M-036', Math.abs(cg.longGain))}`}</Text></View>
          {cg.shortGain !== 0 && <View style={s.tRow}><Text style={s.tL}>Gain — short-term (held 1 yr or less)</Text><Text style={s.tV}>{cg.shortGain == null ? figWords('MK-NW-M-037', GAIN_NOT_STATED) : `${cg.shortGain >= 0 ? '+' : '−'}${fig('MK-NW-M-037', Math.abs(cg.shortGain))}`}</Text></View>}
        </View>
      )}

      {/* THE LOOK-BACK DOOR IS REMOVED (DEC-0030, his word 2026-09-30: "As of now park this", then
          "remove it"). It read "LOOK BACK: what if I'd sold a year ago?" and opened /look-back
          pre-filled with this holding and its value. NOTHING IS STRANDED: /look-back is still reached
          from Account detail and from Contribution room, and the orphan-route guard holds that.
          MK-PF-M-010, MK-PF-M-011 and MK-PF-M-012 keep their door and their worked examples. */}

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
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  back: { color: Colors.primary, fontSize: 17, fontWeight: '700' },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 15, color: Colors.textSecondary, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  big: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary },
  // the text colour unless a change colours it — "Holding liquidated …" had none, so it fell to the platform's black (drawing check 2026-10-12)
  gainLine: { fontSize: 15, fontWeight: '800', marginTop: 2, color: Colors.textPrimary },
  metaLine: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  warn: { color: Colors.amber },
  kicker: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 6 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  line: { fontSize: 15, color: Colors.textPrimary, marginTop: 3 },
  noteLine: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  note: { fontSize: 13, color: Colors.textTertiary, marginTop: 6 },
  estimate: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, marginBottom: 4 },
  lotRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, minHeight: 44, alignItems: 'center' },
  tblTop: { marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  tRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, gap: 12 },
  tL: { fontSize: 15, color: Colors.textSecondary, flexShrink: 1 },
  tV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'], textAlign: 'right' },
  tTotal: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  chip: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  // the coverage sentence: quiet, on the design scale, and it wraps rather than truncating.
  coverageLine: { fontSize: 11, color: Colors.textTertiary, lineHeight: 16, marginTop: 8 },
  chipOn: { borderColor: Colors.textPrimary, backgroundColor: Colors.textPrimary },
  chipTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  chipTxtOn: { color: Colors.cardBg },
  lotShares: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  lotDate: { fontSize: 13, color: Colors.textSecondary },
  entryCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  entryTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  btn: { flex: 1, backgroundColor: Colors.cardBg, borderRadius: Radii.md, paddingVertical: 12, alignItems: 'center', minHeight: 44 },
  btnTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.lg },
  ctaTxt: { color: Colors.white, fontSize: 15, fontWeight: '800' },
});
