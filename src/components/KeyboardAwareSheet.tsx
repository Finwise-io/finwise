// THE shared bottom-sheet primitive (Theme 3): a Modal whose content lifts above the keyboard and can
// scroll, so the last field (usually the amount) is never hidden. Screens previously rolled their own
// sheet with a ScrollView but NO KeyboardAvoidingView — that's why the 401(k) amount hid behind the
// keyboard. Every input sheet should use this; drop-in for the old per-screen `Sheet({open,onClose,title})`.
import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Colors, Radii, Spacing } from '../utils/theme';

export function KeyboardAwareSheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
          <ScrollView style={{ maxHeight: '90%' }} keyboardShouldPersistTaps="handled" onStartShouldSetResponder={() => true}>
            <View style={s.card}><View style={s.grip} /><Text style={s.title}>{title}</Text>{children}</View>
          </ScrollView>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  card: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 32 },
  grip: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
});
