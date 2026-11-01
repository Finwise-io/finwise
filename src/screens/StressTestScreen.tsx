// Emergency "what if" — stress-test a sudden expense (medical, car, job loss) against your cash:
// can you absorb it, how long would you last, and how big should your emergency fund be?
// Built to MoneyKeel/documents/other/moneykeel_pres_mock_stresstest-mock_v03.html (2026-10-27, DEC-8839), phones A to D.
import { EmptyNote } from '../components/UI';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { fig, figPer, figSaid } from '../components/figure';
import { useRouter } from 'expo-router';
// ONE DOOR (MK-NW-O-004 theEmergencyFund, Q-NW-5 ruled 2026-09-27: "Yes."). The emergency fund on Net
// worth, Job safety and this screen ask one question under three names; they read one answer now.
import { theEmergencyFund } from '../../MoneyKeel/functions/networth-and-performance/emergency-fund';
import { useNetWorthInputs } from '../hooks/useNetWorthInputs';   // the Net worth family's inputs, built once (MK-NW-F-145, DEC-0345)
import { Disclaimer } from '../components/Disclaimer';
import { SectionBand } from '../components/SectionBand';
import TopBar from '../components/TopBar';
import { MoneyBox } from '../components/MoneyBox';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const PRESETS = [
  { label: '🩺 Medical bill', amount: 3000 },
  { label: '🚗 Car repair', amount: 1500 },
  { label: '🦷 Dental', amount: 1200 },
  { label: '💻 New laptop', amount: 1500 },
];

