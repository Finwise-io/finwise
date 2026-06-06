// Portfolio Performance — per-holding actual return vs its SAME-period benchmark (ticker-based, lots).
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { moneyCompact } from '../domain/_shared/money';
import { ASSET_KINDS, assetKind, accountAllowsTicker, type AssetAccount } from '../domain/assets';
import {
  buildPerformance, portfolioPeriodReturn, benchmarkTicker, totalShares, costBasis,
  attribution, allocation, PERIODS, type Period, type Position, type Lot,
} from '../domain/performance';
import { txnLabel, cashEffect, availableCash, type Transaction, type TxnType } from '../domain/transactions';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const pct = (v: number | null) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`);
// A holding's TYPE = its instrument class (sets the benchmark) — not an account type (401k/IRA/529/brokerage).
const ACCOUNT_TYPE_IDS = ['brokerage', '401k', 'trad_ira', 'roth_ira', 'hsa', 'college_529', 'checking', 'savings', 'home', 'vehicle'];
const KIND_OPTIONS = ASSET_KINDS.filter((k) => k.section === 'Investments' && !ACCOUNT_TYPE_IDS.includes(k.id));

export default function PerformanceScreen() {
  const store = useStore() as any;
  const accounts: AssetAccount[] = store.assetAccounts ?? [];
  const priceCache = store.priceCache ?? {};
  const [period, setPeriod] = useState<Period>('1Y');
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<{ accountId: string; position: Position } | null>(null);
  const [txnOpen, setTxnOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // every position across accounts, tagged with its owning account
  const owned = useMemo(() => accounts.flatMap((a) => (a.positions ?? []).map((p) => ({ accountId: a.asset_id, p }))), [accounts]);
  const positions = owned.map((o) => o.p);
  const priceOf = (t: string) => priceCache[t.trim().toUpperCase()];
  const rows = useMemo(() => buildPerformance(positions, priceOf, period), [owned, priceCache, period]);
  const portReturn = portfolioPeriodReturn(rows);
  const benchPort = (() => {
    const usable = rows.filter((r) => r.benchReturn != null && r.marketValue > 0);
    const tot = usable.reduce((t, r) => t + r.marketValue, 0);
    return tot > 0 ? usable.reduce((t, r) => t + (r.benchReturn as number) * r.marketValue, 0) / tot : null;
  })();
  const portBeat = portReturn != null && benchPort != null ? portReturn - benchPort : null;
  const cashTotal = accounts.reduce((t, a) => t + (a.cash_balance || 0), 0);
  const investedValue = rows.reduce((t, r) => t + r.marketValue, 0);
  const totalValue = investedValue + cashTotal;
  const attr = useMemo(() => attribution(rows), [rows]);
  const alloc = useMemo(() => allocation(rows, cashTotal), [rows, cashTotal]);
  const allocLabel = (k: string) => (k === 'cash' ? 'Cash' : assetKind(k)?.label ?? 'Other');
  const ALLOC_COLORS = ['#178F6B', '#7A5AA7', '#185FA5', '#EBB23A', '#A9745B', '#5BA98F', '#C2607E'];

  const refresh = async () => { setLoading(true); try { await store.refreshPrices(); } finally { setLoading(false); } };
  useEffect(() => { if (positions.length) refresh(); }, [positions.length]);   // fetch on open / when holdings change

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headRow}>
        <Text style={styles.eyebrow}>PORTFOLIO PERFORMANCE</Text>
        <TouchableOpacity onPress={refresh} disabled={loading}>
          <Text style={styles.refresh}>{loading ? 'Updating…' : '↻ Refresh'}</Text>
        </TouchableOpacity>
      </View>

      {positions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyT}>Track how your investments perform against the market.</Text>
          <Text style={styles.emptyS}>Add a holding with its ticker and what you paid — we'll value it live and compare its return to the right benchmark.</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}><Text style={styles.addBtnT}>＋ Add a holding</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          {/* PERIOD SELECTOR */}
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity key={p} style={[styles.periodPill, period === p && styles.periodPillOn]} onPress={() => setPeriod(p)}>
                <Text style={[styles.periodT, period === p && styles.periodTOn]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* PORTFOLIO SUMMARY */}
          <View style={styles.summary}>
            <Text style={styles.sumVal}>{money(totalValue)}</Text>
            <Text style={styles.sumLab}>portfolio value · live{cashTotal > 0 ? ` · incl. ${money(cashTotal)} cash` : ''}</Text>
            <View style={styles.sumRow}>
              <View style={styles.sumCell}><Text style={styles.sumCellL}>YOUR {period}</Text><Text style={[styles.sumCellV, portReturn != null && { color: portReturn >= 0 ? Colors.primary : Colors.red }]}>{pct(portReturn)}</Text></View>
              <View style={styles.sumCell}><Text style={styles.sumCellL}>BENCHMARK</Text><Text style={styles.sumCellV}>{pct(benchPort)}</Text></View>
              <View style={styles.sumCell}><Text style={styles.sumCellL}>VS BENCH</Text><Text style={[styles.sumCellV, portBeat != null && { color: portBeat >= 0 ? Colors.primary : Colors.red }]}>{portBeat == null ? '—' : `${portBeat >= 0 ? '+' : ''}${(portBeat * 100).toFixed(1)}`}</Text></View>
            </View>
          </View>

          {/* PER-HOLDING TABLE */}
          <View style={styles.card}>
            <View style={styles.tHead}>
              <Text style={[styles.tHL, { flex: 1 }]}>HOLDING</Text>
              <Text style={[styles.tHL, styles.col]}>YOUR {period}</Text>
              <Text style={[styles.tHL, styles.col]}>BENCH</Text>
            </View>
            {rows.map((r) => {
              const o = owned.find((x) => x.p.position_id === r.position.position_id)!;
              return (
                <TouchableOpacity key={r.position.position_id} style={styles.tRow} onPress={() => setEdit({ accountId: o.accountId, position: r.position })}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hTicker}>{r.position.ticker}{r.position.label ? <Text style={styles.hName}>  {r.position.label}</Text> : null}</Text>
                    <Text style={styles.hSub} numberOfLines={1}>
                      {r.price == null ? 'no price yet' : `${money(r.marketValue)} · ${totalShares(r.position)} sh`}
                      {r.totalROI != null ? ` · ${pct(r.totalROI)} since buy` : ''}
                      {` · vs ${r.benchTicker}`}
                    </Text>
                  </View>
                  <Text style={[styles.col, styles.cellV, r.periodReturn != null && { color: r.periodReturn >= 0 ? Colors.primary : Colors.red }]}>{pct(r.periodReturn)}</Text>
                  <Text style={[styles.col, styles.cellB]}>{pct(r.benchReturn)}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => setAddOpen(true)}><Text style={styles.addLink}>＋ Add holding</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setTxnOpen(true)}><Text style={styles.addLink}>＋ Record transaction</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setHistoryOpen(true)}><Text style={styles.addLink}>Activity ›</Text></TouchableOpacity>
            </View>
          </View>

          {/* ATTRIBUTION — what drove the period return */}
          {attr.length > 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>What drove your {period}</Text>
              {attr.map((x) => (
                <View key={x.position.position_id} style={styles.attrRow}>
                  <Text style={styles.attrName} numberOfLines={1}>{x.position.ticker}</Text>
                  <Text style={styles.attrWt}>{Math.round(x.weight * 100)}%</Text>
                  <Text style={[styles.attrPts, { color: x.contribution >= 0 ? Colors.primary : Colors.red }]}>{x.contribution >= 0 ? '+' : ''}{(x.contribution * 100).toFixed(1)} pts</Text>
                </View>
              ))}
              <Text style={styles.tinyFoot}>Each holding's share of your {period} return (weight × its return).</Text>
            </View>
          )}

          {/* ALLOCATION — current mix */}
          {alloc.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Allocation</Text>
              <View style={styles.allocBar}>
                {alloc.map((s, i) => <View key={s.key} style={{ width: `${s.pct}%`, backgroundColor: ALLOC_COLORS[i % ALLOC_COLORS.length] }} />)}
              </View>
              {alloc.map((s, i) => (
                <View key={s.key} style={styles.allocRow}>
                  <View style={[styles.allocDot, { backgroundColor: ALLOC_COLORS[i % ALLOC_COLORS.length] }]} />
                  <Text style={styles.allocName} numberOfLines={1}>{allocLabel(s.key)}</Text>
                  <Text style={styles.allocVal}>{money(s.value)}</Text>
                  <Text style={styles.allocPct}>{s.pct}%</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.foot}>
            Values are end-of-day from a free market-data source{store.pricesFetchedAt ? ` · updated ${new Date(store.pricesFetchedAt).toLocaleDateString()}` : ''}.
            “Your {period}” is the holding's price return over the period; benchmark is the matching index over the SAME period — so the comparison is like-for-like. Past performance isn't a guarantee.
          </Text>
        </>
      )}

      <View style={{ height: 40 }} />
      <HoldingEditor
        open={addOpen || edit != null}
        accounts={accounts}
        existing={edit}
        onClose={() => { setAddOpen(false); setEdit(null); }}
        onSave={(accountId, position, isNew) => {
          if (isNew) {
            if (accountId === '__new__') {
              store.addAsset({ label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, target_return: 0.08, positions: [] });
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
      <HistorySheet open={historyOpen} transactions={store.transactions ?? []} accounts={accounts}
        onClose={() => setHistoryOpen(false)} onDelete={(id) => store.deleteTransaction(id)} />
    </ScrollView>
  );
}

// ───────────────────────── Add / edit holding (ticker + lots) ─────────────────────────
function HoldingEditor({ open, accounts, existing, onClose, onSave, onDelete }: {
  open: boolean; accounts: AssetAccount[]; existing: { accountId: string; position: Position } | null;
  onClose: () => void; onSave: (accountId: string, position: Position, isNew: boolean) => void; onDelete?: () => void;
}) {
  const isNew = existing == null;
  const investAccts = accounts.filter(accountAllowsTicker);   // only security-eligible accounts (excludes cash/property/529)
  const [accountId, setAccountId] = useState<string>('');
  const [ticker, setTicker] = useState('');
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<string>('stocks_etf');
  const [lots, setLots] = useState<Lot[]>([]);

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
  // require full lots: every lot needs shares, cost/share, and a purchase date
  const valid = ticker.trim().length > 0 && lots.length > 0 && lots.every((l) => l.shares > 0 && l.cost_per_share > 0 && !!l.purchase_date);

  const save = () => {
    const clean = lots.filter((l) => l.shares > 0).map((l) => ({ ...l, lot_id: l.lot_id || `lot_${Math.random().toString(36).slice(2, 8)}` }));
    const position: Position = {
      position_id: existing?.position.position_id ?? `pos_${Math.random().toString(36).slice(2, 8)}`,
      ticker: ticker.trim().toUpperCase(), label: label.trim() || undefined, kind, lots: clean,
    };
    onSave(accountId, position, isNew);
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: '92%' }}>
          <Text style={styles.sheetT}>{isNew ? 'Add a holding' : 'Edit holding'}</Text>

          <Text style={styles.fieldL}>Ticker</Text>
          <TextInput style={styles.input} value={ticker} onChangeText={setTicker} autoCapitalize="characters" autoCorrect={false} placeholder="e.g. AAPL, VTI, SPY" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Name (optional)</Text>
          <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g. Apple Inc." placeholderTextColor={Colors.textTertiary} />

          <Text style={styles.fieldL}>Type (sets the benchmark — {benchmarkTicker(kind)})</Text>
          <View style={styles.kindWrap}>
            {KIND_OPTIONS.map((k) => (
              <TouchableOpacity key={k.id} style={[styles.kindChip, kind === k.id && styles.kindChipOn]} onPress={() => setKind(k.id)}>
                <Text style={[styles.kindChipT, kind === k.id && styles.kindChipTOn]}>{k.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldL}>Lots — what you bought</Text>
          {lots.map((l, i) => (
            <View key={i} style={styles.lotRow}>
              <View style={styles.lotCell}><Text style={styles.lotL}>Shares</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={l.shares ? String(l.shares) : ''} onChangeText={(t) => setLot(i, { shares: num(t) })} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Cost / share</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={l.cost_per_share ? String(l.cost_per_share) : ''} onChangeText={(t) => setLot(i, { cost_per_share: num(t) })} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Date</Text><TextInput style={styles.lotIn} value={l.purchase_date} onChangeText={(t) => setLot(i, { purchase_date: t })} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textTertiary} /></View>
              {lots.length > 1 && <TouchableOpacity onPress={() => setLots((ls) => ls.filter((_, j) => j !== i))}><Text style={styles.lotDel}>✕</Text></TouchableOpacity>}
            </View>
          ))}
          <TouchableOpacity onPress={() => setLots((ls) => [...ls, blankLot()])}><Text style={styles.addLink}>＋ Add another lot</Text></TouchableOpacity>

          {accounts.length > 0 && (
            <>
              <Text style={styles.fieldL}>Account</Text>
              <View style={styles.kindWrap}>
                {investAccts.map((a) => (
                  <TouchableOpacity key={a.asset_id} style={[styles.kindChip, accountId === a.asset_id && styles.kindChipOn]} onPress={() => setAccountId(a.asset_id)}>
                    <Text style={[styles.kindChipT, accountId === a.asset_id && styles.kindChipTOn]}>{a.institution?.trim() || a.label}</Text>
                  </TouchableOpacity>
                ))}
                {isNew && (
                  <TouchableOpacity style={[styles.kindChip, accountId === '__new__' && styles.kindChipOn]} onPress={() => setAccountId('__new__')}>
                    <Text style={[styles.kindChipT, accountId === '__new__' && styles.kindChipTOn]}>＋ New account</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          <TouchableOpacity style={[styles.saveBtn, !valid && { opacity: 0.4 }]} disabled={!valid} onPress={save}>
            <Text style={styles.saveBtnT}>{isNew ? 'Add holding' : 'Save'}{valid ? ` · cost ${moneyCompact(costBasis({ position_id: '', ticker, lots } as Position), 'M')}` : ''}</Text>
          </TouchableOpacity>
          {onDelete && <TouchableOpacity onPress={onDelete}><Text style={styles.deleteLink}>Delete holding</Text></TouchableOpacity>}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}
const blankLot = (): Lot => ({ lot_id: `lot_${Math.random().toString(36).slice(2, 8)}`, shares: 0, cost_per_share: 0, purchase_date: new Date().toISOString().slice(0, 10) });

// ───────────────────────── Record a transaction ─────────────────────────
const TXN_TYPES: { k: TxnType; label: string }[] = [
  { k: 'BUY', label: 'Buy' }, { k: 'SELL', label: 'Sell' }, { k: 'DEPOSIT', label: 'Deposit cash' },
  { k: 'WITHDRAWAL', label: 'Withdraw' }, { k: 'TRANSFER', label: 'Transfer' }, { k: 'DIVIDEND', label: 'Dividend' },
];
function TransactionSheet({ open, accounts, onClose, onSave }: {
  open: boolean; accounts: AssetAccount[]; onClose: () => void; onSave: (t: Omit<Transaction, 'id' | 'created_at'>) => void;
}) {
  const eligible = accounts.filter(accountAllowsTicker);
  const cashAccts = accounts.filter((a) => a.tax_bucket !== 'PROPERTY');
  const [type, setType] = useState<TxnType>('BUY');
  const [accountId, setAccountId] = useState('');
  const [counterId, setCounterId] = useState('');
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [reinvest, setReinvest] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  useEffect(() => { if (open) { setType('BUY'); setAccountId((accounts.filter(accountAllowsTicker)[0]?.asset_id) ?? accounts[0]?.asset_id ?? ''); setCounterId(''); setTicker(''); setShares(''); setPrice(''); setAmount(''); setReinvest(false); setDate(new Date().toISOString().slice(0, 10)); } }, [open]);

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
  const acctName = (a: AssetAccount) => a.institution?.trim() || a.label;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: '92%' }}>
          <Text style={styles.sheetT}>Record a transaction</Text>
          <View style={[styles.kindWrap, { marginTop: 8 }]}>
            {TXN_TYPES.map((t) => (
              <TouchableOpacity key={t.k} style={[styles.kindChip, type === t.k && styles.kindChipOn]} onPress={() => setType(t.k)}>
                <Text style={[styles.kindChipT, type === t.k && styles.kindChipTOn]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldL}>{isTransfer ? 'From account' : 'Account'}</Text>
          <View style={styles.kindWrap}>
            {acctList.map((a) => (
              <TouchableOpacity key={a.asset_id} style={[styles.kindChip, accountId === a.asset_id && styles.kindChipOn]} onPress={() => setAccountId(a.asset_id)}>
                <Text style={[styles.kindChipT, accountId === a.asset_id && styles.kindChipTOn]}>{acctName(a)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {isTransfer && (
            <>
              <Text style={styles.fieldL}>To account</Text>
              <View style={styles.kindWrap}>
                {cashAccts.filter((a) => a.asset_id !== accountId).map((a) => (
                  <TouchableOpacity key={a.asset_id} style={[styles.kindChip, counterId === a.asset_id && styles.kindChipOn]} onPress={() => setCounterId(a.asset_id)}>
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
                  <TouchableOpacity key={tk} style={[styles.kindChip, ticker === tk && styles.kindChipOn]} onPress={() => setTicker(tk)}>
                    <Text style={[styles.kindChipT, ticker === tk && styles.kindChipTOn]}>{tk}</Text>
                  </TouchableOpacity>))}
                </View>}
            {isSell && ticker !== '' && <Text style={[styles.note, !sellOk && { color: Colors.red, fontWeight: '700' }]}>You own {ownedShares} shares{!sellOk ? "  ⚠ can't sell more than you own" : ''}</Text>}
          </>)}

          {isDiv && (
            <View style={[styles.lotRow, { marginTop: 12 }]}>
              <TouchableOpacity style={[styles.kindChip, !reinvest && styles.kindChipOn]} onPress={() => setReinvest(false)}><Text style={[styles.kindChipT, !reinvest && styles.kindChipTOn]}>Paid as cash</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.kindChip, reinvest && styles.kindChipOn]} onPress={() => setReinvest(true)}><Text style={[styles.kindChipT, reinvest && styles.kindChipTOn]}>Reinvested</Text></TouchableOpacity>
            </View>
          )}

          {(isTrade || (isDiv && reinvest)) && (
            <View style={[styles.lotRow, { marginTop: 12 }]}>
              <View style={styles.lotCell}><Text style={styles.lotL}>Shares</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={shares} onChangeText={setShares} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Price / share</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={price} onChangeText={setPrice} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Date</Text><TextInput style={styles.lotIn} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textTertiary} /></View>
            </View>
          )}
          {(isCash || isTransfer || (isDiv && !reinvest)) && (
            <View style={[styles.lotRow, { marginTop: 12 }]}>
              <View style={styles.lotCell}><Text style={styles.lotL}>Amount</Text><TextInput style={styles.lotIn} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>
              <View style={styles.lotCell}><Text style={styles.lotL}>Date</Text><TextInput style={styles.lotIn} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textTertiary} /></View>
            </View>
          )}

          <TouchableOpacity style={[styles.saveBtn, !valid && { opacity: 0.4 }]} disabled={!valid} onPress={save}><Text style={styles.saveBtnT}>Record {txnLabel(type).toLowerCase()}</Text></TouchableOpacity>
          <View style={{ height: 16 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ───────────────────────── Activity / history ─────────────────────────
function HistorySheet({ open, transactions, accounts, onClose, onDelete }: {
  open: boolean; transactions: Transaction[]; accounts: AssetAccount[]; onClose: () => void; onDelete: (id: string) => void;
}) {
  const acctName = (id?: string) => { const a = accounts.find((x) => x.asset_id === id); return a ? (a.institution?.trim() || a.label) : '—'; };
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <Text style={styles.sheetT}>Activity</Text>
        <Text style={styles.sheetS}>Every transaction you've recorded — your full history.</Text>
        <ScrollView style={{ maxHeight: 460 }}>
          {transactions.length === 0 && <Text style={styles.hEmpty}>No transactions yet.</Text>}
          {transactions.map((t) => {
            const eff = cashEffect(t);
            const detail = t.ticker ? `${t.ticker}${t.shares ? ` · ${t.shares} sh` : ''}${t.price ? ` @ ${money(t.price)}` : ''}` : acctName(t.account_id);
            return (
              <View key={t.id} style={styles.hRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hType}>{txnLabel(t.type)} <Text style={styles.hDetail}>{detail}</Text></Text>
                  <Text style={styles.hMeta}>{t.date} · {acctName(t.account_id)}{t.counter_account_id ? ` → ${acctName(t.counter_account_id)}` : ''}{t.reinvested ? ' · reinvested' : ''}</Text>
                </View>
                {eff !== 0 && <Text style={[styles.hAmt, { color: eff >= 0 ? Colors.primary : Colors.red }]}>{eff >= 0 ? '+' : ''}{money(eff)}</Text>}
                <TouchableOpacity onPress={() => onDelete(t.id)}><Text style={styles.hDel}>✕</Text></TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={styles.applyBtn2} onPress={onClose}><Text style={styles.saveBtnT}>Done</Text></TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5 },
  refresh: { fontSize: 12.5, fontWeight: '700', color: Colors.primary },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyT: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  emptyS: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, paddingHorizontal: 24, marginTop: 20 },
  addBtnT: { color: '#fff', fontSize: 15, fontWeight: '800' },

  periodRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  periodPill: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: Radii.pill, backgroundColor: Colors.cardBg },
  periodPillOn: { backgroundColor: Colors.primary },
  periodT: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  periodTOn: { color: '#fff' },

  summary: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.base, marginTop: 12, alignItems: 'center' },
  sumVal: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary },
  sumLab: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
  sumRow: { flexDirection: 'row', marginTop: 14, alignSelf: 'stretch' },
  sumCell: { flex: 1, alignItems: 'center' },
  sumCellL: { fontSize: 9.5, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4 },
  sumCellV: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 3 },

  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 12 },
  tHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tHL: { fontSize: 9.5, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4 },
  col: { width: 62, textAlign: 'right' },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
  hTicker: { fontSize: 14.5, fontWeight: '800', color: Colors.textPrimary },
  hName: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  hSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  cellV: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  cellB: { fontSize: 13.5, fontWeight: '700', color: Colors.textSecondary },
  addLink: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 12 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  attrRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
  attrName: { flex: 1, fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary },
  attrWt: { width: 44, textAlign: 'right', fontSize: 12, color: Colors.textTertiary },
  attrPts: { width: 70, textAlign: 'right', fontSize: 13.5, fontWeight: '800' },
  tinyFoot: { fontSize: 10.5, color: Colors.textTertiary, marginTop: 8 },
  allocBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: Colors.bgTertiary, marginBottom: 10 },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  allocDot: { width: 10, height: 10, borderRadius: 3 },
  allocName: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  allocVal: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  allocPct: { width: 48, textAlign: 'right', fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary },
  foot: { fontSize: 10.5, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 12 },
  applyBtn2: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  hEmpty: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', paddingVertical: 24 },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
  hType: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  hDetail: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  hMeta: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  hAmt: { fontSize: 14, fontWeight: '800' },
  hDel: { fontSize: 15, color: Colors.textTertiary, paddingHorizontal: 4 },

  scrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' } as any,
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  sheetT: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  fieldL: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 14, marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 11, fontSize: 15, color: Colors.textPrimary },
  kindWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  kindChip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.pill, paddingHorizontal: 11, paddingVertical: 7 },
  kindChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  kindChipT: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  kindChipTOn: { color: Colors.primaryDark },
  lotRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  lotCell: { flex: 1 },
  lotL: { fontSize: 10, color: Colors.textTertiary, marginBottom: 3 },
  lotIn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8, padding: 8, fontSize: 13, color: Colors.textPrimary },
  lotDel: { fontSize: 16, color: Colors.red, padding: 8 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnT: { color: '#fff', fontSize: 15, fontWeight: '800' },
  deleteLink: { fontSize: 13, fontWeight: '700', color: Colors.red, textAlign: 'center', marginTop: 14 },
});
