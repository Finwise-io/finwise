// Account detail — any class (FCC detailed design v1.1, Net worth sheet). One page per account:
// the balance, where the number comes from and how fresh it is, what it holds, its full activity
// history, and the right record-activity buttons for its class. Every recorded action goes through
// the ONE transactions engine (recordTransaction) — balances update by the same tested rules
// everywhere, and hand-recorded rows are never questioned by the F10 watch (no source field).
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii, ClassMarkColors } from '../utils/theme';
import { currencySymbol } from '../domain/_shared/money';
import { assetClassOf, taxTreatmentOf, ASSET_CLASS_LABEL, valueFreshness, assetKind, benchmarkReturn, accountDisplayNames, accountClassBreakdown, type AssetAccount, sourceWording } from '../domain/assets';
import { bondInfo, annualCoupon, yearsToMaturity, currentYield, approxYTM, bondRateSensitivity } from '../domain/bonds';
import { txnLabel, cashEffect, type Transaction } from '../domain/transactions';
import { maskedMoney, spokenMoney } from '../components/useMoney';
import { InfoDot } from '../components/UI';
import { modalAnimation } from '../hooks/reducedMotion';

const TAX_WORDS: Record<string, string> = {
  taxable: 'taxable',
  tax_deferred: 'pre-tax — taxed when it comes out',
  tax_free: 'tax-free (Roth)',
};
const iso = (d: Date) => d.toISOString().slice(0, 10);

type ActionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'DIVIDEND' | 'INTEREST' | 'COUPON';
const ACTION_LABEL: Record<ActionType, string> = {
  DEPOSIT: 'Deposit', WITHDRAWAL: 'Withdraw', TRANSFER: 'Transfer',
  DIVIDEND: 'Dividend', INTEREST: 'Interest', COUPON: 'Coupon received',
};

