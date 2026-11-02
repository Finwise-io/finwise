// YOUR BASE PAY — one full screen, one section per earner.
//
// Built from the approved mock: MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html, frames 2a–2e
// — held to it word for word, figure for figure, by src/screens/__tests__/basepay_matches_v07.test.tsx.
//
// ONE COMPONENT, TWO FRAMES (mock rule 2b). Onboarding pushes this same screen with a progress bar
// and Continue; Cash flow → Income opens it with a back arrow and Save. Two copies of the same
// questions is how they come to be asked two different ways.
//
// IT DOES NO ARITHMETIC. Every figure on it comes from MK-CF-O-001 basePay, which is handed one
// entry per earner and gives back both sections and the household block together — so the screen
// cannot show a total built from a different source than the rows above it.
//
// 2026-10-25 (CF-MMFIX-B, the drawing check IN-03 to IN-08, IN-13 to IN-15, IN-19; READ THIS FIRST rows of that day): a typed
// rate is labelled as his and its take-home wears no ≈; the money boxes show "$7,000" and the match its worth; an untyped month
// shows the month the app counts; nothing entered reads "Nothing entered yet." (Q48); sign-up shows the drawn title and no
// household card; the headings are the drawn bands, their totals on the rows' right edge.
//
// 2026-10-26 (FIX-INCOME-A; READ THIS FIRST rows of that day on income-end-to-end_v07): Hourly asks "Hours a week" and, until it
// is filled, says "Hours a week not entered" and counts none of the pay (DEC-0296); every "/month" is a month the wage is paid;
// the bracket note names other income when the band is read on it (DEC-0178).
//
// 2026-10-27 (FX-CF-B, the drawing check IN2-01 to IN2-05): row labels are ink; every money figure is one size, a total bold at
// the rows' size under the drawn rule (DEC-0093) — "Everything else taken out" in an open section is one (phone 5); a question's
// hint is the darker grey and a closed section's line the lighter, as drawn; the month names in the pay table are regular.
import TopBar from '../components/TopBar';
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { basePay, entryFromWage, type EarnerPay, SS_WAGE_BASE, MEDICARE_ADDITIONAL_THRESHOLD } from '../../MoneyKeel/functions/cashflow/base-pay';
import { monthWindow, salaryMonths } from '../domain/income/salary-months';
import { filingStatusOf, over65CountOf } from '../domain/income';
import { fig, figPer, figSaid } from '../components/figure';
import { SectionBand } from '../components/SectionBand';
import { EmptyNote } from '../components/UI';
import { MoneyBox, amountInBox, plainAmount } from '../components/MoneyBox';
import { useIncomeProfile } from '../hooks/useIncomeProfile';
import { payFrequencyOf, PAY_FREQUENCY_NOT_RECOGNISED } from '../domain/income/pay-frequency';   // the one table (R23, 2026-11-01)
import { percentDigits } from '../../MoneyKeel/functions/_figure-spec';   // the one percent writer (R24, 2026-11-01)

