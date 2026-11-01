// HOW DO YOU FILE YOUR TAXES? — the question the app never asked.
//
// Built from the approved mock: MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html, frames 4a–4c
// (phones 13 to 15) — held to it word for word by src/screens/__tests__/filing_matches_v07.test.tsx.
//
// The code has always read a filing status, found nothing, and fallen back to SINGLE — for everyone,
// including the couple who had just said they have a spouse. Five surfaces depend on it: every
// month's withholding, the effective rate, the Roth conversion, the retirement tax rate, and the
// base-pay estimate. It could be set, but only from deep inside the Tax Organizer, which is not a
// place someone passes through.
//
// PRE-ANSWERED FROM WHAT THEY ALREADY SAID, so most people confirm rather than choose (mock 4a/4b).
// IT DOES NO TAX ARITHMETIC: every figure comes from MK-CF-F-101 taxOwedFor, the one function.
//
// 2026-10-27 (FX-CF-B, the drawing check of 2026-10-27 IN2-10, IN2-11, IN2-13): phone 14 chooses "Just me" for a 67-year-old,
// as drawn — the figures already count them (over65CountOf); the choices are the drawn rows with a dot, the chosen one green,
// and phone 15's figures are the drawn grey lines under each row, the status chosen marked; opened as a screen it carries the
// MoneyKeel bar with ‹ Back (DEC-0354), declared in app/_layout.tsx so the navigator draws no second bar above it.
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { useIncomeProfile } from '../hooks/useIncomeProfile';   // the one profile income figures read (2026-10-26)
import { Colors, Spacing, Radii } from '../utils/theme';
import { taxOwedFor, type FilingStatus } from '../domain/income/tax';
import { taxableAnnual, stateRateOf, filingStatusOf, over65CountOf } from '../domain/income';
import { taxedAfterPreTax } from '../domain/income/tax-rate';   // the income every tax figure reads, the 401(k)s out (B05)
import { incomeSummary } from '../../MoneyKeel/functions/cashflow/income-summary';
import { money } from '../domain/_shared/num';
import { SectionBand } from '../components/SectionBand';
import TopBar from '../components/TopBar';

const OPTIONS: { v: FilingStatus; label: string }[] = [
  { v: 'single', label: 'Single' },
  { v: 'married', label: 'Married filing jointly' },
  { v: 'mfs', label: 'Married filing separately' },
  { v: 'hoh', label: 'Head of household' },
];

/** The person's own age answers the question for them: 65 or older today, by their birth year (the count over65CountOf makes). */
const iAmOver65Of = (op: any): boolean => (op?.birthYear ? new Date().getFullYear() - Number(op.birthYear) >= 65 : false);

/** WHO IS 65 OR OLDER, AS THE QUESTION SHOWS IT (2026-10-27, IN2-10; phone 14): the answer on record, else "Just me" for someone
 *  whose birth year makes them 65 or older — "You are 67, so we have you already." — else nothing chosen, since the spouse's age
 *  has never been asked. It matches the count the take-home already makes with no answer (over65CountOf: the person's own age),
 *  so showing it chosen moves no figure. */
/* ─ MK-CF-F-293 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * over65Shown
 *
 * Answers ..... Who is 65 or older, as the filing question shows it: the answer on record, else "Just me" for someone whose birth year makes them 65 or older, else nothing chosen — the count the take-home already makes, so showing it moves no figure.
 *
 * Formula .....
 *     the answer on record (over65Who)   when there is one
 *     "me"   when this year − the birth year ≥ 65
 *     nothing chosen   otherwise — the spouse's age has never been asked
 *
 * Called by ... FilingStatusScreen · renderStep (sign-up, the filing step)
 *
 * Numbered by hand 2026-10-30 (PF-TOOLS, the lead's instruction): the scan that issues identifiers reads functions in the
 *               calculation folders only, so this screen helper has no generated record; this one is written by hand in the generated form,
 *               as MK-NW-F-145's is
 * Changed ..... not in git yet (—)
 */
export function over65Shown(op: any): 'me' | 'both' | 'neither' | null {
  return (op?.over65Who as 'me' | 'both' | 'neither' | undefined) ?? (iAmOver65Of(op) ? 'me' : null);
}

