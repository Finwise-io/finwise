// Account portfolio — ONE screen per account, built to Performance v17 frame 2 (his DEC-0646, 2026-10-01):
// the five windows across the top, the SUMMARY trio on one row, the value line, this account's own walk,
// then — in his caption's words — "its holdings, income and activity are v14's, unchanged": what it
// holds by category, the three record doors, its full activity, and the editors. Every figure comes
// from one door (MK-NW-O-002 theAccount, MK-NW-O-008 thePerformance); the screen calculates nothing.
import { plural } from '../domain/_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { SectionBand } from '../components/SectionBand';
import { fig, figSaid, figWords } from '../components/figure';   // rule 11: a figure prints with its identifier
import { Colors, Spacing, Radii, ClassMarkColors } from '../utils/theme';
import { currencySymbol } from '../domain/_shared/money';
import { periodReturnSince, buildPerformance, priceHistoryShortSentence, type Period, type Position } from '../domain/performance';
import { DateLink } from '../components/DateField';   // (DEC-4059c, 2026-10-10)
import { EDIT_HISTORY_START, historyCoverage, assetClassOf, taxWordsOf, TAX_TYPE_NOT_STATED, holdingClassOf, ASSET_CLASS_LABEL, valueFreshness, assetKind, benchmarkReturn, accountDisplayNames, accountClassBreakdown, type AssetAccount, sourceWording } from '../domain/assets';
import { theBonds, MATURITY_NOT_ENTERED } from '../../MoneyKeel/functions/networth-and-performance/bonds';
import { theAccount } from '../../MoneyKeel/functions/networth-and-performance/account';
import { windowStartKey, thePerformance, categoryEarnings } from '../../MoneyKeel/functions/networth-and-performance/performance';
import { ValueGraph } from '../components/ValueGraph';
import { txnLabel, cashEffect, type Transaction } from '../domain/transactions';
import { maskedMoney, spokenMoney, typedAmount } from '../components/useMoney';
import { InfoDot, EstimateTag } from '../components/UI';
import { modalAnimation } from '../hooks/reducedMotion';
import TopBar from '../components/TopBar';
import { HISTORIC_TTM_TITLE, HISTORIC_TTM_BODY } from '../constants/historicReturn';
import { WindowSelector } from '../components/WindowSelector';   // one card, one set of words (DEC-6005)
// ONE walk builder and ONE window return for the whole app: the account page calls exactly what the
// Performance screen calls, so an account's figures and the portfolio's can never disagree.
import { valueOn } from '../../Calculation Module code/engines/snapshots';

import { isoLocalDate as iso, dateShown, maturityParts } from '../domain/_shared/dates';   // maturityParts: the one reading of a maturity date (MK-NW-F-124, 2026-10-13)

type ActionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'DIVIDEND' | 'INTEREST' | 'COUPON';
const ACTION_LABEL: Record<ActionType, string> = {
  DEPOSIT: 'Deposit', WITHDRAWAL: 'Withdraw', TRANSFER: 'Transfer',
  DIVIDEND: 'Dividend', INTEREST: 'Interest', COUPON: 'Coupon received',
};
// THE THREE DOORS (approved mock v14, second phone). Five buttons in a row never read as one thing,
// and two kinds of record had no door at all. Every kind a person can log now arrives through one of
// three doors, in the mock's order and wording; the kinds behind a door are still the SAME recorder.
const MONEY_KINDS: ActionType[] = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'];
const INCOME_KINDS: ActionType[] = ['DIVIDEND', 'INTEREST', 'COUPON'];

/** Founder ruling Q49: a percentage a person reads carries TWO decimals — +0.57%, never +0.6%. The
 *  arithmetic keeps full precision; the rounding happens here, at the display, and nowhere earlier. */
const pct2 = (v: number | null): string => (v == null ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(2)}%`);
/** A stated yearly rate, worded the one way the canon allows (cluster 14 spells the period in full). */
const rateWords = (rate: number): string => `${(rate * 100).toFixed(2)}%/year`;
const WINDOW_KEYS = ['SINCE', '1M', 'YTD', '1Y', '2Y'] as const;
const WINDOW_WORDS: Record<string, string> = {
  '1M': '1M', YTD: 'This year', '1Y': '1Y', '2Y': '2Y',
};
/** How the window reads inside a sentence — "since Jun 3, 2024", "this year". */
const PHRASE: Record<string, string> = {
  '1M': 'the past month', YTD: 'this year', '1Y': 'the past year', '2Y': 'the past 2 years',
};
/** Money as a person reads it — whole dollars, rounded HERE and nowhere earlier, in one place, so two
 *  rows showing the same figure can never round differently. */
// `mny` is gone (2026-10-01): every figure on this screen prints through its own identifier,
// so the screen no longer has a money formatter of its own to reach for.
/** The day after a date. D3 (MK-ST-F-038 windowBounds): a window's beginning value is the close of the
 *  day BEFORE its start — so a window whose beginning IS the daily record's first day opens the day
 *  after it, and the beginning is READ from the record instead of being back-solved. */

/** A record's day as the approved activity rows write it: "Aug 1", with the year only when it is not this year. */
const activityDay = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${MO[m - 1]} ${d}${y === new Date().getFullYear() ? '' : `, ${y}`}`;
};