type Who = 'you' | 'partner' | 'both';
const FREQS: { k: string; label: string }[] = [
  { k: 'hourly', label: 'Hourly' }, { k: 'weekly', label: 'Weekly' },
  { k: 'biweekly', label: 'Bi-weekly' }, { k: 'monthly', label: 'Monthly' },
];
const FREQ_WORD: Record<string, string> = {
  hourly: 'Hourly', weekly: 'Weekly', biweekly: 'Fortnightly', monthly: 'Monthly', annually: 'Yearly',   // the five of the one table (R23)
};
// A fortnightly earner types a FORTNIGHT's pay. The months below are still months — a fortnightly
// figure typed into a monthly box is the mistake this label prevents (mock 2c).
const PERIOD_WORD: Record<string, string> = {
  hourly: 'an hour', weekly: 'a week', biweekly: 'a fortnight', monthly: 'each month', annually: 'a year',
};
const PAID_WORD: Record<string, string> = { hourly: 'hourly', weekly: 'weekly', biweekly: 'fortnightly' };
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
  // the profile the figures read: the answers being edited, with the year's interest and dividends from the accounts handed in
  // (useIncomeProfile; 2026-10-26, FIX-INCOME-A) — read only: `persist` below saves the answers, never this
  const editing = useMemo(() => ({ ...op, ...mine, whoEarns: who, partnerWage: who === 'you' ? undefined : theirs }), [op, mine, who, theirs]);
  const reading = useIncomeProfile(editing);
  const pay = useMemo(() => basePay({
    earners: wages.map((e) => ({ name: e.name, entry: entryFromWage(e.w) })),
    filingStatus: filingStatusOf(op),
    over65: over65CountOf(op),
    profile: reading,
  }), [wages, op, reading]);

  // WRITE AS THEY GO. Onboarding owns its own Continue and moves on without asking this screen, so
  // anything held in local state until a Save button would be lost the moment the same component is
  // used there. One component, two frames (approved mock rule 2b) only works if the body does not
  // depend on which frame is around it.
  const persist = (next: { who?: Who; mine?: Record<string, any>; theirs?: Record<string, any> }) => {
    const w = next.who ?? who, m = next.mine ?? mine, t = next.theirs ?? theirs;
    store.setOnboardingProfile?.({ ...op, ...m, whoEarns: w, partnerWage: w === 'you' ? undefined : t });
  };
  const save = () => { persist({}); if (onDone) onDone(); else router.back(); };

  const onboarding = frame === 'onboarding';
  // THE RATE IS HIS, OR IT IS OURS (IN-03): a take-home worked from his typed rate is his figures applied, and wears no ≈
  const approx = pay.landsEstimated;
  const Frame: any = onboarding ? View : ScrollView;
  const frameProps = onboarding
    ? { style: { paddingBottom: 8 } }
    : { style: s.wrap, contentContainerStyle: { paddingBottom: 48 },
        keyboardShouldPersistTaps: 'handled' as const, automaticallyAdjustKeyboardInsets: true };
  return (
    <Frame {...frameProps}>
      {onboarding ? null : <TopBar back />}   {/* DEC-0354: the app bar carries the way back */}
      {/* the title in both frames, as phone 8 draws it inside sign-up (IN-07, 2026-10-25) */}
      <Text style={s.h1}>Your base pay</Text>
      <Text style={s.sub}>
        {onboarding
          ? 'Bonus, stocks and other income come next'
          : 'Bonus, stocks and other income are captured separately'}
      </Text>

      <View style={s.group}>
        <SectionBand inCard inset={Spacing.base} onRowEdges title="Who earns a wage?" />
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
      </View>

      {/* one earner: the section is theirs and its own line carries the figure; two: the band totals both — but no total, and no
          household card below, while three figures cannot all be right (phone 7; IN3-02, 2026-10-31; tenet 1): a sum worked from
          figures the warning says disagree is not a figure */}
      <View style={s.group}>
        <SectionBand inCard inset={Spacing.base} onRowEdges
          title={wages.length > 1 ? 'Each person’s pay' : wages[0]?.name === 'You' ? 'Your pay' : `${wages[0]?.name}’s pay`}
          value={wages.length > 1 && pay.everyFigureAgrees && !pay.freqNotRecognised.length ? figPer('MK-CF-M-030', pay.grossAnnual) : undefined}
          valueSaid={wages.length > 1 && pay.everyFigureAgrees && !pay.freqNotRecognised.length ? figSaid('MK-CF-M-030', pay.grossAnnual) : undefined} />
        {wages.map((e, i) => (
          <EarnerSection key={e.key} name={e.name} wage={e.w} onChange={e.set} frame={frame}
            pay={pay.earners[i]?.pay} approx={!!pay.earners[i]?.approx} entered={!!pay.earners[i]?.entered} rate={pay.tax.rate} waits={!!pay.earners[i]?.waits}
            band={{ on: pay.bandReadOn, add: pay.stillToAdd, state: pay.tax.stateWords, accounts: accountIncomeIn(reading) }}
            open={open === e.key} first={i === 0}
            onToggle={() => setOpen(open === e.key ? null : e.key)} />
        ))}
      </View>

      {/* SIGN-UP DRAWS NO HOUSEHOLD CARD (phone 8; IN-07, 2026-10-25): its Taxes step asks the rate, so asking it here too was the
          question asked twice. Reached from Cash flow, the card is the screen's sum. */}
      {!onboarding && pay.everyFigureAgrees && (
        <View style={s.group}>
          {/* an hourly wage with no hours a week is no number (DEC-0296): the band carries no total and the card says what is missing */}
          <SectionBand inCard light inset={Spacing.base} onRowEdges title="Your household"
            value={pay.hoursNotEntered.length || pay.freqNotRecognised.length ? undefined : `${approx ? '~' : ''}${figPer('MK-CF-M-031', pay.landsInBank)}`}
            valueSaid={pay.hoursNotEntered.length || pay.freqNotRecognised.length ? undefined : `${approx ? 'about ' : ''}${figSaid('MK-CF-M-031', pay.landsInBank)}`} />
          {pay.freqNotRecognised.length ? (
            <View style={s.warn}><Text style={s.warnT}>{PAY_FREQUENCY_NOT_RECOGNISED}</Text></View>
          ) : pay.hoursNotEntered.length ? (
            <View style={s.warn}><Text style={s.warnT}>{hoursMissingSentence(pay.hoursNotEntered[0])}</Text></View>
          ) : pay.nothingEntered ? (
            /* NOTHING ENTERED (Q48, IN-08): the one line and its door, never ≈$0, a 10% bracket or a warning about $0 */
            <EmptyNote door="income" onPress={() => setOpen(wages[0]?.key ?? 'mine')} />
          ) : (
            <HouseholdCard pay={pay} wages={wages.length} op={op} approx={approx}
              onRate={(v) => store.setOnboardingProfile?.({ ...op, taxMode: v.trim() ? 'manual' : 'system', manualTaxRate: v })} />
          )}
        </View>
      )}

      {!onboarding && (
        <TouchableOpacity accessibilityRole="button" style={[s.cta, !pay.everyFigureAgrees && s.ctaOff]}
          disabled={!pay.everyFigureAgrees} onPress={save} accessibilityLabel="Save your base pay">
          <Text style={s.ctaT}>Save</Text>
        </TouchableOpacity>
      )}
    </Frame>
  );
}

