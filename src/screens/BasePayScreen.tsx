// YOUR BASE PAY — one full screen, one section per earner.
//
// Built from the approved mock: MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v05.html, frames 2a–2e.
//
// ONE COMPONENT, TWO FRAMES (mock rule 2b). Onboarding pushes this same screen with a progress bar
// and Continue; Cash flow → Income opens it with a back arrow and Save. Two copies of the same
// questions is how they come to be asked two different ways.
//
// IT DOES NO ARITHMETIC. Every figure on it comes from MK-CF-O-001 basePay, which is handed one
// entry per earner and gives back both sections and the household block together — so the screen
// cannot show a total built from a different source than the rows above it.
import TopBar from '../components/TopBar';
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { basePay, entryFromWage, type EarnerPay, SS_WAGE_BASE, MEDICARE_ADDITIONAL_THRESHOLD } from '../../MoneyKeel/functions/cashflow/base-pay';
import { monthWindow, salaryMonths } from '../domain/income/salary-months';
import { filingStatusOf, over65CountOf } from '../domain/income';
import { money } from '../domain/_shared/num';
import { fig, figPer, figSpoken } from '../components/figure';

type Who = 'you' | 'partner' | 'both';
const FREQS: { k: string; label: string }[] = [
  { k: 'hourly', label: 'Hourly' }, { k: 'weekly', label: 'Weekly' },
  { k: 'biweekly', label: 'Bi-weekly' }, { k: 'monthly', label: 'Monthly' },
];
const FREQ_WORD: Record<string, string> = {
  hourly: 'Hourly', weekly: 'Weekly', biweekly: 'Fortnightly', monthly: 'Monthly',
};
// A fortnightly earner types a FORTNIGHT's pay. The months below are still months — a fortnightly
// figure typed into a monthly box is the mistake this label prevents (mock 2c).
const PERIOD_WORD: Record<string, string> = {
  hourly: 'an hour', weekly: 'a week', biweekly: 'a fortnight', monthly: 'each month',
};
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_ABBR[m - 1]} ${String(y).slice(2)}`;
};

export default function BasePayScreen({ frame = 'screen', onDone }: {
  frame?: 'screen' | 'onboarding'; onDone?: () => void;
}) {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const partnerName = String(op.partnerName || '').trim() || 'my spouse';
  // 'Your spouse' opens a heading; 'your spouse' sits inside a sentence. Interpolating the
  // heading form mid-sentence gave build 54 'Is Your spouse’s pay…' (founder screenshot #6).
  const midSentence = (n: string) => (n === 'Your spouse' ? 'your spouse' : n);

  const [who, setWho] = useState<Who>((op.whoEarns as Who) ?? 'you');
  const [mine, setMine] = useState<Record<string, any>>(() => ({ ...op }));
  const [theirs, setTheirs] = useState<Record<string, any>>(() => ({ ...(op.partnerWage ?? {}) }));
  const [open, setOpen] = useState<'mine' | 'theirs' | null>('mine');

  const wages = useMemo(() => {
    const list: { name: string; w: Record<string, any>; set: (u: Record<string, any>) => void; key: 'mine' | 'theirs' }[] = [];
    if (who !== 'partner') list.push({ name: 'You', w: mine, set: (u) => { setMine(u); persist({ mine: u }); }, key: 'mine' });
    if (who !== 'you') list.push({ name: partnerName === 'my spouse' ? 'Your spouse' : partnerName, w: theirs, set: (u) => { setTheirs(u); persist({ theirs: u }); }, key: 'theirs' });
    return list;
  }, [who, mine, theirs, partnerName]);

  // EVERY figure below comes from here. The screen adds nothing up itself.
  const pay = useMemo(() => basePay({
    earners: wages.map((e) => ({ name: e.name, entry: entryFromWage(e.w) })),
    filingStatus: filingStatusOf(op),
    over65: over65CountOf(op),
    profile: { ...op, ...mine, whoEarns: who, partnerWage: who === 'you' ? undefined : theirs },
  }), [wages, op, mine, theirs, who]);

  // WRITE AS THEY GO. Onboarding owns its own Continue and moves on without asking this screen, so
  // anything held in local state until a Save button would be lost the moment the same component is
  // used there. One component, two frames (approved mock rule 2b) only works if the body does not
  // depend on which frame is around it.
  const persist = (next: { who?: Who; mine?: Record<string, any>; theirs?: Record<string, any> }) => {
    const w = next.who ?? who, m = next.mine ?? mine, t = next.theirs ?? theirs;
    store.setOnboardingProfile?.({ ...op, ...m, whoEarns: w, partnerWage: w === 'you' ? undefined : t });
  };
  const save = () => { persist({}); if (onDone) onDone(); else router.back(); };

  const Frame: any = frame === 'onboarding' ? View : ScrollView;
  const frameProps = frame === 'onboarding'
    ? { style: { paddingBottom: 8 } }
    : { style: s.wrap, contentContainerStyle: { paddingBottom: 48 },
        keyboardShouldPersistTaps: 'handled' as const, automaticallyAdjustKeyboardInsets: true };
  return (
    <Frame {...frameProps}>
      {frame === 'onboarding' ? null : <TopBar back />}   {/* DEC-0354: the app bar carries the way back */}
      {frame === 'screen' && <Text style={s.h1}>Your base pay</Text>}
      <Text style={s.sub}>
        {frame === 'onboarding'
          ? 'Bonus, stocks and other income come next'
          : 'Bonus, stocks and other income are captured separately'}
      </Text>

      <Text style={s.band}>Who earns a wage?</Text>
      <View style={s.segRow}>
        {([['you', 'Just me'], ['partner', `Just ${partnerName}`], ['both', 'Both of us']] as [Who, string][])
          .map(([v, label]) => (
            <TouchableOpacity key={v} accessibilityRole="radio" accessibilityState={{ selected: who === v }}
              accessibilityLabel={label} style={[s.seg, who === v && s.segOn]}
              onPress={() => { setWho(v); persist({ who: v }); }}>
              <Text style={[s.segT, who === v && s.segTOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
      </View>

      <View style={s.bandRow}>
        <Text style={s.band}>Each person’s pay</Text>
        <Text style={s.bandNum} accessibilityLabel={figSpoken('MK-CF-M-030', pay.grossAnnual)}>
          {figPer('MK-CF-M-030', pay.grossAnnual)}
        </Text>
      </View>

      {wages.map((e, i) => (
        <EarnerSection key={e.key} name={e.name} wage={e.w} onChange={e.set}
          pay={pay.earners[i]?.pay} open={open === e.key}
          onToggle={() => setOpen(open === e.key ? null : e.key)} />
      ))}

      <View style={s.bandRow}>
        <Text style={s.band}>Your household</Text>
        <Text style={s.bandNum}>{`${pay.landsEstimated ? '≈' : ''}${figPer('MK-CF-M-031', pay.landsInBank)}`}</Text>
      </View>
      <View style={s.card}>
        <Row label="Gross /year" note={wages.length > 1 ? 'both wages' : null} value={fig('MK-CF-M-030', pay.grossAnnual)} />
        <Row label="Federal tax bracket"
             note={pay.tax.statusAssumed && wages.length > 1
               ? 'assumed filing jointly — both of you earn'
               : wages.length > 1 ? 'on both wages, filing jointly' : 'what your next dollar costs'}
             value={fig('MK-CF-M-032', pay.tax.bracket)} />
        {/* WHICH ROWS APPEAR FOLLOWS WHOSE FIGURES THEY ARE (mock v6, rule 8e). Entered: their own
            figures read back. Calculated: our row, and the card adds up — gross − tax − 401(k)s =
            take-home, exactly. Mixed: NO tax row — your tax is already inside your entered figure, so
            one line for the household would be a number that explains nothing. */}
        {pay.tax.mode === 'entered' && pay.grossAnnual > 0 && (
          <Row label="Everything else taken out" note="what you entered"
               value={`${figPer('MK-CF-M-036', pay.otherTakenMonthly)} · ${Math.round(pay.tax.rate * 100)}%`} />
        )}
        {pay.tax.mode === 'estimated' && (
          <>
            <Row label="Calculated federal tax" note="assumes you take the standard deduction"
                 value={`≈${figPer('MK-CF-M-033', pay.tax.monthly)}`} />
            {pay.monthly401k > 0 && <Row label="Your 401(k)s" value={figPer('MK-CF-M-034', pay.monthly401k)} />}
          </>
        )}
        <Row label="= Take-home"
             value={`${pay.landsEstimated ? '≈' : ''}${figPer('MK-CF-M-031', pay.landsInBank)}`} strong />
        {pay.landsNote && <Text style={s.landsNote}>{pay.landsNote}</Text>}
                {pay.bandNote && <Text style={s.note}>{pay.bandNote}</Text>}

        {/* A FIGURE IS CORRECTED WHERE IT IS SHOWN (founder rule 8c). The rate could only be changed
            on the Taxes step inside the guided questionnaire, which was itself unreachable. And the
            words "effective tax rate" appear nowhere: TurboTax divides by adjusted gross income, the
            textbook by taxable income, others by total income — a number a person cannot check. We
            ask for the one they can: what their payslip says comes out. */}
        {pay.tax.estimated && pay.landsEstimated && (
          <View style={s.warn}>
            <Text style={s.warnT}>
              <Text style={{ fontWeight: '800' }}>The take-home above is higher than it will really be, by roughly {fig('MK-CF-M-035', pay.tax.shortBy ?? 0)}/month.</Text>{' '}
              Only federal income tax is taken out here. Social Security takes 6.2% of a wage up to {fig('MK-CF-M-045', SS_WAGE_BASE)}/year and Medicare 1.45% of all of it
              (0.9% more above {fig('MK-CF-M-046', MEDICARE_ADDITIONAL_THRESHOLD)}), and your state may take more. If you itemise rather than take the standard deduction, your bill is different again.
            </Text>
          </View>
        )}

        <Text style={s.q}>The tax rate you want us to use</Text>
        <Text style={s.qsub}>
          Everything that comes out, as a share of your gross — from a payslip, add up every deduction except your
          401(k) and divide by the gross. Leave it blank to use the calculated rate.
        </Text>
        <TextInput style={s.input} keyboardType="numeric" accessibilityLabel="The tax rate you want us to use"
          value={op.taxMode === 'manual' && op.manualTaxRate != null ? String(op.manualTaxRate) : ''}
          placeholder={`${pay.tax.whose}`} placeholderTextColor={Colors.textTertiary}
          onChangeText={(v) => store.setOnboardingProfile?.({ ...op, taxMode: v.trim() ? 'manual' : 'system', manualTaxRate: v })} />
        {op.taxMode === 'manual' && !!String(op.manualTaxRate ?? '').trim() && (
          <Text style={s.note}>
            We’ll use {Math.round(pay.tax.rate * 100)}% everywhere your take-home matters — cash flow, budget,
            the surplus. One-time events like a Roth conversion still use the tax tables.
          </Text>
        )}
      </View>

      {frame === 'screen' && (
        <TouchableOpacity accessibilityRole="button" style={[s.cta, !pay.everyFigureAgrees && s.ctaOff]}
          disabled={!pay.everyFigureAgrees} onPress={save} accessibilityLabel="Save your base pay">
          <Text style={s.ctaT}>Save</Text>
        </TouchableOpacity>
      )}
    </Frame>
  );
}

function Row({ label, note, value, strong }: { label: string; note?: string | null; value: string; strong?: boolean }) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowL, strong && s.rowLStrong]}>{label}</Text>
        {note ? <Text style={s.rowNote}>{note}</Text> : null}
      </View>
      <Text style={[s.rowV, strong && s.rowVStrong]}>{value}</Text>
    </View>
  );
}

function EarnerSection({ name, wage, onChange, pay, open, onToggle }: {
  name: string; wage: Record<string, any>; onChange: (u: Record<string, any>) => void;
  pay?: EarnerPay; open: boolean; onToggle: () => void;
}) {
  const freq = String(wage.salaryFreq ?? 'monthly');
  const midName = name === 'Your spouse' ? 'your spouse' : name;   // lowercase mid-sentence (#6)
  const varies = wage.salaryMonthMode === 'months';
  const set = (k: string, v: any) => onChange({ ...wage, [k]: v });
  // Fourteen months, last month to twelve ahead — the window the approved screen asks for, and the
  // reason the table is keyed by month rather than by a slot.
  const keys = useMemo(() => monthWindow(new Date(), 1, 14), []);
  const table = salaryMonths(wage as any);
  const summary = pay
    ? `${FREQ_WORD[freq]} · ${varies ? 'varies' : 'the same each month'} · ${pay.landsIsEstimated ? `take-home ≈${fig('MK-CF-M-031', pay.landsInBank)} (calculated)` : `take-home ${fig('MK-CF-M-031', pay.landsInBank)}`}`
    : FREQ_WORD[freq];

  return (
    <View style={s.section}>
      <TouchableOpacity accessibilityRole="button" style={s.secHead} onPress={onToggle}
        accessibilityLabel={`${name}: ${summary}. ${open ? 'Done' : 'Edit'}`}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.who}>{name}</Text>
            {!open && pay?.verdict.ok && <Text style={s.tick} accessibilityLabel="complete">✓</Text>}
          </View>
          <Text style={s.whoSub}>{summary}</Text>
        </View>
        <Text style={s.chev}>{open ? 'Done ⌃' : 'Edit ⌄'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={s.card}>
          <Text style={s.q}>How often {name === 'You' ? 'you are' : `${midName} is`} paid</Text>
          <View style={s.segRow}>
            {FREQS.map((f) => (
              <TouchableOpacity key={f.k} accessibilityRole="radio" accessibilityState={{ selected: freq === f.k }}
                accessibilityLabel={f.label} style={[s.seg, freq === f.k && s.segOn]}
                onPress={() => set('salaryFreq', f.k)}>
                <Text style={[s.segT, freq === f.k && s.segTOn]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.q}>Is {name === 'You' ? 'your' : `${midName}’s`} pay the same every month?</Text>
          <View style={s.segRow}>
            {([['same', 'The same'], ['months', 'It varies']] as [string, string][]).map(([v, label]) => (
              <TouchableOpacity key={v} accessibilityRole="radio" accessibilityState={{ selected: (varies ? 'months' : 'same') === v }}
                accessibilityLabel={label} style={[s.seg, (varies ? 'months' : 'same') === v && s.segOn]}
                onPress={() => onChange({ ...wage, salaryMonthMode: v, salaryByMonth: v === 'same' ? undefined : wage.salaryByMonth })}>
                <Text style={[s.segT, (varies ? 'months' : 'same') === v && s.segTOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field label={`Gross pay ${PERIOD_WORD[freq]}`}
            hint={varies ? 'A typical one. Every month below starts from this.' : 'Before anything comes out.'}
            value={wage.baseSalary} onChangeText={(v) => set('baseSalary', v)} />

          {varies && (
            <View style={s.grid}>
              {keys.map((k, i) => (
                <View key={k} style={[s.cell, i === 0 && s.cellPast]}>
                  <Text style={s.cellM}>{monthLabel(k)}</Text>
                  <TextInput style={s.cellIn} keyboardType="numeric"
                    accessibilityLabel={`${monthLabel(k)} gross pay`}
                    value={table[k] != null ? String(table[k]) : ''}
                    placeholder={wage.baseSalary ? String(wage.baseSalary) : ''}
                    placeholderTextColor={Colors.textTertiary}
                    onChangeText={(v) => onChange({ ...wage, salaryByMonth: { ...table, [k]: v } })} />
                </View>
              ))}
            </View>
          )}

          <Field label={`Into ${name === 'You' ? 'your' : `${midName}’s`} 401(k) each month`}
            hint={name === 'You' ? 'Your own contribution, not your employer’s match.'
                                 : `${midName}’s own contribution, not their employer’s match.`}
            value={wage.c_401k} onChangeText={(v) => set('c_401k', v)} />

          <Text style={s.q}>{name === 'You' ? 'Your' : `${midName}’s`} employer’s match</Text>
          <Text style={s.qsub}>A share of what they put in, or a flat amount.</Text>
          <View style={s.segRow}>
            {([['pct', '% of theirs'], ['dollar', 'A set amount']] as [string, string][]).map(([v, label]) => (
              <TouchableOpacity key={v} accessibilityRole="radio" accessibilityState={{ selected: (wage.employerMatchMode ?? 'pct') === v }}
                accessibilityLabel={label} style={[s.seg, (wage.employerMatchMode ?? 'pct') === v && s.segOn]}
                onPress={() => set('employerMatchMode', v)}>
                <Text style={[s.segT, (wage.employerMatchMode ?? 'pct') === v && s.segTOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="" value={wage.employerMatchValue} onChangeText={(v) => set('employerMatchValue', v)}
            a11y={`${name} employer match amount`} />

          <Field label={`${name === 'You' ? 'Your' : `${midName}’s`} take-home each month`}
            hint="After tax and everything else taken out of the pay."
            value={wage.landsTypical} onChangeText={(v) => set('landsTypical', v)} />

          {pay && pay.everythingElseMonthly != null && (
            <>
              <Row label="Everything else taken out" value={figPer('MK-CF-M-036', pay.everythingElseMonthly)} />
              <Text style={s.qsub}>
                {Math.round(((pay.everythingElse ?? 0) / (pay.grossAnnualised || 1)) * 100)}% of the gross. Tax,
                medical cover and anything else bought through work — we do not need to ask about each.
              </Text>
            </>
          )}

          {pay && !pay.verdict.ok && (
            <View style={s.warn}><Text style={s.warnT}>{pay.verdict.say}</Text></View>
          )}
        </View>
      )}
    </View>
  );
}

function Field({ label, hint, value, onChangeText, a11y }: {
  label: string; hint?: string; value: any; onChangeText: (v: string) => void; a11y?: string;
}) {
  return (
    <>
      {!!label && <Text style={s.q}>{label}</Text>}
      {!!hint && <Text style={s.qsub}>{hint}</Text>}
      <TextInput style={s.input} keyboardType="numeric" accessibilityLabel={a11y ?? label}
        value={value != null ? String(value) : ''} onChangeText={onChangeText} />
    </>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bgSecondary, padding: Spacing.lg },
  prog: { height: 4, backgroundColor: Colors.bgTertiary, borderRadius: 2, marginBottom: 18 },
  progFill: { width: '55%', height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  back: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10 },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, marginBottom: 6 },
  band: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: Colors.textSecondary, textTransform: 'uppercase', marginTop: 20 },
  bandRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  bandNum: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.base, marginTop: 8, borderWidth: 1, borderColor: Colors.border },
  section: { marginTop: 8 },
  secHead: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border, minHeight: 56 },
  who: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  tick: { fontSize: 13, fontWeight: '800', color: Colors.primaryDark },
  whoSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  chev: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  q: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginTop: 14 },
  qsub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2, lineHeight: 16 },
  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  seg: { flexGrow: 1, minHeight: 44, minWidth: 84, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 10 },
  segOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  segT: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  segTOn: { color: Colors.primaryDark, fontWeight: '800' },
  input: { borderWidth: 1.5, borderColor: Colors.borderStrong, borderRadius: Radii.md, padding: 12, fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, backgroundColor: Colors.bgSecondary, fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  cell: { width: '47%', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.sm, padding: 8 },
  cellPast: { backgroundColor: Colors.bgTertiary },
  cellM: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary },
  cellIn: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, padding: 0, marginTop: 2, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowL: { fontSize: 15, color: Colors.textSecondary },
  rowLStrong: { fontWeight: '800', color: Colors.textPrimary },
  rowNote: { fontSize: 11, color: Colors.textTertiary },
  rowV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  rowVStrong: { fontSize: 17, fontWeight: '800' },
  note: { fontSize: 11, color: Colors.textSecondary, lineHeight: 17, marginTop: 8 },
  landsNote: { fontSize: 13, color: Colors.textPrimary, lineHeight: 18, marginTop: 8, backgroundColor: Colors.bgSecondary, borderLeftWidth: 3, borderLeftColor: Colors.primary, paddingVertical: 6, paddingHorizontal: 10 },
  warn: { backgroundColor: Colors.redLight, borderRadius: Radii.sm, padding: 12, marginTop: 12 },
  warnT: { fontSize: 13, color: Colors.red, lineHeight: 18, fontWeight: '600' },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.md, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  ctaOff: { backgroundColor: Colors.bgTertiary },
  ctaT: { fontSize: 17, fontWeight: '800', color: Colors.white },
});