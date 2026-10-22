// Account portfolio — ONE screen per account (his DEC-0646, 2026-10-01: the Account detail screen IS this screen), BUILT
// TO THE ACCOUNT-PAGE DRAWING v01, APPROVED 2026-10-19 (his word "approved." — DEC-6457), which replaces Performance
// v17 frame 2 as its design: MoneyKeel/documents/networth-and-performance/moneykeel_pres_mock_account-page_v01.html, six
// states A to F (F, a bond whose value is its face value, added 2026-10-20). Top to bottom, as drawn: the name; the source chip; the class and tax type; the five windows; THIS
// ACCOUNT · <window> with the trio on one row; the amber box of missing information; HOW $X BECAME $Y · THIS ACCOUNT;
// BY CATEGORY & HOLDING; Edit · Update value (an account built by hand); BOND FACTS, IF INTEREST RATES MOVE, HISTORIC
// 12-MONTH RETURN; ACTIVITY · <window> with its three doors. Held word for word, state by state, by
// src/screens/__tests__/account_page_drawing_states.test.tsx. Every figure comes from one door (MK-NW-O-002 theAccount,
// MK-NW-O-008 thePerformance); the screen calculates nothing.
import { plural } from '../domain/_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { SectionBand } from '../components/SectionBand';
import { fig, figSaid, figWords } from '../components/figure';   // rule 11: a figure prints with its identifier
import { percentDigits } from '../../MoneyKeel/functions/_figure-spec';   // the one writer of a percent's digits (DEC-6212)
import { Colors, Spacing, Radii, ClassMarkColors, Shadows } from '../utils/theme';
import { currencySymbol } from '../domain/_shared/money';
import { periodReturnSince, buildPerformance, priceHistoryShortSentence, bondInterestInWindow, returnWithInterest, isIndividualBondOrCD, latestCloseLookup, valueAtClose, type Period, type Position } from '../domain/performance';
import { DateLink } from '../components/DateField';   // (DEC-4059c, 2026-10-10)
import { EDIT_HISTORY_START, historyCoverage, assetClassOf, taxWordsOf, TAX_TYPE_NOT_STATED, holdingClassOf, ASSET_CLASS_LABEL, valueFreshness, assetKind, benchmarkReturn, accountDisplayNames, accountClassBreakdown, type AssetAccount } from '../domain/assets';
import { dataGaps } from '../domain/gaps';
import { DataGapsBanner } from '../components/DataGapsBanner';   // the app's one amber box of missing information (drawing v01, state D)
import { SourceChip } from '../components/SourceChip';   // the one source chip: "🔗 Linked", its age only when stale
import { theBonds, holdingBondFacts, MATURITY_NOT_ENTERED } from '../../MoneyKeel/functions/networth-and-performance/bonds';
import { theAccount } from '../../MoneyKeel/functions/networth-and-performance/account';
import { theHolding } from '../../MoneyKeel/functions/networth-and-performance/holding';   // each holding's value, by its own door
import { Dec } from '../../Calculation Module code/engines/decimal';   // exact money subtraction, so nothing is cut to cents
import { windowStartKey, thePerformance, classReturnOf } from '../../MoneyKeel/functions/networth-and-performance/performance';
import { txnLabel, cashEffect, type Transaction } from '../domain/transactions';
import { moneyIntoAccount } from '../../Calculation Module code/engines/ledger';
import { maskedMoney, spokenMoney, typedAmount } from '../components/useMoney';
import { InfoDot, EstimateTag } from '../components/UI';
import { modalAnimation } from '../hooks/reducedMotion';
import TopBar from '../components/TopBar';
import { HISTORIC_TTM_TITLE, HISTORIC_TTM_BODY } from '../constants/historicReturn';
import { CD_BOUGHT_QUESTION, CD_BOUGHT_CHOICES } from '../constants/cdBought';   // the one wording (DEC-3837)
import { WindowSelector } from '../components/WindowSelector';   // one card, one set of words (DEC-6005)

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
// percents to two decimals, half away from zero, by the one writer (percentDigits — +2.125% is +2.13%, DEC-6212)
const pct2 = (v: number | null): string => (v == null ? '—' : `${v >= 0 ? '+' : '−'}${percentDigits(Math.abs(v))}%`);
/** A stated yearly rate, worded the one way the canon allows (cluster 14 spells the period in full). */
const rateWords = (rate: number): string => `${percentDigits(rate)}%/year`;
const WINDOW_KEYS = ['SINCE', '1M', 'YTD', '1Y', '2Y'] as const;
/** THE ONE RIGHT EDGE (drawing v01, row 8; DEC-0093): every figure is followed by the same 16-point column — "›" on a
 *  row that opens a page, "✎" on a record you entered, empty elsewhere — so every figure ends on one line. */
