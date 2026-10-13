// Bonds — individual bond management (Phase B). Bonds are AssetAccounts with bond fields, so they
// already flow into Net Worth + the nest egg; here we add/edit them and show bond-specific metrics.
import { plural } from '../domain/_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import TopBar from '../components/TopBar';
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { SectionBand } from '../components/SectionBand';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { fig, figPer, figSpoken, figWords } from '../components/figure';   // rule 11
import { InfoDot, EmptyNote } from '../components/UI';
import { DateField } from '../components/DateField';
import { type AssetAccount, type TaxBucket } from '../domain/assets';
import { theBonds, MATURITY_NOT_ENTERED } from '../../MoneyKeel/functions/networth-and-performance/bonds';
import { modalAnimation } from '../hooks/reducedMotion';
import { DotJoined } from '../components/SepDot';
import { isoLocalDate, maturityParts } from '../domain/_shared/dates';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
// ISO date helpers (local components, no TZ shift) for the maturity date picker
const fmtISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// read by the one reading of a maturity date (MK-NW-F-124, 2026-10-13): a text that is no date is never shown as
// today's date or a guessed one — the picker opens on its default day and the text is shown as it was stored
const parseISO = (s: string) => { const p = maturityParts(s); return p ? new Date(p[0], p[1] - 1, p[2]) : new Date(); };
const humanDate = (s: string) => (maturityParts(s) ? parseISO(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : s);
const pct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(2)}%`);
const ACCT_TYPES: { label: string; bucket: TaxBucket }[] = [
  { label: 'Taxable', bucket: 'TAXABLE' }, { label: 'Trad IRA / 401k', bucket: 'PRE_TAX' }, { label: 'Roth', bucket: 'ROTH' },
];

export default function BondsScreen() {
  const store = useStore() as any;
  const accounts: AssetAccount[] = store.assetAccounts ?? [];
  // ONE DOOR (MK-NW-O-001 theBonds, Q-NW-4 ruled 2026-09-27). This screen used to filter, sort and
  // summarise the bonds itself while the account page called the same functions its own way — which
  // is how two screens come to show two answers for one bond. It asks the question once now.
  const answer = useMemo(() => theBonds({ accounts }), [accounts]);
  const summary = answer;
  const bonds = answer.rows;
  const [edit, setEdit] = useState<AssetAccount | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
    <TopBar back />
    <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={styles.h1}>Bonds</Text>
      <SectionBand title="BONDS & CDS" /><InfoDot term="bonds" /></View>

      {bonds.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.metric}>Total value {fig('MK-NW-M-041', 0)}</Text>
          <EmptyNote door="bond" onPress={() => setAddOpen(true)} />   {/* Q48 (MK-NW-M-041/042/023) */}
          <Text style={styles.empty}>Track individual bonds — Treasuries, muni or corporate bonds, bond funds/ETFs — with their coupon income, maturity, and yield. They count toward your net worth and retirement nest egg.</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add a bond" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.addBtn} onPress={() => setAddOpen(true)}><Text style={styles.addBtnT}>＋ Add a bond</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={styles.sumVal}>{fig('MK-NW-M-041', summary.totalValue)}</Text>
            <Text style={styles.sumLab}>{plural(summary.count, 'bond')} · {summary.faceNotEntered.length === summary.count ? figWords('MK-NW-M-053', 'face value not entered') : `face ${fig('MK-NW-M-053', summary.totalFace)}`}</Text>
            <View style={styles.sumRow}>
              <View style={styles.sumCell}><Text style={styles.sumCellL}>COUPON /year</Text><Text style={[styles.sumCellV, { color: Colors.primary }]}>{fig('MK-NW-M-043', summary.couponPerYear)}</Text></View>
              <View style={styles.sumCell}><Text style={styles.sumCellL}>AVG YIELD</Text><Text style={styles.sumCellV}>{fig('MK-NW-M-044', summary.avgYield)}</Text></View>
              <View style={styles.sumCell}><Text style={styles.sumCellL}>NEXT MATURITY</Text><Text style={styles.sumCellV}>{summary.nextMaturity ? new Date(summary.nextMaturity).getFullYear() : '—'}</Text></View>
            </View>
            {/* a bond with no value today is not in the average, and the screen says which (outside review, 2026-10-04) */}
            {summary.leftOutOfAverage.length > 0 && (
              <Text style={styles.sumLab}>Average yield leaves out {summary.leftOutOfAverage.join(', ')} — no value today.</Text>
            )}
            {summary.leftOutNoRate.length > 0 && (
              <Text style={styles.sumLab}>Average yield leaves out {summary.leftOutNoRate.join(', ')} — no rate entered.</Text>
            )}
            {summary.faceNotEntered.length > 0 && summary.faceNotEntered.length < summary.count && (
              <Text style={styles.sumLab}>Face value leaves out {summary.faceNotEntered.join(', ')} — not entered.</Text>
            )}
          </View>

          {bonds.map((r) => {
            // every figure on this row comes off the door's answer; the account object is looked up
            // only to open the editor, which is the one thing a figure cannot do
            const acct = accounts.find((x) => String(x.asset_id) === r.accountId);
            const yrs = r.yearsLeft ?? 0;   // G11: no date → no years figure; the sub-line shows the date field instead
            // no maturity date: the row says "maturity date not entered" where the date stands, never a blank or a dash;
            // its interest still counts in COUPON /year (DEC-4036b, 2026-10-10)
            return (
              <TouchableOpacity key={r.accountId} accessibilityRole="button"
                accessibilityLabel={`${r.institution}, ${figSpoken('MK-NW-M-054', r.value)}, ${r.maturity ? `matures ${humanDate(r.maturity)}` : MATURITY_NOT_ENTERED}. Opens the editor.`}
                style={styles.card} onPress={() => acct && setEdit(acct)}>
                <View style={styles.bondHead}><Text style={styles.bondName} numberOfLines={1}>{r.institution}</Text><Text style={styles.bondVal}>{fig('MK-NW-M-054', r.value)}</Text></View>
                <DotJoined style={styles.bondSub} numberOfLines={2} parts={[r.face != null ? `face ${fig('MK-NW-M-055', r.face)}` : figWords('MK-NW-M-055', 'face value not entered'), r.couponRate != null ? `${(r.couponRate * 100).toFixed(2)}% coupon` : figWords('MK-NW-M-055', 'coupon rate not entered'), r.maturity ? `matures ${humanDate(r.maturity)}${yrs > 0 ? ` · ${Math.round(yrs)}y` : ''}` : MATURITY_NOT_ENTERED]} />
                <View style={styles.bondMetrics}>
                  <Text style={styles.metric}>{r.couponPerYear != null ? `${figPer('MK-NW-M-056', r.couponPerYear)} coupon` : figWords('MK-NW-M-056', 'coupon not entered')}</Text>
                  <Text style={styles.metric}>yield {fig('MK-NW-M-057', r.currentYield)}</Text>
                  <Text style={styles.metric}>Yield to maturity: {fig('MK-NW-M-058', r.yieldToMaturity)}{r.accruedCaveat ? ' *' : ''}</Text>
                </View>
                {!!r.accruedCaveat && <Text style={styles.bondSub}>* {r.accruedCaveat}</Text>}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add a bond" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => setAddOpen(true)}><Text style={styles.addLink}>＋ Add a bond</Text></TouchableOpacity>
          <Text style={styles.foot}>Coupons are paid as cash and counted as investment income. Value is what you enter (held at cost/quote — no live bond pricing). Yield to maturity is an estimate.</Text>
        </>
      )}

      <View style={{ height: 40 }} />
      <BondEditor bond={addOpen ? null : edit} open={addOpen || edit != null} onClose={() => { setAddOpen(false); setEdit(null); }}
        onSave={(fields) => {
          if (edit) { store.updateAsset(edit.asset_id, fields); setAddOpen(false); setEdit(null); return; }
          const bondValue = Number(fields.balance) || 0;
          const addIt = () => { store.addAsset({ kind: 'fixed_income', target_return: fields.coupon_rate ?? 0.04, ...fields }); setAddOpen(false); setEdit(null); };
          // double-count guard: a non-bond account at the same institution may already include this bond
          const inst = String(fields.institution ?? '').trim().toLowerCase();
          const isABond = new Set(answer.rows.map((r) => r.accountId));
          const dup = inst ? accounts.find((a) => !isABond.has(String(a.asset_id)) && String(a.institution ?? '').trim().toLowerCase() === inst && (a.balance || 0) > 0) : null;
          if (dup) {
            // "Part of it" = nest the bond inside the existing balance (lower that account so the total holds)
            const addAsPartOf = () => { store.updateAsset(dup.asset_id, { balance: Math.max(0, (dup.balance || 0) - bondValue) }); addIt(); };
            Alert.alert(
              'Part of an existing account?',
              `${dup.institution}'s “${dup.label}” is worth ${fig('MK-NW-M-054', dup.balance || 0)}. Is this ${fig('MK-NW-M-054', bondValue)} bond part of that, or additional money?\n\n“Part of it” lowers ${dup.label} by ${fig('MK-NW-M-054', bondValue)} so nothing is double-counted (total stays ${fig('MK-NW-M-054', dup.balance || 0)}).`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Additional money', onPress: addIt },
                { text: 'Part of it', onPress: addAsPartOf },
              ],
            );
          } else { addIt(); }
        }}
        onDelete={edit ? () => { store.deleteAsset(edit.asset_id); setEdit(null); } : undefined} />
    </ScrollView>
    </View>
  );
}

