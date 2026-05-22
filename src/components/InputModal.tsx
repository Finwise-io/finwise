import React, { useState } from 'react';
import {
  View, Text, TextInput, Modal, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric' | 'email-address';
  onConfirm: (value: string) => void;
  onCancel: () => void;
  confirmLabel?: string;
};

export function InputModal({
  visible, title, message, placeholder, keyboardType = 'default',
  onConfirm, onCancel, confirmLabel = 'OK',
}: Props) {
  const [value, setValue] = useState('');

  function handleConfirm() {
    onConfirm(value);
    setValue('');
  }

  function handleCancel() {
    setValue('');
    onCancel();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={Colors.textTertiary}
            keyboardType={keyboardType}
            autoFocus
            onSubmitEditing={handleConfirm}
          />
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.confirmBtn]} onPress={handleConfirm}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  message: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  input: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radii.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    fontSize: Typography.sizes.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  btnRow: { flexDirection: 'row', gap: Spacing.sm },
  btn: { flex: 1, paddingVertical: 13, borderRadius: Radii.lg, alignItems: 'center' },
  cancelBtn: { backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  confirmBtn: { backgroundColor: Colors.primary },
  cancelText: { fontSize: Typography.sizes.base, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  confirmText: { fontSize: Typography.sizes.base, color: '#fff', fontWeight: Typography.weights.medium },
});
