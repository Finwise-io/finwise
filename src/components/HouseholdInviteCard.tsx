// THE INVITE STEP'S CARD — invite-and-join v01, phone 1 (2026-11-12, cloud copy R13): the 6-letter invite code AND the one-time
// 20-letter key code, each shared by its own button, how long both last, and that the key code is shown on this screen only.
// One card for setup's step "Invite your spouse" and for Settings' "Invite your spouse ›" (delete-account-household v01, mark 1).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { useStore } from '../store/useStore';
import { createInviteWithKeyCode, withdrawInvite, firstNameOf } from '../services/firebase';
import { Colors, Spacing, Radii, Tap } from '../utils/theme';
import { dayWithYear, groupedCode, HOUSEHOLD_CODE_DAYS, DAY_MS } from './householdWords';

/** The invite already made (the code is kept; the key code never is) and how to keep a new one. */
export interface InviteCardProps {
  code?: string | null;
  onCodes: (code: string, expiresAt: number) => void;
}

export function HouseholdInviteCard({ code, onCodes }: InviteCardProps) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  // the key code lives in this card's memory only, and only until the card closes (mark 6)
  const [made, setMade] = React.useState<{ code: string; keyCode: string; expiresAt: number } | null>(null);

  const shareInvite = (c: string) =>
    Share.share({ message: `Join me on MoneyKeel so we can plan our money together! Get the app, create your account, and enter invite code ${c} on the sign-up screen.` }).catch(() => {});
  const shareKey = (k: string) =>
    Share.share({ message: `My MoneyKeel key code: ${groupedCode(k)}. Enter it beside the invite code on the sign-up screen.` }).catch(() => {});

  const create = async () => {
    setErr('');
    const st = useStore.getState() as any;
    const uid = st.user?.uid;
    if (!uid) { setErr('Create your account first — it holds the plan you two will share.'); return; }
    try {
      setBusy(true);
      if (code) await withdrawInvite(code);   // the first pair stops working
      const out = await createInviteWithKeyCode(st.householdId ?? uid, firstNameOf(st.user?.name ?? null));
      const expiresAt = Date.now() + HOUSEHOLD_CODE_DAYS * DAY_MS;
      setMade({ ...out, expiresAt });
      onCodes(out.code, expiresAt);
    } catch {
      setErr('Couldn’t create the codes — check your connection and try again.');
    } finally { setBusy(false); }
  };

  const shownCode = made?.code ?? code ?? null;
  return (
    <View style={s.card} testID="invite-card">
      {made ? (<>
        <Text style={s.label}>Their invite code</Text>
        <Text style={s.invite}>{made.code}</Text>
        <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" style={s.btn} onPress={() => shareInvite(made.code)}>
          <Text style={s.btnT}>Share the invite code</Text>
        </TouchableOpacity>
        <Text style={[s.label, { marginTop: Spacing.base }]}>Their key code</Text>
        <View style={s.codeBox}>
          <Text style={s.keyCode} selectable accessibilityLabel={`Key code ${made.keyCode.split('').join(' ')}`}>{groupedCode(made.keyCode)}</Text>
        </View>
        <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" style={s.btn} onPress={() => shareKey(made.keyCode)}>
          <Text style={s.btnT}>Share the key code</Text>
        </TouchableOpacity>
        <Text style={s.line}>Send the key code a different way from the invite code: say it, or send it in a second message. The invite code alone opens nothing.</Text>
        <Text style={[s.line, s.strong]}>Both codes last 7 days, until {dayWithYear(made.expiresAt)}.</Text>
        <Text style={s.line}>MoneyKeel shows the key code only on this screen. If it is lost, create the two codes again; the first pair stops working.</Text>
      </>) : shownCode ? (<>
        <Text style={s.label}>Their invite code</Text>
        <Text style={s.invite}>{shownCode}</Text>
        <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" style={s.btn} onPress={() => shareInvite(shownCode)}>
          <Text style={s.btnT}>Share the invite code</Text>
        </TouchableOpacity>
        <Text style={s.line}>The key code was shown once. To see a key code again, create the two codes again.</Text>
        <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" style={[s.btn, busy && { opacity: 0.5 }]} disabled={busy} onPress={create}>
          <Text style={s.btnT}>{busy ? 'Creating…' : 'Create the two codes again'}</Text>
        </TouchableOpacity>
      </>) : (<>
        <Text style={s.note}>We’ll create two codes your spouse enters when they sign up: a 6-letter invite code and a 20-letter key code. Both last 7 days. No email needed.</Text>
        <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" style={[s.btn, busy && { opacity: 0.5 }]} disabled={busy} onPress={create}>
          <Text style={s.btnT}>{busy ? 'Creating…' : '✉️ Create the two codes'}</Text>
        </TouchableOpacity>
      </>)}
      {!!err && <Text style={[s.line, { color: Colors.red }]}>{err}</Text>}
    </View>
  );
}

// setup's own card and its words' sizes (modules.tsx s.note, s.heroLabel, s.addBtn); the key code in the recovery code's own
// box (RecoveryCodeModal codeBox: 20 points, weight 800, fixed-width letters)
const s = StyleSheet.create({
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.base, borderWidth: 0.5, borderColor: Colors.border },
  note: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  label: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, marginBottom: 4 },
  invite: { fontSize: 30, fontWeight: '800', textAlign: 'center', letterSpacing: 6, color: Colors.textPrimary, paddingVertical: 8 },
  codeBox: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, alignSelf: 'stretch' },
  keyCode: { fontSize: 20, fontWeight: '800', letterSpacing: 2, color: Colors.textPrimary, textAlign: 'center', fontFamily: 'monospace' },
  btn: { marginTop: Spacing.sm, alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: Spacing.sm, borderRadius: Radii.md, backgroundColor: Colors.primaryLight },
  btnT: { color: Colors.primary, fontWeight: '700' },
  line: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 18 },
  strong: { color: Colors.textPrimary, fontWeight: '700' },
});