/** "Hours a week not entered — your hourly pay is not counted until it is." — the one sentence, in the section and on the card. */
const hoursMissingSentence = (name: string) =>
  `Hours a week not entered — ${name === 'You' ? 'your' : `${name === 'Your spouse' ? 'your spouse' : name}’s`} hourly pay is not counted until it is.`;

/** THE HOUSEHOLD'S CARD — which rows appear follows whose figures they are (mock v6, rule 8e). */
function HouseholdCard({ pay, wages, op, approx, onRate }: {
  pay: ReturnType<typeof basePay>; wages: number; op: Record<string, any>; approx: boolean; onRate: (v: string) => void;
}) {
  const typedRate = op.taxMode === 'manual' && !!String(op.manualTaxRate ?? '').trim();
  return (
    <>
      <Row label="Gross /year" note={wages > 1 ? 'both wages' : null} value={fig('MK-CF-M-030', pay.grossAnnual)} />
      <Row label="Federal tax bracket"
           note={pay.tax.statusAssumed && wages > 1
             ? 'assumed filing jointly — both of you earn'
             : wages > 1 ? (pay.bandOnOtherIncome ? 'on both wages and your other income, filing jointly' : 'on both wages, filing jointly')
             : 'what your next dollar costs'}
           value={fig('MK-CF-M-032', pay.tax.bracket)} />
      {/* Entered: their own figures read back. Calculated: our row, and the card adds up — gross − tax − 401(k)s = take-home,
          exactly. Mixed: NO tax row — your tax is already inside your entered figure, so one line for the household would be a
          number that explains nothing. */}
      {pay.tax.mode === 'entered' && pay.grossAnnual > 0 && (
        <Row label="Everything else taken out" note="what you entered"
             value={`${figPer('MK-CF-M-036', pay.otherTakenMonthly)} · ${fig('MK-CF-M-081', pay.tax.rate)}`} />
      )}
      {pay.tax.mode === 'estimated' && (
        <>
          {/* A TYPED RATE IS HIS, AND THE ROW SAYS SO (2026-10-25, IN-03; tenet 1): "Tax · your rate, 24%", in the Income summary's
              own words (phone 16), never "Calculated federal tax … ≈" for his own 24% */}
          {pay.tax.estimated
            /* a state rate entered is inside it, so it is not "federal" (the lead's ruling, 2026-10-25, MK-CF-M-033 t8; canon row 25) */
            ? <Row label={pay.tax.stateWords ? 'Calculated tax' : 'Calculated federal tax'}
                   note={pay.tax.stateWords ? `federal income tax, plus ${pay.tax.stateWords}; assumes you take the standard deduction` : 'assumes you take the standard deduction'}
                   value={`~${figPer('MK-CF-M-033', pay.tax.monthly)}`} />
            : <Row label="Tax" note={pay.tax.whose} value={figPer('MK-CF-M-033', pay.tax.monthly)} />}
          {pay.monthly401k > 0 && <Row label="Your 401(k)s" value={figPer('MK-CF-M-034', pay.monthly401k)} />}
        </>
      )}
      <Row label="= Take-home" value={`${approx ? '~' : ''}${figPer('MK-CF-M-031', pay.landsInBank)}`} strong pos />
      {pay.landsNote && <Text style={s.landsNote}>{pay.landsNote}</Text>}
      {pay.bandNote && <Text style={s.info}>{pay.bandNote}</Text>}

      {/* only where the whole take-home is ours (frame 2a-ii); a mixed household says it per person instead (2a-iii) */}
      {pay.tax.estimated && pay.tax.mode === 'estimated' && (
        <View style={s.warn}>
          <Text style={s.warnT}>
            <Text style={{ fontWeight: '700' }}>The take-home above is higher than it will really be, by roughly {fig('MK-CF-M-035', pay.tax.shortBy ?? 0)}/month.</Text>{' '}
            {pay.tax.stateWords ? `Only federal income tax and ${pay.tax.stateWords} are taken out here.` : 'Only federal income tax is taken out here.'} Social Security takes 6.2% of a wage up to {fig('MK-CF-M-045', SS_WAGE_BASE)}/year and Medicare 1.45% of all of it
            (0.9% more above {fig('MK-CF-M-046', MEDICARE_ADDITIONAL_THRESHOLD)}){pay.tax.stateWords ? '.' : ', and your state may take more.'} If you itemise rather than take the standard deduction, your bill is different again.
          </Text>
        </View>
      )}

      {/* A FIGURE IS CORRECTED WHERE IT IS SHOWN (founder rule 8c). ASKED ONLY WHERE NOBODY ENTERED A TAKE-HOME (frame 2a-ii).
          The words "effective tax rate" appear nowhere: we ask for what a payslip says comes out. */}
      {pay.tax.mode === 'estimated' && (<>
        <Text style={s.q}>The tax rate you want us to use</Text>
        <Text style={s.qsub}>
          Everything that comes out, as a share of your gross — from a payslip, add up every deduction except your
          401(k) and divide by the gross. Leave it blank to use the calculated rate.
        </Text>
        <TextInput style={s.input} keyboardType="numeric" accessibilityLabel="The tax rate you want us to use"
          value={op.taxMode === 'manual' && op.manualTaxRate != null ? String(op.manualTaxRate) : ''}
          placeholder={`${pay.tax.whose}`} placeholderTextColor={Colors.textTertiary}
          onChangeText={onRate} />
        {typedRate && (
          <Text style={s.info}>
            We’ll use {fig('MK-CF-M-081', pay.tax.rate)} everywhere your take-home matters — cash flow, budget,
            the surplus. One-time events like a Roth conversion still use the tax tables.
          </Text>
        )}
        {typedRate && (
          <Row label="= Take-home" value={figPer('MK-CF-M-031', pay.landsInBank)} strong pos />
        )}
      </>)}
    </>
  );
}