export default function AccountPortfolioScreen() {
  const router = useRouter();
  const { id: idParam, accountId, class: classParam } = useLocalSearchParams<{ id?: string; accountId?: string; class?: string }>();
  const id = idParam ?? accountId;
  // B47 finding 7 (APPROVED): arriving from a class slice = the class-only view; the whole
  // account is one labeled tap away (clearing the param).
  const classView = classParam && ['stocks_etf', 'bonds', 'cash', 'alternatives'].includes(String(classParam)) ? String(classParam) : null;
  const store = useStore() as any;
  const account: AssetAccount | undefined = (store.assetAccounts ?? []).find((a: AssetAccount) => String(a.asset_id) === String(id));
  // which DOOR is open, and so which kinds of record its sheet offers (mock v14: three doors)
  const [door, setDoor] = useState<ActionType[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [valueSheet, setValueSheet] = useState(false);
  const [editRow, setEditRow] = useState<Transaction | null>(null);   // a row YOU entered, opened to correct
  const [period, setPeriod] = useState<string>('SINCE');               // the window picked across the top (v17 frame 2)

  // FOUNDER FINDING 2026-08-11: this was unsorted, and the list below shows only the first eight —
  // so on an account with any history the dividends and interest could be sitting past the cut and
  // the page looked as if it had none, while the figures above counted them. Newest first now.
  const txns: Transaction[] = useMemo(
    () => ((store.transactions ?? []) as Transaction[])
      .filter((t) => String(t.account_id) === String(id) || String(t.counter_account_id) === String(id))
      .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''))),
    [store.transactions, id]);

  if (!account) {
    // A pre-seed row derived from setup answers isn't a real account yet — say so honestly.
    return (
      <View style={s.page}>
        <TopBar back />
        <View style={[s.root, { justifyContent: 'center', padding: Spacing.lg }]}>
        <Text style={s.h1}>This one lives in your setup answers</Text>
        <Text style={s.sub}>Add it as a real account on the Net worth tab to record activity and see history.</Text>
        <TouchableOpacity accessibilityRole="button" style={s.primaryBtn} onPress={() => router.push('/(tabs)/analytics')}
          accessibilityLabel="Open the Net worth tab">
          <Text style={s.primaryTxt}>Open Net worth ›</Text>
        </TouchableOpacity>
        </View>
      </View>
    );
  }

  const cls = assetClassOf(account);
  // MATURED, BY THE ONE READING OF A MATURITY DATE (MK-NW-F-124, 2026-10-13): the banner compared the stored text with
  // today's as strings, so ' 2028-02-09 ' read as matured and '2028-2-09' did not, whatever the Bonds facts said. It is
  // now the bond's own facts from the door (MK-NW-O-001 theBonds: matured = years left is zero), and the day is written
  // from the same reading.
  const bondOne = cls === 'bonds' ? theBonds({ accounts: [account], accountId: String(account.asset_id) }).one : null;
  const maturedOn = bondOne?.matured ? maturityParts(bondOne.maturity) : null;
  const source = account.source ?? 'manual';
  // walk row 8: the ONE source sentence (detail keeps its read-only clarifier for connected)
  const sourceChip = source === 'connected' ? `${sourceWording(account).split(' · ')[0]} · read-only` : sourceWording(account);
  const updatedLine = source === 'connected' && account.last_synced
    ? `Updated ${new Date(account.last_synced).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
    : account.value_as_of ? `Value as of ${account.value_as_of}` : null;
  // Build-43 finding #4: a bare CUSIP ("49306SX43") reads as noise — show the security's NAME for
  // identifier-style tickers (9 alphanumerics with digits), the ticker for everything else.
  const holdingWord = (p: { ticker?: string; name?: string }) => {
    const t = (p.ticker ?? '').trim();
    const isCusip = /^[0-9A-Z]{9}$/.test(t) && /\d/.test(t);
    const nm = (p.name ?? '').trim();
    return isCusip && nm ? (nm.length > 22 ? `${nm.slice(0, 22)}…` : nm) : t;
  };
  const tickers = (account.positions ?? []).map((p) => holdingWord(p as any)).filter(Boolean);
  const fresh = valueFreshness(account);
  // Build-47 walk row 5 (audit Design ICP #29): a hand-entered value with NO date shows the
  // approved one-line nudge instead of silence — the quiet data-quality hole, closed.
  const undated = !account.source && !account.value_as_of && !(account.positions?.length) && (account.balance || 0) > 0;

  // APPROVED account-detail mock (2026-07-19): connected accounts show WHAT'S INSIDE · BY TYPE —
  // every holding with a readable name, class dot and value; the cash sleeve; each option row.
  // ONE DOOR (MK-NW-O-002 theAccount, Q-NW-2 ruled 2026-09-27). The class breakdown, the account's
  // income, each holding's income and the record count were assembled here, in five pieces, while
  // the itemise screen assembled its own — which is how two screens come to disagree about what one
  // account holds. The question is asked once now, and both findings it carries (an untickered
  // record names no holding; a hand-entered lump has no inside) live in the door, not in a screen.
  const answer = theAccount({ account, transactions: (store.transactions ?? []) as any[] });
  // what is inside, holding by holding, is drawn for a LINKED account: its holdings carry the broker's
  // prices. An account built by hand keeps its page as it was (its prices are looked up, not stored).
  const breakdown = account.source === 'connected' ? accountClassBreakdown(account) : null;
  const breakdownClasses = breakdown ? (Object.keys(breakdown) as (keyof typeof breakdown)[]).filter((k) => breakdown[k] !== 0) : [];
  const ledger = ((store.transactions ?? []) as any[]).filter((t) => t.account_id === account.asset_id);
  const incomeOf = (rw: any): string => {
    const words = answer.incomeOfHolding(String(rw.name ?? '').split(' · ')[0].trim()).words;
    return words.replace(/(\d+) dividends/, (_m, n) => `${fig('MK-NW-M-019', Number(n))} dividends`)
                .replace(/(\d+) interest/, (_m, n) => `${fig('MK-NW-M-019', Number(n))} interest`);
  };
  const acctIncome = answer.income;

  // ── THE WINDOW (Performance v17 frame 2, his DEC-0646) ─────────────────────────────────────
  // The same five windows the Performance tab offers, each answered by the ONE door (MK-NW-O-008
  // thePerformance) — so this account and the portfolio can never name different figures for the
  // same window. Nothing below is calculated on the screen; it is asked for, once per window.
  const todayKey = iso(new Date());
  const who = (account.institution || account.label || 'this account').trim();
  const priceCache = store.priceCache ?? {};
  const priceOf = (t: string) => priceCache[String(t).trim().toUpperCase()];
  const positions: Position[] = (account.positions ?? []) as any;
  const ids = new Set([String(account.asset_id)]);
  // the whole daily record: the door scopes each day to this account by `investmentAccountIds`
  const days = ((store as any).snapshotDays ?? []) as any[];
  /** The first day this account's own records reach back to — what "Since" means here: a day somebody
   *  recorded a value first; only with no record at all does the first money movement stand in. */
  const okDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
  const recordedDays = days.map((d: any) => String(d.date).slice(0, 10)).filter(okDay).sort();
  const movedDays = ledger.map((t: any) => String(t.date).slice(0, 10)).filter(okDay).sort();
  const dataStart: string | null = recordedDays[0] ?? movedDays[0] ?? null;
  const figuresFor = (p: string) => {
    // "Since" opens the day after the record's first day (MK-NW-F-090: that day IS the beginning
    // value); with no record, it opens ON the first day money moved, so that movement counts; with
    // neither, it is null and the door answers day one.
    // DAY ONE (nothing recorded, nothing moved): every window opens today — there is no earlier day to
    // work back to, so no window may back-fill one (v17 day one: "We never back-fill a year we didn't see";
    // nothing is worked back on day one, so no holding is ever named as left out there — DEC-3656, DEC-5068)
    const start = !dataStart ? null
      : p === 'SINCE'
      ? (recordedDays.length ? windowStartKey('SINCE', recordedDays, todayKey) : movedDays[0] ?? null)
      : windowStartKey(p, [], todayKey);   // one rule for a window's first day, which refuses a name it does not know (DEC-4640)
    // "Since" hands over its own first day; it used to be read as today, one day's move (2026-10-12, DEC-4640)
    const priced = buildPerformance(positions, priceOf, p as Period, new Date(), () => dataStart, p === 'SINCE' ? start : undefined);
    return thePerformance({
      windowStart: start,
      windowLabel: p === 'SINCE' ? (dataStart ? `since ${dateShown(dataStart)}` : 'since today') : (PHRASE[p] ?? 'this window'),
      today: todayKey,
      // the holdings themselves: the door decides each one's gain over THIS window, and names any it
      // cannot know — this account's own value counts as the instrument when it holds no positions (DEC-3656, 2026-10-09;
      // one with no price history is left out of Wealth generated and Return, and named — DEC-5068, 2026-10-13)
      holdings: priced as any,
      transactions: ledger,
      snapshotDays: days,
      investmentAccountIds: ids,
      accounts: [account] as any[],
      wholeRecord: p === 'SINCE',   // "Since" is the window's own total, never a yearly rate (v17, phone 3)
    });
  };  const byWindow: Record<string, ReturnType<typeof figuresFor>> = {};
  for (const k of WINDOW_KEYS) byWindow[k] = figuresFor(k);
  const now = byWindow[period];
  const walk = now?.walk;
  const windowStart: string | null = now?.windowStart ?? null;
  /** DAY ONE: nothing recorded and no money moved — the value is real, the return starts today. */
  const dayOne = !dataStart;
  /** The day the figures start from, as the drawing writes it: the record's first day. */
  // read from the record: its first day; from the activity records alone: the first day money moved
  const since: string | null = recordedDays.length ? (now?.beginningAsOf ?? null) : (movedDays[0] ?? null);
  const sinceWords = dayOne || !since ? 'today' : dateShown(since);
  const windowWords = period === 'SINCE' ? `since ${sinceWords}` : (PHRASE[period] ?? 'this window');
  /** WHAT EACH CATEGORY EARNED — the same door, so a category cannot read differently here. */
  const cats = categoryEarnings({
    transactions: ledger,
    windowStart: now?.windowStart ?? todayKey,
    rows: buildPerformance(positions, priceOf, period as Period, new Date(), () => dataStart, period === 'SINCE' ? now?.windowStart ?? null : undefined) as any,
  });  const catsTotal = cats.reduce((n, b) => n + b.earned, 0);
  /** THE VALUE LINE — this account's worth on each recorded day inside the window, at most 26 points. */
  const graphPoints: { date: string; value: number }[] = [];
  if (days.length && now?.windowStart) {
    const from = now.beginningAsOf ?? now.windowStart!;
    const inWindow = days.map((d: any) => String(d.date)).filter((d: string) => d >= from).sort();
    const step = Math.max(1, Math.ceil(inWindow.length / 26));
    for (let i = 0; i < inWindow.length; i += step) {
      const v = valueOn(days, ids, inWindow[i]);
      if (v != null) graphPoints.push({ date: inWindow[i], value: v });
    }
    if (account.balance != null) graphPoints.push({ date: todayKey, value: account.balance });
  }
  /** How far back this account's own records reach — said only when the window asks for more. */
  const coverage = historyCoverage(account, now?.windowStart ?? todayKey, new Date());
  // the Total row of BY CATEGORY & HOLDING carries the account's own return — the window's, from the
  // door above, never a second method; where it cannot be measured there is no figure
  const acctReturnText = pct2(now?.ret ?? null);
  // ONE string for this account's market value: the band, the trio and the Total row all print it,
  // so three places on one screen can never show three different roundings of the same figure.
  const marketValueText = fig('MK-NW-M-018', account.balance || 0);
  const insideRows = !breakdown ? [] : [
    ...((account.positions ?? []) as any[]).map((p) => {
      const sh = (p.lots ?? []).reduce((t: number, l: any) => t + (l.shares || 0), 0);
      const value = p.last_price != null ? Math.round(sh * p.last_price * 100) / 100 : 0;
      const cls2 = holdingClassOf(p);   // the one test — the same one the class figure above these rows was split by
      return {
        key: p.position_id ?? p.ticker,
        posId: p.position_id,
        name: cls2 === 'stocks_etf' && sh > 0 ? `${holdingWord(p)} · ${plural(sh, 'share', sh.toLocaleString())}` : holdingWord(p),
        sub: cls2 === 'bonds' ? 'CDs & Treasuries' : cls2 === 'cash' ? 'counts as cash' : undefined,
        color: ClassMarkColors[cls2], value, cls: cls2, ticker: p.ticker,
      };
    }),
    ...(((account as any).cash_balance ?? 0) !== 0 ? [{ key: '__cash', name: 'Cash in this account', sub: undefined as string | undefined, color: ClassMarkColors.cash, value: (account as any).cash_balance as number, cls: 'cash' }] : []),
    ...(((account.option_holdings ?? []) as any[]).map((o) => ({
      key: o.label, name: o.label,
      sub: `option — ${plural(Math.abs(o.contracts), 'contract')}${o.contracts < 0 ? ', short' : ''}`,
      color: ClassMarkColors.alternatives, value: o.value as number, cls: 'alternatives',
    }))),
  ].sort((x, y) => Math.abs(y.value) - Math.abs(x.value));

  // ── THE RETURN COLUMN (mock v14, second phone: RETURN beside MARKET VALUE) ──────────────────
  // Every figure in this column is the SAME window return the header shows, never a second method:
  //   · a bond or a CD states its own yearly rate, and the app already shows that rate (BOND FACTS
  //     further down this page) — where a row has one, the column shows it with the period spelled
  //     out in full (canon cluster 14);
  //   · a class, or a single holding, that IS the whole account has the account's return by
  //     definition — same beginning, same ending, same flows — so it shows that figure;
  //   · a priced holding shows what ITS OWN price did over the same window, read from the daily
  //     closes we hold. That is the figure the approved mock draws beside each holding (LCTX
  //     +2.10%), and its income is never folded into it — income sits on its own line beneath the
  //     row, where the founder put it. A LIFETIME return on cost is never printed here: that is
  //     exactly the disagreement v14 fixes;
  //     (corrected 2026-10-12, DEC-4645: the daily closes are dividend-adjusted, so a holding's own figure DOES
  //     include its dividends — once. The income line beneath it says how much of it came as income; nothing adds the
  //     two. Where its prices begin after the window opens, the row says so — DEC-4641.)
  //   · a class shows its holdings' price return weighted by what each is worth;
  //   · a holding we hold no price for shows "—", never a guess.
  const statedYearlyRate = (rowClass: string): number | null => {
    // an entered 0% prints 0.00%/year, matching Bonds & CDs on Performance; no rate entered → null (DEC-2748b, 2026-10-12)
    const r = account.coupon_rate;
    return rowClass === 'bonds' && r != null && Number.isFinite(r) && r >= 0 ? r : null;
  };
  /** A holding's own price move over the window the header names — nothing else folded in. */
  const priceReturnOf = (ticker?: string): number | null => {
    if (!ticker || !windowStart) return null;
    return periodReturnSince(store.priceCache?.[String(ticker).trim().toUpperCase()], windowStart);
  };
  const returnTextFor = (rowClass: string, value: number, ticker?: string): string => {
    const stated = statedYearlyRate(rowClass);
    if (stated != null) return rateWords(stated);
    if (Math.round(value) === Math.round(account.balance || 0)) return acctReturnText;
    return pct2(priceReturnOf(ticker));
  };
  /** WHERE A HOLDING'S PRICES BEGIN AFTER THE WINDOW OPENS its figure is measured from its first price, and the
   *  row says so — the same sentence, from the same function, as the Holding page (his approval, 2026-10-12,
   *  DEC-4641). Only on a row whose return column shows its own price figure. */
  const shortHistoryOf = (rowClass: string, value: number, ticker?: string): string => {
    if (!ticker || statedYearlyRate(rowClass) != null || Math.round(value) === Math.round(account.balance || 0)) return '';
    if (priceReturnOf(ticker) == null) return '';
    return priceHistoryShortSentence(store.priceCache?.[String(ticker).trim().toUpperCase()]?.points, windowStart, period, todayKey);
  };
  /** A class's price return, weighted by what each holding inside it is worth. */
  const classReturnText = (rowClass: string, total: number, rowsInClass: any[]): string => {
    const stated = statedYearlyRate(rowClass);
    if (stated != null) return rateWords(stated);
    if (Math.round(total) === Math.round(account.balance || 0)) return acctReturnText;
    const priced = rowsInClass.map((rw) => ({ v: Math.abs(rw.value || 0), r: priceReturnOf(rw.ticker) })).filter((x) => x.r != null && x.v > 0);
    const weight = priced.reduce((t, x) => t + x.v, 0);
    if (!priced.length || weight <= 0) return '—';
    return pct2(priced.reduce((t, x) => t + (x.r as number) * x.v, 0) / weight);
  };

  // per-class actions (design: only what makes sense for this account)
  // FINAL mock (mockup-vf/performance-FINAL): EVERY kind of record has a way in on every account —
  // money in/out, income received, and (via tradeLink) a buy or sale. Previously bonds offered only
  // a coupon and cash offered no income door, so a user with a CD had no way to log its interest.
  const actions: ActionType[] =
    cls === 'real_estate' || cls === 'personal_property' ? []          // a house takes no deposits
    : cls === 'cash' ? ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'INTEREST']   // a savings account earns interest
    : cls === 'bonds' ? ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'COUPON', 'INTEREST']
    : ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'DIVIDEND', 'INTEREST'];
  // ticker trades and bond/alt buys-sells keep their existing full flows — one recorder each. The
  // third door carries the mock's one wording for every class; the ROUTE is what differs, and a class
  // that can hold nothing to buy or sell (a savings account) shows no third door rather than a door
  // onto a screen that cannot record anything for it.
  const tradeRoute = cls === 'stocks_etf' || cls === 'mixed' ? '/(tabs)/invest'
    : cls === 'bonds' ? '/bonds'
    : cls === 'alternatives' ? '/other-investments'
    : null;
  const moneyKinds = MONEY_KINDS.filter((k) => actions.includes(k));
  const incomeKinds = INCOME_KINDS.filter((k) => actions.includes(k));

  const shown = showAll ? txns : txns.slice(0, 8);

  return (
    // TOP BAR (approved mock v14, second phone): the app's own MoneyKeel bar, with "‹ Back" where a
    // tab screen carries Menu — this page is opened from another screen, so back is the escape hatch
    // it needs. The screen title stays the app's one title size, 20 points (s.h1).
    <View style={s.page}>
    <TopBar back />
    <ScrollView automaticallyAdjustKeyboardInsets style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* header: name + source + freshness — same source language everywhere */}
      <Text style={s.h1}>{accountDisplayNames((store.assetAccounts ?? []) as AssetAccount[]).get(account.asset_id) ?? account.label}</Text>
      <View style={s.chipRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={s.chip}>{sourceChip}</Text>
          <InfoDot term="provenance" />
        </View>
        {updatedLine && <Text style={s.updated}>{updatedLine}</Text>}
      </View>

      {classView && breakdown ? (
        <View style={s.card}>
          <SectionBand inCard title={`${ASSET_CLASS_LABEL[classView as keyof typeof ASSET_CLASS_LABEL]?.toUpperCase()} IN THIS ACCOUNT`} />
          <Text style={s.balance}>{fig('MK-NW-M-020', (breakdown as any)[classView] || 0)}</Text>
          {/* FOUNDER FINDING 2026-08-11: two bare figures ($224,190 above, $224,690 here) read as a
              mismatch. Say the arithmetic out loud — this slice PLUS everything else IS the total. */}
          <Text style={s.classLine}>
            {fig('MK-NW-M-020', (breakdown as any)[classView] || 0)} of {fig('MK-NW-M-018', account.balance || 0)} in {accountDisplayNames((store.assetAccounts ?? []) as AssetAccount[]).get(account.asset_id) ?? account.label}
            {Math.round((account.balance || 0) - ((breakdown as any)[classView] || 0)) > 0
              ? ` — the other ${fig('MK-NW-M-020', (account.balance || 0) - ((breakdown as any)[classView] || 0))} is ${breakdownClasses.filter((k) => k !== classView).map((k) => ASSET_CLASS_LABEL[k as keyof typeof ASSET_CLASS_LABEL]).join(' + ') || 'other types'}`
              : ''}
          </Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="See the whole account"
            style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => router.setParams({ class: undefined } as any)}>
            <Text style={s.linkTxt}>See the whole account ›</Text>
          </TouchableOpacity>
          <View style={s.optBlock}>
            <SectionBand title={`THE HOLDINGS · ${ASSET_CLASS_LABEL[classView as keyof typeof ASSET_CLASS_LABEL]?.toUpperCase()} ONLY`} />
            {insideRows.filter((rw: any) => rw.cls === classView).map((rw) => (
              <TouchableOpacity key={rw.key} style={s.insideRow} disabled={!(rw as any).posId}
                accessibilityRole={(rw as any).posId ? 'button' : undefined} accessible
                onPress={() => (rw as any).posId && router.push(`/holding-detail?account=${account.asset_id}&position=${(rw as any).posId}` as any)}
                accessibilityLabel={`${rw.name}${rw.sub ? `, ${rw.sub}` : ''}, ${figSaid('MK-NW-M-030', Math.abs(rw.value))}${(rw as any).posId ? '. Opens its page.' : ''}`}>
                <View style={[s.insideDot, { backgroundColor: rw.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.optLabel} numberOfLines={2}>{rw.name}</Text>
                  {!!rw.sub && <Text style={s.insideSub}>{rw.sub}</Text>}
                </View>
                <Text style={s.optVal}>{fig('MK-NW-M-030', rw.value)}</Text>
              </TouchableOpacity>
            ))}
            <Text style={s.optNote}>{insideRows.filter((rw: any) => rw.cls === classView).map((rw: any) => fig('MK-NW-M-030', rw.value)).join(' + ')} = {fig('MK-NW-M-020', (breakdown as any)[classView] || 0)}. Everything else lives on the whole-account page — one tap away above.</Text>
          </View>
        </View>
      ) : (
      <>
      <Text style={p.sub}>{dateShown(todayKey)}</Text>

      {/* ── THE WINDOW SELECTOR · the Performance tab's own control, the same five windows (DEC-6079, 2026-10-19, his
          words: "Also check in perf 17 did we have bar to select time period at the top on account page or not? We
          should have one.") — one component, so the two can never drift apart ────────────────────── */}
      <WindowSelector
        windows={WINDOW_KEYS.map((k) => ({ key: k, label: k === 'SINCE' ? (dayOne || !since ? 'Since today' : `Since ${dateShown(since)}`) : WINDOW_WORDS[k] }))}
        chosen={period} figures={byWindow as any} onPick={(k) => setPeriod(k as any)} />
      {period === '2Y' && (
        <Text style={p.note}>2Y is shown per year, so it sits fairly beside 1Y</Text>
      )}

      {/* ── SUMMARY · the trio ON ONE ROW ──────────────────────────────────────────────────── */}
      <View style={s.card}>
        <SectionBand inCard title={`SUMMARY · ${windowWords.toUpperCase()}`} infoTerm="timeWeighted" />
        <View style={p.trio}>
          <View style={p.trioCell}>
            <Text style={p.trioL}>Ending value</Text>
            <Text style={p.trioV}>{fig('MK-PF-M-004', account.balance || 0)}</Text>
          </View>
          <View style={p.trioCell}>
            <Text style={p.trioL}>Wealth generated</Text>
            <Text style={p.trioV}>{walk ? fig('MK-PF-M-014', walk.wealthGenerated) : '—'}</Text>
          </View>
          <View style={p.trioCell}>
            <Text style={p.trioL}>Return</Text>
            <Text style={[p.trioV, (now?.ret ?? 0) < 0 && { color: Colors.red }]}>
              {now?.ret == null ? '—' : fig('MK-PF-M-016', now.ret)}
            </Text>
          </View>
        </View>
        {/* the return is for the window picked, and is not a yearly rate unless the window is longer
            than a year — his Q49 ruling, stated on the screen rather than assumed */}
        <View style={p.noteRow}>
          <Text style={p.note}>
            {dayOne
              /* THE ACCOUNT PAGE'S OWN DAY-ONE LINE (his approval, 2026-10-19, "approved", DEC-6075): a linked account
                 whose broker sent no past activity names the broker; one added by hand says it was added today. A linked
                 account WITH past activity is not day one — its history is rebuilt (the ↺ line below). */
              ? (source === 'connected'
                ? `You linked this account today. ${who} sent no past activity, so its figures start today.`
                : 'You added this account today, so its figures start today.')
              : walk == null
              /* a refusal is an answer (D4): no daily record reaching back, so no beginning — say so */
              ? 'Wealth generated and Return start once the daily record reaches back far enough to say what this account was worth at the start. It builds from your first recorded day.'
              : now?.sentence
              || (now?.measured == null
                /* no recorded value on the first day: the beginning is worked back from today's values and each
                   holding's price history, and a return IS shown — of the holdings with a history (DEC-5068, 2026-10-13) */
                ? `Your daily record does not reach back to ${sinceWords} yet, so the beginning is worked back from today's values and each holding's price history.`
                : `Return is for the window you picked (${sinceWords} → ${dateShown(todayKey)}) — not a yearly rate · time-weighted`)}
          </Text>
          <InfoDot term="timeWeighted" />
        </View>
        {/* BELOW THE SUMMARY, the holding left out of Wealth generated and Return (DEC-5068, 2026-10-13, his words:
            "Below it display …"). Only where the beginning is worked back and a holding has no price history. */}
        {!dayOne && !!now?.notIncluded && <Text style={p.note}>{now.notIncluded}</Text>}
        {/* where the figures came from, and the first day that source can speak for */}
        {/* not for a worked-back window: the broker's records do not reach its beginning (DEC-5291, 2026-10-13) */}
        {account.source === 'connected' && dataStart && !now?.workedBack && (
          <Text style={p.note}>
            ↺ Rebuilt from {who}&apos;s own records, back to {sinceWords} — the first day it shares.
          </Text>
        )}
        {coverage && <Text style={p.note}>{coverage.sentence}{coverage.kind === 'unreadable' && (<>
          {/* (DEC-4059c, 2026-10-10) "Say date cannot be read. Edit date. and give user an option to enter or correct date." */}
          {' '}<DateLink text={EDIT_HISTORY_START} label="Edit the history start date" maximumDate={new Date()}
            onPick={(iso) => store.updateAsset?.(account.asset_id, { history_start_override: iso })} /></>)}</Text>}
      </View>

      {/* ── THE VALUE LINE · with its own axis ──────────────────────────────────────────────── */}
      {graphPoints.length >= 2 && (
        <View style={[s.card, { paddingHorizontal: 0 }]} testID="account-portfolio-value-line"
          accessibilityLabel={`Value over the window, ${graphPoints.length} recorded days`}>
          <ValueGraph points={graphPoints} />
        </View>
      )}

      {/* ── THE WALK · how the beginning became the ending ─────────────────────────────────── */}
      {walk != null && walk.beginning != null && (
        <View style={s.card}>
          <SectionBand inCard
            /* one title in every state, day one included, "· THIS ACCOUNT" as Performance v17 frame 2 draws it
               (DEC-5136, 2026-10-13: "HOW $38,000 BECAME $52,704 · ALL ACCOUNTS - this is the title.") */
            title={figWords('MK-PF-M-003', `HOW ${fig('MK-PF-M-013', walk.beginning)} BECAME ${fig('MK-PF-M-004', walk.ending)} · THIS ACCOUNT`)} />
          {([
            [`Beginning market value (${sinceWords})`, walk.beginning, 'MK-PF-M-013'],
            ['Contributions', walk.contributions, 'MK-PF-M-015'],
            ['Withdrawals', -Math.abs(walk.withdrawals), 'MK-PF-M-015'],
            ['Wealth generated', walk.wealthGenerated, 'MK-PF-M-014'],
            ['Dividends', walk.dividends, 'MK-PF-M-015'],
            ['Interest', walk.interest, 'MK-PF-M-015'],
            ['Change in investment value', walk.marketChange, 'MK-PF-M-015'],
          ] as [string, number, string][]).map(([label, v, metric]) => (
            <View key={label} style={p.wRow} accessible
              accessibilityLabel={`${label}, ${v < 0 ? 'minus ' : ''}${figSaid(metric, Math.abs(v))}`}>
              <Text style={p.wL}>{label}</Text>
              <Text style={[p.wV, v < 0 && { color: Colors.red }]}>
                {v < 0 ? '−' : ''}{fig(metric, Math.abs(v))}
              </Text>
            </View>
          ))}
          <View style={[p.wRow, p.wTotal]} accessible
            accessibilityLabel={`Ending market value today, ${figSaid('MK-PF-M-004', walk.ending)}`}>
            <Text style={[p.wL, p.wStrong]}>Ending market value ({dayOne ? 'today' : dateShown(todayKey)})</Text>
            <Text style={[p.wV, p.wStrong]}>{fig('MK-PF-M-004', walk.ending)}</Text>
          </View>
          <Text style={p.note}>
            {dayOne
              ? 'Every line fills in as days pass — the structure never changes.'
              : `Every line here comes from ${who}’s own records. A hand-entered account has no records to rebuild from, so its walk starts the day you entered it.`}
          </Text>
        </View>
      )}

      {/* ── THIS ACCOUNT'S OWN ROW ─────────────────────────────────────────────────────────── */}
      <TouchableOpacity accessibilityRole="button" style={p.acctRow}
        accessibilityLabel={`${who} ${account.label}, ${figSaid('MK-PF-M-004', account.balance || 0)}. Opens its holdings.`}
        onPress={() => router.push(`/holding-detail?account=${account.asset_id}` as any)}>
        <Text style={p.acctName} numberOfLines={1}>▸ {who} {account.label}</Text>
        <Text style={p.acctV}>{fig('MK-PF-M-004', account.balance || 0)}</Text>
        <Text style={p.chev}>›</Text>
      </TouchableOpacity>
      <Text style={p.acctSub}>
        {sourceWording(account)}{walk ? ` · wealth generated ${fig('MK-PF-M-014', walk.wealthGenerated)} ${windowWords}` : ''}
      </Text>
      {/* APPROVED account-detail mock (2026-07-19): an account holding several types is called what it
          is — "Mixed holdings" — and its tax treatment is said beside it. v17 frame 2 is drawn for the
          portfolio, where there is no one treatment to name; on one account the line keeps its home. */}
      {/* NO TAX TYPE STATED IS SAID, AND OFFERED (DEC-4036f, 2026-10-10): an account with no account type chosen
          reads "tax type not stated" — never "taxable" by default — and a tap opens the account's own editor,
          whose "Held in" choice sets it. */}
      {taxWordsOf(account) === TAX_TYPE_NOT_STATED ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Tax type not stated. Tap to choose."
          onPress={() => router.push(`/add-account?edit=${account.asset_id}` as any)}>
          <Text style={s.classLine}>{breakdownClasses.length > 1 ? 'Mixed holdings' : ASSET_CLASS_LABEL[cls]} · {TAX_TYPE_NOT_STATED} — choose ›</Text>
        </TouchableOpacity>
      ) : (
        <Text style={s.classLine}>{breakdownClasses.length > 1 ? 'Mixed holdings' : ASSET_CLASS_LABEL[cls]} · {taxWordsOf(account)}</Text>
      )}

      {/* ── WHAT EACH CATEGORY EARNED ──────────────────────────────────────────────────────── */}
      {cats.length > 0 && (
        <View style={s.card}>
          <SectionBand inCard title="WHAT EACH CATEGORY EARNED" value={windowWords} />
          <View style={p.catHead}>
            <Text style={p.catHeadL}>CATEGORY</Text>
            <Text style={[p.catHeadR, p.colEarned]}>EARNED</Text>
            <Text style={[p.catHeadR, p.colReturn]}>RETURN</Text>
          </View>
          {cats.map((b) => (
            <View key={b.label} style={p.catRow} accessible
              accessibilityLabel={`${b.label}, earned ${figSaid('MK-NW-M-019', b.earned)}, return ${b.ret == null ? 'no figure' : pct2(b.ret)}`}>
              <Text style={p.catL} numberOfLines={1}>{b.label}</Text>
              <Text style={[p.catV, p.colEarned]}>{fig('MK-NW-M-019', b.earned)}</Text>
              <Text style={[p.catV, p.colReturn]}>{b.ret == null ? '—' : pct2(b.ret)}</Text>
            </View>
          ))}
          <View style={[p.catRow, p.wTotal]}>
            <Text style={[p.catL, p.wStrong]}>All categories</Text>
            <Text style={[p.catV, p.colEarned, p.wStrong]}>{fig('MK-NW-M-019', catsTotal)}</Text>
            <Text style={[p.catV, p.colReturn]} />
          </View>
          <View style={p.noteRow}>
            <Text style={p.note}>
              Earned = dividends + interest received in this window
            </Text>
            <InfoDot term="benchmark" />
          </View>
        </View>
      )}
        {/* THE WAY INTO ITEMIZE, and the only one (2026-10-01).
            The Itemize screen had no door in any approved design: the Net worth mock v08 does not draw
            one, and the approved Account portfolio (Performance v17 frame 2) has no Edit button — so
            the only path in the code ran through a control that exists solely in the account-detail
            drawing he REJECTED, and only for cash, stocks and mixed accounts. For a bonds or
            alternatives account it was unreachable altogether.
            It belongs here. This is the screen that answers what is inside an account, so breaking a
            lump into its real holdings is the same question continued — not a detour through an edit
            sheet two screens away. It shows only when the account holds money and nothing is recorded
            inside it, which is exactly when the screen has nothing to show and the person has
            something to say. */}
        {/* ONLY AN ACCOUNT THAT CAN HOLD SEVERAL HOLDINGS (DEC-5849, 2026-10-19, his word "approved." — asked after
            "state B - why "itemize your holdings" when we already know it is Bond?"): the door shows on a Stocks /
            Funds or unclassified account (brokerage, 401(k), IRA, Roth, HSA) typed as one total. A bond or CD, a
            single alternative (crypto, gold, an annuity, other), a cash account and property ARE one thing, so
            there is nothing to break into. Replaces DEC-0651's condition on that one point; the rest stands. */}
        {insideRows.length === 0 && tickers.length === 0 && (account.balance || 0) > 0
          && source !== 'connected' && (cls === 'stocks_etf' || cls === 'mixed') && (
          <TouchableOpacity accessibilityRole="button" style={s.itemizeDoor}
            accessibilityLabel={`Itemize ${account.label} into holdings`}
            onPress={() => router.push(`/itemize?accountId=${account.asset_id}` as any)}>
            <Text style={s.itemizeDoorT}>🧩  Itemize into holdings →</Text>
            <Text style={s.itemizeDoorS}>Nothing is recorded inside this account yet. Break it into
              what it actually holds and the total stays {fig('MK-NW-M-018', account.balance || 0)}.</Text>
          </TouchableOpacity>
        )}
      </>
      )}

      {/* BY CATEGORY & HOLDING (approved mock v14, second phone) — its own card, with a RETURN column
          beside MARKET VALUE and a Total row that carries the account's own two figures. Holdings sit
          UNDER their class; each holding carries its own income beneath it, because income belongs to
          the holding that earned it, not to the class. */}
      {!classView && insideRows.length > 0 && (
        <View style={s.card}>
          <SectionBand inCard title="BY CATEGORY & HOLDING" />
          <View style={s.colHdrRow} accessible accessibilityLabel="Columns: category or holding, market value, return">
            <Text style={[s.colHdr, { flex: 1, textAlign: 'left' }]}>CATEGORY / HOLDING</Text>
            <Text style={[s.colHdr, s.colValW]}>MARKET VALUE</Text>
            <Text style={[s.colHdr, s.colRetW]}>RETURN</Text>
          </View>
          {/* the four classes the drawing shows, always; and Unclassified only when this account holds
              something nobody has classed yet — it is counted there on Net worth, so it is listed there here */}
          {([...(['stocks_etf', 'bonds', 'cash', 'alternatives'] as const), ...(insideRows.some((rw: any) => rw.cls === 'mixed') ? (['mixed'] as const) : [])]).map((k) => {
            const inClass = insideRows.filter((rw: any) => rw.cls === k);
            const total = inClass.reduce((t: number, rw: any) => t + (rw.value || 0), 0);
            return (
              <View key={k}>
                {/* the light-green class band, hand-built for ONE reason: SectionBand carries a single
                    trailing figure and this row carries two (market value AND return). Same band
                    colour, same 11-point caps, same square edge-to-edge bar as every other band. */}
                <View style={s.classBand} accessible
                  accessibilityLabel={`${ASSET_CLASS_LABEL[k]}, ${figSaid('MK-NW-M-020', Math.round(total))}, return ${classReturnText(k, total, inClass)}`}>
                  <Text style={s.classBandT} numberOfLines={1}>{ASSET_CLASS_LABEL[k]}</Text>
                  <Text style={[s.classBandV, s.colValW]}>{fig('MK-NW-M-020', total)}</Text>
                  {/* THE BONDS & CDS YEARLY RATE CARRIES ITS INFO DOT (DEC-5847, 2026-10-19, his words: "Let's add info dot
                      next to "4.11%/year" in the sub-titel bar."). The rate itself is unchanged — each bond's and CD's own
                      stated rate, weighted by what each is worth. The dot sits BEFORE the rate, so the rate still ends on
                      the one right edge every figure shares (DEC-0093); its words are the same yearlyPace entry the
                      Performance tab's category table points to, so the two pages explain the /year figure alike. */}
                  <View style={[s.colRetW, s.classBandRet]}>
                    {statedYearlyRate(k) != null && <InfoDot term="yearlyPace" size={15} />}
                    <Text style={s.classBandV}>{classReturnText(k, total, inClass)}</Text>
                  </View>
                </View>
                {inClass.length === 0 && <Text style={s.insideEmpty}>Nothing held in this account</Text>}
                {inClass.map((rw: any) => (
                  <View key={rw.key}>
                    <TouchableOpacity style={s.insideRow} disabled={!rw.posId}
                      accessibilityRole={rw.posId ? 'button' : undefined} accessible
                      onPress={() => rw.posId && router.push(`/holding-detail?account=${account.asset_id}&position=${rw.posId}` as any)}
                      accessibilityLabel={`${rw.name}${rw.sub ? `, ${rw.sub}` : ''}, ${figSaid('MK-NW-M-030', Math.abs(rw.value))}, return ${returnTextFor(rw.cls, rw.value, rw.ticker)}${incomeOf(rw) ? `, ${incomeOf(rw)}` : ''}${rw.posId ? '. Opens its page.' : ''}`}>
                      <View style={[s.insideDot, { backgroundColor: rw.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.optLabel} numberOfLines={2}>{rw.name}</Text>
                        {!!rw.sub && <Text style={s.insideSub}>{rw.sub}</Text>}
                      </View>
                      <Text style={[s.optVal, s.colValW]}>{fig('MK-NW-M-030', rw.value)}</Text>
                      <Text style={[s.optRet, s.colRetW]}>{returnTextFor(rw.cls, rw.value, rw.ticker)}</Text>
                    </TouchableOpacity>
                    {!!incomeOf(rw) && <Text style={s.incomeLine}>{figWords('MK-NW-M-021', `Income: ${incomeOf(rw)}`)}</Text>}
                    {!!shortHistoryOf(rw.cls, rw.value, rw.ticker) && <Text style={s.incomeLine}>{shortHistoryOf(rw.cls, rw.value, rw.ticker)}</Text>}
                  </View>
                ))}
              </View>
            );
          })}
          {/* the Total row (mock v14): the account's market value and the account's return — the SAME
              string the header trio printed, so the two places can never say different things. */}
          <View style={[s.insideRow, s.totalRow]} accessible
            accessibilityLabel={`Total, ${figSaid('MK-NW-M-018', Math.round(account.balance || 0))}, return ${acctReturnText}`}>
            <Text style={[s.optLabel, { fontWeight: '800' }]}>Total</Text>
            <Text style={[s.optVal, s.colValW]}>{marketValueText}</Text>
            <Text style={[s.optRet, s.colRetW, { fontWeight: '800' }]}>{acctReturnText}</Text>
          </View>
          {/* "the income is also on the line beneath it" — two words dropped, as income already means paid (DEC-5848, 2026-10-19) */}
          <Text style={s.optNote}>
            Counted inside this account's total — listed here so nothing is hidden. A holding's return is
            what its own price did in this window, its dividends included; the income is also on the line beneath it. Income sits with the
            holding that earned it{acctIncome != null && acctIncome > 0
              ? <Text> — <Text style={s.optNoteFig}>{fig('MK-NW-M-019', acctIncome)}</Text> for this account</Text>
              : null}.
          </Text>
        </View>
      )}

      {/* MATURED BOND (mock approved 2026-07-31): a dated banner with the three real outcomes —
          the money must not sit labeled as a growing bond after its maturity date */}
      {maturedOn && (account.balance || 0) > 0 && (
        <View style={s.maturedCard}>
          <Text style={s.maturedTitle}>⏰ This {assetKind(account.kind)?.id === 'cd' ? 'CD' : 'bond'} matured {new Date(maturedOn[0], maturedOn[1] - 1, maturedOn[2], 12).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.</Text>
          <Text style={s.maturedBody}>The money isn't growing here anymore — record what happened so your numbers stay true.</Text>
          <TouchableOpacity accessibilityRole="button" style={s.maturedOpt}
            accessibilityLabel="Paid out to my bank — records the payout"
            onPress={() => { store.recordTransaction?.({ type: 'SELL', account_id: account.asset_id, amount: account.balance || 0, date: iso(new Date()), note: 'Matured — paid out' }); }}>
            <Text style={s.maturedOptTxt}>💵  Paid out to my bank ›</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={s.maturedOpt}
            accessibilityLabel="Rolled into a new bond or CD — opens the bonds page"
            onPress={() => router.push('/bonds' as any)}>
            <Text style={s.maturedOptTxt}>🔁  Rolled into a new bond/CD ›</Text>
          </TouchableOpacity>
          <Text style={s.maturedWait}>Still waiting? Leave it — this banner stays until you record it.</Text>
        </View>
      )}

      {/* walk row 5: an UNDATED hand-entered value gets the same gentle nudge — silence hid it */}
      {undated && (
        <View style={s.staleCard}>
          <Text style={s.staleTxt}>⏱ Value date unknown — confirm it once and we can tell you when it goes stale.</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity accessibilityRole="button" style={s.staleBtn}
              onPress={() => store.updateAsset?.(account.asset_id, { value_as_of: iso(new Date()) })}
              accessibilityLabel="This value is current — stamp it today">
              <Text style={s.staleBtnTxt}>It's current</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={s.staleBtn} onPress={() => setValueSheet(true)}
              accessibilityLabel="Update the value">
              <Text style={s.staleBtnTxt}>Update it</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* stale hand-entered value — the gentle 6-month nudge (never red, never a zero) */}
      {fresh?.stale && (
        <View style={s.staleCard}>
          <Text style={s.staleTxt}>⏱ This value is {fresh.monthsOld} months old — still right?</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity accessibilityRole="button" style={s.staleBtn}
              onPress={() => store.updateAsset?.(account.asset_id, { value_as_of: iso(new Date()) })}
              accessibilityLabel="Still right — keep the amount and re-stamp today">
              <Text style={s.staleBtnTxt}>Still right</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={s.staleBtn} onPress={() => setValueSheet(true)}
              accessibilityLabel="Update the value">
              <Text style={s.staleBtnTxt}>Update value</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* edit + update value */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity accessibilityRole="button" style={s.secondaryBtn}
          onPress={() => router.push((cls === 'bonds' ? '/bonds' : cls === 'alternatives' ? '/other-investments' : `/(tabs)/analytics?edit=${account.asset_id}`) as any)}
          accessibilityLabel={`Edit ${account.label}`}>
          <Text style={s.secondaryTxt}>Edit</Text>
        </TouchableOpacity>
        {!account.derive_balance && source !== 'connected' && (
          <TouchableOpacity accessibilityRole="button" style={s.secondaryBtn} onPress={() => setValueSheet(true)}
            accessibilityLabel="Update this account's value">
            <Text style={s.secondaryTxt}>Update value</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* bond facts + yields + the if-interest-rates-move ESTIMATE (design v1.1, Invest sheet) */}
      {cls === 'bonds' && <BondDetail account={account} />}

      {/* alternatives: the type's typical return + the look-back entry */}
      {cls === 'alternatives' && <AltDetail account={account} />}

      {/* the historic 12-month return — the same actual_ttm field the Retirement cockpit reads (one field, two readers);
          shown on a bond's or a CD's page too (his ruling, 2026-10-19) — EXCEPT where the app already works out the
          yield to maturity (DEC-6077, 2026-10-19, his words: "state E - do not need historic 12-month return box as you
          already have YTM."): a bond with face, rate, value and maturity known, or a CD with its rate (a bank CD's
          yield to maturity is its rate). Where it cannot (no rate entered), the card stays, because that is where
          "enter the yield to maturity if it's different" helps. */}
      {(cls === 'alternatives' || (cls === 'bonds' && !yieldToMaturityKnown(account))) && <ReportedReturnCard account={account} />}

      {/* activity history — the ledger, in plain words with signed effects */}
      <SectionBand title="ACTIVITY" value={txns.length ? plural(txns.length, 'record', fig('MK-NW-M-022', txns.length)) : undefined} />
      <View style={s.card}>
        {txns.length === 0 && <Text style={s.empty}>Log a deposit or a buy — your history starts here.</Text>}
        {shown.map((t) => {
          const incoming = String(t.counter_account_id) === String(id) && t.type === 'TRANSFER';
          // THE AMOUNT COMES FROM THE DOOR (2026-10-01). It was calculated here — a transfer coming
          // in counts as its own amount, anything else as its cash effect — which is a money figure
          // calculated on a screen. MK-NW-O-002 theAccount answers it, and the screen prints it.
          const eff = answer.activity.find((a) => a.recordId === String(t.id))?.amount
            ?? (incoming ? (t.amount || 0) : cashEffect(t));
            // HANDOFF 2026-08-11: a row is either the BROKER'S fact or YOURS, and the list has to say
            // which. A broker row cannot be edited — the next sync would overwrite it — so it says
            // where it came from and offers nothing. A row you entered is yours to correct, so it wears
            // "you entered this" and a pencil. Before this they looked identical, which meant a typo
            // you made was indistinguishable from the broker's own record and equally unfixable.
            const mine = t.source !== 'connected';
            const from = mine ? 'you entered this' : `from ${account.institution?.trim() || 'your broker'}`;
            return (
            <View key={String(t.id)} style={s.txnRow} accessible
              accessibilityLabel={`${t.date}: ${txnLabel(t.type)}${t.ticker ? ` ${t.ticker}` : ''}, ${eff < 0 ? 'minus ' : 'plus '}${figSaid('MK-NW-M-062', Math.abs(eff))}. ${mine ? 'You entered this — editable.' : `${from}, read-only.`}`}>
              {/* THE ROW AS BOTH APPROVED DRAWINGS WRITE IT (Performance v17 frame 2, and v14 before it):
                  "Dividend · LCTX", then "Aug 1 · from E*TRADE", then "$120". It printed the date as "08-01"
                  in a column of its own and "+$120" (mock-match audit, 2026-10-11). A minus stays a minus. */}
              <View style={{ flex: 1 }}>
                <Text style={s.txnLabel} numberOfLines={1}>
                  {txnLabel(t.type)}{t.ticker ? ` · ${t.ticker}` : ''}{t.shares ? ` · ${t.shares} sh${t.price ? ` @ ${fig('MK-NW-M-061', t.price)}` : ''}` : ''}
                </Text>
                <Text style={mine ? s.txnMine : s.txnFrom}>{activityDay(String(t.date))} · {from}</Text>
              </View>
              <Text style={[s.txnAmt, { color: eff >= 0 ? Colors.gainText : Colors.textPrimary }]}>
                {eff < 0 ? '−' : ''}{fig('MK-NW-M-062', Math.abs(eff))}
              </Text>
              {mine ? (
                <Text style={s.txnEdit} onPress={() => setEditRow(t)} suppressHighlighting
                  accessibilityRole="button" accessibilityLabel={`Edit or delete your ${txnLabel(t.type).toLowerCase()} of ${figSaid('MK-NW-M-062', Math.abs(eff))}`}>✎</Text>
              ) : <Text style={s.txnEditGap} />}
            </View>
          );
        })}
        {/* the one line the approved design puts under the list (mock v14, second phone). Each row
            already says "from E*TRADE" or "you entered this"; this says what that means for what you
            can do with it — the difference between a record you may fix and one that would be
            overwritten by the next sync. */}
        {txns.length > 0 && (
          <Text style={s.txnNote}>
            Records from {account.institution?.trim() || 'your broker'} can’t be edited — they are the broker’s own.
            Anything you add is marked “you entered this” and stays editable.
          </Text>
        )}
        {/* THE THREE DOORS (approved mock v14, second phone) — they sit at the foot of the ACTIVITY
            card, in the mock's order and wording. Five separate buttons never read as one thing, and
            two kinds of record had no door at all; each door opens the SAME recorder as before, so
            every capability that was reachable still is. */}
        {moneyKinds.length > 0 && (
          <TouchableOpacity accessibilityRole="button" style={s.doorPrimary} onPress={() => setDoor(moneyKinds)}
            accessibilityLabel={`Add a contribution or withdrawal for ${account.label}`}>
            <Text style={s.doorPrimaryTxt}>Add a contribution or withdrawal ›</Text>
          </TouchableOpacity>
        )}
        {incomeKinds.length > 0 && (
          <TouchableOpacity accessibilityRole="button" style={s.doorOutline} onPress={() => setDoor(incomeKinds)}
            accessibilityLabel={`Add a dividend or interest for ${account.label}`}>
            <Text style={s.doorOutlineTxt}>Add a dividend or interest ›</Text>
          </TouchableOpacity>
        )}
        {tradeRoute && (
          <TouchableOpacity accessibilityRole="button" style={s.doorOutline} onPress={() => router.push(tradeRoute as any)}
            accessibilityLabel={`Add a buy or sale for ${account.label}`}>
            <Text style={s.doorOutlineTxt}>Add a buy or sale ›</Text>
          </TouchableOpacity>
        )}
        {/* HANDOFF 2026-08-11: the door names the DATE the list stops at, not just a count. "10 more"
            tells you nothing about whether the missing rows are last week or four years ago — and
            this list is what someone checks when a total looks wrong, so the boundary is the fact
            that matters. The rows are newest-first, so the cut is the date of the last one shown. */}
        {txns.length > 8 && !showAll && (() => {
          const cut = String(shown[shown.length - 1]?.date ?? '');
          const when = cut ? new Date(`${cut}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          const hidden = txns.length - shown.length;
          return (
            <TouchableOpacity accessibilityRole="button" onPress={() => setShowAll(true)}
              accessibilityLabel={`See all activity — ${plural(hidden, 'record', `${hidden} more`)}${when ? `, older than ${when}` : ''}`}>
              <Text style={s.link}>See all activity{when ? ` (older than ${when})` : ''} ›</Text>
              <Text style={s.txnFrom}>{plural(hidden, 'record', `${hidden} more`)} below this date</Text>
            </TouchableOpacity>
          );
        })()}
      </View>

      <RecordActivitySheet account={account} kinds={door} onClose={() => setDoor(null)} />
      <EditRecordSheet row={editRow} onClose={() => setEditRow(null)} />
      <UpdateValueSheet account={account} visible={valueSheet} onClose={() => setValueSheet(false)} />
      <View style={{ height: 40 }} />
    </ScrollView>
    </View>
  );
}

