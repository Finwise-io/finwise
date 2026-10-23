// Holding detail — stock / fund (FCC detailed design v1.1, Invest sheet r20-r31): one ticker's
// full story — what you own, what you paid, what it's worth, how it compares, and the tax facts
// if you sold (clearly an estimate). Every number is the SAME helper the Invest main list uses;
// nothing is recomputed differently here (r24: same row object, no recomputation).
import { quantityWithUnit, lotCostOnRecord, purchaseDateOnRecord, SECTION_1256_LONG_TERM_PERCENT } from '../domain/performance';
import { saleShortOfPurchasesSentence, gainOnPartSentence } from '../domain/performance/realized';
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
import { theHolding, undatedGainSentence, SECTION_1256_LINE, NOT_CAPITAL_GAINS_LINE, yardstickName, gapWords, purchaseQuantityWords, holdingRowsIn, SHARE_COUNT_NOT_STATED } from '../../MoneyKeel/functions/networth-and-performance/holding';
import { windowStartKey, lastCloseLabel, overTheYearsSentence } from '../../MoneyKeel/functions/networth-and-performance/performance';
import { fig, figSaid, figWords } from '../components/figure';   // rule 11: a figure prints with its identifier
import { SaidText } from '../components/SaidText';   // a line of figures said through the one spoken writer: "hidden", "a year" (2026-10-22)
import { InfoDot } from '../components/UI';
import { priceFreshness } from '../services/marketData';
import {
  benchmarkTicker,
  PERIODS, priceHistoryShortSentence, type Period, type Position, type PerformanceRow,
} from '../domain/performance';
import { HoldingEditor, TransactionSheet, HistorySheet } from './PerformanceScreen';
import type { AssetAccount } from '../domain/assets';
import { isoLocalDate, dateShown } from '../domain/_shared/dates';

// EVERY PERCENT ON THIS PAGE PRINTS BY ITS IDENTIFIER (rule 11; 2026-10-21, Performance launch audit gaps 9 and 10): the
// change since purchase and the day's move as percents (MK-NW-M-067, 068), your return, the market and the gap between them
// (MK-PF-M-023 — the account page's holding Return, one figure on both pages — and MK-NW-M-070, 071). They were written here
// by a formatter of the screen's own, so nothing could check them.
// THE SPOKEN PERCENT IS THE PRINTED ONE, SAID (Q49, 2026-10-21): the figure's own two decimals, without its sign, then the
// word — "38.19 percent"; the direction is said in words beside it.
const percentSaid = (id: string, v: number) => figSaid(id, Math.abs(v)).replace(/^[+−]/, '').replace(/%$/, ' percent');
const directionSaid = (id: string, v: number) => `${v >= 0 ? 'up' : 'down'} ${percentSaid(id, v)}`;
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
// A PURCHASE'S DATE IS WRITTEN BY THE APP'S ONE DATE WRITER (MK-ST-F-078 dateShown, 2026-10-21) — "Mar 14, 2023", as every
// approved screen writes a day. This screen kept its own copy of the same rule, a second place for the wording to drift.
// The drawing (holding-detail v02) writes the month in full; its READ THIS FIRST line of 2026-10-21 corrects it (DEC-4529).

/** IF YOU SOLD TODAY, A GAIN THAT CANNOT BE WORKED OUT. The section is drawn only when there is a price today, so a
 *  gain is refused here only because a purchase lacks its price paid or share count — and the line says that. It
 *  printed the figure's whole refusal, which begins "No price today", under a live price (mock-match audit v02, 2026-10-11). */
const GAIN_NOT_STATED = 'Not stated — a purchase has no price paid or share count on record.';
/** THE AVERAGE AND TOTAL PAID WITH A SHARE COUNT NOT ON RECORD (Q34, 2026-10-21, DEC-7170, the lead's decision under DEC-6627
 *  and DEC-3523 tenets 2 and 4): the row says the share count is what is missing. It printed the figure's refusal, "No price
 *  paid on record.", which names the wrong thing when every purchase has its price.
 *  ONE WORDING FOR ONE CAUSE (2026-10-21; tenets 3 and 4; outside re-run OpenAI part 1, MK-NW-M-030#3 and MK-NW-M-031#3): Current
 *  value and Quantity say it too. They printed their rows' refusals — "No price — it shows what you paid…" under a price of
 *  $290.00, and "All sold — …" for shares that were never entered, not sold. */