/** A row; `strong` is a total, drawn bold at the rows' size under a rule (.rrow.tot); `pos` is green, as "= Take-home" is drawn. */
function Row({ label, note, value, strong, pos }: { label: string; note?: string | null; value: string; strong?: boolean; pos?: boolean }) {
  return (
    <View style={[s.row, strong && s.rowTot]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowL, strong && s.rowLStrong]}>{label}</Text>
        {note ? <Text style={s.rowNote}>{note}</Text> : null}
      </View>
      {/* "= Take-home" is green, as drawn (IN-15) */}
      <Text style={[s.rowV, strong && s.rowVStrong, pos && s.pos]}>{value}</Text>
    </View>
  );
}

/** What it is for: whether the band holds interest and dividends nobody typed — read from the accounts' records or calculated from
 *  their rates by the one profile (profileWithAccountIncome sets `invBasis` only then) — so the sentence under the take-home can say
 *  so. Null when the interest was typed, or there is none (2026-10-26, CLEANUP-LEFT). */
/* ─ MK-CF-F-285 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * accountIncomeIn
 *
 * Answers ..... Whether the base pay band holds interest and dividends nobody typed — read from the accounts' records or calculated from their rates (the basis profileWithAccountIncome records) — so the sentence under the take-home can say so; it calculates nothing.
 *
 * Called by ... BasePayScreen
 *
 * Numbered by hand 2026-10-26 (PF-TOOLS, the lead's instruction): the scan that issues identifiers reads functions in the
 *               calculation folders only, so this screen helper has no generated record; this one is written by hand in the generated form,
 *               as MK-NW-F-145's is
 * Changed ..... not in git yet (—)
 */
function accountIncomeIn(p: any): 'calculated' | 'records' | null {
  if (!(Number(p?.invAnnual) > 0)) return null;
  return p?.invBasis === 'records' ? 'records' : p?.invBasis === 'calculated' ? 'calculated' : null;
}