export default function StressTestScreen() {
  const store = useStore() as any;
  const router = useRouter();
  // THE NET WORTH FAMILY'S INPUTS, BUILT ONCE (owner, DEC-0345): MK-NW-F-145 netWorthInputs — the screen no longer picks them out itself
  const nwIn = useNetWorthInputs();
  const cashGuess = theEmergencyFund(nwIn).cash;

  const [cashStr, setCashStr] = useState(cashGuess > 0 ? String(Math.round(cashGuess)) : '');
  const [shockStr, setShockStr] = useState('3000');
  const cash = num(cashStr), shock = num(shockStr);
  // NO CASH ENTERED, NO VERDICT (2026-10-27, FX-CF-C; DEC-0296: "an unknown input produces no number and a reason — never a default";
  // drawing stresstest v03, row 4, phone C): an empty box is not $0. A $0 typed is an answer and gets the verdict.
  const cashEntered = cashStr.trim() !== '';
  // G21 / Q21 / Q47 (2026-09-08): ONE essentials figure (MK-CF-F-190) — logged average first, typed categories only when nothing is logged
  const answer = useMemo(() => theEmergencyFund({ ...nwIn, cashOverride: cash }), [nwIn, cash]);   // the cash the person is trying
  const ess = answer.essentialsMonthly;
  const essLabel = answer.essentialsBasis;
  const hit = answer.afterAShock(shock);
  // RENT FROM A PROPERTY KEEPS ARRIVING (founder, 2026-10-04) — the function counts it, and every
  // sentence below that states months names it, so the months can be followed by hand
  const rent = answer.rentalIncomeMonthly;
  const rentPaysForIt = answer.rentCoversEssentials;
  const rentLine = rent > 0 ? figPer('MK-NW-M-064', rent) : '';   // "$1,000/month", with its identifier
  // NO ESSENTIALS, NO MONTHS AND NO TARGET (2026-10-25, FIX-BUDGET; MK-CF-F-010; drawing stresstest-mock_v02, READ THIS FIRST):
  // the door's months and target are null with $0 of essentials, and this screen turned them back into 0 — "about 0.0 months
  // of essentials" and "✓ You already have at least 3 months". A null stays a null here; each sentence below says so instead.
  const fund3 = answer.targetFor(3);
  const r = { cashAfter: hit.cashAfter, runwayAfter: hit.monthsAfter, coversIt: hit.coversIt,
              monthlyEssentials: ess, jobLossRunway: answer.monthsCovered,
              recommendedFund: fund3?.target ?? null, gapToFund: fund3?.gap ?? null, shock };

  // each figure written once, where several sentences say it (rule 11: the places that print a figure with no identifier only fall)
  const shockWords = fig('MK-MN-M-024', shock);          // "$3,000" — the expense, MK-MN-M-024's own $X
  const leftWords = `You’d have ${money(r.cashAfter)} left`;   // the hit's answer, said once for both sentences below
  const shortWords = money(Math.abs(r.cashAfter));
  const essWords = money(ess);
  const cashWords = money(cash);
  // BEFORE OR AFTER THE EXPENSE, SAID ON EVERY BOX THAT COUNTS THE CASH (his words, 2026-10-27, DEC-8839: "which I am assuming is
  // without accounting for $3K spend. If yes, it should say so."; the lead's ruling R2; drawing stresstest v03, row 2). The
  // expense's own box is titled "After the $3,000 expense"; the two that count the cash before it say so in one plain line.
  const beforeWords = `your cash today, before the ${shockWords} expense.`;
  // THE MONTHS AS NET WORTH WRITES THEM (v03 row 3; tenet 4): one figure, MK-NW-M-013, its one writer, and Net worth's word for it —
  // under 3 months "Tight ⚠" in amber, else "Comfortable ✓" in green. The colour never carries the meaning alone.
  const shownMonths = r.jobLossRunway != null ? Math.round(r.jobLossRunway * 10) / 10 : null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
    {/* DEC-0354: the MoneyKeel bar with ‹ Back (v03 row 5); the navigator's header is off for this route (app/_layout.tsx) */}
    <TopBar back />
    <KeyboardAwareScreen style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>What if…?</Text>
      <Text style={styles.sub}>Test a surprise expense against your cash — see if you can absorb it and how long you’d last.</Text>

      {/* EVERY BOX TITLE ON THE DARK-GREEN BAR, EVERY SUB-TITLE ON THE LIGHT-GREEN BAR (his words, 2026-10-27, DEC-8839; v03 row 1).
          The boxes are square and white so the bars run to their edges, as Income summary's groups. */}
      <View style={styles.card}>
        <SectionBand inCard inset={Spacing.base} onRowEdges title="Your cash and the expense" />
        <SubBand title="Cash you could tap today" first />
        {/* EMPTY MEANS EMPTY (2026-10-31, ST3-01, R16; DEC-0296; stresstest v03, its row of 2026-10-31): a box nobody filled shows no
            figure — the grey "$0" read as cash entered on the first day. A $0 typed is an answer and fills it. */}
        <MoneyBox value={cashStr} onChangeText={setCashStr} a11y="Cash you could tap today" />
        <SubBand title="The surprise expense" />
        <MoneyBox value={shockStr} onChangeText={setShockStr} a11y="The surprise expense" />
        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <TouchableOpacity key={p.label} style={[styles.preset, shock === p.amount && styles.presetOn]} onPress={() => setShockStr(String(p.amount))}>
              <Text style={[styles.presetTxt, shock === p.amount && styles.presetTxtOn]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* the hit — the one box that counts the cash AFTER the expense, and its bar says so */}
      <View style={styles.card}>
        <SectionBand inCard inset={Spacing.base} onRowEdges title={`After the ${shockWords} expense`} />
        {!cashEntered ? (
          <EmptyNote door="accounts" />   /* Q48 (MK-MN-M-024/025): no cash account entered and none typed — no verdict on a $0 nobody entered */
        ) : (
          <>
            <Text style={[styles.vTitle, { color: r.coversIt ? Colors.primaryDark : Colors.red }]}>
              {r.coversIt ? `✓ You could cover a ${shockWords} hit` : `⚠ A ${shockWords} hit would put you ${shortWords} in the red`}
            </Text>
            <Text style={styles.vSub}>
              {r.coversIt
                ? (!rentPaysForIt && r.runwayAfter == null
                  ? `${leftWords}. With ${figPer('MK-MN-M-026', ess)} of essentials there is no count of months to state.`
                  : `${leftWords}${rentPaysForIt ? ', and rent from your property pays for your essentials' : ` — about ${(r.runwayAfter as number).toFixed(1)} months of essentials`} (${essWords}/month — ${essLabel}${rentLine ? (rentPaysForIt ? `; the rent is ${rentLine}` : `, less ${rentLine} rent from your property`) : ''}).`)
                : `You’d need ${shortWords} more to absorb it without borrowing.`}
            </Text>
          </>
        )}
      </View>

      {/* job loss — counted on the cash BEFORE the expense */}
      <View style={styles.card}>
        <SectionBand inCard inset={Spacing.base} onRowEdges title="If you lost your income" />
        {rentPaysForIt ? (
          <Text style={styles.note}>Rent from your property ({rentLine}) pays for your {figPer('MK-MN-M-026', ess)} of essentials ({essLabel}), so your cash would not be drawn on.</Text>
        ) : ess > 0 && shownMonths != null ? (
          <>
            <View style={styles.bigRow}>
              <Text style={[styles.big, { color: shownMonths < 3 ? Colors.amber : Colors.gainText }]}>{fig('MK-NW-M-013', shownMonths)}</Text>
              <Text style={[styles.word, { color: shownMonths < 3 ? Colors.amber : Colors.gainText }]}>{shownMonths < 3 ? 'Tight ⚠' : 'Comfortable ✓'}</Text>
            </View>
            {/* RENT NOT KNOWN (DEC-3836, 2026-10-10 — the DEC-3769 line, carried from Net worth): a property's rent
                is blank or not a plain number, so the months above are counted without it. The same words as Net
                worth, with the same months figure (MK-NW-M-013), and the words open the rent editor on Income. */}
            {answer.rentNotKnown && (
              <TouchableOpacity accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => router.push('/income-manager?open=rental' as any)}
                accessibilityLabel={`${figSaid('MK-NW-M-013', answer.monthsCovered)}, rent not included. Enter rent to include. Opens Income.`}>
                <Text style={styles.note}>{fig('MK-NW-M-013', answer.monthsCovered)}, rent not included. <Text style={{ color: Colors.primary, fontWeight: '700' }}>Enter rent to include.</Text></Text>
              </TouchableOpacity>
            )}
            <Text style={styles.note}>{cashWords} ÷ {rentLine ? `(${essWords}/month − ${rentLine} rent from your property)` : `${essWords}/month`} — {beforeWords}</Text>
            <Text style={styles.note}>Covering your {essWords}/month of essentials ({essLabel}) with no paycheck coming in{rentLine ? `, counting ${rentLine} of rent from your property, which keeps arriving` : ''}. 3–6 months of essentials is the range most planners use.</Text>
          </>
        ) : (
          <>
            <Text style={styles.note}>Your essential expenses come to {figPer('MK-MN-M-026', ess)}.</Text>
            <EmptyNote door="expenses" />   {/* Q48 (MK-MN-M-026) */}
          </>
        )}
      </View>

      {/* emergency fund target — counted on the cash BEFORE the expense */}
      <View style={styles.card}>
        <SectionBand inCard inset={Spacing.base} onRowEdges title="Your emergency fund" />
        {r.gapToFund == null || r.recommendedFund == null ? (
          <Text style={styles.fundTxt}>No target yet: your essentials come to {figPer('MK-MN-M-026', ess)}.</Text>
        ) : (
          <>
            {r.gapToFund > 0 ? (
              <Text style={styles.fundTxt}>3 months of essentials{rent > 0 ? ', less the rent that keeps arriving,' : ''} is <Text style={styles.bold}>{money(r.recommendedFund)}</Text>. You’re <Text style={[styles.bold, { color: Colors.amber }]}>{money(r.gapToFund)}</Text> short of it today — a goal can track it, if you want one.</Text>
            ) : (
              <Text style={styles.fundTxt}>✓ You already have at least 3 months of essentials set aside. A strong emergency fund — some stretch toward 6 months — your call.</Text>
            )}
            <Text style={styles.note}>Measured against {cashWords} — {beforeWords}</Text>
          </>
        )}
      </View>

      {/* P0 (design audit ST-1): the definition every number depends on — body size, never fine print */}
      <Text style={styles.essDef}>“Essentials” are your recurring essential expenses (Critical + Important), not one-time or nice-to-have expenses. A planning estimate.</Text>
      <Disclaimer />
      <View style={{ height: 40 }} />
    </KeyboardAwareScreen>
    </View>
  );
}