export default function AccountDetailScreen() {
  const router = useRouter();
  const { id, class: classParam } = useLocalSearchParams<{ id?: string; class?: string }>();
  // B47 finding 7 (APPROVED): arriving from a class slice = the class-only view; the whole
  // account is one labeled tap away (clearing the param).
  const classView = classParam && ['stocks_etf', 'bonds', 'cash', 'alternatives'].includes(String(classParam)) ? String(classParam) : null;
  const store = useStore() as any;
  const account: AssetAccount | undefined = (store.assetAccounts ?? []).find((a: AssetAccount) => String(a.asset_id) === String(id));
  const [action, setAction] = useState<ActionType | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [valueSheet, setValueSheet] = useState(false);

  const txns: Transaction[] = useMemo(
    () => ((store.transactions ?? []) as Transaction[]).filter((t) => String(t.account_id) === String(id) || String(t.counter_account_id) === String(id)),
    [store.transactions, id]);

  if (!account) {
    // A pre-seed row derived from setup answers isn't a real account yet — say so honestly.
    return (
      <View style={[s.root, { justifyContent: 'center', padding: Spacing.lg }]}>
        <Text style={s.h1}>This one lives in your setup answers</Text>
        <Text style={s.sub}>Add it as a real account on the Net worth tab to record activity and see history.</Text>
        <TouchableOpacity accessibilityRole="button" style={s.primaryBtn} onPress={() => router.push('/(tabs)/analytics')}
          accessibilityLabel="Open the Net worth tab">
          <Text style={s.primaryTxt}>Open Net worth ›</Text>
        </TouchableOpacity>
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
  const insideRows = !breakdown ? [] : [
    ...((account.positions ?? []) as any[]).map((p) => {
      const sh = (p.lots ?? []).reduce((t: number, l: any) => t + (l.shares || 0), 0);
      const value = p.last_price != null ? Math.round(sh * p.last_price * 100) / 100 : 0;
      const cls2 = p.asset_class === 'bond' ? 'bonds' : p.asset_class === 'other' ? 'alternatives' : p.asset_class === 'cash' ? 'cash' : 'stocks_etf';
      return {
        key: p.position_id ?? p.ticker,
        name: cls2 === 'stocks_etf' && sh > 0 ? `${holdingWord(p)} · ${sh.toLocaleString()} share${sh === 1 ? '' : 's'}` : holdingWord(p),
        sub: cls2 === 'bonds' ? 'CDs & Treasuries' : cls2 === 'cash' ? 'counts as cash' : undefined,
        color: ClassMarkColors[cls2], value, cls: cls2,
      };
    }),
    ...(((account as any).cash_balance ?? 0) !== 0 ? [{ key: '__cash', name: 'Cash in the account', sub: undefined as string | undefined, color: ClassMarkColors.cash, value: (account as any).cash_balance as number, cls: 'cash' }] : []),
    ...(((account.option_holdings ?? []) as any[]).map((o) => ({
      key: o.label, name: o.label,
      sub: `option — ${Math.abs(o.contracts)} contract${Math.abs(o.contracts) === 1 ? '' : 's'}${o.contracts < 0 ? ', short' : ''}`,
      color: ClassMarkColors.alternatives, value: o.value as number, cls: 'alternatives',
    }))),
  ].sort((x, y) => Math.abs(y.value) - Math.abs(x.value));

  // per-class actions (design: only what makes sense for this account)
  const actions: ActionType[] =
    cls === 'cash' ? ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']
    : cls === 'stocks_etf' || cls === 'mixed' ? ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'DIVIDEND', 'INTEREST']
    : cls === 'bonds' ? ['COUPON']
    : [];
  // ticker trades and bond/alt buys-sells keep their existing full flows — one recorder each
  const tradeLink = cls === 'stocks_etf' || cls === 'mixed' ? { label: 'Buy / Sell holdings ›', route: '/(tabs)/invest' }
    : cls === 'bonds' ? { label: 'Buy more / Sell this bond ›', route: '/bonds' }
    : cls === 'alternatives' ? { label: 'Buy more / Record a sale ›', route: '/other-investments' }
    : null;

  const shown = showAll ? txns : txns.slice(0, 8);

  return (
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
          <Text style={s.optHdr}>{ASSET_CLASS_LABEL[classView as keyof typeof ASSET_CLASS_LABEL]?.toUpperCase()} IN THIS ACCOUNT</Text>
          <Text style={s.balance}>{maskedMoney(Math.round((breakdown as any)[classView] || 0))}</Text>
          <Text style={s.classLine}>part of {account.label} · {maskedMoney(account.balance || 0)} total</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="See the whole account"
            style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => router.setParams({ class: undefined } as any)}>
            <Text style={s.linkTxt}>See the whole account ›</Text>
          </TouchableOpacity>
          <View style={s.optBlock}>
            <Text style={s.optHdr}>THE HOLDINGS · {ASSET_CLASS_LABEL[classView as keyof typeof ASSET_CLASS_LABEL]?.toUpperCase()} ONLY</Text>
            {insideRows.filter((rw: any) => rw.cls === classView).map((rw) => (
              <View key={rw.key} style={s.insideRow} accessible
                accessibilityLabel={`${rw.name}${rw.sub ? `, ${rw.sub}` : ''}, ${spokenMoney(Math.abs(rw.value))}`}>
                <View style={[s.insideDot, { backgroundColor: rw.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.optLabel} numberOfLines={2}>{rw.name}</Text>
                  {!!rw.sub && <Text style={s.insideSub}>{rw.sub}</Text>}
                </View>
                <Text style={s.optVal}>{maskedMoney(rw.value)}</Text>
              </View>
            ))}
            <Text style={s.optNote}>These sum to the {maskedMoney(Math.round((breakdown as any)[classView] || 0))} above. Everything else lives on the whole-account page — one tap up.</Text>
          </View>
        </View>
      ) : (
      <View style={s.card} accessible
        accessibilityLabel={`Balance ${spokenMoney(account.balance || 0)}. ${breakdownClasses.length > 1 ? 'Mixed holdings' : ASSET_CLASS_LABEL[cls]}, ${TAX_WORDS[taxTreatmentOf(account)] ?? ''}${tickers.length ? `. Holds ${tickers.slice(0, 3).join(', ')}${tickers.length > 3 ? ` and ${tickers.length - 3} more` : ''}` : ''}`}>
        <Text style={s.balance}>{maskedMoney(account.balance || 0)}</Text>
        {/* APPROVED account-detail mock (2026-07-19): an account holding several types is called
            what it is — "Mixed holdings" — never mislabeled by its single biggest type */}
        <Text style={s.classLine}>{breakdownClasses.length > 1 ? 'Mixed holdings' : ASSET_CLASS_LABEL[cls]} · {TAX_WORDS[taxTreatmentOf(account)] ?? taxTreatmentOf(account)}</Text>
        {account.status && account.status !== 'open' && (
          <Text style={s.statusBadge}>This account is {account.status} at {account.institution ?? 'the broker'} — kept here so its history stays.</Text>
        )}
        {insideRows.length > 0 ? (
          /* APPROVED: WHAT'S INSIDE · BY TYPE — readable names, class dots, exact-sum note */
          <View style={s.optBlock}>
            <Text style={s.optHdr}>WHAT'S INSIDE · BY TYPE</Text>
            {insideRows.map((rw) => (
              <View key={rw.key} style={s.insideRow} accessible
                accessibilityLabel={`${rw.name}${rw.sub ? `, ${rw.sub}` : ''}, ${spokenMoney(Math.abs(rw.value))}`}>
                <View style={[s.insideDot, { backgroundColor: rw.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.optLabel} numberOfLines={2}>{rw.name}</Text>
                  {!!rw.sub && <Text style={s.insideSub}>{rw.sub}</Text>}
                </View>
                <Text style={s.optVal}>{maskedMoney(rw.value)}</Text>
              </View>
            ))}
            <Text style={s.optNote}>Counted inside this account's total — listed here so nothing is hidden.</Text>
          </View>
        ) : tickers.length > 0 ? (
          <Text style={s.holdsLine}>Holds: {tickers.slice(0, 3).join(' · ')}{tickers.length > 3 ? ` · +${tickers.length - 3}` : ''}</Text>
        ) : null}
      </View>
      )}

      {/* MATURED BOND (mock approved 2026-07-31): a dated banner with the three real outcomes —
          the money must not sit labeled as a growing bond after its maturity date */}
      {cls === 'bonds' && account.maturity_date && account.maturity_date <= iso(new Date()) && (account.balance || 0) > 0 && (
        <View style={s.maturedCard}>
          <Text style={s.maturedTitle}>⏰ This bond matured {new Date(`${account.maturity_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.</Text>
          <Text style={s.maturedBody}>The money isn't growing here anymore — record what happened so your numbers stay true.</Text>
          <TouchableOpacity accessibilityRole="button" style={s.maturedBtn}
            accessibilityLabel="Record what happened to this matured bond"
            onPress={() => {
              Alert.alert('What happened?', 'Pick the one that matches reality.', [
                { text: 'Paid out to my bank', onPress: () => { store.recordTransaction?.({ type: 'SELL', account_id: account.asset_id, amount: account.balance || 0, date: iso(new Date()), note: 'Matured — paid out' }); } },
                { text: 'Rolled into a new bond/CD', onPress: () => router.push('/bonds' as any) },
                { text: 'Still waiting', style: 'cancel' },
              ]);
            }}>
            <Text style={s.maturedBtnTxt}>Record what happened ›</Text>
          </TouchableOpacity>
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

      {/* record activity — the ONE engine, surfaced here per class */}
      {(actions.length > 0 || tradeLink) && (
        <>
          <Text style={s.section}>RECORD ACTIVITY</Text>
          <View style={s.actionRow}>
            {actions.map((t) => (
              <TouchableOpacity accessibilityRole="button" key={t} style={s.actionBtn} onPress={() => setAction(t)}
                accessibilityLabel={`Record a ${ACTION_LABEL[t].toLowerCase()} for ${account.label}`}>
                <Text style={s.actionTxt}>{ACTION_LABEL[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {tradeLink && (
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push(tradeLink.route as any)}
              accessibilityLabel={tradeLink.label}>
              <Text style={s.link}>{tradeLink.label}</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* activity history — the ledger, in plain words with signed effects */}
      <Text style={s.section}>ACTIVITY</Text>
      <View style={s.card}>
        {txns.length === 0 && <Text style={s.empty}>Log a deposit or a buy — your history starts here.</Text>}
        {shown.map((t) => {
          const incoming = String(t.counter_account_id) === String(id) && t.type === 'TRANSFER';
          const eff = incoming ? (t.amount || 0) : cashEffect(t);
          return (
            <View key={String(t.id)} style={s.txnRow} accessible
              accessibilityLabel={`${t.date}: ${txnLabel(t.type)}${t.ticker ? ` ${t.ticker}` : ''}, ${eff < 0 ? 'minus ' : 'plus '}${spokenMoney(Math.abs(eff))}`}>
              <Text style={s.txnDate}>{String(t.date).slice(5)}</Text>
              <Text style={s.txnLabel} numberOfLines={1}>
                {txnLabel(t.type)}{t.ticker ? ` ${t.ticker}` : ''}{t.shares ? ` · ${t.shares} sh${t.price ? ` @ ${maskedMoney(t.price)}` : ''}` : ''}
              </Text>
              <Text style={[s.txnAmt, { color: eff >= 0 ? Colors.gainText : Colors.textPrimary }]}>
                {eff >= 0 ? '+' : '−'}{maskedMoney(Math.abs(eff))}
              </Text>
            </View>
          );
        })}
        {txns.length > 8 && !showAll && (
          <TouchableOpacity accessibilityRole="button" onPress={() => setShowAll(true)} accessibilityLabel="See all activity">
            <Text style={s.link}>See all activity ({txns.length}) ›</Text>
          </TouchableOpacity>
        )}
      </View>

      <RecordActivitySheet account={account} action={action} onClose={() => setAction(null)} />
      <UpdateValueSheet account={account} visible={valueSheet} onClose={() => setValueSheet(false)} />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── bond facts, yields, and the rates-move estimate (all from the ONE bonds domain) ──────────
function BondDetail({ account }: { account: AssetAccount }) {
  const b = bondInfo(account);
  if (!(b.face > 0 && b.couponRate > 0 && b.maturity)) return null;   // a bond FUND — no honest bond math
  const years = yearsToMaturity(b.maturity);
  const ytm = approxYTM(b);
  const cy = currentYield(b);
  const sens = bondRateSensitivity(b);
  const matured = years <= 0;
  return (
    <>
      <View style={s.card}>
        <Text style={s.cardHdr2}>BOND FACTS</Text>
        <FactRow label="Face value" value={maskedMoney(b.face)} />
        <FactRow label="Interest payments" value={`${(b.couponRate * 100).toFixed(2)}%/yr · ${maskedMoney(annualCoupon(b))}/yr`} />
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
          <Text style={s.estTag}>Estimate, not a prediction</Text>
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

// ── the small record sheet: date + amount (+ destination for transfers) + effect preview ──
function RecordActivitySheet({ account, action, onClose }: { account: AssetAccount; action: ActionType | null; onClose: () => void }) {
  const store = useStore() as any;
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState<'today' | 'yesterday'>('today');
  const [destId, setDestId] = useState<string | null>(null);
  const amt = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
  const others = ((store.assetAccounts ?? []) as AssetAccount[]).filter((a) => a.asset_id !== account.asset_id);
  const dest = others.find((a) => String(a.asset_id) === String(destId)) ?? null;
  const ready = amt > 0 && (action !== 'TRANSFER' || !!dest);

  React.useEffect(() => { if (action) { setAmount(''); setDay('today'); setDestId(null); } }, [action]);

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
    <Modal visible={action != null} transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close without saving" style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet} onStartShouldSetResponder={() => true}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>{action ? ACTION_LABEL[action] : ''} — {account.label}</Text>
          <View style={s.amtRow}>
            <Text style={s.amtPrefix}>{currencySymbol()}</Text>
            <TextInput style={s.amtInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary}
              value={amount} onChangeText={setAmount} autoFocus accessibilityLabel="Amount" />
          </View>
          {action === 'TRANSFER' && (
            <View style={s.destWrap}>
              <Text style={s.destHdr}>INTO</Text>
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
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  h1: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, lineHeight: 20 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  chip: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, backgroundColor: Colors.bgTertiary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  updated: { fontSize: 12, color: Colors.textTertiary },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  balance: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary },
  classLine: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  holdsLine: { fontSize: 13, color: Colors.textTertiary, marginTop: 2 },
  statusBadge: { fontSize: 13, fontWeight: '700', color: Colors.amber, backgroundColor: Colors.amberLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6, overflow: 'hidden' },
  optBlock: { marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
  insideRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  insideDot: { width: 9, height: 9, borderRadius: 5 },
  insideSub: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 1 },
  optHdr: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.7, marginBottom: 4 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  optLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  optVal: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  optNote: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  maturedCard: { backgroundColor: Colors.amberLight, borderRadius: Radii.md, padding: 12, marginBottom: Spacing.sm },
  maturedTitle: { fontSize: 14, fontWeight: '800', color: Colors.amber },
  maturedBody: { fontSize: 12.5, color: Colors.amber, marginTop: 3, lineHeight: 17 },
  maturedBtn: { backgroundColor: Colors.amber, borderRadius: Radii.md, paddingVertical: 11, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 8, minHeight: 44, justifyContent: 'center' },
  maturedBtnTxt: { fontSize: 13.5, fontWeight: '800', color: Colors.white },
  staleCard: { backgroundColor: Colors.amberLight, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  staleTxt: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  staleBtn: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, paddingVertical: 8, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  staleBtnTxt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  section: { fontSize: 12, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: 6 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  actionTxt: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  link: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginTop: 4, paddingVertical: 12, minHeight: 44, textAlignVertical: 'center' },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, minHeight: 40 },
  txnDate: { width: 46, fontSize: 12, fontWeight: '700', color: Colors.textTertiary },
  txnLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  txnAmt: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  empty: { fontSize: 13, color: Colors.textSecondary, paddingVertical: 6 },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  primaryTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  secondaryTxt: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  amtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  amtPrefix: { fontSize: 28, fontWeight: '800', color: Colors.textSecondary },
  amtInput: { fontSize: 40, fontWeight: '800', color: Colors.textPrimary, minWidth: 80, textAlign: 'center', padding: 0 },
  destWrap: { marginTop: Spacing.sm },
  destHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  destRow: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, marginBottom: 6, minHeight: 44, justifyContent: 'center' },
  destOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  destTxt: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, textTransform: 'capitalize' },
  dayRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm, justifyContent: 'center' },
  dayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, minHeight: 40, justifyContent: 'center' },
  preview: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  cardHdr2: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  estTag: { fontSize: 11.5, fontWeight: '800', color: Colors.amber, letterSpacing: 0.3, marginBottom: 4 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, gap: 10 },
  factL: { fontSize: 14, color: Colors.textSecondary, flexShrink: 0 },
  factV: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1, textAlign: 'right' },
  bondLine: { fontSize: 13, color: Colors.textPrimary, lineHeight: 20, marginTop: 4 },
  bondNote: { fontSize: 12.5, color: Colors.textSecondary, lineHeight: 18, marginTop: 6 },
  linkTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 8 },
  ttmInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, color: Colors.textPrimary, minWidth: 80, backgroundColor: Colors.bgSecondary },
  ttmSave: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  ttmSaveTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