const GUTTER = 16;
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
  const { id: idParam, accountId, class: classParam, period: periodParam, show: showParam } = useLocalSearchParams<{ id?: string; accountId?: string; class?: string; period?: string; show?: string }>();
  const id = idParam ?? accountId;
  // B47 finding 7 (APPROVED): arriving from a class slice = the class-only view; the whole
  // account is one labeled tap away (clearing the param).
  const classView = classParam && ['stocks_etf', 'bonds', 'cash', 'alternatives'].includes(String(classParam)) ? String(classParam) : null;
  const store = useStore() as any;
  const account: AssetAccount | undefined = (store.assetAccounts ?? []).find((a: AssetAccount) => String(a.asset_id) === String(id));
  // which DOOR is open, and so which kinds of record its sheet offers (mock v14: three doors)
  const [door, setDoor] = useState<ActionType[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  // THE WAY DOWN TO ACTIVITY (Q15, 2026-10-20, the drawing's rows 49-50): the amber box's door for a record under a word
  // the app does not know goes down to ACTIVITY with every record listed — on this page, and when another screen opens
  // this page for it (show=activity). Pushing this page's own route again opened a second copy of it.
  const scrollRef = useRef<ScrollView>(null);
  const activityY = useRef<number | null>(null);
  const arrivedAtActivity = useRef(false);
  const goToActivity = () => { setShowAll(true); if (activityY.current != null) scrollRef.current?.scrollTo({ y: activityY.current, animated: true }); };
  const [valueSheet, setValueSheet] = useState(false);
  const [editRow, setEditRow] = useState<Transaction | null>(null);   // a row YOU entered, opened to correct
  // the window a person picks on THIS page; until they pick one, the page opens on the window it was opened with (below)
  const [picked, setPicked] = useState<string | null>(null);
  const [closed, setClosed] = useState<Record<string, boolean>>({});   // a class bar tapped shut (▾ → ▸), drawing v01

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
  // SOURCE ALWAYS, DATE ONLY WHEN STALE (the account-page drawing v01, approved 2026-10-19, row 7; DEC-0223, DEC-0355): the
  // chip says where the figures come from — "🔗 Linked", with its age only once it is stale, the one chip Net worth and
  // Performance print. A linked account used to print "Updated Sep 30, 1:00 AM" beside it on every visit, so a date was
  // there whether or not it meant anything. A value typed by hand carries the day it was typed (row 36): "Value as of
  // Jun 2, 2026", through the one date writer.
  const valueAsOfLine = source !== 'connected' && account.value_as_of ? `Value as of ${dateShown(account.value_as_of)}` : null;
  const paused = !!(account.connection_id && (store.snaptradeConnections ?? []).find((c: any) => c.id === account.connection_id && c.disabled));
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
  /** A BALANCE NEVER ENTERED (the drawing's row 16, DEC-3657): Market value reads the one wording for it, and Wealth
   *  generated and Return a dash — never $0. */
  const hasValue = account.balance != null && Number.isFinite(account.balance as number);

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
  /** A holding row's income, from the door: by the holding's TICKER, which is what a record names. It read the row's NAME,
   *  so a bond shown by its name (a 9-character security id gives way to the name) matched no record and its interest
   *  line never showed (found 2026-10-19 running the account-page drawing's state A, DEC-6212). The cash row's income is
   *  the interest that names no holding (theAccount.incomeOfCash, drawing v01 state A: "Income: $15 interest"). */
  const incomeRowOf = (rw: any) => (rw.key === '__cash' ? answer.incomeOfCash
    : answer.incomeOfHolding(String(rw.ticker ?? '').trim() || String(rw.name ?? '').split(' · ')[0].trim()));
  const incomeOf = (rw: any): string => incomeRowOf(rw).words
    .replace(/(\d+) dividends/, (_m, n) => `${fig('MK-NW-M-019', Number(n))} dividends`)
    .replace(/(\d+) interest/, (_m, n) => `${fig('MK-NW-M-019', Number(n))} interest`);
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
  // THIS ACCOUNT'S OWN DAYS (2026-10-19, found building the account-page drawing v01, row 19: "on this page the account's
  // own record begins Jun 2, 2026"). Every day in the record was read, so an account added today beside accounts recorded
  // for a year opened on "Since" a year ago, a day it was not in the record at all.
  const holdsThis = (d: any) => (d.accounts ?? []).some((a: any) => String(a.accountId) === String(account.asset_id))
    || (d.holdings ?? []).some((h: any) => String(h.accountId) === String(account.asset_id));
  const recordedDays = days.filter(holdsThis).map((d: any) => String(d.date).slice(0, 10)).filter(okDay).sort();
  const movedDays = ledger.map((t: any) => String(t.date).slice(0, 10)).filter(okDay).sort();
  const dataStart: string | null = recordedDays[0] ?? movedDays[0] ?? null;
  // A HOLDING'S PURCHASE DATE, for the cap — the Performance tab's rule (invest-v3 FINAL, 2026-07-19): dated lots win; a
  // linked holding's average-cost lot has no date, so this account's earliest BUY of it fills in. The record's first day
  // used to fill in instead, which read a holding the broker already held on that day as bought that day: on a page
  // whose record begins today, every window worked back from price history showed the return on cost (state D of the
  // account-page drawing read +25.00% for 1Y where VTI's prices give +10.00%; found 2026-10-19 running the drawing's
  // states through this screen, DEC-6212).
  const firstBuy: Record<string, string> = {};
  for (const t of ledger) {
    const d = String(t?.date ?? '').slice(0, 10);
    if (t?.type !== 'BUY' || !t?.ticker || !okDay(d)) continue;
    const k = String(t.ticker).trim().toUpperCase();
    if (!firstBuy[k] || d < firstBuy[k]) firstBuy[k] = d;
  }
  const boughtOn = (q: Position) => firstBuy[String(q.ticker ?? '').trim().toUpperCase()] ?? null;
  // the records and this account, so a bond's or a CD's interest is part of its return (DEC-6212, 2026-10-19)
  const income = { transactions: ledger, accounts: [account] };
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
    const priced = buildPerformance(positions, priceOf, p as Period, new Date(), boughtOn, p === 'SINCE' ? start : undefined, income);
    return thePerformance({
      windowStart: start,
      windowLabel: p === 'SINCE' ? (dataStart ? `since ${dateShown(dataStart)}` : 'since today') : (PHRASE[p] ?? 'this window'),
      today: todayKey,
      // the holdings themselves: the door decides each one's gain over THIS window, and names any it
      // cannot know — this account's own value counts as the instrument when it holds no positions (DEC-3656, 2026-10-09;
      // one with no price history is left out of Wealth generated and Return, and named — DEC-5068, 2026-10-13)
      holdings: priced as any,
      // each holding's price history: the days of a window before the daily record begins are worked back from it and joined to the record's own return (DEC-6412, 2026-10-19)
      priceOf,
      transactions: ledger,
      snapshotDays: days,
      investmentAccountIds: ids,
      accounts: [account] as any[],
      wholeRecord: p === 'SINCE',   // "Since" is the window's own total, never a yearly rate (v17, phone 3)
    });
  };
  const byWindow: Record<string, ReturnType<typeof figuresFor>> = {};
  for (const k of WINDOW_KEYS) byWindow[k] = figuresFor(k);
  /** THE WINDOW THE PAGE OPENS ON (the drawing's row 18, approved 2026-10-19, DEC-6457): "The page opens on the window
   *  picked on Performance; opened from Net worth, on Since." Performance hands its window over (?period=1Y); every other
   *  door hands none, so Since. A window this account cannot show — one its own record and no price history reach, which
   *  cannot be picked here (row 19) — opens on Since instead, as states B and E are drawn. */
  const handed = WINDOW_KEYS.find((k) => k === String(periodParam ?? '').toUpperCase()) ?? 'SINCE';
  const cannotPick = (k: string) => k !== 'SINCE' && byWindow[k]?.covered === false && !byWindow[k]?.workedBack;
  const period: string = picked ?? (cannotPick(handed) ? 'SINCE' : handed);
  const now = byWindow[period];
  const walk = hasValue ? now?.walk : null;
  const windowStart: string | null = now?.windowStart ?? null;
  /** DAY ONE: nothing this account recorded or moved is dated before today — the value is real, the return starts today.
   *  AS THE APP HAS IT (2026-10-19, the account-page drawing v01, DEC-6075): Home writes today's values to the daily
   *  record the moment it opens, so on the day an account is linked or added its record already holds ONE day, today.
   *  The day-one test read "no record at all", which never happens once Home has opened — so the approved day-one lines
   *  never showed. A record that begins today is day one, as the Performance tab has always read it. */
  const dayOne = !(recordedDays[0] && recordedDays[0] < todayKey) && !(movedDays[0] && movedDays[0] < todayKey);
  /** A WINDOW WORKED BACK FROM TODAY IS NOT DAY ONE (DEC-5068, DEC-5291): with a record that begins today, 1M, This year,
   *  1Y and 2Y open before it and are worked back from each holding's price history (state D); only the window that
   *  begins today reads as day one (state C). The Performance tab's own rule. */
  const dayOneView = dayOne && !now?.workedBack;
  /** The day the figures start from, as the drawing writes it: the record's first day. */
  // read from the record: its first day; from the activity records alone: the first day money moved — for SINCE only. ANY
  // OTHER WINDOW BEGINS WHERE THE DOOR SAYS (beginningAsOf), as on the Performance tab (2026-10-21, one date for one window):
  // with no daily record a 1M walk read "Beginning market value (Nov 20, 2024)", the first money movement, where the
  // Performance tab's 1M read Sep 20, 2026.
  const since: string | null = recordedDays.length || period !== 'SINCE' ? (now?.beginningAsOf ?? null) : (movedDays[0] ?? null);
  const sinceWords = dayOneView || !since ? 'today' : dateShown(since);
  const windowWords = period === 'SINCE' ? `since ${sinceWords}` : (PHRASE[period] ?? 'this window');
  /** How far back this account's own records reach — on this page only the refusal of a start date that cannot be read,
   *  with its Edit date door (DEC-4059c, row 20 of the drawing). A window reaching past what the broker shared is said by
   *  the amber box below (the history-depth gap); "no activity records" is said by nothing on the drawing — it read
   *  "Vanguard hasn't shared any activity records yet" on an account showing fifteen of them. */
  const coverage = historyCoverage(account, now?.windowStart ?? todayKey, new Date());
  // THE AMBER BOX OF MISSING INFORMATION (the drawing's state D, rows 11 and 35): this account's own gaps, from the one
  // function the Performance and Net worth banners read. Not on day one: nothing is measured yet, so no number is
  // missing an input (state C draws none).
  // the price history the app holds, so a holding added by hand is judged for a price today too (R7, 2026-10-20)
  const gaps = dayOneView ? [] : dataGaps([account], now?.windowStart ?? null, Date.now(), ledger as any, (store.syncFailures ?? []) as any, [], latestCloseLookup(priceCache));   // the one price lookup, the same on Net worth and Performance (2026-10-21)
  // the Total row of BY CATEGORY & HOLDING carries the account's own return — the window's, from the
  // door above, never a second method; where it cannot be measured there is no figure
  const acctReturnText = hasValue ? pct2(now?.ret ?? null) : '—';
  // ONE string for this account's market value: the band, the trio and the Total row all print it,
  // so three places on one screen can never show three different roundings of the same figure.
  const marketValueText = hasValue ? fig('MK-NW-M-018', account.balance as number) : figWords('MK-NW-M-018', 'Value not entered');
  /** THE LINE UNDER A BOND'S OR A CD'S NAME, as a stock's carries its shares (DEC-6212, 2026-10-19): face value, coupon
   *  rate, yield to maturity and, since DEC-6323 (owner, 2026-10-19: "Line under a bond - new line missing maturity
   *  date."), the maturity date — "$5,000 face · 4.00% · YTM 4.00% · matures Mar 31, 2027", the date in the app's one
   *  date writer (dateShown); a matured one says "matured Sep 30, 2026", the banner's word, and has no YTM (theBonds
   *  refuses it). The MARKET VALUE column stays market value, so it adds up to the account (DEC-0093, one meaning per
   *  column). A part not given is left out; with none, the old words. */
  const bondLine = (q: any, value: number): string => {
    if (!isIndividualBondOrCD(q)) return 'CDs & Treasuries';
    const f = holdingBondFacts(q, value);
    const parts = [
      f.face != null ? `${fig('MK-NW-M-023', f.face)} face` : '',
      f.couponRate != null ? figWords('MK-NW-M-024', `${percentDigits(f.couponRate)}%`) : '',
      f.yieldToMaturity != null ? `YTM ${fig('MK-NW-M-026', f.yieldToMaturity)}` : '',
      f.maturity != null ? figWords('MK-NW-M-025', `${f.matured ? 'matured' : 'matures'} ${dateShown(f.maturity)}`) : '',
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'CDs & Treasuries';
  };
  /** The cash sleeve has a row of its own when the account holds cash; only then is interest naming no holding the cash's
   *  (its row, its activity line). With no cash row it stays at the account level, never pinned on a holding (2026-08-11). */
  // THE CASH ROW IS THE DOOR'S (theAccount.uninvestedCash, 2026-10-21, DEC-0095): the cash the broker reports plus the part of
  // its total no listed holding accounts for, so the rows add up to the market value. It read the reported cash alone, so a
  // $50,000 account holding $40,000 of shares and reporting $5,000 of cash listed rows of $45,000 under a $50,000 total.
  const cashRowValue: number = answer.uninvestedCash ?? (account as any).cash_balance ?? 0;
  const hasCashRow = cashRowValue !== 0;
  const insideRows = !breakdown ? [] : [
    ...((account.positions ?? []) as any[]).map((p) => {
      const sh = (p.lots ?? []).reduce((t: number, l: any) => t + (l.shares || 0), 0);
      // THE HOLDING'S VALUE, ASKED OF ITS OWN DOOR (MK-NW-O-006 theHolding): quantity × the broker's price × the one
      // multiplier (an option's 100; a bond quoted per $100 of face, a hundredth). Held at full precision (DEC-0403): it was
      // cut to cents here until 2026-10-20, before the rows were added up. Rounded once, where it is printed.
      // A HOLDING WITH NO PRICE IS NOT WORTH $0 (2026-10-21, tenets 2 and 3): alone, it is worth what the broker's total leaves
      // over (theAccount.unpriced — the figure Net worth counts for it); with others, they share one row of their own below
      // and each says it has no price. It printed $0 while its class total carried its value, so the rows fell short.
      const noPrice = p.last_price == null && sh !== 0;
      const aloneUnpriced = noPrice && answer.unpriced != null && answer.unpriced.count === 1;
      const value = p.last_price != null
        ? (theHolding({ position: p, accountId: String(account.asset_id), price: p.last_price, transactions: [] }).value ?? 0)
        : aloneUnpriced ? answer.unpriced!.value : 0;
      const cls2 = holdingClassOf(p);   // the one test — the same one the class figure above these rows was split by
      if (noPrice) return {
        key: p.position_id ?? p.ticker, posId: p.position_id, name: holdingWord(p),
        sub: `${plural(sh, 'share', sh.toLocaleString())} · no price today${aloneUnpriced ? ` — the rest of ${who}'s total` : ''}`,
        color: ClassMarkColors[cls2], value, cls: cls2, ticker: p.ticker,
        ...(aloneUnpriced ? {} : { valueWords: 'no price today' }),
      };
      return {
        key: p.position_id ?? p.ticker,
        posId: p.position_id,
        // THE NAME, AND BENEATH IT THE SHARES AND THE PRICE (drawing v01, state A: "VOO", then "160 shares · $562.50"; v17
        // frame 2: "LCTX", then "965 shares · $41.45"). The shares used to ride the name, "VOO · 160 shares", with no price.
        name: holdingWord(p),
        sub: cls2 === 'bonds' ? bondLine(p, value)
          : cls2 === 'cash' ? 'counts as cash'
          : sh > 0 ? `${plural(sh, 'share', sh.toLocaleString())}${p.last_price != null ? ` · ${fig('MK-NW-M-029', p.last_price)}` : ''}`
          : undefined,
        color: ClassMarkColors[cls2], value, cls: cls2, ticker: p.ticker,
      };
    }),
    // several holdings with no price share the part of the total the rest leaves over, on one row under their class
    ...(answer.unpriced && answer.unpriced.count > 1 ? [{ key: '__unpriced', name: 'Holdings with no price today',
      sub: `${plural(answer.unpriced.count, 'holding')} · the rest of ${who}'s total` as string | undefined,
      color: ClassMarkColors[answer.unpriced.cls] ?? ClassMarkColors.mixed, value: answer.unpriced.value, cls: answer.unpriced.cls }] : []),
    // the cash sleeve, named and described as both drawings name it: "Cash in this account", "uninvested balance"
    ...(hasCashRow ? [{ key: '__cash', name: 'Cash in this account', sub: 'uninvested balance' as string | undefined, color: ClassMarkColors.cash, value: cashRowValue, cls: 'cash' }] : []),
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
  //   · A BOND OR A CD HELD AS A HOLDING shows its price move PLUS the interest it was paid in the window (DEC-6212,
  //     2026-10-19, his words: "Rule is to return % should include price change, dividend and interest, so showing 0%
  //     return for bond is not accurate." — "approved."): KeyBank CD $5,000, $100 of interest, price flat → +2.00%;
  //   · a class shows its holdings' returns weighed by what each was worth when the window began — the Performance
  //     tab's own rule (classReturnOf, MK-NW-F-084), so the two pages cannot weigh a category two ways;
  //   · a holding we hold no price for shows "—", never a guess.
  const statedYearlyRate = (rowClass: string): number | null => {
    // an entered 0% prints 0.00%/year, matching Bonds & CDs on Performance; no rate entered → null (DEC-2748b, 2026-10-12)
    const r = account.coupon_rate;
    return rowClass === 'bonds' && r != null && Number.isFinite(r) && r >= 0 ? r : null;
  };
  /** A holding's own price move over the window the header names — nothing else folded in. */
  const priceReturnOf = (ticker?: string): number | null => {
    // DAY ONE: the window begins today, so it has no length and no holding has a figure yet — a dash, as the drawing's
    // state C draws every holding (found 2026-10-19: with Home's record of today each holding read "+0.00%")
    if (!ticker || !windowStart || dayOneView) return null;
    return periodReturnSince(store.priceCache?.[String(ticker).trim().toUpperCase()], windowStart);
  };
  /** The holding behind a row of the table, when the row is one. */
  const positionOfRow = (rw: any): Position | undefined => positions.find((q: any) => (q.position_id ?? q.ticker) === rw?.key);
  /** A bond's or CD's interest in the window the header names (DEC-6212); null for anything else. */
  const interestOfRow = (rw: any): number | null => {
    const q = positionOfRow(rw);
    return q && windowStart && !dayOneView ? bondInterestInWindow(q, ledger, windowStart, [account]) : null;
  };
  /** A holding's figure over the window: its own price move, and for a bond or a CD the interest it was paid (DEC-6212). */
  const holdingTotalOf = (rw: any): number | null => returnWithInterest(priceReturnOf(rw?.ticker), Math.abs(rw?.value || 0), interestOfRow(rw), startOfRow(rw));
  const returnTextFor = (rw: any): string => {
    const stated = statedYearlyRate(rw.cls);
    if (stated != null) return rateWords(stated);
    if (isWholeAccount(rw.value, (x) => x.key === rw.key)) return acctReturnText;
    return pct2(holdingTotalOf(rw));
  };
  /** WHERE A HOLDING'S PRICES BEGIN AFTER THE WINDOW OPENS its figure is measured from its first price, and the
   *  row says so — the same sentence, from the same function, as the Holding page (his approval, 2026-10-12,
   *  DEC-4641). Only on a row whose return column shows its own price figure. */
  const shortHistoryOf = (rowClass: string, value: number, ticker?: string): string => {
    if (!ticker || statedYearlyRate(rowClass) != null || isWholeAccount(value, (x) => x.ticker === ticker)) return '';
    if (priceReturnOf(ticker) == null) return '';
    // "not since <day>" names the day the Since chip above names (dataStart), one date for one window (2026-10-21; the one
    // date writer, MK-ST-F-078): with no daily record the window opens ON the first day money moved, not the day after it
    return priceHistoryShortSentence(store.priceCache?.[String(ticker).trim().toUpperCase()]?.points, windowStart, period, todayKey, dataStart);
  };
  /** A class's price return, weighted by what each holding inside it is worth. */
  const classReturnText = (rowClass: string, total: number, rowsInClass: any[]): string => {
    const stated = statedYearlyRate(rowClass);
    if (stated != null) return rateWords(stated);
    if (isWholeAccount(total, (x) => x.cls === rowClass)) return acctReturnText;
    // weighed by what each holding was worth when the window began, its interest counted (MK-NW-F-084, DEC-6212) — it
    // weighed by today's values, a second rule beside the Performance tab's
    // a holding worth $0 today counts at what it was worth when the window began — read at the same close its own figure
    // divides by (valueAtClose) — so a holding that lost everything is in its class with that loss (2026-10-21, tenet 4)
    const r = classReturnOf(rowsInClass.map((rw) => ({ marketValue: Math.abs(rw.value || 0), interest: interestOfRow(rw), total: holdingTotalOf(rw), startValue: startOfRow(rw) })));
    return r == null ? '—' : pct2(r);
  };
  /** What a holding was worth when the window the header names began: its shares at the close its own figure is measured
   *  from (valueAtClose, the close periodReturnSince reads) — the start a holding worth $0 today is counted at. */
  const startOfRow = (rw: any): number | null => {
    const q = positionOfRow(rw);
    if (!q || !rw?.ticker || !windowStart || dayOneView) return null;
    return valueAtClose(q, store.priceCache?.[String(rw.ticker).trim().toUpperCase()], windowStart);
  };
  /** IS THIS PART THE WHOLE ACCOUNT, so its return IS the account's: worth the account's balance today, and no other
   *  holding here worth anything when the window began (2026-10-21; DEC-5068, tenet 4: a known $0 is $0). A holding beside
   *  it that fell to $0 is in the account's return and not in this part's — Beta $1,200 beside Alpha $1,000 → $0 read the
   *  account's −40.00%, where Beta's own is +20.00%. */
  const isWholeAccount = (value: number, inPart: (rw: any) => boolean): boolean =>
    Math.round(value) === Math.round(account.balance || 0)
    && !insideRows.some((rw: any) => !inPart(rw) && (startOfRow(rw) ?? 0) > 0);
  /** THE CLASSES THE TABLE LISTS, in the drawing's order: the four always, and Unclassified only when this account holds
   *  something nobody has classed yet — it is counted there on Net worth, so it is listed there here. */
  const tableClasses = [...(['stocks_etf', 'bonds', 'cash', 'alternatives'] as const), ...(insideRows.some((rw: any) => rw.cls === 'mixed') ? (['mixed'] as const) : [])];
  /** THE INCOME SUM UNDER THE TABLE (the drawing's row 12, frame 2's sum, redrawn): each holding's income in the order the
   *  rows run, "1,500 ＋ 100 ＋ 85 ＋ 15 = $1,700 for this account". Income no holding carries (a dividend that names no
   *  holding) is the last part, so the parts always add up to the account's income (MK-NW-M-019). */
  const incomeParts: number[] = [];
  if (acctIncome != null && acctIncome > 0) {
    for (const k of tableClasses) for (const rw of insideRows.filter((r: any) => r.cls === k)) {
      // dividends + interest added exactly, in decimals, so no binary leftover rides into the sum below
      const inc = incomeRowOf(rw); const n = Number(Dec.of(inc.dividends || 0).add(Dec.of(inc.interest || 0)).toString());
      if (n > 0) incomeParts.push(n);
    }
    // the income no holding carries, subtracted EXACTLY (in decimals, not binary fractions), so a remainder that is really
    // nothing reads nothing — it was cut to cents here until 2026-10-20 to hide the binary leftovers (DEC-0403)
    const rest = Dec.of(acctIncome).sub(Dec.sum(incomeParts.map((n) => Dec.of(n))));
    if (!rest.isNeg() && !rest.isZero()) incomeParts.push(Number(rest.toString()));
  }
  /** A part of the sum is written as the drawing writes it: whole dollars, no currency sign ("1,500"). */
  const sumPart = (n: number) => fig('MK-NW-M-019', n).replace(currencySymbol(), '');

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

  // ── ACTIVITY · <THE WINDOW> (drawing v01: the bar names the window and counts its records) ───────────────────────
  // The records dated inside the picked window (on or after its first day, the day a bond's interest counts from,
  // DEC-6212); "Since" is the account's whole life, so it lists every record. The first eight show; "See all activity"
  // opens the rest, older ones included, and names the date the list stops at.
  const inWindowTxns = period === 'SINCE' || !windowStart ? txns : txns.filter((t) => String(t.date ?? '').slice(0, 10) >= windowStart);
  const shown = showAll ? txns : inWindowTxns.slice(0, 8);
  const hiddenCount = txns.length - shown.length;
  const cutDay = inWindowTxns.length > shown.length || period === 'SINCE' || !windowStart
    ? String(shown[shown.length - 1]?.date ?? '').slice(0, 10) : windowStart;
  /** WHAT A RECORD WAS ABOUT, named as the table names it (drawing v01: "Interest · KeyBank CD", never its security id;
   *  "Interest · cash in this account" for interest that names no holding; "Buy · VOO · 10 shares @ $600.00"). */
  const recordAbout = (t: Transaction): string => {
    const q = t.ticker ? positions.find((p: any) => String(p.ticker ?? '').trim().toUpperCase() === String(t.ticker).trim().toUpperCase()) : undefined;
    const name = t.ticker ? (q ? holdingWord(q as any) : String(t.ticker)) : (t.type === 'INTEREST' && hasCashRow ? 'cash in this account' : '');
    const sh = Number((t as any).shares) || 0;
    return `${txnLabel(t.type)}${name ? ` · ${name}` : ''}${sh ? ` · ${plural(sh, 'share', sh.toLocaleString())}${(t as any).price ? ` @ ${fig('MK-NW-M-061', (t as any).price)}` : ''}` : ''}`;
  };
  /** A RECORD UNDER A WORD THE APP DOES NOT KNOW (Q15, 2026-10-20, the drawing's row 50): the broker's own word first, so
   *  the person can find it on a statement, then the amber box's words for it; the shares it moved, if any, unsigned —
   *  the app cannot tell which way they went. It read "Broker adjustment". */
  const unknownAbout = (t: Transaction, word: string): string => {
    const sh = Math.abs(Number((t as any).shares) || 0);
    return `${word ? `${word} · an activity the app does not know` : 'An activity the app does not know'}${sh ? ` · ${plural(sh, 'share', sh.toLocaleString())}` : ''}`;
  };

  /** THE TRIO'S COLOURS (drawing v01): Market value in the deep green; Wealth generated and Return green when measured and
   *  not below zero, red below zero, and in the text colour where nothing is measured yet (day one, a dash). */
  const signColor = (v: number | null | undefined) => (v == null || dayOneView ? Colors.textPrimary : v < 0 ? Colors.red : Colors.gainText);
  const taxNotStated = taxWordsOf(account) === TAX_TYPE_NOT_STATED;
  const classWords = breakdownClasses.length > 1 ? 'Mixed holdings' : ASSET_CLASS_LABEL[cls];

  return (
    // TOP BAR (approved mock v14, second phone): the app's own MoneyKeel bar, with "‹ Back" where a
    // tab screen carries Menu — this page is opened from another screen, so back is the escape hatch
    // it needs. The screen title stays the app's one title size, 20 points (s.h1).
    <View style={s.page}>
    <TopBar back />
    <ScrollView ref={scrollRef} automaticallyAdjustKeyboardInsets style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* ── THE HEAD, as the account-page drawing v01 draws it (approved 2026-10-19): the name; the source chip with its
          info dot (and, for a value typed by hand, the day it was typed); the class and the tax type ─────────────────── */}
      <Text style={s.h1}>{accountDisplayNames((store.assetAccounts ?? []) as AssetAccount[]).get(account.asset_id) ?? account.label}</Text>
      <View style={s.chipRow}>
        <SourceChip account={account} paused={paused} />
        <InfoDot term="provenance" size={11} />
        {valueAsOfLine && <Text style={s.updated}>{valueAsOfLine}</Text>}
      </View>
      {/* APPROVED account-detail mock (2026-07-19): an account holding several types is called what it is — "Mixed
          holdings" — and its tax treatment is said beside it, directly under the name (drawing v01, row 7).
          NO TAX TYPE STATED IS SAID, AND OFFERED (DEC-4036f, 2026-10-10): an account with no account type chosen reads
          "tax type not stated" — never "taxable" by default — and "choose ›", in the link colour, opens the account's own
          editor, whose "Held in" choice sets it. */}
      {taxNotStated ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Tax type not stated. Tap to choose."
          onPress={() => router.push(`/add-account?edit=${account.asset_id}` as any)}>
          <Text style={s.headClass}>{classWords} · {TAX_TYPE_NOT_STATED} — <Text style={s.headClassLink}>choose ›</Text></Text>
        </TouchableOpacity>
      ) : (
        <Text style={s.headClass}>{classWords} · {taxWordsOf(account)}</Text>
      )}

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
                accessibilityLabel={`${rw.name}${rw.sub ? `, ${rw.sub}` : ''}, ${(rw as any).valueWords ?? figSaid('MK-NW-M-030', Math.abs(rw.value))}${(rw as any).posId ? '. Opens its page.' : ''}`}>
                <View style={[s.insideDot, { backgroundColor: rw.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.optLabel} numberOfLines={2}>{rw.name}</Text>
                  {!!rw.sub && <Text style={s.insideSub}>{rw.sub}</Text>}
                </View>
                <Text style={s.optVal}>{(rw as any).valueWords ? figWords('MK-NW-M-030', (rw as any).valueWords) : fig('MK-NW-M-030', rw.value)}</Text>
              </TouchableOpacity>
            ))}
            <Text style={s.optNote}>{insideRows.filter((rw: any) => rw.cls === classView && !rw.valueWords).map((rw: any) => fig('MK-NW-M-030', rw.value)).join(' + ')} = {fig('MK-NW-M-020', (breakdown as any)[classView] || 0)}. Everything else lives on the whole-account page — one tap away above.</Text>
          </View>
        </View>
      ) : (
      <>
      {/* ── THE WINDOW SELECTOR · the Performance tab's own control, the same five windows (DEC-6079, 2026-10-19, his
          words: "Also check in perf 17 did we have bar to select time period at the top on account page or not? We
          should have one.") — one component, so the two can never drift apart ────────────────────── */}
      <WindowSelector
        // the Since window names ITS OWN first day — the record's — whichever window is picked. It named the picked
        // window's beginning, so with 1Y picked it read "Since Sep 29, 2025" on a record that begins today (state D of
        // the account-page drawing, found 2026-10-19, DEC-6212)
        windows={WINDOW_KEYS.map((k) => ({ key: k, label: k === 'SINCE' ? (dayOne || !dataStart || dataStart >= todayKey ? 'Since today' : `Since ${dateShown(dataStart)}`) : WINDOW_WORDS[k] }))}
        // A BALANCE NEVER ENTERED IS NEVER $0 (DEC-3657, the drawing's row 16): no window has a figure — they read
        // −100.00% when the missing balance was counted as nothing (found 2026-10-19)
        chosen={period} figures={(hasValue ? byWindow : Object.fromEntries(WINDOW_KEYS.map((k) => [k, { ...byWindow[k], ret: null, perYear: null }]))) as any}
        onPick={(k) => setPicked(k)} />
      {period === '2Y' && (
        <Text style={p.note}>2Y is shown per year, so it sits fairly beside 1Y</Text>
      )}

      {/* ── THIS ACCOUNT · <THE WINDOW> · the trio ON ONE ROW (drawing v01; v17 frame 2's band) ─────────────────────── */}
      <View style={s.card} testID="card-summary">
        <SectionBand inCard gutter={GUTTER} title={`THIS ACCOUNT · ${windowWords.toUpperCase()}`} value={marketValueText} />
        <View style={p.trio}>
          <View style={p.trioCell}>
            <Text style={p.trioL}>Market value</Text>
            <Text style={[p.trioV, { color: Colors.primaryDark }]}>{marketValueText}</Text>
          </View>
          <View style={p.trioCell}>
            <Text style={p.trioL}>Wealth generated</Text>
            <Text style={[p.trioV, { color: signColor(walk?.wealthGenerated) }]}>{walk ? fig('MK-PF-M-014', walk.wealthGenerated) : '—'}</Text>
          </View>
          <View style={p.trioCell}>
            <Text style={p.trioL}>Return</Text>
            <Text style={[p.trioV, { color: signColor(hasValue ? now?.ret : null) }]}>
              {!hasValue || now?.ret == null ? '—' : fig('MK-PF-M-016', now.ret)}
            </Text>
          </View>
        </View>
        {/* the return is for the window picked, and is not a yearly rate unless the window is longer
            than a year — his Q49 ruling, stated on the screen rather than assumed */}
        <View style={p.noteRow}>
          <Text style={p.note}>
            {dayOneView
              /* THE ACCOUNT PAGE'S OWN DAY-ONE LINE (his approval, 2026-10-19, "approved", DEC-6075): a linked account
                 whose broker sent no past activity names the broker; one added by hand says it was added today. A linked
                 account WITH past activity is not day one — its history is rebuilt. */
              ? (source === 'connected'
                ? `You linked this account today. ${who} sent no past activity, so its figures start today.`
                : 'You added this account today, so its figures start today.')
              : walk == null
              /* a refusal is an answer (D4): no daily record reaching back, so no beginning — say so */
              ? 'Wealth generated and Return start once the daily record reaches back far enough to say what this account was worth at the start. It builds from your first recorded day.'
              : now?.sentence
              /* a window joined at the record's first day: only the days before it are worked back (DEC-6412, 2026-10-19) */
              || (now?.recordBegins
                ? `Your daily record begins ${dateShown(now.recordBegins)}, so the days before it are worked back from each holding's price history.`
                : null)
              || (now?.measured == null
                /* no recorded value on the first day: the beginning is worked back from today's values and each
                   holding's price history, and a return IS shown — of the holdings with a history (DEC-5068, 2026-10-13) */
                ? `Your daily record does not reach back to ${sinceWords} yet, so the beginning is worked back from today's values and each holding's price history.`
                : `Return is for the window you picked (${sinceWords} → ${dateShown(todayKey)}) — not a yearly rate · time-weighted`)}
          </Text>
          {/* the day-one line explains no return, so it carries no dot (drawing v01, state C) */}
          {!dayOneView && <InfoDot term="timeWeighted" size={11} />}
        </View>
        {/* A BOND'S OR CD'S VALUE THAT IS NOT A MARKET VALUE SAYS SO (DEC-0281, the one value rule, bondValue): what you
            paid, or the face value, because no market value was entered — so Market value above is not read as one. */}
        {!!bondOne?.valueNote && <Text style={p.note}>{figWords('MK-NW-M-018', bondOne.valueNote)}</Text>}
        {/* BELOW THE SUMMARY, the holding left out of Wealth generated and Return (DEC-5068, 2026-10-13, his words:
            "Below it display …"). Only where the beginning is worked back and a holding has no price history. */}
        {!dayOneView && !!now?.notIncluded && <Text style={p.note}>{now.notIncluded}</Text>}
        {coverage?.kind === 'unreadable' && <Text style={p.note}>{coverage.sentence}{' '}
          {/* (DEC-4059c, 2026-10-10) "Say date cannot be read. Edit date. and give user an option to enter or correct date." */}
          <DateLink text={EDIT_HISTORY_START} label="Edit the history start date" maximumDate={new Date()}
            onPick={(iso) => store.updateAsset?.(account.asset_id, { history_start_override: iso })} /></Text>}
      </View>

      {/* ── THE AMBER BOX OF MISSING INFORMATION (drawing v01, state D; the shared box, DEC-5982 · DEC-6078) ─────── */}
      <DataGapsBanner gaps={gaps}
        onPage={{ sync: source === 'connected', onFix: (g) => (g.kind === 'no-activity' ? (setDoor(incomeKinds), true)
          : g.kind === 'unknown-activity' ? (goToActivity(), true) : false) }} />

      {/* ── THE WALK · how the beginning became the ending ─────────────────────────────────── */}
      {walk != null && walk.beginning != null && (
        <View style={s.card} testID="card-walk">
          <SectionBand inCard gutter={GUTTER}
            /* one title in every state, day one included, "· THIS ACCOUNT" as Performance v17 frame 2 draws it
               (DEC-5136, 2026-10-13: "HOW $38,000 BECAME $52,704 · ALL ACCOUNTS - this is the title.") */
            title={figWords('MK-PF-M-003', `HOW ${fig('MK-PF-M-013', walk.beginning)} BECAME ${fig('MK-PF-M-004', walk.ending)} · THIS ACCOUNT`)} />
          {([
            [`Beginning market value (${sinceWords})`, walk.beginning, 'MK-PF-M-013', ''],
            ['Contributions', walk.contributions, 'MK-PF-M-015', 'flow'],
            ['Withdrawals', -Math.abs(walk.withdrawals), 'MK-PF-M-015', 'flow'],
            ['Wealth generated', walk.wealthGenerated, 'MK-PF-M-014', 'strong'],
            ['Dividends', walk.dividends, 'MK-PF-M-015', 'sub'],
            ['Interest', walk.interest, 'MK-PF-M-015', 'sub'],
            ['Change in investment value', walk.marketChange, 'MK-PF-M-015', 'sub'],
          ] as [string, number, string, string][]).map(([label, v, metric, kind]) => (
            <View key={label} style={[p.wRow, kind === 'sub' && p.wSub]} accessible
              accessibilityLabel={`${label}, ${v < 0 ? 'minus ' : ''}${figSaid(metric, Math.abs(v))}`}>
              <Text style={[p.wL, kind === 'strong' && p.wStrongL]}>{label}</Text>
              {/* money taken out is not a loss, so Withdrawals stays in the text colour; red is for a figure that fell
                  (the Performance tab's rule, 2026-10-12) */}
              <Text style={[p.wV, kind === 'strong' && p.wStrongV, v < 0 && kind !== 'flow' && { color: Colors.red }]}>
                {v < 0 ? '−' : ''}{fig(metric, Math.abs(v))}
              </Text>
              <View testID="right-gutter" style={p.gutter} />
            </View>
          ))}
          <View style={[p.wRow, p.wTotal]} accessible
            accessibilityLabel={`Ending market value today, ${figSaid('MK-PF-M-004', walk.ending)}`}>
            <Text style={[p.wL, p.wStrongL]}>Ending market value ({dayOneView ? 'today' : dateShown(todayKey)})</Text>
            <Text style={[p.wV, p.wStrongV, { color: Colors.primaryDark }]}>{fig('MK-PF-M-004', walk.ending)}</Text>
            <View testID="right-gutter" style={p.gutter} />
          </View>
          {/* THE FOOTNOTE (drawing v01, row 9): the lines open nothing, so nothing here promises they do. Day one says the
              structure fills in; a linked account says where every line comes from; an account built by hand keeps the
              second sentence only; a worked-back window has none — its figures come from price history, as the
              summary already says. */}
          {dayOneView ? (
            <Text style={[p.note, p.notePad]}>Every line fills in as days pass — the structure never changes.</Text>
          ) : now?.workedBack ? null : source === 'connected' ? (
            <Text style={[p.note, p.notePad]}>Every line here comes from {who}’s own records. A hand-entered account has no records to rebuild from, so its walk starts the day you entered it.</Text>
          ) : (
            <Text style={[p.note, p.notePad]}>A hand-entered account has no records to rebuild from, so its walk starts the day you entered it.</Text>
          )}
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
            something to say — in the place the holdings table would take. */}
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

      {/* BY CATEGORY & HOLDING (approved mock v14, second phone; drawing v01) — its own card, with a RETURN column
          beside MARKET VALUE and a Total row that carries the account's own two figures. Holdings sit
          UNDER their class; each holding carries its own income beneath it, because income belongs to
          the holding that earned it, not to the class. Every figure ends on ONE right edge, followed by the same
          16-point column, which holds "›" only on a row that opens a page — each holding (drawing v01, row 8). */}
      {!classView && insideRows.length > 0 && (
        <View style={s.card} testID="card-holdings">
          <SectionBand inCard gutter={GUTTER} title="BY CATEGORY & HOLDING" />
          <View style={s.colHdrRow} accessible accessibilityLabel="Columns: category or holding, market value, return">
            <Text style={[s.colHdr, { flex: 1, textAlign: 'left' }]}>CATEGORY / HOLDING</Text>
            <Text style={[s.colHdr, s.colValW]}>MARKET VALUE</Text>
            <Text style={[s.colHdr, s.colRetW]}>RETURN</Text>
            <View testID="right-gutter" style={s.gutter} />
          </View>
          {tableClasses.map((k) => {
            const inClass = insideRows.filter((rw: any) => rw.cls === k);
            const total = inClass.reduce((t: number, rw: any) => t + (rw.value || 0), 0);
            // ▾ a class with holdings, open; ▸ one with nothing in it, or closed by a tap on its bar (drawing v01)
            const open = inClass.length > 0 && !closed[k];
            return (
              <View key={k}>
                {/* the light-green class band, hand-built for ONE reason: SectionBand carries a single
                    trailing figure and this row carries two (market value AND return). Same band
                    colour, same 11-point caps, same square edge-to-edge bar as every other band. */}
                <TouchableOpacity style={s.classBand} disabled={inClass.length === 0} activeOpacity={0.8}
                  onPress={() => setClosed((c) => ({ ...c, [k]: !c[k] }))}
                  accessibilityRole={inClass.length ? 'button' : undefined}
                  accessibilityState={inClass.length ? { expanded: open } : undefined}
                  accessibilityLabel={`${ASSET_CLASS_LABEL[k]}, ${figSaid('MK-NW-M-020', Math.round(total))}, return ${classReturnText(k, total, inClass)}`}>
                  <View style={[s.classDot, { backgroundColor: ClassMarkColors[k] }]} />
                  <Text style={s.classBandT} numberOfLines={1}>{open ? '▾' : '▸'} {ASSET_CLASS_LABEL[k]}</Text>
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
                  <View testID="right-gutter" style={s.gutter} />
                </TouchableOpacity>
                {inClass.length === 0 && <Text style={s.insideEmpty}>Nothing held in this account</Text>}
                {open && inClass.map((rw: any) => (
                  <View key={rw.key}>
                    <TouchableOpacity style={s.insideRow} disabled={!rw.posId}
                      accessibilityRole={rw.posId ? 'button' : undefined} accessible
                      onPress={() => rw.posId && router.push(`/holding-detail?account=${account.asset_id}&position=${rw.posId}` as any)}
                      accessibilityLabel={`${rw.name}${rw.sub ? `, ${rw.sub}` : ''}, ${rw.valueWords ?? figSaid('MK-NW-M-030', Math.abs(rw.value))}, return ${returnTextFor(rw)}${incomeOf(rw) ? `, ${incomeOf(rw)}` : ''}${rw.posId ? '. Opens its page.' : ''}`}>
                      <View style={[s.insideDot, { backgroundColor: rw.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.optLabel} numberOfLines={2}>{rw.name}</Text>
                        {!!rw.sub && <Text style={s.insideSub}>{rw.sub}</Text>}
                      </View>
                      <Text style={[s.optVal, s.colValW]}>{rw.valueWords ? figWords('MK-NW-M-030', rw.valueWords) : fig('MK-NW-M-030', rw.value)}</Text>
                      <Text style={[s.optRet, s.colRetW]}>{returnTextFor(rw)}</Text>
                      <View testID="right-gutter" style={s.gutter}>{!!rw.posId && <Text style={s.gutterMark}>›</Text>}</View>
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
            accessibilityLabel={`Total, ${hasValue ? figSaid('MK-NW-M-018', Math.round(account.balance as number)) : 'Value not entered'}, return ${acctReturnText}`}>
            <Text style={[s.optLabel, { fontWeight: '800' }]}>Total</Text>
            <Text style={[s.optVal, s.colValW]}>{marketValueText}</Text>
            <Text style={[s.optRet, s.colRetW, { fontWeight: '800' }]}>{acctReturnText}</Text>
            <View testID="right-gutter" style={s.gutter} />
          </View>
          {/* THE NOTE UNDER THE TABLE (drawing v01, rows 12 and 24): the ruled holding-return sentence (DEC-4645, DEC-5848,
              a bond's or CD's interest added since DEC-6212), then — where the account has income — the sum, holding by
              holding, as frame 2 drew it; then what a tap does, and its dot */}
          <View style={p.noteRow}>
            <Text style={[p.note, p.notePad]}>
              A holding’s return is what its own price did in this window, its dividends included, and a bond’s or CD’s interest added; the income is also on the line beneath it.
              {incomeParts.length > 0 && acctIncome != null
                ? ` Income sits with the holding that earned it (${incomeParts.map(sumPart).join(' ＋ ')} = ${fig('MK-NW-M-019', acctIncome)} for this account).`
                : ''} Tap a holding for its own page.
            </Text>
            <InfoDot term="priceReturn" size={11} />
          </View>
        </View>
      )}

      {/* MATURED BOND (mock approved 2026-07-31): a dated banner with the three real outcomes —
          the money must not sit labeled as a growing bond after its maturity date */}
      {maturedOn && (account.balance || 0) > 0 && (
        <View style={s.maturedCard}>
          <Text style={s.maturedTitle}>⏰ This {assetKind(account.kind)?.id === 'cd' ? 'CD' : 'bond'} matured {dateShown(bondOne?.maturity)}.</Text>
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

      {/* EDIT · UPDATE VALUE — on an account built by hand only (drawing v01, states B and E). A linked account's figures
          are the broker's (states A, C and D draw no buttons): its name and tax type are set where it was linked, and
          "choose ›" above opens that editor when the tax type is missing. */}
      {source !== 'connected' && (
        <View style={s.btnRow} testID="account-buttons">
          <TouchableOpacity accessibilityRole="button" style={s.secondaryBtn}
            onPress={() => router.push((cls === 'bonds' ? '/bonds' : cls === 'alternatives' ? '/other-investments' : `/(tabs)/analytics?edit=${account.asset_id}`) as any)}
            accessibilityLabel={`Edit ${account.label}`}>
            <Text style={s.secondaryTxt}>Edit</Text>
          </TouchableOpacity>
          {!account.derive_balance && (
            <TouchableOpacity accessibilityRole="button" style={s.secondaryBtn} onPress={() => setValueSheet(true)}
              accessibilityLabel="Update this account's value">
              <Text style={s.secondaryTxt}>Update value</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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

      {/* ── ACTIVITY · <THE WINDOW> — the ledger, in plain words with signed effects, its bar inside its card (drawing v01) */}
      <View style={s.card} testID="card-activity" onLayout={(e) => {
        activityY.current = e.nativeEvent.layout.y;
        if (showParam === 'activity' && !arrivedAtActivity.current) { arrivedAtActivity.current = true; goToActivity(); }
      }}>
        <SectionBand inCard gutter={GUTTER} title={`ACTIVITY · ${windowWords.toUpperCase()}`}
          value={inWindowTxns.length ? plural(inWindowTxns.length, 'record', fig('MK-NW-M-022', inWindowTxns.length)) : undefined} />
        {txns.length === 0 && <Text style={s.empty}>Log a deposit or a buy — your history starts here.</Text>}
        {shown.map((t) => {
          const incoming = String(t.counter_account_id) === String(id) && t.type === 'TRANSFER';
          // THE AMOUNT COMES FROM THE DOOR (2026-10-01). It was calculated here — a transfer coming
          // in counts as its own amount, anything else as its cash effect — which is a money figure
          // calculated on a screen. MK-NW-O-002 theAccount answers it, and the screen prints it.
          const fromDoor = answer.activity.find((a) => a.recordId === String(t.id));
          // A WORD THE APP DOES NOT KNOW (Q15, the drawing's row 50): the broker's word and the amount it sent, unsigned,
          // in the text colour — never the $0 its effect on the totals is
          const unknown = fromDoor?.unknown ?? null;
          const eff = fromDoor?.amount
            ?? (incoming ? 0 - (moneyIntoAccount(t) ?? 0) : cashEffect(t));   // the one rule for a stored amount (2026-10-21)
            // HANDOFF 2026-08-11: a row is either the BROKER'S fact or YOURS, and the list has to say
            // which. A broker row cannot be edited — the next sync would overwrite it — so it says
            // where it came from and offers nothing. A row you entered is yours to correct, so it wears
            // "you entered this" and a pencil. Before this they looked identical, which meant a typo
            // you made was indistinguishable from the broker's own record and equally unfixable.
            const mine = t.source !== 'connected';
            const from = mine ? 'you entered this' : `from ${account.institution?.trim() || 'your broker'}`;
            const about = unknown ? unknownAbout(t, unknown.word) : recordAbout(t);
            // the amount as the broker sent it, with no direction; a record that moved only shares has no amount — a dash
            // A RECORD WHOSE AMOUNT IS NOT ON RECORD (2026-10-21, DEC-3523 tenet 3): a dash too, in the text colour — it
            // read $0 in green while the return refused across its day (the door says which: theAccount, noAmount)
            const noAmount = !unknown && !!fromDoor?.noAmount;
            const amountText = unknown ? (unknown.amount != null ? fig('MK-NW-M-062', unknown.amount) : '—')
              : noAmount ? '—'
              : `${eff < 0 ? '−' : ''}${fig('MK-NW-M-062', Math.abs(eff))}`;
            const amountSaid = unknown ? `${unknown.amount != null ? figSaid('MK-NW-M-062', unknown.amount) : 'no amount'}, which way it went is not known`
              : noAmount ? 'no amount on record'
              : `${eff < 0 ? 'minus ' : 'plus '}${figSaid('MK-NW-M-062', Math.abs(eff))}`;
            return (
            <View key={String(t.id)} style={s.txnRow} accessible={!mine}
              accessibilityLabel={`${t.date}: ${about}, ${amountSaid}. ${mine ? 'You entered this — editable.' : `${from}, read-only.`}`}>
              {/* THE ROW AS BOTH APPROVED DRAWINGS WRITE IT (Performance v17 frame 2, and v14 before it):
                  "Dividend · LCTX", then "Aug 1 · from E*TRADE", then "$120". It printed the date as "08-01"
                  in a column of its own and "+$120" (mock-match audit, 2026-10-11). A minus stays a minus. */}
              <View style={{ flex: 1 }}>
                <Text style={s.txnLabel} numberOfLines={1}>{about}</Text>
                <Text style={mine ? s.txnMine : s.txnFrom}>{activityDay(String(t.date))} · {from}</Text>
              </View>
              <Text style={[s.txnAmt, { color: !unknown && !noAmount && eff >= 0 ? Colors.gainText : Colors.textPrimary }]}>
                {amountText}
              </Text>
              {/* the one right-hand column: ✎ on a record you entered (it opens its editor), nothing on the broker's */}
              <View testID="right-gutter" style={s.gutter}>
                {mine && (
                  <TouchableOpacity onPress={() => setEditRow(t)} hitSlop={{ top: 12, bottom: 12, left: 14, right: 14 }}
                    accessibilityRole="button" accessibilityLabel={`Edit or delete your ${txnLabel(t.type).toLowerCase()} of ${figSaid('MK-NW-M-062', Math.abs(eff))}`}>
                    <Text style={s.txnEdit}>✎</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
        {/* the one line the approved design puts under the list (mock v14, second phone). Each row
            already says "from E*TRADE" or "you entered this"; this says what that means for what you
            can do with it — the difference between a record you may fix and one that would be
            overwritten by the next sync. */}
        {shown.length > 0 && (
          <View style={p.noteRow}>
            <Text style={[p.note, p.notePad]}>
              Records from {account.institution?.trim() || 'your broker'} can’t be edited — they are the broker’s own. Anything you add is marked “you entered this” and stays editable.
            </Text>
            <InfoDot term="provenance" size={11} />
          </View>
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
            that matters. The rows are newest-first, so the cut is the date of the last one shown; with a window picked
            and nothing past the first eight, it is the window's first day (v17 frame 2: "older than Jul 19"). */}
        {hiddenCount > 0 && !showAll && (() => {
          const when = cutDay ? new Date(`${cutDay}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          return (
            <TouchableOpacity accessibilityRole="button" onPress={() => setShowAll(true)}
              accessibilityLabel={`See all activity — ${plural(hiddenCount, 'record', `${hiddenCount} more`)}${when ? `, older than ${when}` : ''}`}>
              <Text style={s.link}>See all activity{when ? ` (older than ${when})` : ''} ›</Text>
              <Text style={[p.note, s.seeAllCount]}>{plural(hiddenCount, 'record', `${hiddenCount} more`)} below this date</Text>
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
  const saveAsset = (useStore() as any).updateAsset;   // a CD's answer to where it was bought is saved here (DEC-3837)
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
      <View style={s.card} testID="card-bond-facts">
        <Text style={s.cardHdr2}>BOND FACTS</Text>
        <FactRow label="Face value" value={one.face != null ? fig('MK-NW-M-023', one.face) : figWords('MK-NW-M-023', 'not entered')} />
        {/* DEC-0281 (2026-08-26): the current price and the cost, two of the nine facts a bond shows. The price is quoted
            the way a broker quotes a bond, per $100 of face — market value ÷ face × 100 (Q38 part 3), only with both;
            what you paid only when entered (MK-XS-I-067). */}
        {one.pricePer100 != null && <FactRow label="Price" value={`${fig('MK-NW-M-066', one.pricePer100)} per $100 of face`} />}
        {one.paid != null && <FactRow label="What you paid" value={fig('MK-NW-M-065', one.paid)} />}
        {/* no rate entered: the rate reads "not entered" and a year's interest $0, said so in the Bonds screen's words (DEC-2748c) */}
        <FactRow label="Interest payments" value={figWords('MK-NW-M-024', one.couponRate == null
          ? `not entered · ${fig('MK-NW-M-056', 0)}/year — coupon rate not entered`
          : `${(one.couponRate * 100).toFixed(2)}%/year · ${one.couponPerYear != null ? fig('MK-NW-M-056', one.couponPerYear) : 'not entered'}/year`)} />
        <FactRow label="Matures" value={figWords('MK-NW-M-025', !one.maturity ? MATURITY_NOT_ENTERED : matured ? `${dateShown(one.maturity)} (matured)` : `${dateShown(one.maturity)} (${plural(Math.round(years), 'year')} away)`)} />
        {!matured && one.yieldToMaturity != null && <FactRow label="Yield if held to maturity" value={`about ${fig('MK-NW-M-026', one.yieldToMaturity)} · estimate`} />}
        {one.currentYield != null && <FactRow label="Yield on today's value" value={fig('MK-NW-M-027', one.currentYield)} />}
        {!!one.accruedCaveat && <Text style={s.bondNote}>{one.accruedCaveat}</Text>}
      </View>

      {/* the door says why for a bank CD; a CD bought through a broker gets the estimate like a bond (DEC-3837, 2026-10-10) */}
      {!!one.ratesMoveRefusal && !matured && (
        <View style={s.card}>
          <SectionBand inCard title="IF INTEREST RATES MOVE" />
          <Text style={s.bondNote}>{one.ratesMoveRefusal}</Text>
          {/* WHERE THE CD WAS BOUGHT IS NOT ENTERED (2026-10-21, DEC-3837, DEC-3523 tenet 3): the card asks the one question in
              its one wording, with its two answers; an answer is saved on the account and the card then reads as that answer */}
          {one.cdBoughtNotEntered && (
            <>
              <Text style={[s.bondNote, { color: Colors.textPrimary, fontWeight: '700' }]}>{CD_BOUGHT_QUESTION}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {CD_BOUGHT_CHOICES.map(({ value, label, spoken }) => (
                  <TouchableOpacity key={value} accessibilityRole="button" accessibilityLabel={`${spoken}. Saves it on this CD.`} style={s.choiceBtn}
                    onPress={() => saveAsset?.(account.asset_id, { cd_bought: value } as any)}>
                    <Text style={s.choiceBtnTxt}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      )}
      {one.ratesMove && (
        <View style={s.card} testID="card-rates" accessible
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
    <View style={s.card} testID="card-historic">
      <Text style={s.cardHdr2}>{HISTORIC_TTM_TITLE}</Text>
      <Text style={s.bondNote}>{HISTORIC_TTM_BODY}</Text>
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
          <Text style={s.preview}>Stamped “Value as of {dateShown(iso(new Date()))}” — the amount is yours to set.</Text>
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
  // the head (drawing v01): the chip row 6 apart, then the class line 4 below it and 8 above the window bar
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  headClass: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 8 },
  headClassLink: { color: Colors.primary, fontWeight: '700' },
  chip: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, backgroundColor: Colors.bgTertiary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  updated: { fontSize: 13, color: Colors.textTertiary, marginLeft: 4 },
  // a card (drawing v01 .card): white, 16 round, 12 in from its edges and 10 at its foot, 8 apart, the theme's card shadow
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, paddingBottom: 10, marginBottom: Spacing.sm, ...Shadows.card },
  balance: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary },
  classLine: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  holdsLine: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  statusBadge: { fontSize: 13, fontWeight: '700', color: Colors.amber, backgroundColor: Colors.amberLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6, overflow: 'hidden' },
  optBlock: { marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
  insideRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  insideDot: { width: 9, height: 9, borderRadius: 5 },
  insideSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  txnNote: { fontSize: 11, color: Colors.textTertiary, lineHeight: 16, paddingHorizontal: Spacing.md, paddingTop: 8, paddingBottom: 4 },
  // under a class with nothing in it, on the holdings' left edge (dot 9 + gap 8 = 17), drawing v01 .empty
  insideEmpty: { fontSize: 13, color: Colors.textTertiary, paddingLeft: 17, paddingTop: 4, paddingBottom: 8 },
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
  colHdrRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  colHdr: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.4, textAlign: 'right' },
  // two fixed columns, then the one 16-point column every row ends in (drawing v01 .cv 76, .cr 88, .g 16)
  colValW: { width: 76, textAlign: 'right' },
  colRetW: { width: 88, textAlign: 'right' },
  gutter: { width: GUTTER, marginLeft: -8, alignItems: 'flex-end' },   // a row spaces its cells 8 apart; the column sits flush
  gutterMark: { fontSize: 15, color: Colors.textTertiary },
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  seeAllCount: { marginTop: -8 },
  optRet: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  // the class band: SectionBand's light band, rebuilt here because this row carries TWO figures
  classBand: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.bandLight, paddingVertical: 8, paddingHorizontal: Spacing.md,
    marginHorizontal: -Spacing.md, marginTop: 2, marginBottom: Spacing.xs, borderRadius: 0 },
  classDot: { width: 8, height: 8, borderRadius: 4 },
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
  incomeLine: { fontSize: 11, color: Colors.textSecondary, paddingLeft: 17, paddingBottom: 6, marginTop: -2 },
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
  // an answer to a question on a card: the shape of the amber box's own doors (rounded corners, DEC-0231)
  choiceBtn: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primaryDeep, borderRadius: Radii.md, minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' },
  choiceBtnTxt: { fontSize: 13, fontWeight: '800', color: Colors.primaryDeep },
  section: { fontSize: 13, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: 6 },
  link: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginTop: 4, paddingVertical: 12, minHeight: 44, textAlignVertical: 'center' },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, minHeight: 40 },
  txnMine: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark, marginTop: 1 },
  txnFrom: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  txnEdit: { fontSize: 15, color: Colors.primaryDark, fontWeight: '800' },
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
  // rounded corners, not semicircle ends — the one shape of a choice (DEC-0231, 2026-09-25; corrected 2026-10-20)
  dayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, minHeight: 40, justifyContent: 'center' },
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

  // a note and its dot: the dot sits at the note's last line, as the drawing puts it at the end of the words
  noteRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  note: { fontSize: 11, color: Colors.textTertiary, lineHeight: 16, marginTop: 6, flexShrink: 1 },
  notePad: { paddingTop: 2 },

  // the walk (drawing v01 .wr): 15-point label in the secondary grey, 15/700 figure, 7 above and below; Wealth generated
  // and the ending in 800, its three parts indented 20; every figure followed by the one 16-point column
  wRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8 },
  wSub: { paddingLeft: 20 },
  wL: { flex: 1, fontSize: 15, color: Colors.textSecondary },
  wV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'], textAlign: 'right' },
  wStrongL: { color: Colors.textPrimary, fontWeight: '800' },
  wStrongV: { fontWeight: '800' },
  wTotal: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4 },
  gutter: { width: GUTTER, marginLeft: -8 },

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
