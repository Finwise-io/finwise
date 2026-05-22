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

const SAVING_LABELS = [
  'Monthly deposit', 'Emergency fund', 'Transfer from checking',
  'Work bonus', 'Tax refund', 'Gift', 'Other',
];

export default function SavingsScreen() {
  const router = useRouter();
  const { addSavings, savings, goals, updateGoal } = useStore();
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('Monthly deposit');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [linkedGoal, setLinkedGoal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totalSavings = savings.reduce((s, e) => s + e.amount, 0);
  const parsedAmount = parseFloat(amount) || 0;

  function handleSave() {
    if (parsedAmount <= 0) {
      Alert.alert('Enter an amount', 'How much are you saving?');
      return;
    }
    setSaving(true);
    addSavings({ amount: parsedAmount, label, date: new Date(date + 'T12:00:00').toISOString() });

    // Also update linked goal
    if (linkedGoal) {
      const goal = goals.find((g) => g.id === linkedGoal);
      if (goal) updateGoal(linkedGoal, { saved: goal.saved + parsedAmount });
    }

    setSaving(false);
    Alert.alert('Savings logged! 🏦', `$${parsedAmount.toFixed(2)} saved. Total savings: $${(totalSavings + parsedAmount).toLocaleString()}`, [
      { text: 'Done', onPress: () => router.back() },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Card style={{ alignItems: 'center', padding: Spacing.xl }}>
          <Text style={styles.totalLabel}>Total savings</Text>
          <Text style={styles.totalAmt}>${totalSavings.toLocaleString()}</Text>
          {parsedAmount > 0 && (
            <Text style={styles.newTotal}>After this: ${(totalSavings + parsedAmount).toLocaleString()}</Text>
          )}
        </Card>

        <Card>
          <Text style={styles.label}>Amount ($)</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.textTertiary}
            autoFocus
          />

          <Text style={[styles.label, { marginTop: Spacing.md }]}>What is this?</Text>
          <View style={styles.labelGrid}>
            {SAVING_LABELS.map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.labelBtn, label === l && styles.labelBtnOn]}
                onPress={() => setLabel(l)}
              >
                <Text style={[styles.labelBtnText, label === l && styles.labelBtnTextOn]}>{l}</Text>
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
        </Card>

        {goals.length > 0 && (
          <Card>
            <Text style={styles.label}>Link to a goal (optional)</Text>
            <Text style={styles.hint}>This will also add the amount to your goal progress</Text>
            <View style={styles.goalGrid}>
              <TouchableOpacity
                style={[styles.goalBtn, linkedGoal === null && styles.goalBtnOn]}
                onPress={() => setLinkedGoal(null)}
              >
                <Text style={{ fontSize: 20 }}>🚫</Text>
                <Text style={[styles.goalBtnText, linkedGoal === null && styles.goalBtnTextOn]}>None</Text>
              </TouchableOpacity>
              {goals.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.goalBtn, linkedGoal === g.id && styles.goalBtnOn]}
                  onPress={() => setLinkedGoal(g.id)}
                >
                  <Text style={{ fontSize: 20 }}>{g.icon}</Text>
                  <Text style={[styles.goalBtnText, linkedGoal === g.id && styles.goalBtnTextOn]} numberOfLines={1}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        <TipCard color="green">
          <Text style={{ fontSize: Typography.sizes.sm, color: Colors.primaryDeep, lineHeight: 20 }}>
            💡 Even saving $25/week adds up to $1,300/year. Small amounts count — log every deposit!
          </Text>
        </TipCard>

        <Button
          label={parsedAmount > 0 ? `Save $${parsedAmount.toFixed(2)} ✓` : 'Enter amount above'}
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
  totalAmt: { fontSize: 38, fontWeight: '700', color: Colors.primary },
  newTotal: { fontSize: Typography.sizes.sm, color: Colors.primaryDark, marginTop: 4 },
  label: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary, marginBottom: 8 },
  hint: { fontSize: Typography.sizes.xs, color: Colors.textTertiary, marginBottom: 8, marginTop: -4 },
  amountInput: {
    fontSize: 32, fontWeight: '700', textAlign: 'center',
    paddingVertical: 16, color: Colors.textPrimary,
    backgroundColor: Colors.bgSecondary, borderRadius: Radii.md,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  input: {
    backgroundColor: Colors.bgSecondary, borderRadius: Radii.md,
    borderWidth: 0.5, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    fontSize: Typography.sizes.md, color: Colors.textPrimary,
  },
  labelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  labelBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radii.pill, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  labelBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  labelBtnText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: '500' },
  labelBtnTextOn: { color: Colors.primaryDeep },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  goalBtn: { alignItems: 'center', gap: 4, padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.bgSecondary, minWidth: 80 },
  goalBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  goalBtnText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500', textAlign: 'center' },
  goalBtnTextOn: { color: Colors.primaryDeep },
});