export default function FilingStatusScreen({ frame = 'screen', onDone }: {
  frame?: 'screen' | 'onboarding'; onDone?: () => void;
}) {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const partner = op.hasPartner === 'yes';
  const partnerName = String(op.partnerName || '').trim();

  // Pre-answered from what they already told us. Never silently — the screen says why.
  const suggested: FilingStatus = partner ? 'married' : 'single';
  const [status, setStatus] = useState<FilingStatus>((op.filingStatus as FilingStatus) ?? suggested);
  const [over65, setOver65] = useState<'me' | 'both' | 'neither' | null>(() => over65Shown(op));
  const [shown, setShown] = useState(false);

  // the figures read the profile with the year's interest and dividends from the accounts (useIncomeProfile; 2026-10-26,
  // FIX-INCOME-A) — the answer is saved on `op`, never on this
  const incomeOp = useIncomeProfile(op);
  const gross = useMemo(() => taxableAnnual(incomeOp), [incomeOp]);
  // THE TAX ON WHAT IS TAXED ONCE THE 401(k)s ARE OUT (2026-10-24, CF-FIX; B05): the take-home this compares against is worked
  // that way, so the difference it shows is the one the take-home really moves by. It taxed the whole of what was entered.
  const taxed = useMemo(() => taxedAfterPreTax(incomeOp), [incomeOp]);
  const state = stateRateOf(op);
  // WHAT THE APP WAS SHOWING, AGAINST WHAT IT WILL SHOW (2026-10-24, Cash flow journey E2E-79; tenet 1). "What we were assuming"
  // is the status in force when this screen opened — the answer on record, or the one the app assumed from what they said
  // (filingStatusOf: a spouse entered is taxed jointly) — and each side counts who is 65 or older as the take-home does
  // (over65CountOf). It compared single, with no one over 65, against the status chosen with no one over 65: a 67-year-old with
  // a spouse, already shown ≈$6,600/month filing jointly, read "Taxed as single $9,650/year — what we were assuming … $328/month
  // more" and the take-home did not move.
  const [before] = useState(() => ({ status: filingStatusOf(op), over65: over65CountOf(op), profile: incomeOp }));
  const beforeWord = (OPTIONS.find((o) => o.v === before.status)?.label ?? 'Single').toLowerCase();
  const asBefore = taxOwedFor(taxed, before.status, state, before.over65);
  const asChosen = taxOwedFor(taxed, status, state, over65CountOf({ ...op, filingStatus: status, over65Who: over65 ?? undefined }));
  const asChosenBoth65 = taxOwedFor(taxed, status, state, 2);
  // THE MONTH'S DIFFERENCE IS THE DIFFERENCE OF THE TWO TAKE-HOMES AS PRINTED (2026-10-24, the lead's ruling on E2E-79; DEC-3523
  // tenet 2: he must be able to see how): Your base pay prints $6,196 and then $6,523, so this says $327 — it said $328, the
  // cent-exact $327.50 rounded. Each take-home is the one the Income summary prints (MK-CF-O-004 incomeSummary), for the profile
  // as it was when this screen opened and as answered. A fall is said too, in the same words with "less" (tenet 1).
  const takeHomeShown = (p: any) => Math.round(incomeSummary(p).lands.usualMonth);
  const shownBefore = takeHomeShown(before.profile);
  const change = takeHomeShown({ ...before.profile, filingStatus: status, over65Who: over65 ?? undefined }) - shownBefore;
  const changeBoth65 = takeHomeShown({ ...before.profile, filingStatus: status, over65Who: 'both' }) - shownBefore;
  const moreLess = (n: number) => (n > 0 ? 'more' : 'less');

  const save = () => {
    // the 65-or-older answer is asked on a joint return only, so it is saved from there; a pre-chosen "Just me" is confirmed by Save
    store.setOnboardingProfile?.({ ...op, filingStatus: status, over65Who: (status === 'married' ? over65 : op.over65Who) ?? undefined });
    // 4c, once — whenever the answer changes the status and the take-home with it, up or down
    if (gross > 0 && status !== before.status && change !== 0 && !shown) { setShown(true); return; }
    if (onDone) onDone(); else router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
    {/* DEC-0354: opened as a screen (the Tax organizer's two doors), the MoneyKeel bar carries the way back (IN2-13, 2026-10-27) */}
    {frame === 'onboarding' ? null : <TopBar back />}
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      {frame === 'onboarding' && <View style={s.prog}><View style={s.progFill} /></View>}

      {!shown ? (
        <FilingStatusQuestions
          op={op} status={status} onStatus={setStatus} over65={over65} onOver65={setOver65} />
      ) : (
        /* 4c — shown once, right after the answer, so the question feels worth having answered. */
        <>
          <Text style={s.h1}>That changes your take-home</Text>
          <Text style={s.sub}>On the {money(gross)} you entered{taxed < gross ? ', less your 401(k)' : ''}</Text>
          {/* THE DRAWN ROWS (phone 15; IN2-11, 2026-10-27): each a dot and its figure as a grey line under it, the status chosen
              marked in green — not a right-hand column of bold figures. What was assumed keeps a grey dot, as drawn. */}
          <View style={s.choices}>
            <Choice label={`Taxed as ${beforeWord}`} line={`${money(asBefore)}/year — what we were assuming`} on={false} was first />
            <Choice label={OPTIONS.find((o) => o.v === status)?.label ?? ''} line={`${money(asChosen)}/year`} on />
            {status === 'married' && (
              <Choice label="…and both of you over 65" line={`${money(asChosenBoth65)}/year`} on={false} />
            )}
          </View>
          {/* the pre-answer box, as drawn (phone 15; IN-15, 2026-10-25): its figure bold inside the sentence, the box's size and ink
              (IN2-11, 2026-10-27 — it stood alone at 24 points in green, off the type scale) */}
          <View style={s.pre}>
            {/* "if you are both over 65" goes with its row, which only a joint return has; it says "more" or "less" itself only
                where its direction is not the line's above */}
            <Text style={s.preT}>
              <Text style={s.whyB}>{money(Math.abs(change))}/month {moreLess(change)}</Text> take-home than we were showing you{status === 'married'
                ? ` — ${money(Math.abs(changeBoth65))}${moreLess(changeBoth65) === moreLess(change) ? '' : ` ${moreLess(changeBoth65)}`} if you are both over 65`
                : ''}.
            </Text>
          </View>
          {/* SAY WHOSE INCOME THE BRACKET CAME FROM (founder, 2026-08-27) — true only while one wage is entered */}
          {(status === 'married' || status === 'mfs') && incomeSummary(op).wages < 2 && (
            <View style={s.info}>
              <Text style={s.whoseT}>Your tax bracket is calculated from your income only.</Text>
              <Text style={s.infoT}>Add your spouse’s income if you want it to be accurate.</Text>
            </View>
          )}
        </>
      )}

      <TouchableOpacity accessibilityRole="button" style={s.cta} onPress={save}
        accessibilityLabel={shown ? 'Got it' : frame === 'onboarding' ? 'Continue' : 'Save'}>
        <Text style={s.ctaT}>{shown ? 'Got it' : frame === 'onboarding' ? 'Continue' : 'Save'}</Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
}


/** THE QUESTION ITSELF — rendered by this screen and by the onboarding step, so it is asked one way.
 *  Onboarding supplies its own Continue footer, so this renders no button of its own. */
export function FilingStatusQuestions({ op, status, onStatus, over65, onOver65 }: {
  op: any; status: FilingStatus; onStatus: (v: FilingStatus) => void;
  over65: 'me' | 'both' | 'neither' | null; onOver65: (v: 'me' | 'both' | 'neither') => void;
}) {
  const partner = op?.hasPartner === 'yes';
  const partnerName = String(op?.partnerName || '').trim();
  const suggested: FilingStatus = partner ? 'married' : 'single';
  const iAmOver65 = iAmOver65Of(op);
  // THE SENTENCE SAYS WHAT IS TRUE OF WHAT WAS ENTERED (2026-10-25, CF-MMFIX-B; drawing check IN-17; tenet 1). It said "because
  // you entered it is just you" to someone who had entered nothing (opened from the Tax organizer), and "Set to Single" beside an
  // answer of Head of household already on record. The drawn sentences (phones 13 and 14) stand wherever they are true.
  const onRecord = (op?.filingStatus as FilingStatus | undefined) ?? undefined;
  const setTo: FilingStatus = onRecord ?? suggested;
  const why = onRecord && !(onRecord === suggested && (partner || op?.hasPartner === 'no'))
    ? ' because you entered it.'
    : partner ? ` because you entered ${partnerName || 'a spouse'}.`
    : op?.hasPartner === 'no' ? ' because you entered it is just you. Change it if that is not right.'
    : ' because you have not entered a spouse. Change it if that is not right.';
  return (
    <>
      <Text style={s.h1}>How do you file your taxes?</Text>
      <Text style={s.sub}>It decides your tax bands, so every take-home figure depends on it.</Text>

      {/* the drawn rows, each with a dot, the chosen one green (phones 13 and 14; IN2-11, 2026-10-27) */}
      <View style={s.choices}>
        {OPTIONS.map((o, i) => (
          <Choice key={o.v} label={o.label} on={status === o.v} first={i === 0} onPress={() => onStatus(o.v)} />
        ))}
      </View>

      {/* the pre-answer box, as drawn (phones 13 and 14; IN-15, 2026-10-25) */}
      <View style={s.pre}>
        <Text style={s.preT}>
          Set to <Text style={s.whyB}>{OPTIONS.find((o) => o.v === setTo)?.label}</Text>{why}
        </Text>
      </View>

      {status === 'married' && (
        <View style={s.group}>
          <SectionBand inCard light inset={Spacing.base} onRowEdges title="Is either of you 65 or older?" />
          {/* "Just me" is chosen for someone 65 or older with no answer yet, as phone 14 draws it (over65Shown, IN2-10) */}
          {([['me', 'Just me'], ['both', 'Both of us'], ['neither', 'Neither']] as const).map(([v, label], i) => (
            <Choice key={v} label={label} on={over65 === v} first={i === 0} onPress={() => onOver65(v)}
              line={v === 'me' && iAmOver65 ? `You are ${new Date().getFullYear() - Number(op.birthYear)}, so we have you already.` : undefined} />
          ))}
          <View style={s.info}>
            <Text style={s.infoT}>
              Being 65 or older adds to your standard deduction — $1,650 each on a joint return. We know
              your age from your birth year; we have never asked about {partnerName ? `${partnerName}’s` : 'your spouse’s'}.
            </Text>
          </View>
        </View>
      )}
    </>
  );
}

/** ONE DRAWN CHOICE (phones 13 to 15): a dot, the label, and a grey line under it when there is one; chosen, the dot fills and the
 *  label turns green. `was` is phone 15's "what we were assuming" row, its dot grey. A row with no onPress is read, not tapped. */
function Choice({ label, line, on, first, was, onPress }: {
  label: string; line?: string; on: boolean; first?: boolean; was?: boolean; onPress?: () => void;
}) {
  const body = (
    <>
      <View style={[s.dot, was && s.dotWas, on && s.dotOn]}>{on && <View style={s.dotIn} />}</View>
      <View style={{ flex: 1 }}>
        <Text style={[s.optT, on && s.optTOn]}>{label}</Text>
        {line ? <Text style={s.optLine}>{line}</Text> : null}
      </View>
    </>
  );
  return onPress ? (
    <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={label}
      style={[s.opt, first && s.optFirst]} onPress={onPress}>{body}</TouchableOpacity>
  ) : (
    <View style={[s.opt, first && s.optFirst]} accessibilityLabel={`${label}${line ? `, ${line}` : ''}${on ? ', chosen' : ''}`}>{body}</View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bgSecondary, padding: Spacing.lg },
  prog: { height: 4, backgroundColor: Colors.bgTertiary, borderRadius: 2, marginBottom: 18 },
  progFill: { width: '70%', height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, marginBottom: 14 },
  // the drawn choices (IN2-11, 2026-10-27): rows in one white card, a hairline between them, a dot before each label
  choices: { backgroundColor: Colors.cardBg, paddingHorizontal: Spacing.base },
  opt: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: 48, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  optFirst: { borderTopWidth: 0 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.borderStrong, marginTop: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cardBg },
  dotWas: { borderColor: Colors.textTertiary },
  dotOn: { borderColor: Colors.primary },
  dotIn: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  optT: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  optTOn: { color: Colors.primaryDark },
  optLine: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  // the drawing's boxes (IN-15, 2026-10-25): the pre-answer on the green tint with a green rule; information on the blue tint
  pre: { backgroundColor: Colors.primaryLight, borderLeftWidth: 3, borderLeftColor: Colors.primary, paddingVertical: 9, paddingHorizontal: 11, marginTop: 14 },
  preT: { fontSize: 13, color: Colors.textPrimary, lineHeight: 19 },
  info: { backgroundColor: Colors.blueLight, borderLeftWidth: 3, borderLeftColor: Colors.blue, paddingVertical: 9, paddingHorizontal: 11, marginTop: 10 },
  infoT: { fontSize: 13, color: Colors.textPrimary, lineHeight: 19 },
  group: { backgroundColor: Colors.cardBg, padding: Spacing.base, marginTop: 20 },
  whyB: { fontWeight: '700', color: Colors.textPrimary },   // bold inside a sentence at 700, as drawn (IN3-06, 2026-10-31)
  q: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginTop: 24 },
  note: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginTop: 10 },
  whoseT: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },   // as drawn (IN3-06)
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.md, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  ctaT: { fontSize: 17, fontWeight: '800', color: Colors.white },
});
