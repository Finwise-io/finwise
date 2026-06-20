// Shows a one-time recovery code the user must save. We never store the code itself, so this is the
// only time it can be seen — dismissing requires an explicit "I've saved it".
import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';

export function RecoveryCodeModal({ visible, code, onDone }: { visible: boolean; code: string; onDone: () => void }) {
  const [ack, setAck] = useState(false);

  async function share() {
    try { await Share.share({ message: `My FinWise recovery code: ${code}\n\nKeep this safe — it restores your data if you forget your password.` }); }
    catch { /* user dismissed the share sheet */ }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Text style={s.emoji}>🔑</Text>
          <Text style={s.title}>Save your recovery code</Text>
          <Text style={s.body}>
            Your data is encrypted with your password. If you ever forget it, this code is the only way
            to get your data back. Save it somewhere safe — we can't show it again and we can't recover it for you.
          </Text>

          <View style={s.codeBox}>
            <Text style={s.code} accessibilityLabel={`Recovery code ${code.split('').join(' ')}`} selectable>{code}</Text>
          </View>

          <TouchableOpacity style={s.shareBtn} onPress={share} accessibilityRole="button" accessibilityLabel="Share or save recovery code">
            <Text style={s.shareTxt}>Share / save…</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.ackRow} onPress={() => setAck((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: ack }} accessibilityLabel="I've saved my recovery code somewhere safe">
            <View style={[s.box, ack && s.boxOn]}>{ack ? <Text style={s.check}>✓</Text> : null}</View>
            <Text style={s.ackTxt}>I've saved it somewhere safe</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.doneBtn, !ack && { opacity: 0.4 }]}
            disabled={!ack}
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={s.doneTxt}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  card: { width: '100%', maxWidth: 400, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.lg, alignItems: 'center' },
  emoji: { fontSize: 40, marginBottom: Spacing.sm },
  title: { fontSize: Typography.sizes.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm, textAlign: 'center' },
  body: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 20, textAlign: 'center', marginBottom: Spacing.base },
  codeBox: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, alignSelf: 'stretch', marginBottom: Spacing.sm },
  code: { fontSize: 20, fontWeight: '800', letterSpacing: 2, color: Colors.textPrimary, textAlign: 'center', fontFamily: 'monospace' },
  shareBtn: { paddingVertical: Spacing.sm, marginBottom: Spacing.sm },
  shareTxt: { color: Colors.primary, fontWeight: '700', fontSize: Typography.sizes.md },
  ackRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 10, marginBottom: Spacing.base, paddingVertical: 4 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  check: { color: '#fff', fontWeight: '800', fontSize: 14 },
  ackTxt: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.textPrimary },
  doneBtn: { backgroundColor: Colors.primary, borderRadius: Radii.pill, paddingVertical: 14, alignSelf: 'stretch', alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  doneTxt: { color: '#fff', fontWeight: '800', fontSize: Typography.sizes.md },
});
