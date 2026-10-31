// YOUR INCOME — every source in one place: what is entered, one line each, and the rest one tap away.
//
// Built from the approved mock: MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html,
// frames 3a to 3d (phones 9 to 12) — held to it word for word by
// src/screens/__tests__/income_manager_matches_v07.test.tsx.
//
// ONE ROUTE, FOUR FRAMES. The list (phone 12) and the three editors it opens — bonus and stock (9),
// rent (10), interest and dividends (11) — are views of this one screen, so a source is edited where
// it is listed and there is no second place to keep in step. The sources the drawing does not draw an
// editor for (self-employment, benefits, support, scholarships, student loans, something else) open
// the question the person was asked when they first picked them, unchanged.
//
// IT DOES NO ARITHMETIC. Which sources are entered and what each line says comes from MK-CF-O-016's
// neighbour theIncomeManager; the December card reads MK-CF-O-004 incomeSummary; what the accounts pay
// comes from MK-CF-F-184 incomeFromAccounts.
//
// 2026-10-27 (FX-CF-B, the drawing check IN2-01 to IN2-03, IN2-05, IN2-06): row labels are ink; every money figure one size, a
// total bold at the rows' size under the drawn rule (DEC-0093); December's row on phone 9 is a plain row with its figure green;
// a hint is the darker grey and a closed line the lighter; phone 11's first sentence is bold, in one box with the second.
import { plural } from '../domain/_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import TopBar from '../components/TopBar';
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { EmptyNote } from '../components/UI';
import { SectionBand } from '../components/SectionBand';
import { MoneyBox } from '../components/MoneyBox';   // the money box as drawn — "$12,000" while it is typed (IN-06, 2026-10-25)
import { fig } from '../components/figure';   // rule 11: a figure prints with its identifier
import { theIncomeManager, incomeSummary, type ManagedSource } from '../../MoneyKeel/functions/cashflow/income-summary';
import { incomeFromAccounts } from '../domain/income/from-accounts';
import { historyCoverage, assetClassOf, EDIT_HISTORY_START } from '../domain/assets';
import { DateLink } from '../components/DateField';   // (DEC-4059c, 2026-10-10)
import { theNetWorth } from '../../MoneyKeel/functions/networth-and-performance/net-worth';
import { RsuEditor, renderStep } from '../onboarding/modules';
import type { StepCtx } from '../onboarding/modules';
import { modalAnimation } from '../hooks/reducedMotion';
import { useNetWorthInputs } from '../hooks/useNetWorthInputs';   // the Net worth family's inputs, built once (MK-NW-F-145, DEC-0345)
import { isoLocalDate, dateShown } from '../domain/_shared/dates';   // dateShown: every stored date in words (MK-ST-F-078)

type View_ = null | ManagedSource['key'] | 'bonus';
const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** The question each undrawn source was first asked with — reused, so it is asked one way. */
const STEP: Partial<Record<ManagedSource['key'], { step: string; title: string }>> = {
  self_employment: { step: 'income_self', title: 'Self-employed / side gig' },
  benefits: { step: 'income_benefits', title: 'Benefits' },
  support: { step: 'income_support', title: 'Child support or alimony' },
  scholarship: { step: 'income_scholarship', title: 'Scholarships, grants, stipend' },
  loans: { step: 'income_loans', title: 'Student loans' },
  other_income: { step: 'income_other', title: 'Something else' },
};