// the words live in the door, so the account page says the same (holding.ts SHARE_COUNT_NOT_STATED, 2026-10-22)
/** No price today and no purchase with a price paid on record: nothing is known to show as what was paid (canon row 24). */
const NO_PAID_ON_RECORD = 'No price paid on record.';

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

  // r24: the SAME row the account page prints for this holding — ONE FUNCTION, holdingRowsIn (2026-10-22; tenet 4, MK-PF-M-023):
  // this account's records, its earliest buy standing in for an undated purchase, and the account itself, so a bond's or a
  // CD's interest is part of its return (DEC-6212). It was built here without the earliest buy, a second way to the same row.
  const row: PerformanceRow | null = useMemo(
    () => (position && account ? holdingRowsIn({ account, positions: [position], priceOf, period, transactions: (store.transactions ?? []) as any[] })[0] ?? null : null),
    [position, priceCache, period, store.transactions, account],
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
    position, accountId: String(account.asset_id), account, price: row.price ?? null,
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
  // ONE WAY TO WRITE THIS HOLDING'S QUANTITY (2026-10-21): a coin quantity to eight decimals, its trailing zeros dropped
  // (coinQuantity, the precision standard's formatter for coins); any other quantity as it is held. The purchase rows wrote
  // their quantity raw, so a coin quantity there could run past eight decimals while the Quantity row above was cut to eight.
  const quantityText = (n: number): string => (position.kind === 'crypto' ? coinQuantity(n) : String(n));
  const quantityWords = quantityWithUnit(position, shares, quantityText);
  // WHAT THE VALUE ROWS SAY WHEN THE VALUE CANNOT BE KNOWN (2026-10-21; tenet 3): a share count not on record, or — with no
  // price — no purchase with a price paid on record. Never the row's refusal, which is a sentence about the figure.
  const valueNotKnown = shares == null ? SHARE_COUNT_NOT_STATED : NO_PAID_ON_RECORD;

  // SPOKEN THROUGH THE SAME FORMATTERS AS THE FIGURES ON SCREEN (Q49, 2026-10-21): money rounded once, by the figure's own
  // formatter, and the return to two decimals — it was said as a whole percent ("38 percent" beside +38.19%)
  const headerA11y = closed
    ? `${name}, position closed, all shares sold`
    : `${name}, ${value == null ? valueNotKnown : `worth ${figSaid('MK-NW-M-030', value)}`}${gain != null ? `, ${gain >= 0 ? 'up' : 'down'} ${figSaid('MK-NW-M-059', Math.abs(gain))}${roi != null ? `, ${percentSaid('MK-NW-M-067', roi)} since purchase` : ''}` : ''}`;

  // THE MARKET COMPARISON (2026-10-21). The band names the yardstick this holding is measured against — the stock market for a
  // stock or fund, the bond market for a bond (AGG), gold, bitcoin, a balanced fund — and an Unclassified holding has none
  // (DEC-2160). It said "the stock market" for every holding, false for a bond (DEC-0458, DEC-1624, DEC-6614; tenets 1, 2).
  const yardstick = yardstickName(row.benchTicker);
  // OVER 2Y THE RETURNS ARE YEARLY RATES (DEC-0237, DEC-0404, DEC-0368; the precision order): written /year, with each
  // window's own total said beside it in the Performance tab's sentence. A year or less is the window's own total.
  const yearly = row.years != null;
  const perYear = yearly ? '/year' : '';

  // IF YOU SOLD TODAY — which rows the card draws (2026-10-21):
  //   · inside an account taxed as pre-tax or tax-free, one row, the whole gain, and the line saying why (notCapitalGains);
  //   · an option on a broad-based index, the two rows at 60% and 40% and the line naming the law (section 1256);
  //   · otherwise the holding-period split; a purchase with no purchase date on record is in neither part and has its own
  //     line, and with no dated purchase held the two rows are not drawn and that line carries the gain.
  const cgIndex = cg?.split === 'section_1256';
  const cgNoneDated = !!cg && !cgIndex && cg.undated != null && cg.heldShares != null && cg.undated.held === cg.heldShares;
  const signedGain = (id: string, v: number) => `${v >= 0 ? '+' : '−'}${fig(id, Math.abs(v))}`;

  const tickerTxns = ((store.transactions ?? []) as any[]).filter((t) => String(t.ticker ?? '').toUpperCase() === ticker.toUpperCase());
  const realized = answer.realised;

  // PRICE PAID (AVERAGE), WITH THE INFO DOT THAT STATES ITS RULE (Q34, 2026-10-21; his comment of 2026-08-26 asked for the
  // dot): drawn the same way with a live price and without one. A share count not on record says so on the row.
  const avgRow = () => (
    <View style={s.tRow}>
      <View style={s.kickerRow}><Text style={s.tL}>Price paid (average)</Text><InfoDot term="averagePricePaid" size={15} /></View>
      <Text style={s.tV}>{shares == null ? figWords('MK-NW-M-032', SHARE_COUNT_NOT_STATED) : fig('MK-NW-M-032', rawAvg)}</Text>
    </View>
  );

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
            {/* the price is the latest close the app holds, never a live quote: the band says so, with its day (2026-10-21, MK-NW-M-029) */}
            <SectionBand inCard inset={20} title={lastCloseLabel(position ? priceOf(position.ticker) : null)} />
            <Text style={s.big}>{fig('MK-NW-M-029', row.price as number)}</Text>
            {dayChange != null && (
              <Text style={[s.gainLine, { color: dayChange.d >= 0 ? Colors.gainText : Colors.red }]}>
                {dayChange.d >= 0 ? '▲ up ' : '▼ down '}{fig('MK-NW-M-060', Math.abs(dayChange.d))} ({fig('MK-NW-M-068', Math.abs(dayChange.p))}) {fresh.stale ? 'last market day' : 'today'}
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
              <View style={s.tRow}><Text style={s.tL}>Current value</Text><Text style={s.tV}>{value == null ? figWords('MK-NW-M-030', valueNotKnown) : fig('MK-NW-M-030', value)}</Text></View>
              {gain != null && (
                <View style={s.tRow}><Text style={s.tL}>Change since purchase</Text>
                  <Text style={[s.tV, { color: gain >= 0 ? Colors.gainText : Colors.red }]}>{gain >= 0 ? '▲ +' : '▼ −'}{fig('MK-NW-M-059', Math.abs(gain))}{roi != null ? ` (${fig('MK-NW-M-067', roi)})` : ''}</Text></View>
              )}
              <View style={s.tRow}><Text style={s.tL}>Quantity</Text><Text style={s.tV}>{figWords('MK-NW-M-031', quantityWords ?? SHARE_COUNT_NOT_STATED)}</Text></View>
              {avgRow()}
            </View>
            )}
          </>
        ) : closed ? null : (
          <>
            <Text style={[s.kicker, s.warn]}>NO LIVE PRICE — SHOWING WHAT YOU PAID</Text>
            {/* what was paid, or — when that is not known either — the words saying why, at the size of a line, not a figure */}
            {value == null
              ? <Text style={s.line}>{figWords('MK-NW-M-030', valueNotKnown)}</Text>
              : <Text style={s.big}>{fig('MK-NW-M-030', value)}</Text>}
            <Text style={s.metaLine}>⏱ live pricing arrives with the price provider</Text>
            <View style={s.tblTop}>
              <View style={s.tRow}><Text style={s.tL}>Quantity</Text><Text style={s.tV}>{figWords('MK-NW-M-031', quantityWords ?? SHARE_COUNT_NOT_STATED)}</Text></View>
              {avgRow()}
            </View>
            <Text style={s.note}>No market compare, dividends or tax estimate without a live price — sections appear when pricing does. Nothing invented.</Text>
          </>
        )}
      </View>

      {/* vs the stock market — SAME DATES (r24); window words match the math (capped at purchase) */}
      {hasPrice && !closed && (row.periodReturn != null && row.benchReturn != null && yardstick != null ? (
        <View style={s.card} accessible
          accessibilityLabel={`Versus ${yardstick}, same dates: your return ${directionSaid('MK-PF-M-023', row.periodReturn)}${yearly ? ' a year' : ''}, the market ${directionSaid('MK-NW-M-070', row.benchReturn)}${yearly ? ' a year' : ''}${row.beatBy != null ? `, you are ${gapWords(row.beatBy)}${yearly ? ' a year' : ''}` : ''}`}>
          <SectionBand title={`VS ${yardstick.toUpperCase()} · SAME DATES`} />
          <View style={s.tRow}><Text style={s.tL}>{row.cappedSince ? 'Your return since purchase' : `Your return, past ${PERIOD_WORDS[period]}`}</Text><Text style={s.tV}>{fig('MK-PF-M-023', row.periodReturn)}{perYear}</Text></View>
          <View style={s.tRow}><Text style={s.tL}>The market, same dates</Text><Text style={s.tV}>{fig('MK-NW-M-070', row.benchReturn)}{perYear}</Text></View>
          {/* THE GAP IS TO TWO DECIMALS, like the two returns it is taken from (precision standard, Q49; 2026-10-21): it printed
              one, so +38.19% beside +22.40% read 15.8 points where 15.79 is the difference. The drawing's line of 2026-10-21 says so. */}
          {row.beatBy != null && (
            <View style={s.tRow}><Text style={s.tL}>You are</Text>
              <Text style={[s.tV, { color: row.beatBy >= 0 ? Colors.gainText : Colors.red }]}>{figWords('MK-NW-M-071', gapWords(row.beatBy, yearly) as string)}</Text></View>
          )}
          {/* A YEARLY RATE SAYS SO, WITH THE WINDOW'S OWN TOTAL BESIDE IT (his ruling of 2026-09-25, DEC-0237, DEC-0404; the
              precision order): the Performance tab's sentence, for each of the two returns (2026-10-21, gap 34), from the one writer
              the Performance tab and the account page ask (overTheYearsSentence, 2026-10-22) — the market's line lost its "same". */}
          {yearly && row.periodTotal != null && (
            <Text style={s.noteLine}>{`Your return: ${overTheYearsSentence({ cumulative: row.periodTotal, perYear: row.periodReturn, years: row.years as number }, (v, per) => (per ? `${fig('MK-PF-M-023', v)}/year` : fig('MK-PF-M-023', v)))} — a yearly rate, so it sits fairly beside a one-year window.`}</Text>
          )}
          {yearly && row.benchTotal != null && (
            <Text style={s.noteLine}>{`The market: ${overTheYearsSentence({ cumulative: row.benchTotal ?? null, perYear: row.benchReturn, years: row.years as number }, (v, per) => (per ? `${fig('MK-NW-M-070', v)}/year` : fig('MK-NW-M-070', v)))}.`}</Text>
          )}
          {/* CORRECTED 2026-10-12 (DEC-4645): this read "price changes only — dividends not included", which was false —
              the holding and its market yardstick (SPY or AGG) are both read from dividend-adjusted closes, so both
              figures include their dividends and interest. The drawing (holding-detail v02) carries a dated line. */}
          <View style={s.kickerRow}><Text style={s.note}>both include dividends and interest</Text><InfoDot term="benchmark" /></View>
          {isBondFund && <Text style={s.note}>Bond funds fall when interest rates rise — that's the mechanism, not a prediction.</Text>}
        </View>
      ) : (
        <View style={s.card}>
          {/* the band names the yardstick here too; an Unclassified holding has none, and the line says that is why (DEC-2160) */}
          <SectionBand inCard inset={20} title={`VS ${(yardstick ?? 'the market').toUpperCase()}`} />
          {/* a purchase with no date beside dated ones: no return since purchase, and the reason is that, not the prices
              (2026-10-21, MK-PF-F-040, the lead's decision under DEC-3523 tenet 3) */}
          <Text style={s.note}>{yardstick == null
            ? 'This holding is Unclassified, so there is no market to compare it with.'
            : row?.undatedPurchase
            ? 'A purchase of this holding has no date on record, so its return since purchase cannot be measured.'
            : 'Not enough price history for a fair comparison — check back as prices fill in.'}</Text>
        </View>
      ))}

      {/* what you bought — r25: the lots ARE the cost basis */}
      {position.lots.length > 0 && (
      <View style={s.card}>
        <SectionBand inCard inset={20} title="WHAT YOU BOUGHT" />
        {position.lots.map((l) => {
          // A PURCHASE DATE NOT ON RECORD SAYS SO (2026-10-21; tenet 3): it was drawn blank, and a day that does not exist
          // (31 February) was written as if it did. The one reading of a date: purchaseDateOnRecord, as the gains below use.
          const bought = purchaseDateOnRecord(l.purchase_date);
          const dateWords = bought ? dateShown(bought) : 'Date not on record';
          return (
          <TouchableOpacity accessibilityRole="button" key={l.lot_id} style={s.lotRow} onPress={() => setEditOpen(true)}
            // spoken in the holding's own unit (contracts, coins), as the row is drawn — it said "shares" for every holding
            accessibilityLabel={`${quantityWithUnit(position, l.shares, quantityText) ?? 'no share count on record'} at ${lotCostOnRecord(l) ? figSaid('MK-NW-M-061', l.cost_per_share as number) : 'no price paid on record'}, ${bought ? `bought ${dateWords}` : 'purchase date not on record'}. Opens the editor.`}>
            <Text style={s.lotDate}>{dateWords}</Text>
            {/* ONE RULE FOR WHAT WAS PAID (lotCostOnRecord, 2026-10-20) — the same one the average and the gains use, so a
                purchase this row calls not recorded is the one they leave out.
                THE HOLDING'S OWN UNIT (2026-10-21; DEC-0277; purchaseQuantityWords): "100 sh" for shares as drawn, "2 contracts"
                for an option — it read "2 sh" under Quantity "2 contracts" — and a share count not on record says so. */}
            <Text style={s.lotShares}>{purchaseQuantityWords(position, l.shares, quantityText)} @ {lotCostOnRecord(l) ? fig('MK-NW-M-061', l.cost_per_share as number)
              // a purchase with no price paid says so (READ THIS FIRST 2026-10-11 on holding-detail v02: "each line says
              // what is missing"); it printed the figure's other refusal, "No purchases recorded — the section is not drawn."
              // ONE WORDING FOR AN UNKNOWN PRICE PAID ON THIS CARD (Q34, 2026-10-21; tenet 4): the row, the average, Total paid
              // and the line under them say "no price paid on record", the words of his sale sentence (DEC-4643); canon row 24.
              : figWords('MK-NW-M-061', 'no price paid on record')}</Text>
          </TouchableOpacity>
          );
        })}
        <View style={[s.tRow, s.tTotal]}><Text style={[s.tL, { fontWeight: '800', color: Colors.textPrimary }]}>Total paid</Text><SaidText style={s.tV}>{shares == null ? figWords('MK-NW-M-033', SHARE_COUNT_NOT_STATED) : fig('MK-NW-M-033', basis)}</SaidText></View>
        <Text style={s.note}>These purchases are the cost basis — they explain the average cost above.</Text>
        {/* THE AVERAGE AND THE TOTAL PAID LEAVE OUT A PURCHASE WITH NO PRICE PAID, AND SAY SO HERE, beside the purchase that has
            none (2026-10-20). It counted that purchase as $0: 10 shares at $100 and 10 with no cost read $50.00, and Total paid read
            $1,000 for all 20. Both now count the same purchases as the gains (paidOnRecord, lotCostOnRecord). */}
        {(answer.avgLeavesOut ?? 0) > 0 && (
          <Text style={s.note}>The average above and the total paid leave out {quantityWithUnit(position, answer.avgLeavesOut, quantityText)} with no price paid on record.</Text>
        )}
      </View>
      )}

      {/* dividends & realized — one card (mock v2); facts from the ledger, zeros said plainly */}
      {hasPrice && !closed && (
        <View style={s.card}>
          <SectionBand inCard inset={20} title="DIVIDENDS & REALIZED" />
          {/* THE TWELVE-MONTH WINDOW IS SPELLED OUT (Q35, 2026-10-21, DEC-7171; his comment of 2026-08-26: "Screen should say Trailing
              Twelve Months and not just 12 months"; canon row 23) */}
          {/* NO RECORD NAMES THIS HOLDING, NO LINE (2026-10-21; the row's own refusal, tenet 3; outside re-run OpenAI part 1,
              MK-NW-M-034#3): it read $0 for a holding no dividend record names, as if it had paid nothing */}
          {dividends.records > 0 && (
            <View style={s.tRow}><Text style={s.tL}>Dividends received (trailing twelve months)</Text><SaidText style={s.tV}>{fig('MK-NW-M-034', dividends.trailing12)}</SaidText></View>
          )}
          <View style={s.tRow}><Text style={s.tL}>Realized from sales</Text>
            <SaidText style={s.tV}>{realized.sellsCounted > 0
              ? `${realized.realizedAllTime >= 0 ? '+' : '−'}${fig('MK-NW-M-035', Math.abs(realized.realizedAllTime))} all time`
              : realized.shortOfPurchases.length > 0
              // sold, but no purchase on record behind any of it: not "nothing sold" (DEC-4643, 2026-10-12)
              ? figWords('MK-NW-M-035', 'not on record')
              : `${fig('MK-NW-M-035', 0)} — nothing sold`}</SaidText></View>
          {/* his ruling, 2026-10-04: "$0 — nothing sold" stays; the line about how sales are matched is for when there is a sale */}
          {(realized.sellsCounted > 0 || realized.shortOfPurchases.length > 0) && (
            <Text style={s.noteLine}>From your recorded buys and sells (oldest shares sold first).</Text>
          )}
          {/* A SALE IS COUNTED ONCE (his approval, 2026-10-12, DEC-4643): a sale bigger than the purchases on record
              says what its matched part made and how many shares have no price paid on record — one line per sale.
              It read "1 sale had no recorded purchase" beside a gain counted on the same sale, as if two sales. */}
          {realized.shortOfPurchases.map((sale, i) => (
            <SaidText key={`${sale.date}-${i}`} style={s.noteLine}>
              {saleShortOfPurchasesSentence(sale, position, (n) => fig('MK-NW-M-035', n), quantityText)}
            </SaidText>
          ))}
        </View>
      )}

      {/* if you sold today — r26, table grammar; the estimate labeled in real text */}
      {cg && !closed && (
        <View style={s.card}>
          <SectionBand inCard inset={20} title="IF YOU SOLD TODAY" />
          {answer.notCapitalGains ? (
            <>
              {/* INSIDE AN ACCOUNT TAXED AS PRE-TAX OR TAX-FREE (2026-10-21): a sale there is not a capital gain, so the
                  split by holding period has no tax meaning — the gain is shown whole, with the reason */}
              <View style={s.tRow}><Text style={s.tL}>Gain</Text><SaidText style={s.tV}>{cg.totalGain == null ? figWords('MK-NW-M-059', GAIN_NOT_STATED) : signedGain('MK-NW-M-059', cg.totalGain)}</SaidText></View>
              <Text style={s.noteLine}>{NOT_CAPITAL_GAINS_LINE}</Text>
            </>
          ) : (
            <>
              {!cgNoneDated && (
                <View style={s.tRow}><Text style={s.tL}>{cgIndex ? `Gain — long-term (${SECTION_1256_LONG_TERM_PERCENT}%)` : 'Gain — long-term (held over 1 yr)'}</Text><SaidText style={s.tV}>{cg.longGain == null ? figWords('MK-NW-M-036', GAIN_NOT_STATED) : signedGain('MK-NW-M-036', cg.longGain)}</SaidText></View>
              )}
              {!cgNoneDated && cg.shortGain !== 0 && <View style={s.tRow}><Text style={s.tL}>{cgIndex ? `Gain — short-term (${100 - SECTION_1256_LONG_TERM_PERCENT}%)` : 'Gain — short-term (held 1 yr or less)'}</Text><SaidText style={s.tV}>{cg.shortGain == null ? figWords('MK-NW-M-037', GAIN_NOT_STATED) : signedGain('MK-NW-M-037', cg.shortGain)}</SaidText></View>}
              {/* AN OPTION ON A BROAD-BASED INDEX (2026-10-21): 60/40 by law, whatever the holding period — the line names it */}
              {cgIndex && <Text style={s.noteLine}>{SECTION_1256_LINE}</Text>}
              {/* A PURCHASE WITH NO PURCHASE DATE ON RECORD (2026-10-21; tenet 3): in neither part, its gain said here */}
              {cg.undated != null && cg.undated.gain != null && cg.undated.counted > 0 && (
                <SaidText style={s.noteLine}>
                  {undatedGainSentence({ gain: cg.undated.gain, counted: cg.undated.counted }, position, (n) => fig('MK-NW-M-059', n), quantityText)}
                </SaidText>
              )}
            </>
          )}
          {/* Q20, 2026-10-20 — BY HIS RULE FOR SALES (DEC-4643): count the purchases whose price paid is on record and say
              what is left out, in the same sentence. A purchase with no price paid refused the whole gain. */}
          {cg.countedShares != null && cg.heldShares != null && cg.countedShares < cg.heldShares && (
            <SaidText style={s.noteLine}>
              {gainOnPartSentence({ gain: cg.totalGain, counted: cg.countedShares, of: cg.heldShares }, position, (n) => fig('MK-NW-M-036', n), quantityText)}
            </SaidText>
          )}
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
  // the two doors at the foot, as holding detail v02 draws them (.btnRow, .btn): 4 below the card, a 1-point edge in the line
  // colour on a white button (2026-10-21, gap 25: the edge was missing and the row sat 2 below)
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: { flex: 1, backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingVertical: 12, alignItems: 'center', minHeight: 44 },
  btnTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.lg },
  ctaTxt: { color: Colors.white, fontSize: 15, fontWeight: '800' },
});