function EarnerSection({ name, wage, onChange, pay, approx, entered, rate, band, open, onToggle, frame, waits }: {
  name: string; wage: Record<string, any>; onChange: (u: Record<string, any>) => void;
  pay?: EarnerPay; approx: boolean; entered: boolean; rate: number; open: boolean; onToggle: () => void; frame: 'screen' | 'onboarding'; first: boolean;
  /** this earner's calculated take-home rests on another wage that cannot be read: not worked (R27, 2026-11-02) */
  waits?: boolean;
  /** what the band is read on, what is still to add, and a state rate entered — all from MK-CF-O-001 basePay (F3, t8); and whether
   *  the band holds interest and dividends nobody typed, read from the accounts (2026-10-26) */
  band: { on: number; add: string[]; state: string | null; accounts: 'calculated' | 'records' | null };
}) {
  // "rent, a bonus or a spouse’s wage" — the drawn list, less what is already entered (F3)
  const toAdd = band.add.length > 1 ? `${band.add.slice(0, -1).join(', ')} or ${band.add[band.add.length - 1]}` : band.add[0] ?? '';
  const freq = payFrequencyOf(wage.salaryFreq);   // nothing saved is Monthly, as shown chosen (R23, 2026-11-01)
  const midName = name === 'Your spouse' ? 'your spouse' : name;   // lowercase mid-sentence (#6)
  const isYou = name === 'You';
  // A month table entered before this screen existed carries no mode of its own. It still drives
  // every figure, so the section must show it as "It varies" — otherwise the gross typed here would
  // change nothing (bug B-40, which this screen inherited when the manager's own sheet was retired).
  const varies = wage.salaryMonthMode === 'months'
    || (wage.salaryMonthMode == null && Object.keys(salaryMonths(wage as any)).length > 0);
  const set = (k: string, v: any) => onChange({ ...wage, [k]: v });
  // Fourteen months, last month to twelve ahead — the window the approved screen asks for, and the
  // reason the table is keyed by month rather than by a slot.
  const keys = useMemo(() => monthWindow(new Date(), 1, 14), []);
  const table = salaryMonths(wage as any);
  // the months as typed, keyed by month (an older twelve-slot table is read through salaryMonths instead)
  const rawTable: Record<string, any> | null = wage.salaryByMonth && !Array.isArray(wage.salaryByMonth) && typeof wage.salaryByMonth === 'object'
    ? Object.fromEntries(Object.entries(wage.salaryByMonth).filter(([k]) => /^\d{4}-\d{2}$/.test(k))) : null;
  // The closed line reads back the pattern and the take-home; a take-home is a MONTH, and says so when
  // the person is not paid monthly. Open, the questions below say it, so the line stops at the pattern.
  const pattern = `${FREQ_WORD[freq]} · ${varies ? 'varies' : 'the same each month'}`;
  const perMonthWord = freq === 'monthly' ? '' : '/month';
  const onboarding = frame === 'onboarding';
  // a frequency outside the one table says so and shows no figure (R23, 2026-11-01; dated row on income-end-to-end_v07)
  const summary = pay?.freqNotRecognised && !open ? 'Pay frequency not recognised'
    : pay?.hoursNotEntered && !open ? `${FREQ_WORD[freq]} · hours a week not entered`
    : !pay || !(pay.grossAnnualised > 0) || (onboarding && open) ? 'Tell us how you are paid'
    : open ? pattern
    // the calculated take-home waits for the other wage (R27, 2026-11-02; CF6-15): it read "take-home ~$4,318 (calculated)" on a $0 wage
    : waits ? `${pattern} · take-home not calculated — the other pay cannot be read yet`
    : `${pattern} · ${pay.landsIsEstimated ? `take-home ${approx ? '~' : ''}${fig('MK-CF-M-031', pay.landsInBank)}${perMonthWord} (calculated)` : `take-home ${fig('MK-CF-M-031', pay.landsInBank)}${perMonthWord}`}`;
  const whose = isYou ? 'your' : `${midName}’s`;
  // THE THREE THAT CANNOT ALL BE RIGHT ARE MARKED, AND THEIR GREY LINES GIVE WAY TO THE WARNING (phone 7; IN-19, 2026-10-25)
  const disagree = !!pay && !pay.verdict.ok;
  // phone 6 draws no grey line under the other person's 401(k) and take-home (IN-19)
  const hintsForThem = isYou;
  const matchPct = (wage.employerMatchMode ?? 'pct') === 'pct';
  const matchTyped = String(wage.employerMatchValue ?? '').trim() !== '';
  const matchWorth = pay?.matchMonthly ?? 0;   // its worth from MK-CF-O-001 basePay, never worked here (D1)

  return (
    <View>
      <TouchableOpacity accessibilityRole="button" style={[s.secHead, open && s.secHeadOpen]} onPress={onToggle}
        accessibilityLabel={`${name}: ${summary}. ${open ? 'Done' : 'Edit'}`}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.who}>{name}</Text>
            {/* a tick is a finished section — never one with nothing entered (IN-08) */}
            {!open && entered && pay?.verdict.ok && !pay.hoursNotEntered && !pay.freqNotRecognised && <Text style={s.tick} accessibilityLabel="complete">✓</Text>}
          </View>
          <Text style={s.whoSub}>{summary}</Text>
        </View>
        <Text style={s.chev}>{open ? 'Done ⌃' : 'Edit ⌄'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={s.secBody}>
          <Text style={s.q}>How often {isYou ? 'you are' : `${midName} is`} paid</Text>
          <View style={s.segRow}>
            {FREQS.map((f) => (
              <TouchableOpacity key={f.k} accessibilityRole="radio" accessibilityState={{ selected: freq === f.k }}
                accessibilityLabel={f.label} style={[s.seg, freq === f.k && s.segOn]}
                onPress={() => set('salaryFreq', f.k)}>
                <Text style={[s.segT, freq === f.k && s.segTOn]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {pay?.freqNotRecognised && (
            <View style={s.warn}><Text style={s.warnT}>{PAY_FREQUENCY_NOT_RECOGNISED}</Text></View>
          )}

          <Text style={s.q}>Is {isYou ? 'your' : `${midName}’s`} pay the same every month?</Text>
          <View style={s.segRow}>
            {([['same', 'The same'], ['months', 'It varies']] as [string, string][]).map(([v, label]) => (
              <TouchableOpacity key={v} accessibilityRole="radio" accessibilityState={{ selected: (varies ? 'months' : 'same') === v }}
                accessibilityLabel={label} style={[s.seg, (varies ? 'months' : 'same') === v && s.segOn]}
                onPress={() => onChange({ ...wage, salaryMonthMode: v, salaryByMonth: v === 'same' ? undefined : wage.salaryByMonth })}>
                <Text style={[s.segT, (varies ? 'months' : 'same') === v && s.segTOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* A GROSS NOBODY TYPED SAYS SO (2026-10-24; tenet 3; drawing v07 rule 9, "every estimate is prefixed ≈ and says what
              it cannot see"): a take-home entered before 2026-08-28 had its gross worked back once, and this box showed it as if
              typed — "5475.378787878787". It is written to the cent, says where it came from, and goes once a gross is typed. */}
          {/* a frequency outside the one table has no period to name: "Gross pay" (R23a, 2026-11-01) — it read "Gross undefined" */}
          <Field label={freq === 'monthly' ? 'Gross pay each month' : PERIOD_WORD[freq] ? `Gross ${PERIOD_WORD[freq]}` : 'Gross pay'}
            hint={disagree ? undefined
              : wage.grossWorkedBack ? '~ Worked back from the take-home you entered. Type the gross from a payslip to replace it.'
              : varies ? 'A typical one. Every month below starts from this.'
              : onboarding ? 'Before anything comes out. The only one we need.' : 'Before anything comes out.'}
            value={wage.grossWorkedBack && Number(wage.baseSalary) > 0 ? Number(wage.baseSalary).toFixed(2) : wage.baseSalary}
            bad={disagree}
            onChangeText={(v) => onChange({ ...wage, baseSalary: v, grossWorkedBack: undefined })} />

          {/* HOURS A WEEK, ASKED WHERE AN HOURLY RATE NEEDS THEM (2026-10-26, FIX-INCOME-A; DEC-0296, tenet 3): with none entered the
              pay is no number — never a 40-hour week nobody entered — and the section says so */}
          {freq === 'hourly' && (
            <>
              <Text style={s.q}>Hours a week</Text>
              <Text style={s.qsub}>The hours you are usually paid for.</Text>
              <MoneyBox value={wage.hoursPerWeek} share a11y={`${name} hours a week`} bad={!!pay?.hoursNotEntered}
                onChangeText={(v) => set('hoursPerWeek', v)} />
              {pay?.hoursNotEntered && (
                <View style={s.warn}><Text style={s.warnT}>{hoursMissingSentence(name)}</Text></View>
              )}
            </>
          )}

          {varies && (
            <View style={s.grid}>
              {keys.map((k, i) => {
                // a month is typed when the table holds it; clearing a box takes it out, so it counts as the typical month again
                const typed = k in table;
                const asStored = rawTable ? rawTable[k] : table[k];
                return (
                  <View key={k} style={[s.cell, typed && s.cellTyped]}>
                    <Text style={s.cellM}>{monthLabel(k)}</Text>
                    {/* A MONTH NOT TYPED SHOWS THE MONTH THE APP COUNTS (IN-05, 2026-10-25): the typical gross as a month —
                        $2,077 a fortnight is $4,500 — never "2077", the fortnight figure a monthly box must not hold. Last month
                        is greyed, a typed month marked, as drawn (phone 6). */}
                    {/* every money box, one component (DEC-8385, FX-SHARED 2026-10-27): MoneyBox draws the figure as amountInBox did and
                        refuses a typed letter; the box keeps this table's look */}
                    <MoneyBox bare style={[s.cellIn, i === 0 && s.cellInPast, typed && s.cellInTyped]}
                      a11y={`${monthLabel(k)} gross pay`}
                      value={typed ? (asStored ?? table[k]) : ''}
                      placeholder={pay && pay.typicalMonth > 0 ? fig('MK-CF-M-080', pay.typicalMonth) : ''}
                      placeholderTextColor={i === 0 ? Colors.textTertiary : Colors.textPrimary}
                      onChangeText={(typedNow) => {
                        const next: Record<string, any> = { ...(rawTable ?? table) };
                        if (typedNow === '') delete next[k]; else next[k] = typedNow;
                        onChange({ ...wage, salaryByMonth: next });
                      }} />
                  </View>
                );
              })}
            </View>
          )}

          <Field label={`Into ${isYou ? 'your' : `${midName}’s`} 401(k) each month`}
            hint={disagree || !hintsForThem && !onboarding ? undefined
              : onboarding ? 'Leave blank if you don’t contribute.'
              : 'Your own contribution, not your employer’s match.'}
            value={wage.c_401k} onChangeText={(v) => set('c_401k', v)} />

          <Text style={s.q}>{isYou ? 'Your' : `${midName}’s`} employer’s match</Text>
          <Text style={s.qsub}>A share of what {isYou ? 'you' : 'they'} put in, or a flat amount.</Text>
          <View style={s.segRow}>
            {([['pct', '% of theirs'], ['dollar', 'A set amount']] as [string, string][]).map(([v, label]) => (
              <TouchableOpacity key={v} accessibilityRole="radio" accessibilityState={{ selected: (matchPct ? 'pct' : 'dollar') === v }}
                accessibilityLabel={label} style={[s.seg, (matchPct ? 'pct' : 'dollar') === v && s.segOn]}
                onPress={() => set('employerMatchMode', v)}>
                <Text style={[s.segT, (matchPct ? 'pct' : 'dollar') === v && s.segTOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* THE MATCH SAYS WHAT IT IS WORTH, IN THE BOX (IN-04, 2026-10-25): "50% · $400/month", "$150/month · a set amount" */}
          <MoneyBox value={wage.employerMatchValue} onChangeText={(v) => set('employerMatchValue', v)}
            a11y={`${name} employer match amount`} share={matchPct}
            tail={matchPct
              ? (matchTyped ? `% · ${figPer('MK-CF-M-079', matchWorth)}` : '%')
              : (matchTyped ? '/month · a set amount' : '/month')} />

          <Field label={`${isYou ? 'Your' : `${midName}’s`} take-home each month`}
            hint={disagree || !hintsForThem && !onboarding ? undefined
              : onboarding ? 'Leave blank and we’ll calculate it.'
              : 'After tax and everything else taken out of your pay.'}
            placeholder="optional" bad={disagree}
            value={wage.landsTypical} onChangeText={(v) => set('landsTypical', v)} />

          {/* a take-home is asked for as a MONTH even of someone paid by the fortnight (frame 2c) */}
          {varies && freq !== 'monthly' && (
            <Text style={s.info}>
              The months are shown as months even though {isYou ? 'you are' : `${midName} is`} paid {PAID_WORD[freq]} — a {PAID_WORD[freq]} figure
              typed into a monthly box is the mistake this prevents.
            </Text>
          )}

          {/* nothing entered: say what we will calculate, on what, and what it cannot see (frame 2e) — and with a rate of his own,
              that it is his rate the figure is worked from, not a tax band (IN-03, 2026-10-25) */}
          {pay && pay.landsIsEstimated && pay.grossAnnualised > 0 && !waits && (
            <Text style={s.info}>
              {pay.monthly401k > 0 ? '' : <><Text style={{ fontWeight: '700' }}>Nothing is taken out for a 401(k)</Text>, because you have not entered one. </>}
              {approx ? (
                <>
                  {/* WHAT THE BAND IS READ ON, IN WORDS THAT ARE TRUE (2026-10-26, CLEANUP-LEFT; income-end-to-end_v07 row of that date;
                      tenet 1): the band holds the accounts' interest and dividends, typed or not (useIncomeProfile), so "the $X you have
                      entered" was untrue when part of it was calculated — or read from the accounts' records — and never typed */}
                  {band.accounts ? (
                    <>
                      We’ll calculate ~{fig('MK-CF-M-031', pay.landsInBank)}/month, using your tax band read on <Text style={{ fontWeight: '700' }}>{fig('MK-CF-M-076', band.on)}</Text>
                      {` — what you have entered${toAdd ? ' so far' : ''} and the interest and dividends ${band.accounts === 'records' ? 'from your accounts’ records' : 'calculated from your accounts'}.`}
                      {toAdd ? ` Add ${toAdd} later and the band is calculated again, so this figure moves.` : ''}{' '}
                    </>
                  ) : (
                    <>
                      We’ll calculate ~{fig('MK-CF-M-031', pay.landsInBank)}/month, using your tax band read on
                      the <Text style={{ fontWeight: '700' }}>{fig('MK-CF-M-076', band.on)} you have entered{toAdd ? ' so far' : ''}</Text>
                      {toAdd ? ` — add ${toAdd} later and the band is calculated again, so this figure moves.` : '.'}{' '}
                    </>
                  )}
                  {band.state ? `It holds ${band.state} but knows nothing about your insurance` : 'It knows nothing about your state or your insurance'}, so
                  the ~{fig('MK-CF-M-031', pay.landsInBank)} is higher than it will really be.
                </>
              ) : (
                <>We’ll calculate {fig('MK-CF-M-031', pay.landsInBank)}/month, using the {fig('MK-CF-M-081', rate)} rate you entered.</>
              )}
            </Text>
          )}

          {/* only while the three figures agree — a share worked from figures that cannot all be right is not a figure */}
          {pay && pay.everythingElseMonthly != null && pay.verdict.ok && (
            <>
              {/* a total row, as phone 5 draws it: bold, ink, under the rule (IN2-04, 2026-10-27) — gross less 401(k) less take-home */}
              <Row label="Everything else taken out" value={figPer('MK-CF-M-036', pay.everythingElseMonthly)} strong />
              <Text style={s.info}>
                {/* the share worked once, by MK-CF-O-001 basePay, printed to two decimals (IN3-01, 2026-10-31; Q49) */}
                {percentDigits((pay.everythingElseShare ?? 0), 2)}% of {whose} gross. Tax,
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

function Field({ label, hint, value, onChangeText, a11y, placeholder, bad }: {
  label: string; hint?: string; value: any; onChangeText: (v: string) => void; a11y?: string; placeholder?: string; bad?: boolean;
}) {
  return (
    <>
      {!!label && <Text style={s.q}>{label}</Text>}
      {!!hint && <Text style={s.qsub}>{hint}</Text>}
      {/* the figure as drawn while it is typed — "$7,000" (IN-06); the profile keeps the plain amount */}
      <MoneyBox value={value} onChangeText={onChangeText} a11y={a11y ?? label} placeholder={placeholder} bad={bad} />
    </>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bgSecondary, padding: Spacing.lg },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, marginBottom: 6 },
  // a banded group: square and white, as drawn; its band runs to its edges (SectionBand inCard) — DEC-0079
  group: { backgroundColor: Colors.cardBg, padding: Spacing.base, marginTop: 12 },
  secHead: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: 10, marginHorizontal: -Spacing.base, paddingHorizontal: Spacing.base,
             borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  secHeadOpen: { backgroundColor: Colors.primaryLight },
  secBody: { paddingBottom: 8 },
  who: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  tick: { fontSize: 13, fontWeight: '800', color: Colors.primaryDark },
  whoSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },   // a closed section's line, the lighter grey (IN2-03)
  chev: { fontSize: 13, fontWeight: '800', color: Colors.primary },   // brand green at 800, as drawn (IN-15)
  q: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginTop: 14 },
  qsub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },   // a question's hint, the darker grey (IN2-03)
  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  seg: { flexGrow: 1, minHeight: 44, minWidth: 84, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 10, backgroundColor: Colors.cardBg },
  segOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  segT: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  segTOn: { color: Colors.primaryDark, fontWeight: '800' },
  input: { borderWidth: 1.5, borderColor: Colors.borderStrong, borderRadius: Radii.md, padding: 12, fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, backgroundColor: Colors.cardBg, fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  cell: { width: '47%', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.sm, padding: 8 },
  cellTyped: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  cellM: { fontSize: 11, fontWeight: '400', color: Colors.textTertiary },   // the month's name regular, as drawn (IN2-05)
  cellIn: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, padding: 0, marginTop: 2, fontVariant: ['tabular-nums'] },
  cellInPast: { color: Colors.textTertiary, fontWeight: '400' },
  cellInTyped: { color: Colors.primaryDark },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowL: { fontSize: 15, color: Colors.textPrimary },   // ink, as drawn (IN2-01, 2026-10-27)
  rowLStrong: { fontWeight: '800', color: Colors.textPrimary },
  rowTot: { borderTopWidth: 1.5, borderTopColor: Colors.textPrimary },
  rowNote: { fontSize: 11, color: Colors.textTertiary },
  rowV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  rowVStrong: { fontWeight: '800' },   // every money figure one size (DEC-0093; IN2-02, 2026-10-27: it was 17 beside 15)
  pos: { color: Colors.gainText },
  // the drawing's information box: ink on the blue tint, a blue rule on its left (IN-15)
  info: { fontSize: 11, color: Colors.textPrimary, lineHeight: 17, marginTop: 10, backgroundColor: Colors.blueLight,
          borderLeftWidth: 3, borderLeftColor: Colors.blue, paddingVertical: 8, paddingHorizontal: 10 },
  landsNote: { fontSize: 13, color: Colors.textPrimary, lineHeight: 18, marginTop: 8, backgroundColor: Colors.bgSecondary, borderLeftWidth: 3, borderLeftColor: Colors.primary, paddingVertical: 6, paddingHorizontal: 10 },
  // the drawing's warning: ink on the red tint, a red rule on its left (IN-15)
  warn: { backgroundColor: Colors.redLight, borderLeftWidth: 3, borderLeftColor: Colors.red, padding: 12, marginTop: 12 },
  warnT: { fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.md, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  ctaOff: { backgroundColor: Colors.bgTertiary },
  ctaT: { fontSize: 17, fontWeight: '800', color: Colors.white },
});