export default function IncomeManagerScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const set = (patch: Record<string, any>) => store.setOnboardingProfile?.({ ...(store.onboardingProfile ?? {}), ...patch });
  const [view, setView] = useState<View_>(null);
  const [jobOpen, setJobOpen] = useState(false);
  // a row on the Cash flow tab opens the source it names
  const { open: openParam } = useLocalSearchParams() as { open?: string };
  React.useEffect(() => {
    // benefits and support open their own questions — the Income tab lists them since 2026-10-25 (incomeSources)
    const to: Record<string, View_> = { bonus: 'bonus', equity: 'bonus', rental: 'rental', self: 'self_employment', dividends: 'investment_income', onetime: 'other_income', benefits: 'benefits', support: 'support' };
    if (openParam && to[openParam]) setView(to[openParam]);
    if (openParam) (router as any).setParams?.({ open: undefined });
  }, [openParam]);

  const m = theIncomeManager(op);
  // a bonus or stock with no job to hang it on is its own row (MK-CF-O-019-C05, 2026-10-25)
  const stockOnly = !m.entered.some((x) => x.key === 'employment') && !!m.bonusAndStock && (m.bonusAndStock.amount > 0 || !!m.bonusAndStock.tail);
  const stockLine = m.bonusAndStock ? [m.bonusAndStock.amount > 0 ? `${fig('MK-CF-M-027', m.bonusAndStock.amount)}/year` : '', m.bonusAndStock.tail].filter(Boolean).join(' ') : '';
  const open = (key: ManagedSource['key']) => {
    if (key === 'employment') router.push('/base-pay' as any);
    else if (key === 'retirement_income') router.push('/monthly-income' as any);
    else setView(key);
  };
  const line = (x: ManagedSource) => [x.lead, `${x.estimated ? '≈' : ''}${fig(x.key === 'employment' ? 'MK-CF-M-031' : 'MK-CF-M-027', x.amount)}${x.per === 'one-time' ? '' : `/${x.per}`}`,
    x.per === 'one-time' ? 'one-time' : '', x.tail].filter(Boolean).join(' ');

  if (view === 'bonus') return <BonusAndStock op={op} set={set} onDone={() => setView(null)} />;
  if (view === 'rental') return <Rent op={op} set={set} onDone={() => setView(null)} />;
  if (view === 'investment_income') return <InterestAndDividends op={op} set={set} onDone={() => setView(null)} />;
  if (view && STEP[view]) return <AskedBefore source={view as ManagedSource['key']} onDone={() => setView(null)} />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
      <TopBar back />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>Your income</Text>
        <Text style={s.sub}>Add anything that changes</Text>

        {/* Q48 on a fresh account: the one line and its door, and no count of no sources (IN-12, 2026-10-25) */}
        {m.entered.length === 0 && (
          <View style={s.group}><EmptyNote door="income" onPress={() => router.push('/base-pay' as any)} /></View>
        )}
        {(m.entered.length > 0 || stockOnly) && (
        <View style={s.group}>
        <SectionBand inCard inset={Spacing.base} onRowEdges title="You entered about" value={plural(m.entered.length + (stockOnly ? 1 : 0), 'source')} />
        {m.entered.map((x) => {
          const isJob = x.key === 'employment';
          const expanded = isJob && jobOpen;
          return (
            <View key={x.key}>
              <TouchableOpacity accessibilityRole="button" style={[s.secHead, expanded && s.secHeadOpen]}
                accessibilityLabel={`${x.title}: ${line(x)}. ${expanded ? 'Done' : 'Edit'}`}
                onPress={() => (isJob ? setJobOpen(!jobOpen) : open(x.key))}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.who}>{x.title}</Text>
                    <Text style={s.tick} accessibilityLabel="entered">✓</Text>
                  </View>
                  <Text style={s.whoSub}>{line(x)}</Text>
                </View>
                <Text style={s.chev}>{expanded ? 'Done ⌃' : 'Edit ⌄'}</Text>
              </TouchableOpacity>
              {/* A JOB HOLDS TWO THINGS — the pay, and what is paid on top of it (frames 2 and 3a). */}
              {expanded && (
                <View style={s.secBody}>
                  <TouchableOpacity accessibilityRole="button" style={s.linkRow} onPress={() => router.push('/base-pay' as any)}>
                    <Text style={s.linkL}>Your base pay</Text><Text style={s.linkV}>›</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" style={s.linkRow} onPress={() => setView('bonus')}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.linkL}>Bonus and stock</Text>
                      <Text style={s.whoSub}>{m.bonusAndStock && m.bonusAndStock.amount > 0
                        ? `${fig('MK-CF-M-027', m.bonusAndStock.amount)}/year ${m.bonusAndStock.tail}` : 'Paid on top of base pay'}</Text>
                    </View>
                    <Text style={s.linkV}>›</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
        {/* STOCK WITH NO JOB IS STILL A SOURCE (2026-10-25, FIX-INCOME-B; the outside review's MK-CF-O-019-C05): vesting that goes on
            after a job ends was on no row — "about 0 sources". Its row opens Bonus and stock, as the job's does. */}
        {stockOnly && (
          <TouchableOpacity accessibilityRole="button" style={s.secHead} onPress={() => setView('bonus')}
            accessibilityLabel={`Bonus and stock: ${stockLine}. Edit`}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.who}>Bonus and stock</Text>
                <Text style={s.tick} accessibilityLabel="entered">✓</Text>
              </View>
              <Text style={s.whoSub}>{stockLine}</Text>
            </View>
            <Text style={s.chev}>Edit ⌄</Text>
          </TouchableOpacity>
        )}
        </View>
        )}

        {m.notEntered.length > 0 && (
          <View style={s.group}>
            <SectionBand inCard light inset={Spacing.base} onRowEdges title="Anything else?" />
            {m.notEntered.map((x) => (
              <TouchableOpacity key={x.key} accessibilityRole="button" style={s.moreRow} onPress={() => open(x.key)}
                accessibilityLabel={`Add ${x.title}`}>
                <Text style={s.moreIcon}>{x.icon}</Text>
                <Text style={s.moreT}>{x.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity accessibilityRole="button" style={s.cta} onPress={() => router.back()} accessibilityLabel="Done">
          <Text style={s.ctaT}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/** The frame every editor shares: the way back, the title, what it is, and Save where the drawing has one. */
function Frame({ title, sub, onDone, save, children }: { title: string; sub: string; onDone: () => void; save?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
      <TopBar back onBack={onDone} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text style={s.h1}>{title}</Text>
        <Text style={s.sub}>{sub}</Text>
        {children}
        {save !== false && (
          <TouchableOpacity accessibilityRole="button" style={s.cta} onPress={onDone} accessibilityLabel={`Save ${title}`}>
            <Text style={s.ctaT}>Save</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

/** DEC-3768c (founder, 2026-10-10): a money field here keeps digits and ONE decimal point as the person types —
 *  "about 2k" can no longer be typed, so a rent figure is always a number. Every field this component serves
 *  is a plain amount (bonus, stock a year, rent, running costs, mortgage payment, interest and dividends), so
 *  the filter applies to all of them. A change that carries a LETTER is refused whole — the field keeps what it
 *  had — because stripping the letters out of "about 2k" would leave "2", the very $2 the decision forbids.
 *  2026-10-25 (IN-06): the box shows the figure as drawn while it is typed — "$12,000" — through the one MoneyBox, which keeps
 *  that filter; the profile still holds the plain amount. */
function Money({ label, hint, value, onChangeText, placeholder, a11y }: { label: string; hint?: string; value: any; onChangeText: (v: string) => void; placeholder?: string; a11y?: string }) {
  return (
    <>
      <Text style={s.q}>{label}</Text>
      {!!hint && <Text style={s.qsub}>{hint}</Text>}
      <MoneyBox value={value} onChangeText={onChangeText} a11y={a11y ?? label} placeholder={placeholder} />
    </>
  );
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <View style={s.segRow}>
      {options.map(([v, label]) => (
        <TouchableOpacity key={v} accessibilityRole="radio" accessibilityState={{ selected: value === v }} accessibilityLabel={label}
          style={[s.seg, value === v && s.segOn]} onPress={() => onChange(v)}>
          <Text style={[s.segT, value === v && s.segTOn]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── 3a · BONUS AND STOCK (phone 9) ───────────────────────────────────────────────────────────────
// A bonus belongs to a person, so it follows base pay's just-me / just-them / both pattern. The
// household's bonus (bonusAnnual, the figure every calculation reads) is kept as the sum of the parts.
function BonusAndStock({ op, set, onDone }: { op: any; set: (p: Record<string, any>) => void; onDone: () => void }) {
  const store = useStore() as any;
  const partner = String(op.partnerName || '').trim() || 'my spouse';
  const couple = op.hasPartner === 'yes' || op.whoEarns === 'both' || op.whoEarns === 'partner';
  const who: 'you' | 'partner' | 'both' = op.bonusWho ?? 'you';
  const mine = op.bonusMine ?? (who !== 'partner' ? op.bonusAnnual : '') ?? '';
  const theirs = op.bonusTheirs ?? (who === 'partner' ? op.bonusAnnual : '') ?? '';
  const write = (w: typeof who, a: any, b: any) => set({
    bonusWho: w, bonusMine: a, bonusTheirs: b,
    bonusAnnual: String((w !== 'partner' ? num(a) : 0) + (w !== 'you' ? num(b) : 0) || ''),
  });
  const month = Number(op.bonusMonth) || 12;
  const [grants, setGrants] = useState(false);
  const dated = Array.isArray(op.rsuGrants) && op.rsuGrants.length > 0;
  const sum = incomeSummary(op, { accounts: store.assetAccounts, transactions: store.transactions });   // the Income summary's own reading
  const ctx: StepCtx = { status: (op.status ?? null) as any, tracks: [] as any, answers: op, setAnswer: (k, v) => set({ [k]: v }) };
  const people: { key: 'you' | 'partner'; band: string; value: any; on: (v: string) => void }[] = [];
  if (who !== 'partner') people.push({ key: 'you', band: 'Your bonus', value: mine, on: (v) => write(who, v, theirs) });
  if (who !== 'you') people.push({ key: 'partner', band: `${partner === 'my spouse' ? 'Your spouse' : partner}’s bonus`, value: theirs, on: (v) => write(who, mine, v) });
  return (
    <Frame title="Bonus and stock" sub="Paid on top of base pay" onDone={onDone}>
      {couple && (
        <View style={s.group}>
          <SectionBand inCard inset={Spacing.base} onRowEdges title="Who gets a bonus?" />
          <Seg value={who} options={[['you', 'Just me'], ['partner', `Just ${partner}`], ['both', 'Both of us']]} onChange={(v) => write(v, mine, theirs)} />
        </View>
      )}
      {people.map((p, i) => (
        <View key={p.key}>
          <View style={s.group}>
            <SectionBand inCard inset={Spacing.base} onRowEdges title={p.band} value={`${fig('MK-CF-M-008', num(p.value))}/year`} />
            <Money label="How much, a year" hint="Before tax. A typical year if it varies." value={p.value} onChangeText={p.on} a11y={`${p.band}, a year`} />
            {i === 0 && (
              <>
                <Text style={s.q}>Which month is it paid?</Text>
                <Text style={s.qsub}>It counts in that month, not spread across the year.</Text>
                <View style={s.segRow}>
                  {MONTHS.map((mo, k) => (
                    <TouchableOpacity key={mo} accessibilityRole="radio" accessibilityState={{ selected: month === k + 1 }} accessibilityLabel={`Paid in ${mo}`}
                      style={[s.month, month === k + 1 && s.segOn]} onPress={() => set({ bonusMonth: k + 1 })}>
                      <Text style={[s.segT, month === k + 1 && s.segTOn]}>{mo}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {dated ? (
                  <>
                    <Text style={s.q}>Stock that vests, a year</Text>
                    <TouchableOpacity accessibilityRole="button" style={s.linkRow} onPress={() => setGrants(true)}
                      accessibilityLabel="Change the grants and their vesting dates">
                      <Text style={s.linkL}>{fig('MK-CF-M-009', sumOfStock(op))}/year, from the grants you entered</Text><Text style={s.linkV}>›</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Money label="Stock that vests, a year" hint="Leave blank if you have none." placeholder={fig('MK-CF-M-009', 0)}
                    value={num(op.rsuShares) * num(op.rsuPrice) || ''} onChangeText={(v) => set({ rsuShares: v, rsuPrice: '1' })} />
                )}
                {/* SHARES ARE NOT MONEY TO SPEND unless sold when they vest (2026-10-25, the lead's ruling, like DEC-0179 and DEC-0198's
                    "does this reach your bank?"); the grants' own editor asks it too. Dated row on income-end-to-end_v07. */}
                {(dated || num(op.rsuShares) * num(op.rsuPrice) > 0) && (
                  <>
                    <Text style={s.q}>Do you sell the shares when they vest?</Text>
                    <Seg value={op.rsuSoldAtVest === 'yes' ? 'yes' : 'no'} options={[['no', 'Keep them'], ['yes', 'Sell them']]} onChange={(v) => set({ rsuSoldAtVest: v })} />
                    <Text style={s.qsub}>{op.rsuSoldAtVest === 'yes'
                      ? 'Sold, they land as money in the month they vest, after tax.'
                      : 'Kept, they are shares, not money to spend. They are still taxed in the year they vest.'}</Text>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      ))}
      {num(op.bonusAnnual) > 0 && sum.lands.standoutMonth && (
        <>
          <View style={s.group}>
            <SectionBand inCard light inset={Spacing.base} onRowEdges title={`${sum.lands.standoutMonth.label} will look different`} />
            {/* ≈ on a month worked with the calculated rate, as the Income summary prints it (IN-03, 2026-10-25) */}
            <Row label={sum.lands.totalLabel.replace(/^= /, '')} value={`${sum.lands.approx ? '≈' : ''}${fig('MK-CF-M-037', sum.lands.usualMonth)}`} />
            {/* a plain row, its month regular and its figure green, as phone 9 draws it (IN2-05, 2026-10-27) */}
            <Row label={sum.lands.standoutMonth.label} note="bonus, after tax" pos
                 value={`${sum.lands.standoutMonth.approx ? '≈' : ''}${fig('MK-CF-M-039', sum.lands.standoutMonth.amount)}`} />
            <Text style={s.info}>
              Cash flow will show that spike where it happens. Spreading it across twelve months would make every month wrong to make one look tidy.
            </Text>
          </View>
        </>
      )}
      <Modal visible={grants} transparent animationType={modalAnimation()} onRequestClose={() => setGrants(false)}>
        <View style={s.sheetWrap}>
          <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: Spacing.lg }} keyboardShouldPersistTaps="handled">
            <RsuEditor ctx={ctx} />
            <TouchableOpacity accessibilityRole="button" style={s.cta} onPress={() => setGrants(false)} accessibilityLabel="Done — your changes save as you type">
              <Text style={s.ctaT}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </Frame>
  );
}
/** What the dated grants come to in a year — read back from the one place it is calculated. */
const sumOfStock = (op: any) => theIncomeManager(op).bonusAndStock ? Math.max(0, (theIncomeManager(op).bonusAndStock as any).amount - num(op.bonusAnnual)) : 0;

// ── 3b · RENT FROM A PROPERTY (phone 10) ─────────────────────────────────────────────────────────
// Two figures, not one: rent received is not income; what is left after running the place is.
function Rent({ op, set, onDone }: { op: any; set: (p: Record<string, any>) => void; onDone: () => void }) {
  const store = useStore() as any;
  const router = useRouter();
  const list: { type?: string; income: any; expenses: any; property_id?: string; mortgage?: any }[] = Array.isArray(op.rentals) && op.rentals.length
    ? op.rentals : [{ income: '', expenses: '' }];   // the old single rent figure is moved into the list by the store (old-rent-migration.ts)
  const write = (i: number, patch: Record<string, any>) => set({ rentals: list.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
  // HIS RULINGS, 2026-10-04. DEC-1924: "mortgage should not costs to run. We should ask to add monthly
  // mortgage payment if any mortgage on second property. And automatically add it to debt." DEC-1925:
  // "no mortgage without property" — so each rent entry says which property in Net worth it is for,
  // and that is also what makes the property a rental rather than a second home (DEC-1926).
  const properties = ((store.assetAccounts ?? []) as any[]).filter((a) => assetClassOf(a) === 'real_estate');
  const nwIn = useNetWorthInputs();   // the family's inputs, built once — never picked out of the store here (DEC-0345)
  const onProperty = theNetWorth(nwIn).mortgageCheck.byProperty;
  const mortgageOn = (id: any) => onProperty.find((p) => p.propertyId === String(id ?? ''))?.mortgage ?? null;
  /** Leaving the screen: a payment typed for a property with no mortgage is added to Debts, on that property. */
  const leave = () => {
    let sent = false;
    for (const r of list) {
      const p = properties.find((a) => String(a.asset_id) === String(r.property_id ?? ''));
      if (!p || !(num(r.mortgage) > 0) || mortgageOn(p.asset_id)) continue;
      // THE BALANCE AND THE RATE ARE NOT ASKED HERE, SO THEY ARE NOT ENTERED — never $0 and 0% (2026-10-25, FIX-INCOME-B; the
      // outside review's part 9-12 measurer; tenet 3, DEC-0296): Net worth reads "Value not entered" and the Debts tab "rate not
      // entered" (rateNotEntered), where they read −$0 and 0.00%. The payment is the one typed.
      store.addLiability?.({ label: `${p.label} mortgage`, debt_type: 'MORTGAGE', remaining_balance: undefined, interest_rate_apr: undefined,
        minimum_monthly_payment: num(r.mortgage), monthly_payment: num(r.mortgage), payment_type: 'installment', property_id: p.asset_id });
      sent = true;
    }
    // the payment lives in Debts from here on, so it is not kept a second time on the rent entry
    if (sent) set({ rentals: list.map((r) => ({ ...r, mortgage: '' })) });
    onDone();
  };
  return (
    <Frame title="Rent from a property" sub="What you keep, after what it costs to run" onDone={leave} save={false}>
      {list.map((r, i) => {
        const keep = num(r.income) - num(r.expenses);
        // NO PROPERTY, NOT RENT (DEC-4059d, 2026-10-10, "10 - approved"): the entry is kept as typed but counted
        // nowhere until it names its property — the question stays amber until it is answered.
        // the one test the counting uses (MK-CF-F-067 rentalList, MK-NW-F-115 liveRent): the entry names a property
        const named = r.property_id != null && String(r.property_id).trim() !== '';
        return (
          <View key={i}>
            <View style={s.group}>
              <SectionBand inCard inset={Spacing.base} onRowEdges title={list.length > 1 ? `Property ${i + 1}` : 'The property'} value={`${fig('MK-CF-M-010', keep)}/month net`} />
              <Money label="Rent you receive each month" value={r.income} onChangeText={(v) => write(i, { income: v })} a11y={`Rent you receive each month, property ${i + 1}`} />
              <Money label="What it costs to run each month" hint="Tax, insurance, repairs, management."
                value={r.expenses} onChangeText={(v) => write(i, { expenses: v })} a11y={`What it costs to run each month, property ${i + 1}`} />
              <Row label="= You keep" value={`${fig('MK-CF-M-010', keep)}/month`} strong pos />
              {/* the figure every other screen uses only once the entry names its property (DEC-4059d, 2026-10-10) */}
              {named && <Text style={s.info}>
                {fig('MK-CF-M-027', keep * 12)}/year. This is the figure every other screen uses
                {num(r.expenses) > 0 ? ` — the rent alone would overstate what reaches you by ${fig('MK-CF-M-027', num(r.expenses))}/month.` : '.'}
              </Text>}
              <Text style={[s.q, !named && { color: Colors.amber }]}>Which property is it?</Text>
              {!named && <Text style={[s.qsub, { color: Colors.amber }]}>Not counted as rent until you pick its property.</Text>}
              {properties.length === 0 ? (
                // (DEC-4059d, 2026-10-10) the door to add one: Add an account, opened on Real estate
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add the property in Net worth first"
                  style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => router.push('/add-account?cls=property' as any)}>
                  <Text style={[s.link, { marginTop: 4 }]}>Add the property in Net worth first ›</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {properties.map((a) => {
                    const on = String(r.property_id ?? '') === String(a.asset_id);
                    return (
                      <TouchableOpacity key={String(a.asset_id)} accessibilityRole="button" accessibilityState={{ selected: on }}
                        accessibilityLabel={`Property ${i + 1} is ${a.label}`} onPress={() => write(i, { property_id: String(a.asset_id) })}
                        style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: Radii.md, borderWidth: 1,
                          borderColor: on ? Colors.primary : Colors.border, backgroundColor: on ? Colors.primaryLight : Colors.bgSecondary }}>
                        <Text style={s.qsub}>{on ? '✓ ' : ''}🏠 {a.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {properties.some((a) => String(a.asset_id) === String(r.property_id ?? '')) && (mortgageOn(r.property_id)
                ? <Text style={s.note}>Its mortgage is in Debts: {mortgageOn(r.property_id)}. It is counted from there, not in the costs above.</Text>
                : <Money label="Monthly mortgage payment on this property, if any" hint="It is added to Debts for you — not to the costs above."
                    value={r.mortgage} onChangeText={(v) => write(i, { mortgage: v })} a11y={`Monthly mortgage payment, property ${i + 1}`} />)}
            </View>
          </View>
        );
      })}
      {/* a filled green button, as drawn (phone 10; IN-15, 2026-10-25) */}
      <TouchableOpacity accessibilityRole="button" style={s.cta}
        onPress={() => set({ rentals: [...list, { type: 'long', income: '', expenses: '' }] })} accessibilityLabel="Add another property">
        <Text style={s.ctaT}>Add another property</Text>
      </TouchableOpacity>
    </Frame>
  );
}

// ── 3c · INTEREST AND DIVIDENDS (phone 11) ───────────────────────────────────────────────────────
// The app holds the accounts, so it shows what they pay and lets the person correct it — and it is
// TAXED BUT NOT SPENDABLE unless they say it reaches their bank (finding B34, founder 2026-08-27).
function InterestAndDividends({ op, set, onDone }: { op: any; set: (p: Record<string, any>) => void; onDone: () => void }) {
  const store = useStore() as any;
  const worked = incomeFromAccounts(store.assetAccounts ?? [], store.transactions ?? []);
  // founder rule 2026-08-04: a "last 12 months" figure can only cover the history each source shared
  const yearStart = new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);
  const coverageNotes = ((store.assetAccounts ?? []) as any[]).filter((a) => a.source === 'connected' || a.source === 'imported')
    .map((a) => ({ a, c: historyCoverage(a, yearStart) })).filter((x) => !!x.c);
  const paid = op.invPaidToBank === 'yes';
  return (
    <Frame title="Interest & dividends" sub="What your savings and investments pay you" onDone={onDone}>
      {worked.lines.length > 0 && (
        <>
          <View style={s.group}>
            <SectionBand inCard inset={Spacing.base} onRowEdges title="From your accounts" value={`${fig('MK-CF-M-066', worked.annual)}/year`} />
            {worked.lines.map((l) => <Row key={l.label} label={l.label} note={l.why} value={fig('MK-CF-M-066', l.annual)} />)}
            <Row label="= We calculate" value={`${fig('MK-CF-M-066', worked.annual)}/year`} strong />
            {!!worked.missing && <Text style={s.note}>{worked.missing}</Text>}
            {coverageNotes.map(({ a, c }: any, i: number) => c.kind === 'unreadable'
              // (DEC-4059c, 2026-10-10) "Say date cannot be read. Edit date." — the account is named, and its date is picked
              ? <Text key={i} style={s.note}>· {a.institution || a.label}: {c.sentence} <DateLink text={EDIT_HISTORY_START} label={`Edit the history start date for ${a.institution || a.label}`}
                  maximumDate={new Date()} onPick={(iso) => store.updateAsset?.(a.asset_id, { history_start_override: iso })} /></Text>
              : <Text key={i} style={s.note}>· {c.sentence}</Text>)}
          </View>
        </>
      )}
      <View style={s.card}>
        <Money label={worked.lines.length > 0 ? 'Change it if that is not right' : 'How much, a year'}
          hint={worked.lines.length > 0 ? 'We only see the accounts you entered.' : 'Interest from savings plus dividends from shares and funds.'}
          placeholder={worked.annual > 0 ? `use ${fig('MK-CF-M-066', worked.annual)}` : undefined}
          value={op.invAnnual ?? ''} onChangeText={(v) => set({ invAnnual: v, invAmount: v, invFreq: 'annual' })} a11y="Interest and dividends, a year" />
      </View>
      <View style={s.group}>
        <SectionBand inCard light inset={Spacing.base} onRowEdges title={paid ? 'This reaches your bank' : 'This does not reach your bank'} />
        {/* one box, its first sentence bold, as phone 11 draws it (IN2-06, 2026-10-27) */}
        <Text style={s.info}>
          <Text style={{ fontWeight: '800' }}>{paid ? 'Interest and dividends are counted as income you are taxed on, and as money you can spend.'
                : 'Interest and dividends are counted as income you are taxed on, not money you can spend.'}</Text>{' '}
          They are normally reinvested where they are earned, so they never reach your bank account. If you actually take them as cash, tell us and we will count them.
        </Text>
        <Seg value={paid ? 'yes' : 'no'} options={[['no', 'Reinvested'], ['yes', 'Paid to my bank']]} onChange={(v) => set({ invPaidToBank: v })} />
      </View>
    </Frame>
  );
}

// ── THE SOURCES THE DRAWING DOES NOT DRAW AN EDITOR FOR ──────────────────────────────────────────
// Each opens the question it was first asked with. "Something else" also holds the one-time payments
// recorded as they arrived (MK-CF-M-012) — the list Cash flow's "Received this month" reads.
function AskedBefore({ source, onDone }: { source: ManagedSource['key']; onDone: () => void }) {
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const ctx: StepCtx = { status: (op.status ?? null) as any, tracks: [] as any, answers: op,
    // the profile as it is NOW, so two answers given by one tap both keep (2026-10-24, E2E-70: a month and its year)
    setAnswer: (k, v) => store.setOnboardingProfile?.({ ...((useStore.getState() as any).onboardingProfile ?? {}), [k]: v }) };
  const [add, setAdd] = useState(false);
  const incomes = store.incomes ?? [];
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
      <TopBar back onBack={onDone} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {renderStep(STEP[source]!.step as any, ctx)}
        {source === 'other_income' && (
          <>
            {/* the box title on the dark bar, edge to edge of its square card (DEC-8839, R1; 2026-10-27) — it was grey capitals */}
            <View style={s.group}>
              <SectionBand inCard inset={Spacing.base} onRowEdges title="One-time payments you recorded" />
              {incomes.length === 0 && <Text style={s.note}>None recorded.</Text>}
              {incomes.map((i: any) => (
                <View key={i.id} style={s.linkRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.linkL}>{i.source || i.type}</Text>
                    <Text style={s.whoSub}>{dateShown(i.date)}{i.notes ? ` · ${i.notes}` : ''}</Text>
                  </View>
                  <Text style={s.rowV}>{fig('MK-CF-M-012', i.amount)}</Text>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete ${i.source || i.type}`} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    onPress={() => Alert.alert('Delete this income?', `${i.source || i.type} · ${fig('MK-CF-M-012', i.amount)}`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => store.deleteIncome(i.id) },
                    ])}><Text style={s.del}>✕</Text></TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add one-time income" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => setAdd(true)}>
                <Text style={s.link}>＋ Add one-time income</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        <TouchableOpacity accessibilityRole="button" style={s.cta} onPress={onDone} accessibilityLabel="Done — your changes save as you type">
          <Text style={s.ctaT}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
      <AddIncome open={add} onClose={() => setAdd(false)}
        onSave={(src, amount) => { store.addIncome?.({ type: 'other', amount, source: src, date: isoLocalDate(new Date()) }); setAdd(false); }} />
    </View>
  );
}

function AddIncome({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (source: string, amount: number) => void }) {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  React.useEffect(() => { if (open) { setSource(''); setAmount(''); } }, [open]);
  return (
    <Modal visible={open} transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={s.scrim} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss" />
        <View style={s.sheet}>
          <Text style={s.who}>Add one-time income</Text>
          <Text style={s.q}>What was it?</Text>
          <TextInput style={s.input} value={source} onChangeText={setSource} placeholder="e.g. Gift, stock sale, freelance" placeholderTextColor={Colors.textTertiary} accessibilityLabel="What was it?" />
          <Text style={s.q}>Amount</Text>
          <MoneyBox bare style={s.input} value={amount} onChangeText={setAmount} placeholder="0" a11y="Amount" />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add" style={[s.cta, (num(amount) <= 0 || !source.trim()) && { opacity: 0.4 }]}
            disabled={num(amount) <= 0 || !source.trim()} onPress={() => onSave(source.trim(), num(amount))}>
            <Text style={s.ctaT}>Add</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Row({ label, note, value, strong, pos }: { label: string; note?: string | null; value: string; strong?: boolean; pos?: boolean }) {
  return (
    <View style={[s.row, strong && s.rowTot]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowL, strong && s.rowLStrong]}>{label}</Text>
        {note ? <Text style={s.rowNote}>{note}</Text> : null}
      </View>
      <Text style={[s.rowV, strong && s.rowVStrong, pos && s.pos]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 48 },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, marginBottom: 6 },
  band: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: Colors.textSecondary, textTransform: 'uppercase', marginTop: 20 },
  bandRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  bandNum: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.base, marginTop: 8, borderWidth: 1, borderColor: Colors.border },
  // a banded group: square and white, as drawn; its band runs to its edges (SectionBand inCard) — DEC-0079 (2026-10-25)
  group: { backgroundColor: Colors.cardBg, padding: Spacing.base, marginTop: 16 },
  secHead: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: 10, marginHorizontal: -Spacing.base, paddingHorizontal: Spacing.base,
             borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  secHeadOpen: { backgroundColor: Colors.primaryLight },
  secBody: { paddingBottom: 4 },
  who: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  tick: { fontSize: 13, fontWeight: '800', color: Colors.primaryDark },
  whoSub: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },   // a closed line, the lighter grey, as drawn (IN2-03)
  chev: { fontSize: 13, fontWeight: '800', color: Colors.primary },   // brand green at 800, as drawn (IN-15)
  linkRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 8 },
  linkL: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  linkV: { fontSize: 17, fontWeight: '700', color: Colors.primaryDark },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  moreIcon: { fontSize: 17, width: 26, textAlign: 'center' },
  moreT: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  q: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginTop: 14 },
  qsub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },   // a hint, the darker grey, as drawn (IN2-03)
  lead: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, lineHeight: 21 },
  input: { borderWidth: 1.5, borderColor: Colors.borderStrong, borderRadius: Radii.md, padding: 12, fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, backgroundColor: Colors.bgSecondary, fontVariant: ['tabular-nums'] },
  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  seg: { flexGrow: 1, minHeight: 44, minWidth: 84, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 10 },
  month: { minHeight: 44, minWidth: 52, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 8 },
  segOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  segT: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  segTOn: { color: Colors.primaryDark, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowL: { fontSize: 15, color: Colors.textPrimary },   // ink, as drawn (IN2-01, 2026-10-27)
  rowLStrong: { fontWeight: '800', color: Colors.textPrimary },
  rowTot: { borderTopWidth: 1.5, borderTopColor: Colors.textPrimary },   // the drawn total row's rule
  rowNote: { fontSize: 11, color: Colors.textTertiary },
  rowV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  rowVStrong: { fontWeight: '800' },   // every money figure one size (DEC-0093; IN2-02: it was 17 beside 15)
  pos: { color: Colors.gainText },   // "= You keep" and the December bonus are green, as drawn (IN-15); "= We calculate" is not
  note: { fontSize: 11, color: Colors.textSecondary, lineHeight: 17, marginTop: 8 },
  // the drawing's information box: ink on the blue tint, a blue rule on its left (IN-15)
  info: { fontSize: 11, color: Colors.textPrimary, lineHeight: 17, marginTop: 10, backgroundColor: Colors.blueLight,
          borderLeftWidth: 3, borderLeftColor: Colors.blue, paddingVertical: 8, paddingHorizontal: 10 },
  link: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 12 },
  del: { fontSize: 17, color: Colors.textSecondary, paddingHorizontal: 8, paddingVertical: 8 },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.md, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  ctaT: { fontSize: 17, fontWeight: '800', color: Colors.white },
  scrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' } as any,
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
  sheetWrap: { flex: 1, backgroundColor: Colors.bgSecondary, paddingTop: 48 },
});
