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

const OPTIONS: { v: FilingStatus; label: string }[] = [
  { v: 'single', label: 'Single' },
  { v: 'married', label: 'Married filing jointly' },
  { v: 'mfs', label: 'Married filing separately' },
  { v: 'hoh', label: 'Head of household' },
];

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
  const [over65, setOver65] = useState<'me' | 'both' | 'neither' | null>(op.over65Who ?? null);
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

  const iAmOver65 = op.birthYear ? new Date().getFullYear() - Number(op.birthYear) >= 65 : false;

  const save = () => {
    store.setOnboardingProfile?.({ ...op, filingStatus: status, over65Who: over65 ?? undefined });
    // 4c, once — whenever the answer changes the status and the take-home with it, up or down
    if (gross > 0 && status !== before.status && change !== 0 && !shown) { setShown(true); return; }
    if (onDone) onDone(); else router.back();
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      {frame === 'onboarding'
        ? <View style={s.prog}><View style={s.progFill} /></View>
        : (
          <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} accessibilityLabel="Back">
            <Text style={s.back}>‹ Back</Text>
          </TouchableOpacity>
        )}

      {!shown ? (
        <FilingStatusQuestions
          op={op} status={status} onStatus={setStatus} over65={over65} onOver65={setOver65} />
      ) : (
        /* 4c — shown once, right after the answer, so the question feels worth having answered. */
        <>
          <Text style={s.h1}>That changes your take-home</Text>
          <Text style={s.sub}>On the {money(gross)} you entered{taxed < gross ? ', less your 401(k)' : ''}</Text>
          <View style={s.card}>
            <Row label={`Taxed as ${beforeWord}`} value={`${money(asBefore)}/year — what we were assuming`} />
            <Row label={OPTIONS.find((o) => o.v === status)?.label ?? ''} value={`${money(asChosen)}/year`} />
            {status === 'married' && (
              <Row label="…and both of you over 65" value={`${money(asChosenBoth65)}/year`} />
            )}
            {/* the pre-answer box, as drawn (phone 15; IN-15, 2026-10-25) */}
            <View style={s.pre}>
              <Text style={s.big}>{money(Math.abs(change))}/month {moreLess(change)}</Text>
              {/* "if you are both over 65" goes with its row, which only a joint return has; it says "more" or "less" itself only
                  where its direction is not the line's above */}
              <Text style={s.preT}>
                take-home than we were showing you{status === 'married'
                  ? ` — ${money(Math.abs(changeBoth65))}${moreLess(changeBoth65) === moreLess(change) ? '' : ` ${moreLess(changeBoth65)}`} if you are both over 65`
                  : ''}.
              </Text>
            </View>
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
  const iAmOver65 = op?.birthYear ? new Date().getFullYear() - Number(op.birthYear) >= 65 : false;
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

      {OPTIONS.map((o) => (
        <TouchableOpacity key={o.v} accessibilityRole="radio" accessibilityState={{ selected: status === o.v }}
          accessibilityLabel={o.label} style={[s.opt, status === o.v && s.optOn]}
          onPress={() => onStatus(o.v)}>
          <Text style={[s.optT, status === o.v && s.optTOn]}>{o.label}</Text>
        </TouchableOpacity>
      ))}

      {/* the pre-answer box, as drawn (phones 13 and 14; IN-15, 2026-10-25) */}
      <View style={s.pre}>
        <Text style={s.preT}>
          Set to <Text style={s.whyB}>{OPTIONS.find((o) => o.v === setTo)?.label}</Text>{why}
        </Text>
      </View>

      {status === 'married' && (
        <View style={s.group}>
          <SectionBand inCard light inset={Spacing.base} onRowEdges title="Is either of you 65 or older?" />
          <View style={s.segRow}>
            {([['me', 'Just me'], ['both', 'Both of us'], ['neither', 'Neither']] as const).map(([v, label]) => (
              <TouchableOpacity key={v} accessibilityRole="radio" accessibilityState={{ selected: over65 === v }}
                accessibilityLabel={label} style={[s.seg, over65 === v && s.segOn]} onPress={() => onOver65(v)}>
                <Text style={[s.segT, over65 === v && s.segTOn]}>{label}</Text>
                {v === 'me' && iAmOver65 && (
                  <Text style={s.segSub}>You are {new Date().getFullYear() - Number(op.birthYear)}, so we have you already.</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
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

function Row({ label, note, value }: { label: string; note?: string; value: string }) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowL}>{label}</Text>
        {note ? <Text style={s.rowNote}>{note}</Text> : null}
      </View>
      <Text style={s.rowV}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bgSecondary, padding: Spacing.lg },
  prog: { height: 4, backgroundColor: Colors.bgTertiary, borderRadius: 2, marginBottom: 18 },
  progFill: { width: '70%', height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  back: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10 },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, marginBottom: 14 },
  opt: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, marginTop: 8, backgroundColor: Colors.cardBg },
  optOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optT: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  optTOn: { fontWeight: '800', color: Colors.primaryDark },
  // the drawing's boxes (IN-15, 2026-10-25): the pre-answer on the green tint with a green rule; information on the blue tint
  pre: { backgroundColor: Colors.primaryLight, borderLeftWidth: 3, borderLeftColor: Colors.primary, paddingVertical: 9, paddingHorizontal: 11, marginTop: 14 },
  preT: { fontSize: 13, color: Colors.textPrimary, lineHeight: 19 },
  info: { backgroundColor: Colors.blueLight, borderLeftWidth: 3, borderLeftColor: Colors.blue, paddingVertical: 9, paddingHorizontal: 11, marginTop: 10 },
  infoT: { fontSize: 13, color: Colors.textPrimary, lineHeight: 19 },
  group: { backgroundColor: Colors.cardBg, padding: Spacing.base, marginTop: 20 },
  whyB: { fontWeight: '800', color: Colors.textPrimary },
  q: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginTop: 24 },
  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  seg: { flexGrow: 1, minHeight: 44, minWidth: 90, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, backgroundColor: Colors.cardBg },
  segOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  segT: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  segTOn: { color: Colors.primaryDark, fontWeight: '800' },
  note: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginTop: 10 },
  segSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  whoseT: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.base, marginTop: 8, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowL: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  rowNote: { fontSize: 11, color: Colors.textTertiary },
  rowV: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  big: { fontSize: 24, fontWeight: '800', color: Colors.primaryDark, fontVariant: ['tabular-nums'] },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.md, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  ctaT: { fontSize: 17, fontWeight: '800', color: Colors.white },
});