/** Does the app already work out this bond's or CD's yield to maturity? Read off the one bonds door (MK-NW-O-001
 *  theBonds), the same answer BOND FACTS prints: a yield to maturity it computed, or a CD stating its rate (a bank
 *  CD's yield to maturity is its rate). Matured: no. (DEC-6077, 2026-10-19) */
function yieldToMaturityKnown(account: AssetAccount): boolean {
  const one = theBonds({ accounts: [account], accountId: String(account.asset_id) }).one;
  if (!one || one.matured) return false;
  return one.yieldToMaturity != null || (!!one.isCD && one.couponRate != null);
}

// ── bond facts, yields, and the rates-move estimate (all from the ONE bonds domain) ──────────
function BondDetail({ account }: { account: AssetAccount }) {
  // ONE DOOR (MK-NW-O-001 theBonds, Q-NW-4 ruled 2026-09-27). This screen used to call six bond
  // functions and assemble the answer itself, which is how it and the Bonds screen could disagree.
  // It now asks the question once and reads the figures off the answer.
  const answer = theBonds({ accounts: [account], accountId: String(account.asset_id) });
  const one = answer.one;
  // a bond FUND (no maturity) — no honest bond math. A face or a rate never entered still gets its facts: the card used to
  // vanish with no rate, taking face value and maturity with it (outside review OpenAI final, 2026-10-09, DEC-2748b + DEC-2748c)
  // A BOND OR CD WITH NO MATURITY DATE STILL HAS ITS FACTS (DEC-4036b, 2026-10-10): the card used to vanish, so a
  // CD typed without its date showed nothing. Only a holding with no date, no face, no rate and no CD word — a bond
  // fund — has no card; anything else reads "maturity date not entered" where the date would be.
  if (!one || (!one.maturity && one.face == null && one.couponRate == null && !one.isCD)) return null;
  const { matured } = one;
  const years = one.yearsLeft ?? 0;
  return (
    <>
      <View style={s.card}>
        <Text style={s.cardHdr2}>BOND FACTS</Text>
        <FactRow label="Face value" value={one.face != null ? fig('MK-NW-M-023', one.face) : figWords('MK-NW-M-023', 'not entered')} />
        {/* no rate entered: the rate reads "not entered" and a year's interest $0, said so in the Bonds screen's words (DEC-2748c) */}
        <FactRow label="Interest payments" value={figWords('MK-NW-M-024', one.couponRate == null
          ? `not entered · ${fig('MK-NW-M-056', 0)}/year — coupon rate not entered`
          : `${(one.couponRate * 100).toFixed(2)}%/year · ${one.couponPerYear != null ? fig('MK-NW-M-056', one.couponPerYear) : 'not entered'}/year`)} />
        <FactRow label="Matures" value={figWords('MK-NW-M-025', !one.maturity ? MATURITY_NOT_ENTERED : matured ? `${one.maturity} (matured)` : `${one.maturity} (${plural(Math.round(years), 'year')} away)`)} />
        {!matured && one.yieldToMaturity != null && <FactRow label="Yield if held to maturity" value={`about ${fig('MK-NW-M-026', one.yieldToMaturity)} · estimate`} />}
        {one.currentYield != null && <FactRow label="Yield on today's value" value={fig('MK-NW-M-027', one.currentYield)} />}
        {!!one.accruedCaveat && <Text style={s.bondNote}>{one.accruedCaveat}</Text>}
      </View>

      {/* the door says why for a bank CD; a CD bought through a broker gets the estimate like a bond (DEC-3837, 2026-10-10) */}
      {!!one.ratesMoveRefusal && !matured && (
        <View style={s.card}>
          <SectionBand inCard title="IF INTEREST RATES MOVE" />
          <Text style={s.bondNote}>{one.ratesMoveRefusal}</Text>
        </View>
      )}
      {one.ratesMove && (
        <View style={s.card} accessible
          accessibilityLabel={`Estimate, not a prediction. If interest rates rise one percent, this bond's market value falls to roughly ${figSaid('MK-NW-M-028', one.ratesMove.ratesUp.low)} to ${figSaid('MK-NW-M-028', one.ratesMove.ratesUp.high)}. If rates fall one percent, roughly ${figSaid('MK-NW-M-028', one.ratesMove.ratesDown.low)} to ${figSaid('MK-NW-M-028', one.ratesMove.ratesDown.high)}. Held to maturity, ${figSaid('MK-NW-M-023', one.face)} comes back if the issuer pays as promised.`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.cardHdr2}>IF INTEREST RATES MOVE</Text>
            <InfoDot term="rateSensitivity" />
          </View>
          <EstimateTag />
          {/* MK-NW-M-028 under its own identifier (inputs-and-use audit, 2026-10-11): these estimates printed as MK-NW-M-023,
              the bond's face value. The face value on the line below is still MK-NW-M-023. */}
          <Text style={s.bondLine}>Rates rise 1% → value roughly {fig('MK-NW-M-028', one.ratesMove.ratesUp.low)}–{fig('MK-NW-M-028', one.ratesMove.ratesUp.high)} (down about {fig('MK-NW-M-028', Math.abs(one.ratesMove.ratesUp.delta))})</Text>
          <Text style={s.bondLine}>Rates fall 1% → value roughly {fig('MK-NW-M-028', one.ratesMove.ratesDown.low)}–{fig('MK-NW-M-028', one.ratesMove.ratesDown.high)}</Text>
          {one.face != null && <Text style={s.bondNote}>Held to maturity, {fig('MK-NW-M-023', one.face)} comes back — if the issuer pays as promised.</Text>}
        </View>
      )}
    </>
  );
}