/** A SUB-TITLE INSIDE A BOX, ON THE LIGHT-GREEN BAR, edge to edge (DEC-8839; v03 row 1). The band's own inCard pull (−16) is given
 *  back above it; the first one sits right under the dark bar's own 4-point gap, the next 12 points under the box before it. */
function SubBand({ title, first }: { title: string; first?: boolean }) {
  return <View style={{ marginTop: Spacing.base + (first ? Spacing.sm : Spacing.md) }}><SectionBand inCard light inset={Spacing.base} onRowEdges title={title} /></View>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 6, lineHeight: 19 },
  // a banded box: square and white, its bars run to its edges (SectionBand inCard, inset 16) — as Income summary's groups (DEC-0079)
  card: { backgroundColor: Colors.cardBg, padding: Spacing.base, marginTop: 10 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  // rounded corners, not semicircle ends — the one shape of a choice (DEC-0231, 2026-09-25; corrected 2026-10-20)
  preset: { paddingHorizontal: 14, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, minHeight: 44, justifyContent: 'center' },
  presetOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  presetTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  presetTxtOn: { color: Colors.primaryDark },
  vTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  vSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  big: { fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
  word: { fontSize: 13, fontWeight: '800' },
  note: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
  fundTxt: { fontSize: 13, color: Colors.textPrimary, lineHeight: 20, marginTop: 4 },
  bold: { fontWeight: '800' },
  essDef: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 14 },
});
