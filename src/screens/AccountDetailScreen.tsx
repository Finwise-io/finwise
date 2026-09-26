// Account detail — any class (FCC detailed design v1.1, Net worth sheet). One page per account:
// the balance, where the number comes from and how fresh it is, what it holds, its full activity
// history, and the right record-activity buttons for its class. Every recorded action goes through
// the ONE transactions function (recordTransaction) — balances update by the same tested rules
// everywhere, and hand-recorded rows are never questioned by the F10 watch (no source field).
import React, { useMemo, useState } from 'react';
import { personalFlowTotals } from '../../Calculation Module code/engines/ledger';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { SectionBand } from '../components/SectionBand';
import { Colors, Spacing, Radii, ClassMarkColors } from '../utils/theme';
import { currencySymbol } from '../domain/_shared/money';
import { periodReturnSince } from '../domain/performance';
import { assetClassOf, taxTreatmentOf, ASSET_CLASS_LABEL, valueFreshness, assetKind, benchmarkReturn, accountDisplayNames, accountClassBreakdown, type AssetAccount, sourceWording } from '../domain/assets';
import { bondInfo, annualCoupon, yearsToMaturity, currentYield, approxYTM, bondRateSensitivity } from '../domain/bonds';
import { txnLabel, cashEffect, type Transaction } from '../domain/transactions';
import { maskedMoney, spokenMoney } from '../components/useMoney';
import { InfoDot, EstimateTag } from '../components/UI';
import { modalAnimation } from '../hooks/reducedMotion';
import TopBar from '../components/TopBar';
// ONE walk builder and ONE window return for the whole app: the account page calls exactly what the
// Performance screen calls, so an account's figures and the portfolio's can never disagree.
import { buildChangeWalk } from '../domain/history';
import { windowBounds, modifiedDietzOverWindow } from '../../Calculation Module code/engines/window-return';
import { valueOn } from '../../Calculation Module code/engines/snapshots';
import { Dec } from '../../Calculation Module code/engines/decimal';

const TAX_WORDS: Record<string, string> = {
  taxable: 'taxable',
  tax_deferred: 'pre-tax — taxed when it comes out',
  tax_free: 'tax-free (Roth)',
};
import { isoLocalDate as iso } from '../domain/_shared/dates';

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
/** Money as a person reads it — whole dollars, rounded HERE and nowhere earlier, in one place, so two
 *  rows showing the same figure can never round differently. */
const mny = (v: number): string => maskedMoney(Math.round(v));
/** 'Jul 19' — the short day the approved walk prints in its first and its last row. It carries its own
 *  name because MK-ST-F-003 dayWords already words a date the long way ('19 Jul 2026'). */
const dayShort = (d: string): string => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
/** The day after a date. D3 (MK-ST-F-038 windowBounds): a window's beginning value is the close of the
 *  day BEFORE its start — so a window whose beginning IS the daily record's first day opens the day
 *  after it, and the beginning is READ from the record instead of being back-solved. */
const dayAfter = (d: string): string => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