// ── alternatives: what it is + the typical return used in projections + the look-back door ──
function AltDetail({ account }: { account: AssetAccount }) {
  const router = useRouter();
  const kind = assetKind(account.kind);
  const ret = benchmarkReturn(account.kind);
  return (
    <View style={s.card}>
      <Text style={s.cardHdr2}>ABOUT THIS HOLDING</Text>
      <FactRow label="Type" value={kind?.label ?? 'Alternative'} />
      {/* B44 (founder): a "typical yearly return" exists for gold/crypto (approved wireframe) but
          NOT for an option — a contract has no historical asset-class return. Say the truth instead. */}
      {account.kind === 'options'
        ? <Text style={s.optNote}>Options are contracts — no "typical yearly return" exists for them. Their value moves with the underlying price, time to expiry and volatility.</Text>
        : <FactRow label="Typical yearly return for this type" value={`~${(ret * 100).toFixed(2)}% · estimate from history`} />}
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/look-back')}
        accessibilityLabel="Look back: what if this had been in the stock market?">
        <Text style={s.linkTxt}>Look back: what if this had been in the stock market? ›</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── HISTORIC 12-MONTH RETURN — edits the SAME actual_ttm the Retirement cockpit reads ──
// His wording (DEC-6005, 2026-10-19): "change the wording keep is simple for users … Something like "Historic 12 Month
// Return" …", then "ok. Update the language to reflect what is accurate.", then "Add your historic 12-month - remove
// your. Rest approved." One title, one body, and "Not entered" where nothing was typed — the same words in the
// Retirement cockpit's editor of this field.
function ReportedReturnCard({ account }: { account: AssetAccount }) {
  const store = useStore() as any;
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const ttm = account.actual_ttm;
  const save = () => {
    const n = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
    store.updateAsset?.(account.asset_id, { actual_ttm: Number.isFinite(n) ? n / 100 : null });
    setEditing(false);
  };
  return (
    <View style={s.card}>
      <Text style={s.cardHdr2}>{HISTORIC_TTM_TITLE}</Text>
      <Text style={s.optNote}>{HISTORIC_TTM_BODY}</Text>
      {editing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <TextInput style={s.ttmInput} keyboardType="numbers-and-punctuation" placeholder="e.g. 2.1"
            placeholderTextColor={Colors.textTertiary} value={val} onChangeText={setVal} autoFocus
            accessibilityLabel="Historic 12-month return on your holdings, in percent" />
          <Text style={s.bondLine}>%</Text>
          <TouchableOpacity accessibilityRole="button" style={s.ttmSave} onPress={save} accessibilityLabel="Save historic 12-month return">
            <Text style={s.ttmSaveTxt}>Save</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Text style={[s.bondLine, { flex: 1 }]}>{ttm != null ? `${(ttm * 100).toFixed(2)}%` : 'Not entered'}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => { setVal(ttm != null ? String((ttm * 100).toFixed(2)) : ''); setEditing(true); }}
            accessibilityLabel={ttm != null ? 'Edit historic 12-month return' : 'Add historic 12-month return'}>
            <Text style={s.linkTxt}>{ttm != null ? 'Edit' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.factRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={s.factL}>{label}</Text>
      <Text style={s.factV}>{value}</Text>
    </View>
  );
}

// ── the small record sheet: which kind, then date + amount (+ destination for transfers) + effect ──
// One door can carry more than one kind of record (money in, money out, a move between accounts), so
// the sheet names the kinds behind the door it was opened by and records through the ONE recorder.
function RecordActivitySheet({ account, kinds, onClose }: { account: AssetAccount; kinds: ActionType[] | null; onClose: () => void }) {
  const store = useStore() as any;
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState<'today' | 'yesterday'>('today');
  const [destId, setDestId] = useState<string | null>(null);
  const [action, setAction] = useState<ActionType | null>(null);
  const amt = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
  const others = ((store.assetAccounts ?? []) as AssetAccount[]).filter((a) => a.asset_id !== account.asset_id);
  const dest = others.find((a) => String(a.asset_id) === String(destId)) ?? null;
  const ready = amt > 0 && (action !== 'TRANSFER' || !!dest);

  React.useEffect(() => {
    if (kinds) { setAmount(''); setDay('today'); setDestId(null); setAction(kinds[0] ?? null); }
  }, [kinds]);

  const save = () => {
    if (!action || !ready) return;
    const d = new Date(); if (day === 'yesterday') d.setDate(d.getDate() - 1);
    store.recordTransaction?.({
      type: action, account_id: account.asset_id, amount: amt, date: iso(d),
      ...(action === 'TRANSFER' && dest ? { counter_account_id: dest.asset_id } : {}),
    });
    onClose();
  };

  const preview = !ready ? null
    : action === 'TRANSFER' ? `−${typedAmount(amt)} from ${account.label} → +${typedAmount(amt)} into ${dest?.label}`
    : action === 'WITHDRAWAL' ? `−${typedAmount(amt)} from ${account.label}`
    : `+${typedAmount(amt)} into ${account.label}`;

  return (
    <Modal visible={kinds != null} transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close without saving" style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet} onStartShouldSetResponder={() => true}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>{action ? ACTION_LABEL[action] : ''} — {account.label}</Text>
          {/* the kinds behind this door. One kind → no chips to choose from; the door already said it. */}
          {(kinds?.length ?? 0) > 1 && (
            <View style={s.kindRow}>
              {(kinds ?? []).map((k) => (
                <TouchableOpacity accessibilityRole="button" key={k} style={[s.dayChip, action === k && s.destOn]}
                  onPress={() => setAction(k)} accessibilityState={{ selected: action === k }}
                  accessibilityLabel={`Record a ${ACTION_LABEL[k].toLowerCase()} for ${account.label}`}>
                  <Text style={s.destTxt}>{ACTION_LABEL[k]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* Founder finding 2026-08-11: a deposit never said where the money went, so it looked as
              though the app had silently decided. It has not decided anything — money arriving in an
              investment account IS settlement cash until a purchase moves it. Say that. */}
          {action === 'DEPOSIT' && (account.positions?.length ?? 0) > 0 && (
            <Text style={s.sheetNote}>Lands as cash in this account. When you invest it, record the purchase and it moves into that holding.</Text>
          )}
          {action === 'WITHDRAWAL' && (account.positions?.length ?? 0) > 0 && (
            <Text style={s.sheetNote}>Comes out of the cash in this account — sell a holding first if there isn't enough.</Text>
          )}
          <View style={s.amtRow}>
            <Text style={s.amtPrefix}>{currencySymbol()}</Text>
            <TextInput style={s.amtInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary}
              value={amount} onChangeText={setAmount} autoFocus accessibilityLabel="Amount" />
          </View>
          {action === 'TRANSFER' && (
            <View style={s.destWrap}>
              <SectionBand title="INTO" />
              {others.map((a) => (
                <TouchableOpacity accessibilityRole="button" key={a.asset_id}
                  style={[s.destRow, destId === a.asset_id && s.destOn]}
                  onPress={() => setDestId(String(a.asset_id))}
                  accessibilityLabel={`Transfer into ${a.label}`}
                  accessibilityState={{ selected: destId === a.asset_id }}>
                  <Text style={s.destTxt}>{a.label}</Text>
                </TouchableOpacity>
              ))}
              {others.length === 0 && <Text style={s.empty}>Add another account first.</Text>}
            </View>
          )}
          <View style={s.dayRow}>
            {(['today', 'yesterday'] as const).map((dd) => (
              <TouchableOpacity accessibilityRole="button" key={dd} style={[s.dayChip, day === dd && s.destOn]} onPress={() => setDay(dd)}
                accessibilityState={{ selected: day === dd }}>
                <Text style={s.destTxt}>{dd}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {preview && <Text style={s.preview}>{preview}</Text>}
          <TouchableOpacity accessibilityRole="button" style={[s.primaryBtn, !ready && { opacity: 0.4 }]} disabled={!ready} onPress={save}
            accessibilityLabel={`Save this ${action ? ACTION_LABEL[action].toLowerCase() : ''}`}>
            <Text style={s.primaryTxt}>Save</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── update a hand-entered value (re-stamps value_as_of — display honesty, one stored number) ──
function UpdateValueSheet({ account, visible, onClose }: { account: AssetAccount; visible: boolean; onClose: () => void }) {
  const store = useStore() as any;
  const [amount, setAmount] = useState('');
  React.useEffect(() => { if (visible) setAmount(String(account.balance ?? '')); }, [visible]);
  const amt = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
  const save = () => {
    if (amt <= 0) return;
    store.updateAsset?.(account.asset_id, { balance: amt, value_as_of: iso(new Date()) });
    onClose();
  };
  return (
    <Modal visible={visible} transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close without saving" style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet} onStartShouldSetResponder={() => true}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>Update value — {account.label}</Text>
          <View style={s.amtRow}>
            <Text style={s.amtPrefix}>{currencySymbol()}</Text>
            <TextInput style={s.amtInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary}
              value={amount} onChangeText={setAmount} autoFocus accessibilityLabel="Current value" />
          </View>
          <Text style={s.preview}>Stamped “Value as of {iso(new Date())}” — the amount is yours to set.</Text>
          <TouchableOpacity accessibilityRole="button" style={[s.primaryBtn, amt <= 0 && { opacity: 0.4 }]} disabled={amt <= 0} onPress={save}
            accessibilityLabel="Save the updated value">
            <Text style={s.primaryTxt}>Save value</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.bgSecondary },
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 15, color: Colors.textSecondary, marginTop: 6, lineHeight: 20 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  chip: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, backgroundColor: Colors.bgTertiary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  updated: { fontSize: 13, color: Colors.textTertiary },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  balance: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary },
  classLine: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  holdsLine: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  statusBadge: { fontSize: 13, fontWeight: '700', color: Colors.amber, backgroundColor: Colors.amberLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6, overflow: 'hidden' },
  optBlock: { marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
  insideRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  insideDot: { width: 9, height: 9, borderRadius: 5 },
  insideSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  txnNote: { fontSize: 11, color: Colors.textTertiary, lineHeight: 16, paddingHorizontal: Spacing.md, paddingTop: 8, paddingBottom: 4 },
  insideEmpty: { fontSize: 13, color: Colors.textTertiary, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  // AMBER, NOT GREEN (DEC-5982, 2026-10-19, his words: "ITemize your holdings box should be amber per color scheme and
  // not green."): the door is a thing the person still has to do, so it wears the app's one amber action box — the
  // exact box of DataGapsBanner (amberLight, a 1-point amber edge, Radii.lg, Spacing.md) — with its title in amber,
  // as this page's own amber box draws it (account-page drawing v01, .warnb).
  itemizeDoor: { backgroundColor: Colors.amberLight, borderWidth: 1, borderColor: Colors.amber, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.md },
  itemizeDoorT: { fontSize: 15, fontWeight: '800', color: Colors.amber },
  itemizeDoorS: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  optHdr: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.7, marginBottom: 4 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  optLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  optVal: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  trioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8 },
  trioCell: { minWidth: 88 },
  trioLbl: { fontSize: 11, color: Colors.textSecondary },
  trioVal: { fontSize: 17, fontWeight: '800', color: Colors.primaryDark, fontVariant: ['tabular-nums'] },
  trioNote: { fontSize: 11, color: Colors.textSecondary, marginTop: 6, lineHeight: 15 },
  // the walk: one row per line, the figure on the shared right edge
  walkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 5, minHeight: 30 },
  walkL: { fontSize: 13, color: Colors.textPrimary, flexShrink: 1 },
  walkV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  walkTotal: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 8 },
  walkNote: { fontSize: 11, fontWeight: '700', color: Colors.primary, marginTop: 8, paddingVertical: 12, minHeight: 44 },
  // BY CATEGORY & HOLDING: the two right-hand columns every row, band and total share
  colHdrRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 2 },
  colHdr: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.4, textAlign: 'right' },
  colValW: { minWidth: 84, textAlign: 'right' },
  colRetW: { minWidth: 64, textAlign: 'right' },
  optRet: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  // the class band: SectionBand's light band, rebuilt here because this row carries TWO figures
  classBand: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.bandLight, paddingVertical: 8, paddingHorizontal: Spacing.md,
    marginHorizontal: -Spacing.md, marginBottom: Spacing.xs, borderRadius: 0 },
  classBandT: { flex: 1, color: Colors.primaryDeep, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  classBandRet: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  classBandV: { color: Colors.primaryDeep, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 8 },
  optNoteFig: { fontWeight: '800', color: Colors.textPrimary },
  // the three doors (mock v14): one filled, two outlined, stacked as the mock stacks them
  doorPrimary: { backgroundColor: Colors.primaryDeep, borderRadius: Radii.md, paddingHorizontal: 14,
    minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginTop: 8 },
  doorPrimaryTxt: { fontSize: 13, fontWeight: '800', color: Colors.white },
  doorOutline: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.primaryDeep, borderRadius: Radii.md,
    paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginTop: 6 },
  doorOutlineTxt: { fontSize: 13, fontWeight: '800', color: Colors.primaryDeep },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.sm, justifyContent: 'center' },
  incomeLine: { fontSize: 11, color: Colors.textSecondary, paddingLeft: 20, paddingBottom: 6, marginTop: -2 },
  optNote: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  maturedCard: { backgroundColor: Colors.amberLight, borderRadius: Radii.md, padding: 12, marginBottom: Spacing.sm },
  maturedTitle: { fontSize: 15, fontWeight: '800', color: Colors.amber },
  maturedBody: { fontSize: 13, color: Colors.amber, marginTop: 3, lineHeight: 17 },
  maturedOpt: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, paddingVertical: 11, paddingHorizontal: 12, marginTop: 8, minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: Colors.amberMid },
  maturedOptTxt: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  maturedWait: { fontSize: 11, color: Colors.textTertiary, marginTop: 8 },
  maturedBtn: { backgroundColor: Colors.amber, borderRadius: Radii.md, paddingVertical: 11, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 8, minHeight: 44, justifyContent: 'center' },
  maturedBtnTxt: { fontSize: 13, fontWeight: '800', color: Colors.white },
  staleCard: { backgroundColor: Colors.amberLight, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  staleTxt: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  staleBtn: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, paddingVertical: 8, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  staleBtnTxt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  section: { fontSize: 13, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: 6 },
  link: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginTop: 4, paddingVertical: 12, minHeight: 44, textAlignVertical: 'center' },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, minHeight: 40 },
  txnMine: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark, marginTop: 1 },
  txnFrom: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  txnEdit: { fontSize: 15, color: Colors.primaryDark, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 6 },
  txnEditGap: { width: 31 },
  txnLabel: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  txnAmt: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  empty: { fontSize: 13, color: Colors.textSecondary, paddingVertical: 6 },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  primaryTxt: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  secondaryBtn: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  secondaryTxt: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  sheetNote: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  amtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  amtPrefix: { fontSize: 30, fontWeight: '800', color: Colors.textSecondary },
  amtInput: { fontSize: 38, fontWeight: '800', color: Colors.textPrimary, minWidth: 80, textAlign: 'center', padding: 0 },
  destWrap: { marginTop: Spacing.sm },
  destHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  destRow: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, marginBottom: 6, minHeight: 44, justifyContent: 'center' },
  destOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  destTxt: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textTransform: 'capitalize' },
  dayRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm, justifyContent: 'center' },
  dayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, minHeight: 40, justifyContent: 'center' },
  preview: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  cardHdr2: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  estTag: { fontSize: 11, fontWeight: '800', color: Colors.amber, letterSpacing: 0.3, marginBottom: 4 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, gap: 10 },
  factL: { fontSize: 15, color: Colors.textSecondary, flexShrink: 0 },
  factV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  bondLine: { fontSize: 13, color: Colors.textPrimary, lineHeight: 20, marginTop: 4 },
  bondNote: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 6 },
  linkTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 8 },
  ttmInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, color: Colors.textPrimary, minWidth: 80, backgroundColor: Colors.bgSecondary },
  ttmSave: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  ttmSaveTxt: { color: Colors.white, fontSize: 13, fontWeight: '800' },
});