export function BondEditor({ bond, open, onClose, onSave, onDelete }: {
  bond: AssetAccount | null; open: boolean; onClose: () => void; onSave: (f: Partial<AssetAccount>) => void; onDelete?: () => void;
}) {
  const [label, setLabel] = useState('');
  const [face, setFace] = useState('');
  const [coupon, setCoupon] = useState('');
  const [accrued, setAccrued] = useState('');   // A47: interest earned since the last coupon, when known
  const [maturity, setMaturity] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [value, setValue] = useState('');
  const [valueAsOf, setValueAsOf] = useState('');   // walk row 4: the stamp lives everywhere a manual value does
  const [institution, setInstitution] = useState('');
  // NO ACCOUNT TYPE IS CHOSEN FOR THE PERSON (DEC-4036f, 2026-10-10): "An account with no account type chosen is never
  // assumed taxable." Taxable used to be preselected; now no chip is on until they tap one, and saved untapped the
  // holding has no tax type (its page says "tax type not stated").
  const [bucket, setBucket] = useState<TaxBucket | undefined>(undefined);
  const [sellAmt, setSellAmt] = useState('');
  // WHERE A CD WAS BOUGHT (DEC-3837, 2026-10-10): a bank CD yields its rate; a broker CD is priced like a
  // bond. Not answered = bank. Asked only for a CD, judged by the bonds door (MK-NW-O-001) — the same test
  // the bond figures and the Add an account form use.
  const [cdBought, setCdBought] = useState<'bank' | 'broker'>('bank');
  const isCd = !!theBonds({ accounts: [{ asset_id: 'draft', label, institution, kind: bond?.kind, asset_class: 'bonds',
    tax_bucket: 'TAXABLE', balance: 0, target_return: 0 } as any] }).rows[0]?.isCD;
  const cdField = isCd ? { cd_bought: cdBought } : {};   // saved with the other fields (DEC-3837, 2026-10-10)
  React.useEffect(() => {
    if (!open) return;
    setLabel(bond?.label ?? ''); setFace(bond?.face_value ? String(bond.face_value) : '');
    setCoupon(bond?.coupon_rate ? String(bond.coupon_rate * 100) : ''); setMaturity(bond?.maturity_date ?? '');
    setAccrued(bond?.accrued_interest != null ? String(bond.accrued_interest) : '');
    setValue(bond ? String(bond.balance ?? '') : ''); setBucket(bond?.tax_bucket);   // (DEC-4036f, 2026-10-10) unstated stays unstated setInstitution(bond?.institution ?? ''); setSellAmt(''); setValueAsOf(bond?.value_as_of ?? '');
    setCdBought(bond?.cd_bought === 'broker' ? 'broker' : 'bank');   // (DEC-3837, 2026-10-10)
  }, [open]);
  // You can sell a bond on the secondary market before maturity. Record a full or partial sale: a full
  // sale closes the position; a partial sale lowers its value and scales the face/par proportionally.
  // Walk row 4 (audit Home·NW #20): the sale goes through the LEDGER — a SELL row appears in the
  // account's Activity exactly like stock sales, instead of a silent balance patch with no trail.
  const recordTransaction = useStore((s: any) => s.recordTransaction);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const applySale = () => {
    const sold = num(sellAmt); if (sold <= 0) return;
    const cur = num(value) > 0 ? num(value) : num(face);
    if (cur <= 0) return;
    const full = sold >= cur - 0.005;
    Alert.alert(
      full ? 'Sell all of this bond?' : 'Sell part of this bond?',
      full
        ? `Marks the whole position (${fig('MK-NW-M-054', cur)}) as sold and removes it from your holdings.`
        : `Lowers ${label.trim() || 'this bond'} from ${fig('MK-NW-M-054', cur)} to ${fig('MK-NW-M-054', cur - sold)} (face value adjusts proportionally). Coupons are paid on the remaining face — and the sale shows in this account's activity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: full ? 'Sell all' : 'Sell', onPress: () => {
          if (full) { onDelete?.(); return; }
          const newVal = r2(cur - sold);
          // the ledger row lowers the value (the one writer); onSave carries only the non-balance fields
          if (bond) recordTransaction?.({ type: 'SELL', account_id: bond.asset_id, amount: sold, date: isoLocalDate(new Date()), note: 'Bond sale' });
          onSave({ label: label.trim(), tax_bucket: bucket as TaxBucket, institution: institution.trim() || undefined,
            coupon_rate: coupon.trim() === '' ? undefined : num(coupon) / 100,   // DEC-2748b: an empty box is unknown, not 0%
            maturity_date: maturity.trim(), accrued_interest: accrued.trim() === '' ? undefined : num(accrued),
            face_value: r2(num(face) * (newVal / cur)), ...cdField, ...(bond ? {} : { balance: newVal }) });
        } },
      ],
    );
  };
  const valid = label.trim() && num(face) > 0 && num(coupon) >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(maturity.trim());
  // #11: the spinner only fires onChange when you SPIN it, so tapping "Done" on the default date saved
  // nothing. Commit the default the instant the picker opens, so the shown date is the chosen date.
  const defaultMaturityISO = fmtISO(new Date(new Date().getFullYear() + 10, 0, 1));
  const openPicker = () => {
    if (!showPicker && !maturity) setMaturity(defaultMaturityISO);
    setShowPicker((s) => !s);
  };
  const save = () => onSave({
    label: label.trim(), tax_bucket: bucket as TaxBucket, institution: institution.trim() || undefined,
    face_value: num(face), coupon_rate: coupon.trim() === '' ? undefined : num(coupon) / 100, /* DEC-2748b */ maturity_date: maturity.trim(), accrued_interest: accrued.trim() === '' ? undefined : num(accrued),
    balance: num(value) > 0 ? num(value) : num(face),   // default value to face if blank
    value_as_of: valueAsOf || fmtISO(new Date()),       // walk row 4: every manual value carries its date
    ...cdField,
  });
  return (
    <Modal visible={open} transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={{ maxHeight: '90%' }}>
          <Text style={styles.sheetT}>{bond ? 'Edit bond' : 'Add a bond'}</Text>
          <Text style={styles.fieldL}>Name / issuer</Text>
          <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g. US Treasury 2030, Apple Corp 4.5%" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Institution / account (optional)</Text>
          <TextInput style={styles.input} value={institution} onChangeText={setInstitution} placeholder="e.g. Chase, Fidelity, Schwab" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldHint}>Held inside a brokerage or bank account? Add it here — if that account already has a balance, we'll ask whether this bond is part of it so nothing is double-counted.</Text>
          <Text style={styles.fieldL}>Face (par) value</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={face} onChangeText={setFace} placeholder="10000" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Coupon rate (% per year)</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={coupon} onChangeText={setCoupon} placeholder="4.5" placeholderTextColor={Colors.textTertiary} />
          {isCd && (
            <>
              {/* (DEC-3837, 2026-10-10) asked once, for a CD only */}
              <Text style={styles.fieldL}>Bought from the bank, or through a broker?</Text>
              <View style={styles.chips}>{([['bank', 'From the bank'], ['broker', 'Through a broker']] as const).map(([v, t]) => (
                <TouchableOpacity key={v} accessibilityRole="button" accessibilityLabel={v === 'bank' ? 'CD bought from the bank' : 'CD bought through a broker'} accessibilityState={{ selected: cdBought === v }}
                  style={[styles.chip, cdBought === v && styles.chipOn]} onPress={() => setCdBought(v)}><Text style={[styles.chipT, cdBought === v && styles.chipTOn]}>{t}</Text></TouchableOpacity>
              ))}</View>
            </>
          )}
          <Text style={styles.fieldL}>Accrued interest (optional)</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={accrued} onChangeText={setAccrued} placeholder="interest earned since the last coupon, if you know it" placeholderTextColor={Colors.textTertiary} accessibilityLabel="Accrued interest, optional" />
          <Text style={styles.fieldHint}>When you enter it, the yield is calculated on the price without it. Left blank, the yield uses the price as you entered it — and says so.</Text>
          <Text style={styles.fieldL}>Maturity date</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={maturity ? `Maturity date, ${humanDate(maturity)}. Tap to change.` : 'Pick a maturity date'} style={styles.input} activeOpacity={0.7} onPress={openPicker}>
            <Text style={{ fontSize: 17, color: maturity ? Colors.textPrimary : Colors.textTertiary }}>{maturity ? humanDate(maturity) : 'Tap to pick a date'}</Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={maturity ? parseISO(maturity) : new Date(new Date().getFullYear() + 10, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date(2000, 0, 1)}
              onChange={(e: any, d?: Date) => {
                if (Platform.OS !== 'ios') setShowPicker(false);
                if (e?.type === 'dismissed') return;
                if (d) setMaturity(fmtISO(d));
              }}
            />
          )}
          {showPicker && Platform.OS === 'ios' && (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Done picking date" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => setShowPicker(false)} style={{ alignSelf: 'flex-end', paddingVertical: 6 }}>
              <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 15 }}>Done</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.fieldL}>Market value, as your statement shows it — without accrued interest (blank = face value)</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={value} onChangeText={setValue} placeholder="the value on your statement" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Value as of</Text>
          <DateField value={valueAsOf} onChange={setValueAsOf} label="value as of" style={styles.input} />
          {valid && num(face) > 0 && coupon.trim() !== '' && <Text style={styles.note}>~{figPer('MK-NW-M-056', num(face) * (num(coupon) / 100))} in coupon income.</Text>}
          <Text style={styles.fieldL}>Account</Text>
          <View style={styles.chips}>{ACCT_TYPES.map((t) => (
            <TouchableOpacity key={t.bucket} accessibilityRole="button" accessibilityLabel={`Account type ${t.label}`} accessibilityState={{ selected: bucket === t.bucket }} style={[styles.chip, bucket === t.bucket && styles.chipOn]} onPress={() => setBucket(t.bucket)}><Text style={[styles.chipT, bucket === t.bucket && styles.chipTOn]}>{t.label}</Text></TouchableOpacity>
          ))}</View>
          {bond && (
            <View style={styles.sellBox}>
              <Text style={styles.sellTitle}>🔻 Sell</Text>
              <Text style={styles.fieldHint}>Sold this bond (or part of it) on the secondary market before maturity? Enter the proceeds to lower or close the position. To just re-mark its price, edit “Current value” above.</Text>
              <View style={styles.sellRow}>
                <TextInput style={[styles.input, { flex: 1 }]} keyboardType="decimal-pad" value={sellAmt} onChangeText={setSellAmt}
                  placeholder={`amount sold (up to ${fig('MK-NW-M-054', num(value) > 0 ? num(value) : num(face))})`} placeholderTextColor={Colors.textTertiary} />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sell" style={[styles.sellBtn, !(num(sellAmt) > 0) && { opacity: 0.4 }]} disabled={!(num(sellAmt) > 0)} onPress={applySale}>
                  <Text style={styles.sellBtnT}>Record</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sold the whole position" onPress={() => setSellAmt(String(num(value) > 0 ? num(value) : num(face)))}><Text style={styles.sellAll}>Sold the whole position →</Text></TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={[styles.saveBtn, !valid && { opacity: 0.4 }]} disabled={!valid} onPress={save}><Text style={styles.saveBtnT}>{bond ? 'Save' : 'Add bond'}</Text></TouchableOpacity>
          {onDelete && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete bond" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={onDelete}><Text style={styles.deleteLink}>Delete bond</Text></TouchableOpacity>}
          <View style={{ height: 16 }} />
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, marginBottom: 8 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: 10 },
  empty: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  addBtnT: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  addLink: { fontSize: 15, fontWeight: '800', color: Colors.primaryDark, marginTop: 10, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: 12, textAlign: 'center', backgroundColor: Colors.primaryLight, overflow: 'hidden' },
  foot: { fontSize: 11, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 12 },
  summary: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.base, marginBottom: 10, alignItems: 'center' },
  sumVal: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary },
  sumLab: { fontSize: 13, color: Colors.textTertiary, marginTop: 1 },
  sumRow: { flexDirection: 'row', marginTop: 14, alignSelf: 'stretch' },
  sumCell: { flex: 1, alignItems: 'center' },
  // P0 (design audit B-1): stat labels never below the 11pt kicker floor
  sumCellL: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.3 },
  sumCellV: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginTop: 3 },
  bondHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bondName: { flex: 1, fontSize: 15, fontWeight: '800', color: Colors.textPrimary, paddingRight: 8 },
  bondVal: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  bondSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 3 },
  bondMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  metric: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  scrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' } as any,
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  sheetT: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  fieldL: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 14, marginBottom: 5 },
  fieldHint: { fontSize: 11, color: Colors.textTertiary, lineHeight: 15, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 17, color: Colors.textPrimary },
  note: { fontSize: 13, color: Colors.textSecondary, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.pill, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipT: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  chipTOn: { color: Colors.primaryDark },
  sellBox: { marginTop: 18, padding: 12, borderRadius: Radii.md, backgroundColor: Colors.bgSecondary, borderWidth: 1, borderColor: Colors.border },
  sellTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  sellRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
  sellBtn: { backgroundColor: Colors.textPrimary, borderRadius: Radii.md, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  sellBtnT: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  sellAll: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 4, paddingVertical: 12, minHeight: 44, textAlignVertical: 'center' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  saveBtnT: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  deleteLink: { fontSize: 13, fontWeight: '700', color: Colors.red, textAlign: 'center', marginTop: 14 },
});