export default function AccountDetailScreen() {
  const router = useRouter();
  const { id, class: classParam } = useLocalSearchParams<{ id?: string; class?: string }>();
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
  const breakdown = accountClassBreakdown(account);
  const breakdownClasses = breakdown ? (Object.keys(breakdown) as (keyof typeof breakdown)[]).filter((k) => breakdown[k] !== 0) : [];
  // income for a holding = its own ledger rows (never estimated); blank when the broker shared none
  const ledger = ((store.transactions ?? []) as any[]).filter((t) => t.account_id === account.asset_id);
  const incomeOf = (rw: any): string => {
    const tk = String(rw.name ?? '').split(' · ')[0].trim().toUpperCase();
    // FOUNDER FINDING 2026-08-11: a ledger row with NO ticker used to match EVERY non-stock holding,
    // so the whole account's untickered income was pinned onto each row — a CD showed "$16,907
    // dividends", which a CD cannot pay, and two CDs showed the same figure twice. Income belongs to
    // a holding only when the source actually says which holding it came from. Untickered income is
    // real and is still counted — at the ACCOUNT level, in the Income figure above, where it belongs.
    const rowsFor = !tk ? [] : ledger.filter((t) => (t.type === 'DIVIDEND' || t.type === 'INTEREST')
      && !!t.ticker && String(t.ticker).toUpperCase() === tk);
    // ONE flows function (Track 1 step 3) — abs-summing here made a reversal add, the $2,387 class
    const tkFlows = personalFlowTotals(rowsFor);
    const div = tkFlows.dividends.toNumber(2);
    const int = tkFlows.interest.toNumber(2);
    const parts: string[] = [];
    if (div > 0) parts.push(`${maskedMoney(Math.round(div))} dividends`);
    if (int > 0) parts.push(`${maskedMoney(Math.round(int))} interest`);
    return parts.join(' · ');
  };
  // the account's own income — no estimate ever fills a blank. It is NOT a headline figure any more
  // (mock v14): it sits with the holding that earned it, and the account's total is said out loud in
  // the note under BY CATEGORY & HOLDING, where the mock says it.
  const acctFlows = personalFlowTotals(ledger.filter((t) => t.type === 'DIVIDEND' || t.type === 'INTEREST'));
  const acctIncome = acctFlows.dividends.add(acctFlows.interest).toNumber(2);

  // ── THE WINDOW ("THIS ACCOUNT · SINCE JUL 19" on the approved mock) ─────────────────────────
  // This page carries no window picker, so it answers ONE window: since the daily record began —
  // the same window the Performance screen opens on, read from the same daily record, so the two
  // screens can never name different windows. The record's first day IS the beginning value, so the
  // window opens the day after it (see dayAfter).
  const todayKey = iso(new Date());
  const recordFrom = Object.keys((store.invDaily ?? {}) as Record<string, number>)
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort()[0] ?? null;
  const windowStart = recordFrom ? dayAfter(recordFrom) : null;
  const bounds = windowStart && windowStart <= todayKey ? windowBounds(windowStart, todayKey) : null;
  // The beginning is READ from the daily record, never back-solved: MK-ST-F-031 valueOn answers
  // nothing when the record does not reach that far back, and nothing means this page says "—".
  const beginning = bounds
    ? valueOn((store.snapshotDays ?? []) as any, new Set([String(account.asset_id)]), bounds.beginningAsOf)
    : null;
  const windowLedger = ledger.filter((t) => !windowStart || String(t.date ?? '').slice(0, 10) >= windowStart);
  const wFlows = personalFlowTotals(windowLedger);
  // THE SAME BUILDER the Performance screen uses (MK-XS-F-011 buildChangeWalk), given this account's
  // own rows — so the account's walk and the portfolio's walk are the same arithmetic, one narrower.
  const walk = beginning == null || !bounds ? null : buildChangeWalk({
    beginning, ending: account.balance || 0,
    fromLabel: `since ${dayShort(bounds.beginningAsOf)}`, toLabel: 'today',
    contributions: wFlows.contributions.toNumber(2), withdrawals: wFlows.withdrawals.toNumber(2),
    dividends: wFlows.dividends.toNumber(2), interest: wFlows.interest.toNumber(2),
  });
  // THE DEFECT THE FOUNDER FOUND (mock v14, mark 4). This was (balance − cost) / cost — the LIFETIME
  // return on cost, which disagreed with the walk printed directly beneath it. The header figure is
  // the WINDOW return now: wealth generated ÷ the money working in the window, from the one function
  // the Performance screen uses (MK-ST-F-064 modifiedDietzOverWindow). Its numerator IS the walk's
  // wealth generated (ending − beginning − net flows), so the header and the walk cannot disagree.
  // A refusal is an answer: rate comes back null and the screen shows "—", never a guess.
  const acctReturn = beginning == null || !bounds ? null : modifiedDietzOverWindow({
    beginning: Dec.of(String(beginning)), ending: Dec.of(String(account.balance || 0)),
    flows: windowLedger
      .filter((t: any) => t.type === 'DEPOSIT' || t.type === 'WITHDRAWAL')
      .map((t: any) => ({
        date: String(t.date ?? '').slice(0, 10) || null,
        amount: (Dec.parse(t.amount) ?? Dec.ZERO).mul(Dec.of(t.type === 'WITHDRAWAL' ? '-1' : '1')),
      })),
    start: bounds.start, end: bounds.end,
  });
  const acctReturnText = pct2(acctReturn?.rate ?? null);
  // ONE string for this account's market value: the band, the trio and the Total row all print it,
  // so three places on one screen can never show three different roundings of the same figure.
  const marketValueText = mny(account.balance || 0);
  const insideRows = !breakdown ? [] : [
    ...((account.positions ?? []) as any[]).map((p) => {
      const sh = (p.lots ?? []).reduce((t: number, l: any) => t + (l.shares || 0), 0);
      const value = p.last_price != null ? Math.round(sh * p.last_price * 100) / 100 : 0;
      const cls2 = p.asset_class === 'bond' ? 'bonds' : p.asset_class === 'other' ? 'alternatives' : p.asset_class === 'cash' ? 'cash' : 'stocks_etf';
      return {
        key: p.position_id ?? p.ticker,
        posId: p.position_id,
        name: cls2 === 'stocks_etf' && sh > 0 ? `${holdingWord(p)} · ${sh.toLocaleString()} share${sh === 1 ? '' : 's'}` : holdingWord(p),
        sub: cls2 === 'bonds' ? 'CDs & Treasuries' : cls2 === 'cash' ? 'counts as cash' : undefined,
        color: ClassMarkColors[cls2], value, cls: cls2, ticker: p.ticker,
      };
    }),
    ...(((account as any).cash_balance ?? 0) !== 0 ? [{ key: '__cash', name: 'Cash in the account', sub: undefined as string | undefined, color: ClassMarkColors.cash, value: (account as any).cash_balance as number, cls: 'cash' }] : []),
    ...(((account.option_holdings ?? []) as any[]).map((o) => ({
      key: o.label, name: o.label,
      sub: `option — ${Math.abs(o.contracts)} contract${Math.abs(o.contracts) === 1 ? '' : 's'}${o.contracts < 0 ? ', short' : ''}`,
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
  //   · a class shows its holdings' price return weighted by what each is worth;
  //   · a holding we hold no price for shows "—", never a guess.
  const statedYearlyRate = (rowClass: string): number | null => {
    const r = account.coupon_rate ?? 0;
    return rowClass === 'bonds' && r > 0 ? r : null;
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

      {/* B47 finding 7 (APPROVED): the class-only view — the slice you tapped is the question */}
      {classView && breakdown ? (
        <View style={s.card}>
          <SectionBand title={`${ASSET_CLASS_LABEL[classView as keyof typeof ASSET_CLASS_LABEL]?.toUpperCase()} IN THIS ACCOUNT`} />
          <Text style={s.balance}>{mny((breakdown as any)[classView] || 0)}</Text>
          {/* FOUNDER FINDING 2026-08-11: two bare figures ($224,190 above, $224,690 here) read as a
              mismatch. Say the arithmetic out loud — this slice PLUS everything else IS the total. */}
          <Text style={s.classLine}>
            {mny((breakdown as any)[classView] || 0)} of {mny(account.balance || 0)} in {accountDisplayNames((store.assetAccounts ?? []) as AssetAccount[]).get(account.asset_id) ?? account.label}
            {Math.round((account.balance || 0) - ((breakdown as any)[classView] || 0)) > 0
              ? ` — the other ${mny((account.balance || 0) - ((breakdown as any)[classView] || 0))} is ${breakdownClasses.filter((k) => k !== classView).map((k) => ASSET_CLASS_LABEL[k as keyof typeof ASSET_CLASS_LABEL]).join(' + ') || 'other types'}`
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
                accessibilityLabel={`${rw.name}${rw.sub ? `, ${rw.sub}` : ''}, ${spokenMoney(Math.abs(rw.value))}${(rw as any).posId ? '. Opens its page.' : ''}`}>
                <View style={[s.insideDot, { backgroundColor: rw.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.optLabel} numberOfLines={2}>{rw.name}</Text>
                  {!!rw.sub && <Text style={s.insideSub}>{rw.sub}</Text>}
                </View>
                <Text style={s.optVal}>{mny(rw.value)}</Text>
              </TouchableOpacity>
            ))}
            <Text style={s.optNote}>{insideRows.filter((rw: any) => rw.cls === classView).map((rw: any) => mny(rw.value)).join(' + ')} = {mny((breakdown as any)[classView] || 0)}. Everything else lives on the whole-account page — one tap away above.</Text>
          </View>
        </View>
      ) : (
      /* The spoken summary names the holdings ONLY when they are not listed below (mock v14 gives
         them their own card, each row spoken with its own value and return) — reading a summary of a
         list that is right there made the card the first thing a screen reader, and a test looking
         for a holding, landed on. */
      <View style={s.card} accessible
        accessibilityLabel={`Balance ${spokenMoney(account.balance || 0)}. ${breakdownClasses.length > 1 ? 'Mixed holdings' : ASSET_CLASS_LABEL[cls]}, ${TAX_WORDS[taxTreatmentOf(account)] ?? ''}${insideRows.length === 0 && tickers.length ? `. Holds ${tickers.slice(0, 3).join(', ')}${tickers.length > 3 ? ` and ${tickers.length - 3} more` : ''}` : ''}`}>
        <SectionBand inCard value={marketValueText}
          title={`THIS ACCOUNT${bounds ? ` · SINCE ${dayShort(bounds.beginningAsOf).toUpperCase()}` : ''}`} />
        <Text style={s.balance}>{marketValueText}</Text>
        {/* HEADER TRIO (approved mock v14, second phone): Market value · Wealth generated · Return,
            in that order. Income left the headline — it sits with the holding that earned it and in
            this account's own walk below. Wealth generated comes from the walk, and the Return is the
            walk's own figure over the money working in the window, so the three agree by construction. */}
        <View style={s.trioRow}>
          <View style={s.trioCell}><Text style={s.trioLbl}>Market value</Text><Text style={s.trioVal}>{marketValueText}</Text></View>
          <View style={s.trioCell}><Text style={s.trioLbl}>Wealth generated</Text>
            <Text style={[s.trioVal, walk != null && walk.wealthGenerated < 0 && { color: Colors.red }]}>
              {walk == null ? '—' : `${walk.wealthGenerated < 0 ? '−' : ''}${mny(Math.abs(walk.wealthGenerated))}`}
            </Text>
          </View>
          <View style={s.trioCell}><Text style={s.trioLbl}>Return</Text>
            <Text style={[s.trioVal, (acctReturn?.rate ?? 0) < 0 && { color: Colors.red }]}>{acctReturnText}</Text>
          </View>
        </View>
        {/* A refusal is an answer (D4). When the daily record does not reach back far enough, or WHEN
            money moved drives the percentage, the two figures above say "—" and this line says why —
            never a guess dressed as a measurement. */}
        {(walk == null || acctReturn?.rate == null) && (
          <Text style={s.trioNote}>
            {walk == null
              ? 'Wealth generated and Return start once the daily record reaches back far enough to say what this account was worth at the start. It builds from your first recorded day.'
              : acctReturn?.sentence}
          </Text>
        )}
        {/* APPROVED account-detail mock (2026-07-19): an account holding several types is called
            what it is — "Mixed holdings" — never mislabeled by its single biggest type */}
        {/* NOTE for the live review: the mock's portfolio header shows the trio only, but this line
            carries real information (class + tax treatment), so it stays until the founder says drop it. */}
        <Text style={s.classLine}>{breakdownClasses.length > 1 ? 'Mixed holdings' : ASSET_CLASS_LABEL[cls]} · {TAX_WORDS[taxTreatmentOf(account)] ?? taxTreatmentOf(account)}</Text>
        {account.status && account.status !== 'open' && (
          <Text style={s.statusBadge}>This account is {account.status} at {account.institution ?? 'the broker'} — kept here so its history stays.</Text>
        )}
        {insideRows.length === 0 && tickers.length > 0 && (
          <Text style={s.holdsLine}>Holds: {tickers.slice(0, 3).join(' · ')}{tickers.length > 3 ? ` · +${tickers.length - 3}` : ''}</Text>
        )}
      </View>
      )}

      {/* THIS ACCOUNT'S OWN WALK (approved mock v14, second phone) — a card of its own, directly
          under the header trio and above BY CATEGORY & HOLDING. Contributions and withdrawals live
          HERE, per account, and the rows reach the ending value exactly because the SAME builder the
          Performance screen uses makes the residual the change in investment value. */}
      {!classView && walk != null && bounds != null && (
        <View style={s.card}>
          <SectionBand inCard title={`HOW ${mny(walk.beginning)} BECAME ${mny(walk.ending)} · THIS ACCOUNT`} />
          {[
            { l: `Beginning market value (${dayShort(bounds.beginningAsOf)})`, v: walk.beginning },
            { l: 'Contributions', v: walk.contributions },
            { l: 'Withdrawals', v: -walk.withdrawals },
            { l: 'Wealth generated', v: walk.wealthGenerated, strong: true },
            { l: 'Dividends', v: walk.dividends, indent: true },
            { l: 'Interest', v: walk.interest, indent: true },
            { l: 'Change in investment value', v: walk.marketChange, indent: true },
          ].map((r) => (
            /* "Every line opens the rows behind it" (the mock's own words): a walk line is a summary
               of ledger rows, so tapping one opens this account's full activity list below — the place
               a wrong number is actually fixed. */
            <TouchableOpacity key={r.l} style={[s.walkRow, (r as any).indent && { paddingLeft: 20 }]}
              // a walk line is a 30-point row in the approved drawing; hitSlop carries the tap target
              // back to the 44 points a finger needs without stretching the card to twice its height
              hitSlop={{ top: 7, bottom: 7, left: 8, right: 8 }}
              accessibilityRole="button" onPress={() => setShowAll(true)}
              accessibilityLabel={`${r.l}, ${r.v < 0 ? 'minus ' : ''}${spokenMoney(Math.abs(Math.round(r.v)))}. Opens the activity records behind this walk.`}>
              <Text style={[s.walkL, (r as any).indent && { color: Colors.textSecondary }, (r as any).strong && { fontWeight: '800' }]}>{r.l}</Text>
              <Text style={[s.walkV, (r as any).strong && { fontWeight: '800' }, r.v < 0 && { color: Colors.red }]}>
                {r.v < 0 ? '−' : ''}{mny(Math.abs(r.v))}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={[s.walkRow, s.walkTotal]} accessible
            accessibilityLabel={`Ending market value today, ${spokenMoney(Math.round(walk.ending))}`}>
            <Text style={[s.walkL, { fontWeight: '800' }]}>Ending market value ({dayShort(todayKey)})</Text>
            <Text style={[s.walkV, { fontWeight: '800', color: Colors.primaryDark }]}>{mny(walk.ending)}</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" onPress={() => setShowAll(true)}
            accessibilityLabel="Open the activity records behind this walk">
            <Text style={s.walkNote}>Every line opens the rows behind it ›</Text>
          </TouchableOpacity>
        </View>
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
          {(['stocks_etf', 'bonds', 'cash', 'alternatives'] as const).map((k) => {
            const inClass = insideRows.filter((rw: any) => rw.cls === k);
            if (!inClass.length) return null;
            const total = inClass.reduce((t: number, rw: any) => t + (rw.value || 0), 0);
            return (
              <View key={k}>
                {/* the light-green class band, hand-built for ONE reason: SectionBand carries a single
                    trailing figure and this row carries two (market value AND return). Same band
                    colour, same 11-point caps, same square edge-to-edge bar as every other band. */}
                <View style={s.classBand} accessible
                  accessibilityLabel={`${ASSET_CLASS_LABEL[k]}, ${spokenMoney(Math.round(total))}, return ${classReturnText(k, total, inClass)}`}>
                  <Text style={s.classBandT} numberOfLines={1}>{ASSET_CLASS_LABEL[k]}</Text>
                  <Text style={[s.classBandV, s.colValW]}>{mny(total)}</Text>
                  <Text style={[s.classBandV, s.colRetW]}>{classReturnText(k, total, inClass)}</Text>
                </View>
                {inClass.map((rw: any) => (
                  <View key={rw.key}>
                    <TouchableOpacity style={s.insideRow} disabled={!rw.posId}
                      accessibilityRole={rw.posId ? 'button' : undefined} accessible
                      onPress={() => rw.posId && router.push(`/holding-detail?account=${account.asset_id}&position=${rw.posId}` as any)}
                      accessibilityLabel={`${rw.name}${rw.sub ? `, ${rw.sub}` : ''}, ${spokenMoney(Math.abs(rw.value))}, return ${returnTextFor(rw.cls, rw.value, rw.ticker)}${incomeOf(rw) ? `, ${incomeOf(rw)}` : ''}${rw.posId ? '. Opens its page.' : ''}`}>
                      <View style={[s.insideDot, { backgroundColor: rw.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.optLabel} numberOfLines={2}>{rw.name}</Text>
                        {!!rw.sub && <Text style={s.insideSub}>{rw.sub}</Text>}
                      </View>
                      <Text style={[s.optVal, s.colValW]}>{mny(rw.value)}</Text>
                      <Text style={[s.optRet, s.colRetW]}>{returnTextFor(rw.cls, rw.value, rw.ticker)}</Text>
                    </TouchableOpacity>
                    {!!incomeOf(rw) && <Text style={s.incomeLine}>Income: {incomeOf(rw)}</Text>}
                  </View>
                ))}
              </View>
            );
          })}
          {/* the Total row (mock v14): the account's market value and the account's return — the SAME
              string the header trio printed, so the two places can never say different things. */}
          <View style={[s.insideRow, s.totalRow]} accessible
            accessibilityLabel={`Total, ${spokenMoney(Math.round(account.balance || 0))}, return ${acctReturnText}`}>
            <Text style={[s.optLabel, { fontWeight: '800' }]}>Total</Text>
            <Text style={[s.optVal, s.colValW]}>{marketValueText}</Text>
            <Text style={[s.optRet, s.colRetW, { fontWeight: '800' }]}>{acctReturnText}</Text>
          </View>
          <Text style={s.optNote}>
            Counted inside this account's total — listed here so nothing is hidden. A holding's return is
            what its own price did in this window; the income it paid sits on the line beneath it. Income sits with the
            holding that earned it{acctIncome > 0
              ? <Text> — <Text style={s.optNoteFig}>{mny(acctIncome)}</Text> for this account</Text>
              : null}.
          </Text>
        </View>
      )}

      {/* MATURED BOND (mock approved 2026-07-31): a dated banner with the three real outcomes —
          the money must not sit labeled as a growing bond after its maturity date */}
      {cls === 'bonds' && account.maturity_date && account.maturity_date <= iso(new Date()) && (account.balance || 0) > 0 && (
        <View style={s.maturedCard}>
          <Text style={s.maturedTitle}>⏰ This {assetKind(account.kind)?.id === 'cd' ? 'CD' : 'bond'} matured {new Date(`${account.maturity_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.</Text>
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

      {/* your reported return — the same actual_ttm field the Retirement cockpit reads (one field, two readers) */}
      {(cls === 'bonds' || cls === 'alternatives') && <ReportedReturnCard account={account} />}

      {/* activity history — the ledger, in plain words with signed effects */}
      <SectionBand title="ACTIVITY" value={txns.length ? `${txns.length} record${txns.length === 1 ? '' : 's'}` : undefined} />
      <View style={s.card}>
        {txns.length === 0 && <Text style={s.empty}>Log a deposit or a buy — your history starts here.</Text>}
        {shown.map((t) => {
          const incoming = String(t.counter_account_id) === String(id) && t.type === 'TRANSFER';
          const eff = incoming ? (t.amount || 0) : cashEffect(t);
            // HANDOFF 2026-08-11: a row is either the BROKER'S fact or YOURS, and the list has to say
            // which. A broker row cannot be edited — the next sync would overwrite it — so it says
            // where it came from and offers nothing. A row you entered is yours to correct, so it wears
            // "you entered this" and a pencil. Before this they looked identical, which meant a typo
            // you made was indistinguishable from the broker's own record and equally unfixable.
            const mine = t.source !== 'connected';
            const from = mine ? 'you entered this' : `from ${account.institution?.trim() || 'your broker'}`;
            return (
            <View key={String(t.id)} style={s.txnRow} accessible
              accessibilityLabel={`${t.date}: ${txnLabel(t.type)}${t.ticker ? ` ${t.ticker}` : ''}, ${eff < 0 ? 'minus ' : 'plus '}${spokenMoney(Math.abs(eff))}. ${mine ? 'You entered this — editable.' : `${from}, read-only.`}`}>
              <Text style={s.txnDate}>{String(t.date).slice(5)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.txnLabel} numberOfLines={1}>
                  {txnLabel(t.type)}{t.ticker ? ` ${t.ticker}` : ''}{t.shares ? ` · ${t.shares} sh${t.price ? ` @ ${maskedMoney(t.price)}` : ''}` : ''}
                </Text>
                <Text style={mine ? s.txnMine : s.txnFrom}>{from}</Text>
              </View>
              <Text style={[s.txnAmt, { color: eff >= 0 ? Colors.gainText : Colors.textPrimary }]}>
                {eff >= 0 ? '+' : '−'}{maskedMoney(Math.abs(eff))}
              </Text>
              {mine ? (
                <Text style={s.txnEdit} onPress={() => setEditRow(t)} suppressHighlighting
                  accessibilityRole="button" accessibilityLabel={`Edit or delete your ${txnLabel(t.type).toLowerCase()} of ${spokenMoney(Math.abs(eff))}`}>✎</Text>
              ) : <Text style={s.txnEditGap} />}
            </View>
          );
        })}
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
              accessibilityLabel={`See all activity — ${hidden} more record${hidden === 1 ? '' : 's'}${when ? `, older than ${when}` : ''}`}>
              <Text style={s.link}>See all activity{when ? ` (older than ${when})` : ''} ›</Text>
              <Text style={s.txnFrom}>{hidden} more record{hidden === 1 ? '' : 's'} below this date</Text>
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

// ── bond facts, yields, and the rates-move estimate (all from the ONE bonds domain) ──────────
function BondDetail({ account }: { account: AssetAccount }) {
  const b = bondInfo(account);
  if (!(b.face > 0 && b.couponRate > 0 && b.maturity)) return null;   // a bond FUND — no honest bond math
  const years = yearsToMaturity(b.maturity) ?? 0;   // G11: no maturity date → 0 here only for the words; the yield itself refuses
  const ytm = approxYTM(b);
  const cy = currentYield(b);
  const sens = bondRateSensitivity(b);
  const matured = years <= 0;
  return (
    <>
      <View style={s.card}>
        <Text style={s.cardHdr2}>BOND FACTS</Text>
        <FactRow label="Face value" value={maskedMoney(b.face)} />
        <FactRow label="Interest payments" value={`${(b.couponRate * 100).toFixed(2)}%/year · ${maskedMoney(annualCoupon(b))}/year`} />
        <FactRow label="Matures" value={matured ? `${b.maturity} (matured)` : `${b.maturity} (${Math.round(years)} year${Math.round(years) === 1 ? '' : 's'} away)`} />
        {!matured && ytm != null && <FactRow label="Yield if held to maturity" value={`about ${(ytm * 100).toFixed(1)}% · estimate`} />}
        {cy != null && <FactRow label="Yield on today's value" value={`${(cy * 100).toFixed(1)}%`} />}
      </View>
      {sens && (
        <View style={s.card} accessible
          accessibilityLabel={`Estimate, not a prediction. If interest rates rise one percent, this bond's market value falls to roughly ${spokenMoney(sens.ratesUp.low)} to ${spokenMoney(sens.ratesUp.high)}. If rates fall one percent, roughly ${spokenMoney(sens.ratesDown.low)} to ${spokenMoney(sens.ratesDown.high)}. Held to maturity, ${spokenMoney(b.face)} comes back if the issuer pays as promised.`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.cardHdr2}>IF INTEREST RATES MOVE</Text>
            <InfoDot term="rateSensitivity" />
          </View>
          <EstimateTag />
          <Text style={s.bondLine}>Rates rise 1% → value roughly {maskedMoney(sens.ratesUp.low)}–{maskedMoney(sens.ratesUp.high)} (down about {maskedMoney(Math.abs(sens.ratesUp.delta))})</Text>
          <Text style={s.bondLine}>Rates fall 1% → value roughly {maskedMoney(sens.ratesDown.low)}–{maskedMoney(sens.ratesDown.high)}</Text>
          <Text style={s.bondNote}>Held to maturity, {maskedMoney(b.face)} comes back — if the issuer pays as promised.</Text>
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
        : <FactRow label="Typical yearly return for this type" value={`~${(ret * 100).toFixed(1)}% · estimate from history`} />}
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/look-back')}
        accessibilityLabel="Look back: what if this had been in the stock market?">
        <Text style={s.linkTxt}>Look back: what if this had been in the stock market? ›</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── your reported return (12 mo) — edits the SAME actual_ttm the Retirement cockpit reads ──
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
      <Text style={s.cardHdr2}>YOUR REPORTED RETURN (12 MO)</Text>
      {editing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <TextInput style={s.ttmInput} keyboardType="numbers-and-punctuation" placeholder="e.g. 2.1"
            placeholderTextColor={Colors.textTertiary} value={val} onChangeText={setVal} autoFocus
            accessibilityLabel="Your holding's actual return over the past 12 months, in percent" />
          <Text style={s.bondLine}>%</Text>
          <TouchableOpacity accessibilityRole="button" style={s.ttmSave} onPress={save} accessibilityLabel="Save reported return">
            <Text style={s.ttmSaveTxt}>Save</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Text style={[s.bondLine, { flex: 1 }]}>{ttm != null ? `${(ttm * 100).toFixed(1)}%` : 'not set — projections use the typical return until you report your own'}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => { setVal(ttm != null ? String((ttm * 100).toFixed(1)) : ''); setEditing(true); }}
            accessibilityLabel={ttm != null ? 'Edit reported return' : 'Add reported return'}>
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
    : action === 'TRANSFER' ? `−${maskedMoney(amt)} from ${account.label} → +${maskedMoney(amt)} into ${dest?.label}`
    : action === 'WITHDRAWAL' ? `−${maskedMoney(amt)} from ${account.label}`
    : `+${maskedMoney(amt)} into ${account.label}`;

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
  txnDate: { width: 46, fontSize: 13, fontWeight: '700', color: Colors.textTertiary },
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