// ── EDIT A RECORD YOU ENTERED (handoff 2026-08-11) ─────────────────────────────────────────────
// Only rows the person typed reach this sheet — a broker row is the broker's own fact and the next
// sync would overwrite any change, so it is never editable. A correction is applied as a REVERSAL
// plus a fresh record, through the one transactions function, so the account's balance moves by the
// same tested rules as every other change rather than being patched behind the ledger's back.
function EditRecordSheet({ row, onClose }: { row: Transaction | null; onClose: () => void }) {
  const store = useStore() as any;
  const [amount, setAmount] = useState('');
  React.useEffect(() => { if (row) setAmount(String(Math.abs(Number(row.amount) || 0))); }, [row?.id]);
  if (!row) return null;
  const n = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
  const valid = Number.isFinite(n) && n > 0;

  const save = () => {
    if (!valid) return;
    const { id, created_at, ...rest } = row as any;
    if (store.deleteTransaction?.(row.id) === false) {
      Alert.alert('This one can’t be changed', 'It is an older record the ledger cannot reverse. You can add a correcting entry instead.');
      onClose(); return;
    }
    store.recordTransaction?.({ ...rest, amount: n });
    onClose();
  };
  const remove = () => {
    if (store.deleteTransaction?.(row.id) === false) {
      Alert.alert('This one can’t be deleted', 'It is an older record the ledger cannot reverse.');
    }
    onClose();
  };

  return (
    <Modal visible transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" style={sh.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={sh.sheet} onStartShouldSetResponder={() => true}>
          <View style={sh.grip} />
          <Text style={sh.title}>{txnLabel(row.type)} — you entered this</Text>
          <Text style={sh.note}>{String(row.date)} · correcting it reverses the old amount and records the new one, so your balance stays right.</Text>
          <View style={sh.amtRow}>
            <Text style={sh.amtPrefix}>{currencySymbol()}</Text>
            <TextInput style={sh.amtInput} keyboardType="decimal-pad" value={amount} onChangeText={setAmount}
              autoFocus accessibilityLabel="Amount" />
          </View>
          <TouchableOpacity accessibilityRole="button" style={[sh.saveBtn, !valid && { opacity: 0.5 }]} disabled={!valid}
            onPress={save} accessibilityLabel="Save this correction">
            <Text style={sh.saveTxt}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={remove} accessibilityLabel="Delete this record">
            <Text style={sh.deleteLink}>Delete this record</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const sh = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 34 },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  title: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  note: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  amtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.md },
  amtPrefix: { fontSize: 24, fontWeight: '800', color: Colors.textSecondary },
  amtInput: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, minWidth: 140, textAlign: 'center',
    borderBottomWidth: 2, borderBottomColor: Colors.primaryDeep, paddingVertical: 6, minHeight: 48 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg },
  saveTxt: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  deleteLink: { fontSize: 15, fontWeight: '700', color: Colors.red, textAlign: 'center', marginTop: Spacing.md, minHeight: 44, paddingTop: 12 },
});

