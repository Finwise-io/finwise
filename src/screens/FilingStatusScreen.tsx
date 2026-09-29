// HOW DO YOU FILE YOUR TAXES? — the question the app never asked.
//
// Built from the approved mock: MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v05.html, frames 4a–4c.
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
import { Colors, Spacing, Radii } from '../utils/theme';
import { taxOwedFor, type FilingStatus } from '../domain/income/tax';
import { taxableAnnual, stateRateOf } from '../domain/income';
import { money } from '../domain/_shared/num';

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

  const gross = useMemo(() => taxableAnnual(op), [op]);
  const state = stateRateOf(op);
  const asSingle = taxOwedFor(gross, 'single', state, 0);
  const asChosen = taxOwedFor(gross, status, state, 0);
  const asChosenBoth65 = taxOwedFor(gross, status, state, 2);

  const iAmOver65 = op.birthYear ? new Date().getFullYear() - Number(op.birthYear) >= 65 : false;

  const save = () => {
    store.setOnboardingProfile?.({ ...op, filingStatus: status, over65Who: over65 ?? undefined });
    if (gross > 0 && status !== 'single' && !shown) { setShown(true); return; }   // 4c, once
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
          <Text style={s.sub}>On the {money(gross)} you entered</Text>
          <View style={s.card}>
            <Row label="Taxed as single" note="what we were assuming" value={`${money(asSingle)}/year`} />
            <Row label={OPTIONS.find((o) => o.v === status)?.label ?? ''} value={`${money(asChosen)}/year`} />
            {status === 'married' && (
              <Row label="…and both of you over 65" value={`${money(asChosenBoth65)}/year`} />
            )}
            <Text style={s.big}>{money((asSingle - asChosen) / 12)}/month more</Text>
            <Text style={s.note}>
              take-home than we were showing you — {money((asSingle - asChosenBoth65) / 12)} if you are
              both over 65. Federal only: it knows nothing about your state.
            </Text>
          </View>
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

      <Text style={s.why}>
        Set to <Text style={s.whyB}>{OPTIONS.find((o) => o.v === suggested)?.label}</Text>
        {partner
          ? ` because you entered about ${partnerName || 'your spouse'}.`
          : ' because you entered it is just you. Change it if that is not right.'}
      </Text>

      {status === 'married' && (
        <>
          <Text style={s.q}>Is either of you 65 or older?</Text>
          <View style={s.segRow}>
            {([['me', 'Just me'], ['both', 'Both of us'], ['neither', 'Neither']] as const).map(([v, label]) => (
              <TouchableOpacity key={v} accessibilityRole="radio" accessibilityState={{ selected: over65 === v }}
                accessibilityLabel={label} style={[s.seg, over65 === v && s.segOn]} onPress={() => onOver65(v)}>
                <Text style={[s.segT, over65 === v && s.segTOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.note}>
            {iAmOver65 ? 'You are 65 or older, so we have you already. ' : ''}
            Being 65 or older adds to your standard deduction — $1,650 each on a joint return. We know
            your age from your birth year; we have never asked about your spouse’s.
          </Text>
        </>
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
  why: { fontSize: 13, color: Colors.textSecondary, marginTop: 14, lineHeight: 19 },
  whyB: { fontWeight: '800', color: Colors.textPrimary },
  q: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginTop: 24 },
  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  seg: { flexGrow: 1, minHeight: 44, minWidth: 90, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, backgroundColor: Colors.cardBg },
  segOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  segT: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  segTOn: { color: Colors.primaryDark, fontWeight: '800' },
  note: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginTop: 10 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.base, marginTop: 8, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowL: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  rowNote: { fontSize: 11, color: Colors.textTertiary },
  rowV: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  big: { fontSize: 24, fontWeight: '800', color: Colors.primaryDark, marginTop: 14, fontVariant: ['tabular-nums'] },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.md, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  ctaT: { fontSize: 17, fontWeight: '800', color: Colors.white },
});
