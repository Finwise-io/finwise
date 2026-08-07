// Bill calendar v2 (FCC detailed design v1.1, Cash flow r34-r43): the SAME 12 dated months as
// everywhere else, viewed as a running-balance table — money in, money out, and what's left at
// the end of each month, starting from real cash on hand. Big bills get day-level treatment
// ('will the money be there two days before it's due?'). Dated bills are added and edited HERE,
// and a deferred loan visibly starts paying in its real first month. One grid (F2), no second math.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Switch } from 'react-native';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { maskedMoney, spokenMoney } from '../components/useMoney';
import { buildDatedGrid } from '../domain/grid';
import { upcomingBills } from '../domain/cashflow';
import { cashTotal } from '../domain/assets';   // canonical cash — equals Net worth's figure for the same accounts
import { requiredPayment, paymentShape } from '../domain/debt';

const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso: string) => { const [y, m, d] = String(iso).split('-').map(Number); return `${MO[m - 1]} ${d}, ${y}`; };
const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

export default function BillCalendarScreen() {
  const store = useStore() as any;
  const router = useRouter();
  const op = store.onboardingProfile ?? {};
  const A = store.retirementAssumptions ?? {};

  // ── hooks first (the setup gate returns below) ──
  const accounts = store.assetAccounts ?? [];
  const liabilities = store.liabilities ?? [];
  const cashOnHand = cashTotal(accounts);
  const [startStr, setStartStr] = useState(cashOnHand > 0 ? String(Math.round(cashOnHand)) : '');
  const start = num(startStr);

  // the ONE dated grid — same construction as the Cash flow tab (Roth tax lands here too),
  // plus this screen's starting balance so End chains from real cash (r39)
  const grid = useMemo(() => {
    const rothTax = Number(A.rothConversionTax) || 0;
    const oneOffs = rothTax > 0
      ? [{ label: 'Roth conversion tax (from your Plan)', amount: rothTax, month: 4, year: new Date().getFullYear() + 1 }]
      : undefined;
    return buildDatedGrid(op, { liabilities, oneOffs, startBalance: start });
  }, [op, liabilities, A.rothConversionTax, start]);

  const bills = useMemo(() => upcomingBills(op, start).filter((b) => b.daysAway <= 150).slice(0, 3), [op, start]);
  const deferredDebts = useMemo(() => liabilities.filter((d: any) => {
    if (!d.first_payment_date) return false;
    const m = String(d.first_payment_date).match(/^(\d{4})-(\d{2})/);
    if (!m) return false;
    const now = new Date();
    return (+m[1] * 12 + (+m[2] - 1)) > (now.getFullYear() * 12 + now.getMonth());
  }), [liabilities]);
  // B47 finding 11 — loans due IN FULL on a date: always visible here, whole balance + due date
  const dueInFullDebts = useMemo(() => liabilities.filter((d: any) =>
    paymentShape(d) === 'due_in_full' && (d.remaining_balance || 0) > 0 && d.payoff_date), [liabilities]);
  const critical = (Array.isArray(op.spendCats) ? op.spendCats : []).filter((c: any) => (c.tier ?? 'flex') === 'critical' && num(c.amount) > 0);

  // ── add / edit a dated bill (r41): writes a non-monthly spending category, year supported ──
  const [form, setForm] = useState<{ open: boolean; id?: string; label: string; amount: string; month: number; day: string; year: string; yearly: boolean; essential: boolean }>(
    { open: false, label: '', amount: '', month: new Date().getMonth() + 1, day: '', year: '', yearly: true, essential: true });
  const saveBill = () => {
    if (!form.label.trim() || num(form.amount) <= 0) return;
    const cats = Array.isArray(op.spendCats) ? [...op.spendCats] : [];
    const cat = {
      id: form.id ?? `bill_${Date.now().toString(36)}`, label: form.label.trim(), custom: true,
      bucket: 'nonmonthly', amount: num(form.amount), months: [form.month],
      dueDay: num(form.day) || undefined,
      year: !form.yearly && num(form.year) > 2000 ? num(form.year) : undefined,   // one-offs carry a YEAR (v1.1)
      tier: form.essential ? 'critical' : 'flex',
    };
    const idx = cats.findIndex((c: any) => c.id === cat.id);
    if (idx >= 0) cats[idx] = { ...cats[idx], ...cat }; else cats.push(cat);
    store.setOnboardingProfile?.({ ...op, spendCats: cats });                     // ONE recompute event — every surface moves together
    setForm({ open: false, label: '', amount: '', month: new Date().getMonth() + 1, day: '', year: '', yearly: true, essential: true });
  };
  const editBill = (label: string) => {
    const c = (Array.isArray(op.spendCats) ? op.spendCats : []).find((x: any) => x.label === label && x.bucket === 'nonmonthly');
    if (!c) return;
    setForm({ open: true, id: c.id, label: c.label, amount: String(c.amount ?? ''), month: (c.months ?? [new Date().getMonth() + 1])[0], day: String(c.dueDay ?? ''), year: String(c.year ?? ''), yearly: !c.year, essential: (c.tier ?? 'flex') === 'critical' });
  };

  // setup gate (r43) — the calendar is built from income timing + bills
  if (!store.onboardingComplete) {
    return (
      <View style={styles.gateWrap}>
        <Text style={styles.gateEmoji}>🗓️</Text>
        <Text style={styles.h1}>Bill calendar</Text>
        <Text style={[styles.sub, { textAlign: 'center' }]}>
          This calendar maps when your money lands against when your bills are due — it's built from
          the income and spending you enter during setup.
        </Text>
        <TouchableOpacity accessibilityRole="button" style={styles.gateBtn}
          onPress={() => { store.setOnboardingPaused?.(false); router.replace('/onboarding'); }}>
          <Text style={styles.gateBtnT}>Finish my setup →</Text>
        </TouchableOpacity>
        <Text style={styles.tiny}>It picks up right where you left off.</Text>
      </View>
    );
  }

  const short = grid.shortMonths.length > 0;
  const lowestCell = grid.cells.reduce((m, c) => (c.runningBalance < m.runningBalance ? c : m), grid.cells[0]);
  // the biggest cause, named in one sentence (r43): the largest bill in the first short month
  const shortCause = short ? (() => {
    const cell = grid.cells.find((c) => grid.shortMonths.includes(c.label));
    const big = cell?.billItems.slice().sort((a, b) => b.amount - a.amount)[0];
    return big ? `The biggest cause: ${big.label} (${maskedMoney(Math.round(big.amount))}) in ${cell!.label}.` : '';
  })() : '';

  return (
    <KeyboardAwareScreen style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Bill calendar</Text>
      <Text style={styles.sub}>{grid.cells[0]?.label} {grid.cells[0]?.year} – {grid.cells[11]?.label} {grid.cells[11]?.year} · when money lands, when bills are due, and what's left.</Text>

      <View style={styles.card}>
        <Text style={styles.fieldL}>Cash on hand now</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={Colors.textTertiary}
          value={startStr} onChangeText={setStartStr} accessibilityLabel="Cash on hand now, editable" />
        <Text style={styles.tiny}>Auto-filled from your accounts ({maskedMoney(Math.round(cashOnHand))}) — the starting balance the table carries forward. Edit it and the End column recalculates from there.</Text>
      </View>

      {/* verdict (r38) — the flagged months here match the '!' flags on the Cash flow bars */}
      <View style={[styles.verdict, short ? styles.verdictBad : styles.verdictGood]} accessible
        accessibilityLabel={short
          ? `Careful — short in ${grid.shortMonths.join(' and ')}. ${shortCause}`
          : `OK — you stay above zero in all 12 months. Lowest point ${maskedMoney(Math.round(grid.lowestBalance))} in ${lowestCell?.label}.`}>
        <Text style={[styles.verdictTitle, short && { color: Colors.red }]}>
          {short ? `Careful — short in ${grid.shortMonths.join(', ')}` : 'OK — you stay above zero in all 12 months'}
        </Text>
        <Text style={styles.verdictSub}>
          {short ? `Lowest point ${maskedMoney(Math.round(grid.lowestBalance))} (${lowestCell?.label}). ${shortCause}` : `Lowest point ${maskedMoney(Math.round(grid.lowestBalance))} — ${lowestCell?.label}.`}
        </Text>
      </View>

      {/* the 12-row dated table (r39): In / Out / End, chaining exactly; rows open month detail */}
      <View style={styles.card}>
        <View style={styles.rowHead}>
          <Text style={[styles.hCell, { flex: 1 }]}>Month</Text>
          <Text style={[styles.hCell, styles.numCell]}>In</Text>
          <Text style={[styles.hCell, styles.numCell]}>Out</Text>
          <Text style={[styles.hCell, styles.numCell]}>End</Text>
        </View>
        {grid.cells.map((c, slot) => {
          const neg = c.runningBalance < 0;
          return (
            <TouchableOpacity accessibilityRole="button" key={`${c.label}${c.year}`} style={styles.mRow}
              onPress={() => router.push(`/month-detail?slot=${slot}` as any)}
              accessibilityLabel={`${c.label} ${c.year}: in ${spokenMoney(Math.round(c.inflow))}, out ${spokenMoney(Math.round(c.outflow))}, ending balance ${spokenMoney(Math.round(c.runningBalance))}${neg ? ' — short' : ''}. Opens the month's detail.`}>
              <Text style={[styles.mLabel, { flex: 1 }]}>{c.label}{neg ? ' !' : ''}</Text>
              <Text style={[styles.mNum, styles.numCell, { color: Colors.primary }]}>{c.inflow > 0 ? '+' + maskedMoney(Math.round(c.inflow)) : '—'}</Text>
              <Text style={[styles.mNum, styles.numCell]}>{c.outflow > 0 ? '−' + maskedMoney(Math.round(c.outflow)) : '—'}</Text>
              <Text style={[styles.mNum, styles.numCell, { fontWeight: '800', color: neg ? Colors.red : Colors.textPrimary }]}>{maskedMoney(Math.round(c.runningBalance))}{neg ? ' short' : ''}</Text>
              <Text style={styles.mChev}>›</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* coming up (r40): day-level big bills — 55-70 copy: savings or a backup, never a family ask */}
      {(bills.length > 0 || deferredDebts.length > 0) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coming up</Text>
          {bills.map((b) => (
            <TouchableOpacity accessibilityRole="button" key={b.id} style={styles.billRow} onPress={() => editBill(b.label)}
              accessibilityLabel={`${b.label}, ${spokenMoney(b.amount)} due ${fmtDate(b.dueDate)}. ${b.shortfall > 0 ? `Short ${spokenMoney(b.shortfall)} — set it aside by ${fmtDate(b.needByDate)}, from savings or a backup.` : `Covered: about ${spokenMoney(b.availableByNeed)} there by ${fmtDate(b.needByDate)}.`} Opens the editor.`}>
              <Text style={styles.billName}>{b.label} · {maskedMoney(b.amount)} due {fmtDate(b.dueDate)}</Text>
              {b.shortfall > 0 ? (
                <Text style={styles.billShort}>Short {maskedMoney(b.shortfall)} — set it aside by {fmtDate(b.needByDate)}, from savings or a backup.</Text>
              ) : (
                <Text style={styles.billOk}>✓ Covered — about {maskedMoney(b.availableByNeed)} there by {fmtDate(b.needByDate)}.</Text>
              )}
            </TouchableOpacity>
          ))}
          {dueInFullDebts.map((d: any) => (
            <View key={d.debt_id} style={styles.billRow} accessible
              accessibilityLabel={`${d.label}: ${spokenMoney(d.remaining_balance)} due in full ${fmtDate(d.payoff_date)}. No monthly payment — plan for the lump sum.`}>
              <Text style={styles.billName}>{d.label} — {maskedMoney(d.remaining_balance)} due in full {fmtDate(d.payoff_date)}</Text>
              <Text style={styles.billShort}>One lump payment, not a monthly bill — it's in that month's Out column.</Text>
            </View>
          ))}
          {deferredDebts.map((d: any) => (
            <View key={d.debt_id} style={styles.billRow} accessible
              accessibilityLabel={`${d.label}: first payment ${fmtDate(d.first_payment_date)}, ${spokenMoney(requiredPayment(d))} a month. No payments before then.`}>
              <Text style={styles.billName}>{d.label} — first payment {fmtDate(d.first_payment_date)}, {maskedMoney(requiredPayment(d))}/month</Text>
              <Text style={styles.billShort}>Visible now; the Out column starts counting it in its real first month.</Text>
            </View>
          ))}
          <Text style={styles.tiny}>Assumes money should be in your account 2 days before the due date.</Text>
        </View>
      )}

      {/* beyond the window (r43): never silently dropped */}
      {grid.later.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Later — beyond this 12-month window</Text>
          {grid.later.map((l, i) => (
            <Text key={i} style={styles.billShort}>· {l.label} — {maskedMoney(Math.round(l.amount))}{l.year ? `, ${MO[l.month - 1]} ${l.year}` : ''}</Text>
          ))}
        </View>
      )}

      {/* add / edit a dated bill (r41) */}
      {form.open ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{form.id ? 'Edit this bill' : 'Add a dated bill'}</Text>
          <Text style={styles.fieldL}>Name</Text>
          <TextInput style={styles.input} placeholder="Property tax" placeholderTextColor={Colors.textTertiary}
            value={form.label} onChangeText={(t) => setForm({ ...form, label: t })} accessibilityLabel="Bill name" />
          <Text style={styles.fieldL}>Amount</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={Colors.textTertiary}
            value={form.amount} onChangeText={(t) => setForm({ ...form, amount: t })} accessibilityLabel="Bill amount" />
          <Text style={styles.fieldL}>Due month</Text>
          <View style={styles.monthWrap}>
            {MO.map((m, i) => (
              <TouchableOpacity accessibilityRole="button" key={m} style={[styles.monthChip, form.month === i + 1 && styles.monthChipOn]}
                onPress={() => setForm({ ...form, month: i + 1 })} accessibilityLabel={`Due in ${m}`}
                accessibilityState={{ selected: form.month === i + 1 }}>
                <Text style={[styles.monthChipTxt, form.month === i + 1 && { color: Colors.primaryDark }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldL}>Day (optional)</Text>
              <TextInput style={styles.input} keyboardType="number-pad" placeholder="15" placeholderTextColor={Colors.textTertiary}
                value={form.day} onChangeText={(t) => setForm({ ...form, day: t })} accessibilityLabel="Due day of month" />
            </View>
            {!form.yearly && (
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldL}>Year (one-off)</Text>
                <TextInput style={styles.input} keyboardType="number-pad" placeholder={String(new Date().getFullYear())} placeholderTextColor={Colors.textTertiary}
                  value={form.year} onChangeText={(t) => setForm({ ...form, year: t })} accessibilityLabel="Year, for a one-time bill" />
              </View>
            )}
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchL}>Repeats every year</Text>
            <Switch value={form.yearly} onValueChange={(v) => setForm({ ...form, yearly: v })} accessibilityLabel="Repeats every year" />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchL}>Essential (pay first in a tight month)</Text>
            <Switch value={form.essential} onValueChange={(v) => setForm({ ...form, essential: v })} accessibilityLabel="Essential bill" />
          </View>
          <TouchableOpacity accessibilityRole="button" style={[styles.gateBtn, { marginTop: Spacing.md, alignSelf: 'stretch', alignItems: 'center' }, (!form.label.trim() || num(form.amount) <= 0) && { opacity: 0.4 }]}
            disabled={!form.label.trim() || num(form.amount) <= 0} onPress={saveBill} accessibilityLabel="Save this bill">
            <Text style={styles.gateBtnT}>Save bill</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={{ alignItems: 'center', minHeight: 44, justifyContent: 'center' }}
            onPress={() => setForm({ ...form, open: false })} accessibilityLabel="Cancel">
            <Text style={styles.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity accessibilityRole="button" style={styles.addBtn} onPress={() => setForm({ ...form, open: true })}
          accessibilityLabel="Add a dated bill">
          <Text style={styles.addBtnTxt}>+ Add a dated bill</Text>
        </TouchableOpacity>
      )}

      {/* prioritize when short — protect the essentials */}
      {short && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>If you can't pay everything, pay these first</Text>
          <Text style={styles.tiny}>Protect the essentials — housing, food, utilities, medicine — before anything optional.</Text>
          {critical.length > 0
            ? critical.map((c: any) => <Text key={c.id} style={styles.critItem}>• {c.label}</Text>)
            : <Text style={styles.critItem}>• Mark bills 'essential' to see them here.</Text>}
        </View>
      )}

      <Text style={styles.foot}>A forward plan, not a promise: spending uses your planned amounts, income is after estimated tax, and non-monthly bills land in the months you chose. Tap any row for that month's full detail.</Text>
      <View style={{ height: 40 }} />
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  gateWrap: { flex: 1, backgroundColor: Colors.bgSecondary, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  gateEmoji: { fontSize: 38 },
  gateBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, paddingHorizontal: 28, marginTop: Spacing.md },
  gateBtnT: { color: Colors.white, fontWeight: '800', fontSize: 15 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 6, lineHeight: 19 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  billRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary, minHeight: 44, justifyContent: 'center' },
  billName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  billShort: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  billOk: { fontSize: 13, color: Colors.primary, fontWeight: '700', marginTop: 3 },
  fieldL: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 5, marginTop: 8 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 17, color: Colors.textPrimary },
  tiny: { fontSize: 11, color: Colors.textTertiary, marginTop: 6, lineHeight: 15 },
  verdict: { borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10 },
  verdictGood: { backgroundColor: Colors.primaryLight },
  verdictBad: { backgroundColor: Colors.redLight },
  verdictTitle: { fontSize: 15, fontWeight: '800', color: Colors.primaryDark },
  verdictSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  rowHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  hCell: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.3 },
  numCell: { width: 88, textAlign: 'right' },
  mRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary, minHeight: 48 },
  mLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  mChev: { fontSize: 17, color: Colors.textTertiary, marginLeft: 4 },
  mNum: { fontSize: 15, fontVariant: ['tabular-nums'] },
  critItem: { fontSize: 13, color: Colors.textPrimary, marginTop: 4, fontWeight: '600' },
  monthWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  monthChip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingVertical: 7, paddingHorizontal: 10, minHeight: 36 },
  monthChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  monthChipTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  formRow: { flexDirection: 'row', gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, minHeight: 40 },
  switchL: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  addBtn: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 10, alignItems: 'center', minHeight: 48, justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.border },
  addBtnTxt: { fontSize: 15, fontWeight: '800', color: Colors.primaryDark },
  cancelTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  foot: { fontSize: 11, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 12 },
});