/** The v17 top (frame 2) keeps the styles it was built and diff-tested with. */
const p = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  back: { color: Colors.primary, fontSize: 17, fontWeight: '700' },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 6 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.md },

  // the window selector: one quiet tray, the chosen window lifted onto a white card (mock v14)
  segRow: {
    flexDirection: 'row', gap: 3, backgroundColor: Colors.bgTertiary,
    borderRadius: Radii.md, padding: 3, marginBottom: Spacing.md,
  },
  seg: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.sm, paddingHorizontal: 2 },
  segWide: { flex: 1.6 },
  segOn: { backgroundColor: Colors.cardBg },
  segK: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.3 },
  segV: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, marginTop: 2, fontVariant: ['tabular-nums'] },
  segOnT: { color: Colors.primaryDark },

  // the trio on ONE row — his change in v17
  trio: { flexDirection: 'row', marginTop: Spacing.sm },
  trioCell: { flex: 1, alignItems: 'center' },
  trioL: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.3 },
  trioV: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 3, fontVariant: ['tabular-nums'] },

  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  note: { fontSize: 11, color: Colors.textTertiary, lineHeight: 16, marginTop: 6, flexShrink: 1 },

  wRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, gap: 12 },
  wL: { fontSize: 15, color: Colors.textSecondary, flexShrink: 1 },
  wV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'], textAlign: 'right' },
  wTotal: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4 },
  wStrong: { fontWeight: '800', color: Colors.textPrimary },

  acctRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg, paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  acctName: { flex: 1, fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  acctV: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  chev: { fontSize: 17, color: Colors.textTertiary },
  acctSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.md, paddingHorizontal: Spacing.md },

  catHead: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm, paddingBottom: 4 },
  catHeadL: { flex: 1, fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.3 },
  catHeadR: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.3, textAlign: 'right' },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  catL: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  catV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'], textAlign: 'right' },
  // ONE right edge for every figure: both columns are fixed width, so nothing shifts (his gap 4)
  colEarned: { width: 96 },
  colReturn: { width: 92 },
});
