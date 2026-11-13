// SETTINGS' HOUSEHOLD BOX — delete-account-household v01 (mark 1) and return code v01 (marks 1 to 4), 2026-11-12, cloud copy R13,
// R14, R16. After Security: the owner sees the spouse who shares the household; the member sees whose household it is and the
// door "Make a return code for <owner>"; a solo account sees the one door "Invite your spouse ›", which opens the invite step's card.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Share, ScrollView } from 'react-native';
import { Card } from './UI';
import { SectionBand } from './SectionBand';
import { HouseholdInviteCard } from './HouseholdInviteCard';
import { leaveReturnCode, type HouseholdPeople } from '../services/firebase';
import { useStore } from '../store/useStore';
import { Colors, Typography, Spacing, Radii, Tap } from '../utils/theme';
import { dayWithYear, groupedCode, HOUSEHOLD_CODE_DAYS, DAY_MS } from './householdWords';
import { modalAnimation } from '../hooks/reducedMotion';

/** The other person's first name, as the box and the delete warning say it; a stand-in when no name was stored. */
export function householdOtherName(people: HouseholdPeople | null): string | null {
  if (!people || people.role === 'solo') return null;
  return people.role === 'owner' ? (people.memberName ?? 'Your spouse') : (people.ownerName ?? 'your spouse');
}

const SHARED = 'you both see the same accounts, plans and goals';

export function HouseholdBox({ people }: { people: HouseholdPeople | null }) {
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState<string | null>(() => (useStore.getState() as any).onboardingProfile?.inviteCode ?? null);
  const [ret, setRet] = React.useState<{ code: string; expiresAt: number } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  if (!people) return null;   // not read yet (or offline): no box rather than a wrong one

  const since = (ms: number | null) => (ms != null ? `Since ${dayWithYear(ms)} · ${SHARED}` : `${SHARED.charAt(0).toUpperCase()}${SHARED.slice(1)}`);
  const other = householdOtherName(people) ?? '';

  async function makeReturnCode() {
    if (people?.role !== 'member') return;
    setErr(''); setBusy(true);
    try {
      const code = await leaveReturnCode(people.owner);
      setRet({ code, expiresAt: Date.now() + HOUSEHOLD_CODE_DAYS * DAY_MS });
    } catch {
      setErr('Couldn’t make the return code — check your connection and try again.');
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <SectionBand title="Household" />
      {people.role === 'solo' ? (
        <TouchableOpacity accessibilityRole="button" style={[s.row, { borderBottomWidth: 0 }]} onPress={() => setInviteOpen(true)}>
          <Text style={{ fontSize: 24 }}>✉️</Text>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={s.label}>Invite your spouse</Text>
            <Text style={s.sub}>They’ll see and manage the same accounts, plans and goals as you.</Text>
          </View>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>
      ) : (
        <View style={[s.row, people.role === 'owner' && { borderBottomWidth: 0 }]}>
          <View style={s.avatar}><Text style={s.avatarT}>{other.charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={s.label}>{people.role === 'owner' ? `${other} shares your household` : `You share ${other}’s household`}</Text>
            <Text style={s.sub}>{since(people.joinedAt)}</Text>
          </View>
        </View>
      )}
      {people.role === 'member' && (
        <TouchableOpacity accessibilityRole="button" style={[s.row, { borderBottomWidth: 0 }, busy && { opacity: 0.5 }]} disabled={busy} onPress={makeReturnCode}>
          <Text style={{ fontSize: 24 }}>🔑</Text>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={s.label}>Make a return code for {other}</Text>
            <Text style={s.sub}>If {other} has lost both the password and the recovery code, this code lets {other} back in.</Text>
          </View>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>
      )}
      {!!err && <Text style={[s.sub, { color: Colors.red, marginBottom: Spacing.sm }]}>{err}</Text>}

      {/* Invite your spouse › opens the invite step's own card (invite-and-join v01, phone 1) */}
      <Modal visible={inviteOpen} animationType={modalAnimation()} presentationStyle="pageSheet" onRequestClose={() => setInviteOpen(false)}>
        <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingTop: Spacing.xl, gap: Spacing.base }} style={{ backgroundColor: Colors.bgSecondary }}>
          <Text style={s.sheetTitle}>Invite your spouse (optional)</Text>
          <Text style={s.sheetSub}>They’ll see and manage the same accounts, plans and goals as you.</Text>
          <HouseholdInviteCard code={inviteCode} onCodes={(c) => setInviteCode(c)} />
          <TouchableOpacity accessibilityRole="button" style={s.done} onPress={() => setInviteOpen(false)}>
            <Text style={s.doneT}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {people.role === 'member' && (
        <ReturnCodeSheet visible={!!ret} code={ret?.code ?? ''} expiresAt={ret?.expiresAt ?? 0} ownerName={other} onDone={() => setRet(null)} />
      )}
    </Card>
  );
}

/** Return code v01, state B: the code in the recovery code's box and form, how long it lasts, and that a new one stops this one. */
export function ReturnCodeSheet({ visible, code, expiresAt, ownerName, onDone }: { visible: boolean; code: string; expiresAt: number; ownerName: string; onDone: () => void }) {
  const shown = groupedCode(code);
  const share = () => Share.share({ message: `Your MoneyKeel return code: ${shown}. Enter it after resetting your password, on the screen that asks for the recovery code.` }).catch(() => {});
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={s.backdrop}>
        <View style={s.sheet} accessibilityViewIsModal testID="return-code-sheet">
          <Text style={s.sheetTitle}>Return code for {ownerName}</Text>
          <Text style={s.body}>{ownerName} enters this code after resetting the password, on the screen that asks for the recovery code. The code works once.</Text>
          <View style={s.codeBox}>
            <Text style={s.code} selectable accessibilityLabel={`Return code ${shown.split('').join(' ')}`}>{shown}</Text>
          </View>
          <Text style={[s.body, s.strong]}>The return code lasts 7 days, until {dayWithYear(expiresAt)}.</Text>
          <Text style={s.body}>Give it to {ownerName} yourself: say it, or write it down. Making a new return code stops this one working.</Text>
          <TouchableOpacity accessibilityRole="button" style={s.shareBtn} onPress={share}>
            <Text style={s.shareT}>Share / save…</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={s.done} onPress={onDone}>
            <Text style={s.doneT}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Settings' own rows (SettingsScreen actionRow, actionLabel, actionSub, arrow) and the recovery code's box (RecoveryCodeModal codeBox)
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: Tap.min, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  label: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary },
  sub: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 1 },
  arrow: { fontSize: 20, color: Colors.textTertiary },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  avatarT: { fontSize: 15, fontWeight: '700', color: Colors.white },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  sheet: { width: '100%', maxWidth: 400, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.lg },
  sheetTitle: { fontSize: Typography.sizes.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  sheetSub: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  body: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.sm },
  strong: { color: Colors.textPrimary, fontWeight: '700' },
  codeBox: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, marginBottom: Spacing.sm },
  code: { fontSize: 20, fontWeight: '800', letterSpacing: 2, color: Colors.textPrimary, textAlign: 'center', fontFamily: 'monospace' },
  shareBtn: { paddingVertical: Spacing.md, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  shareT: { color: Colors.primary, fontWeight: '700', fontSize: Typography.sizes.md },
  done: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  doneT: { color: Colors.white, fontWeight: '800', fontSize: Typography.sizes.md },
});
