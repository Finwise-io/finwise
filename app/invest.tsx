import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../src/store/useStore';
import { Button, Card, TipCard } from '../src/components/UI';
import { Colors, Typography, Spacing, Radii } from '../src/utils/theme';
import { format } from 'date-fns';

const INVEST_TYPES = [
  { label: '401(k)', icon: '🏦' },
  { label: 'IRA', icon: '📋' },
  { label: 'Stocks', icon: '📈' },
  { label: 'ETF / Index fund', icon: '🗂' },
  { label: 'Crypto', icon: '₿' },
  { label: 'Real estate', icon: '🏠' },
  { label: 'Bonds', icon: '📄' },
  { label: 'Other', icon: '💼' },
];

export default function InvestScreen() {
  const router = useRouter();
  const { addInvestment, investments, treasuryYield } = useStore();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('401(k)');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  const totalInvested = investments.reduce((s, i) => s + i.amount, 0);
  const parsedAmount = parseFloat(amount) || 0;

  function handleSave() {
    if (parsedAmount <= 0) {
      Alert.alert('Enter an amount', 'How much did you invest?');
      return;
    }
    setSaving(true);
    addInvestment({
      amount: parsedAmount,
      type,
      date: new Date(date + 'T12:00:00').toISOString(),
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    Alert.alert(
      'Investment logged! 📈',
      `$${parsedAmount.toFixed(2)} in ${type} recorded. Total portfolio: $${(totalInvested + parsedAmount).toLocaleString()}`,
      [{ text: 'Done', onPress: () => router.back() }]
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Card style={{ alignItems: 'center', padding: Spacing.xl }}>
          <Text style={styles.totalLabel}>Total portfolio</Text>
          <Text style={styles.totalAmt}>${totalInvested.toLocaleString()}</Text>
          {parsedAmount > 0 && (
            <Text style={styles.newTotal}>After this: ${(totalInvested + parsedAmount).toLocaleString()}</Text>
          )}
        </Card>

        <Card>
          <Text style={styles.label}>Amount invested ($)</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.textTertiary}
            autoFocus
          />

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Investment type</Text>
          <View style={styles.typeGrid}>
            {INVEST_TYPES.map((t) => (
              <TouchableOpacity
                key={t.label}
                style={[styles.typeBtn, type === t.label && styles.typeBtnOn]}
                onPress={() => setType(t.label)}
              >
                <Text style={{ fontSize: 22 }}>{t.icon}</Text>
                <Text style={[styles.typeBtnText, type === t.label && styles.typeBtnTextOn]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Date</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textTertiary}
          />

          <Text style={[styles.label, { marginTop: Spacing.sm }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, { height: 64, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. monthly contribution, bought 5 shares of AAPL..."
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
        </Card>

        <TipCard color="blue">
          <Text style={{ fontSize: Typography.sizes.base, fontWeight: '600', color: Colors.blue, marginBottom: 3 }}>
            💡 10-year Treasury yield: {treasuryYield}%
          </Text>
          <Text style={{ fontSize: Typography.sizes.sm, color: Colors.blue, lineHeight: 20 }}>
            Treasury bonds are currently yielding {treasuryYield}% — a low-risk benchmark. Compare your investment returns against this.
          </Text>
        </TipCard>

        <Button
          label={parsedAmount > 0 ? `Log $${parsedAmount.toFixed(2)} investment ✓` : 'Enter amount above'}
          onPress={handleSave}
          loading={saving}
          disabled={parsedAmount <= 0}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.base, gap: Spacing.sm },
  totalLabel: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginBottom: 4 },
  totalAmt: { fontSize: 38, fontWeight: '700', color: Colors.blue },
  newTotal: { fontSize: Typography.sizes.sm, color: Colors.blue, marginTop: 4 },
  label: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary, marginBottom: 8 },
  amountInput: {
    fontSize: 32, fontWeight: '700', textAlign: 'center', paddingVertical: 16,
    color: Colors.textPrimary, backgroundColor: Colors.bgSecondary,
    borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border,
  },
  input: {
    backgroundColor: Colors.bgSecondary, borderRadius: Radii.md,
    borderWidth: 0.5, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    fontSize: Typography.sizes.md, color: Colors.textPrimary,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeBtn: {
    width: '22%', alignItems: 'center', gap: 4, padding: Spacing.sm,
    borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border,
    backgroundColor: Colors.bgSecondary,
  },
  typeBtnOn: { backgroundColor: Colors.blueLight, borderColor: Colors.blueMid },
  typeBtnText: { fontSize: 10, color: Colors.textSecondary, fontWeight: '500', textAlign: 'center' },
  typeBtnTextOn: { color: Colors.blue },
});
