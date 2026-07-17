// Shows a one-time recovery code the user must save. We never store the code itself, so this is the
// only time it can be seen — dismissing requires an explicit "I've saved it".
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';

export function RecoveryCodeModal({ visible, code, onDone, securing = false }: { visible: boolean; code: string; onDone: () => void; securing?: boolean }) {
  const [ack, setAck] = useState(false);
  // The component stays mounted between signups (it just renders null when hidden), so reset the
  // "I've saved it" checkbox each time it reappears — otherwise a second signup shows it pre-checked.
  useEffect(() => { if (visible) setAck(false); }, [visible]);

  async function share() {
    try { await Share.share({ message: `My MoneyKeel recovery code: ${code}\n\nKeep this safe — it restores your data if you forget your password.` }); }
    catch { /* user dismissed the share sheet */ }
  }

  // Full-screen in-tree overlay (NOT a native <Modal>): a native modal presents a frame AFTER the
  // Stack has navigated to the first onboarding question, so the question flashed first. As an
  // absolutely-positioned View with a high zIndex it paints in the SAME frame → recovery code is first.
  if (!visible) return null;

  return (
    <View style={s.backdrop} accessibilityViewIsModal accessibilityRole="alert" accessibilityLabel="Save your recovery code">
        <View style={s.card}>
          <Text style={s.emoji}>🔑</Text>
          <Text style={s.title}>Save your recovery code</Text>
          <Text style={s.privacy}>🔒 End-to-end encrypted · never sent to AI</Text>
          <Text style={s.body}>
            If you ever forget your password, this code is <Text style={s.bold}>the only way back into your data.</Text>
            {'\n\n'}
            <Text style={s.bold}>Save it now</Text> — in a password manager, or written down somewhere safe.
            {'\n\n'}
            Your data is encrypted so even we can't read it, and it's <Text style={s.bold}>never sent to AI services</Text> — which means <Text style={s.bold}>if you lose both your password and this code, no one (including MoneyKeel) can recover your data.</Text> We'll never ask you for it.
          </Text>

          <View style={s.codeBox}>
            <Text style={s.code} accessibilityLabel={`Recovery code ${code.split('').join(' ')}`} selectable>{code}</Text>
          </View>

          <TouchableOpacity style={s.shareBtn} onPress={share} accessibilityRole="button" accessibilityLabel="Share or save recovery code">
            <Text style={s.shareTxt}>Share / save…</Text>
          </TouchableOpacity>

          {securing ? (
            // Key-wrapping (PBKDF2) runs on the JS thread for several seconds after signup. Rather than
            // a dead checkbox, show an honest "Securing…" state (the native spinner keeps animating
            // through the freeze). Read your code now; the checkbox unlocks the instant it's done.
            <View style={s.securingRow} accessibilityRole="progressbar" accessibilityLabel="Securing your account">
              <ActivityIndicator color={Colors.primary} />
              <Text style={s.securingTxt}>Securing your account… you can read your code while you wait.</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.ackRow} onPress={() => setAck((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: ack }} accessibilityLabel="I've saved my recovery code somewhere safe">
              <View style={[s.box, ack && s.boxOn]}>{ack ? <Text style={s.check}>✓</Text> : null}</View>
              <Text style={s.ackTxt}>I've saved it somewhere safe</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[s.doneBtn, (!ack || securing) && { opacity: 0.4 }]}
            disabled={!ack || securing}
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={s.doneTxt}>Continue</Text>
          </TouchableOpacity>
        </View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999, backgroundColor: Colors.bgSecondary, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  card: { width: '100%', maxWidth: 400, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.lg, alignItems: 'center' },
  emoji: { fontSize: 40, marginBottom: Spacing.sm },
  title: { fontSize: Typography.sizes.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4, textAlign: 'center' },
  privacy: { fontSize: 15, fontWeight: '800', color: Colors.primary, marginBottom: Spacing.sm, textAlign: 'center', letterSpacing: 0.3 },   // B-L1: privacy claim emphasized (larger than body)
  bold: { fontWeight: '800', color: Colors.textPrimary },
  body: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 20, textAlign: 'center', marginBottom: Spacing.base },
  codeBox: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, alignSelf: 'stretch', marginBottom: Spacing.sm },
  code: { fontSize: 20, fontWeight: '800', letterSpacing: 2, color: Colors.textPrimary, textAlign: 'center', fontFamily: 'monospace' },
  shareBtn: { paddingVertical: Spacing.sm, marginBottom: Spacing.sm },
  shareTxt: { color: Colors.primary, fontWeight: '700', fontSize: Typography.sizes.md },
  ackRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 10, marginBottom: Spacing.base, paddingVertical: 4 },
  securingRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 10, marginBottom: Spacing.base, paddingVertical: 4 },
  securingTxt: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  check: { color: '#fff', fontWeight: '800', fontSize: 14 },
  ackTxt: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.textPrimary },
  doneBtn: { backgroundColor: Colors.primary, borderRadius: Radii.pill, paddingVertical: 14, alignSelf: 'stretch', alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  doneTxt: { color: '#fff', fontWeight: '800', fontSize: Typography.sizes.md },
});
