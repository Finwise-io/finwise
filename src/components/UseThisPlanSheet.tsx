// "Use this plan" — the shared F11 adoption sheet (FCC detailed design v1.1, Plan sheet).
// The founder's non-negotiable: before anything changes, see exactly what changes — every value
// old → new — then one explicit tap. The sheet is the ONE write path a decision screen uses
// (store.adoptPlan snapshots the previous plan so "Back to previous plan" can restore it exactly).
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';

export interface PlanChange { label: string; from: string; to: string }

export function UseThisPlanSheet({ visible, onClose, title, changes, patch, adoptionLabel, onAdopted }: {
  visible: boolean;
  onClose: () => void;
  title: string;                            // e.g. "Claim Social Security at 67"
  changes: PlanChange[];                    // the exact old → new list (rendered, never recomputed)
  patch: Record<string, any>;               // the assumptions patch adoptPlan applies
  adoptionLabel: string;                    // history label, e.g. "before claiming at 67"
  onAdopted?: () => void;
}) {
  const store = useStore() as any;
  const adopt = () => {
    store.adoptPlan?.(patch, adoptionLabel);
    onClose();
    onAdopted?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close without changing anything" style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={s.card} onStartShouldSetResponder={() => true}>
          <View style={s.handle} />
          <Text style={s.title}>{title}</Text>
          <Text style={s.sub}>Here is exactly what changes — nothing moves until you tap the button.</Text>

          {changes.map((c, i) => (
            <View key={i} style={[s.row, i > 0 && s.divider]}
              accessible accessibilityLabel={`${c.label}: from ${c.from} to ${c.to}`}>
              <Text style={s.rowLabel}>{c.label}</Text>
              <View style={s.valRow}>
                <Text style={s.fromVal}>{c.from}</Text>
                <Text style={s.arrow}>→</Text>
                <Text style={s.toVal}>{c.to}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity accessibilityRole="button" style={s.adoptBtn} onPress={adopt} accessibilityLabel={`Use this plan: ${title}`}>
            <Text style={s.adoptTxt}>Use this plan</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={s.cancelBtn} onPress={onClose} accessibilityLabel="Not now — keep my current plan">
            <Text style={s.cancelTxt}>Not now — keep my current plan</Text>
          </TouchableOpacity>
          <Text style={s.note}>You can switch back anytime — Plan keeps your previous plan.</Text>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  card: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  sub: { fontSize: 13.5, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: Spacing.md, lineHeight: 19 },
  row: { paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  valRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  fromVal: { fontSize: 15, color: Colors.textTertiary, textDecorationLine: 'line-through' },
  arrow: { fontSize: 15, color: Colors.textSecondary },
  toVal: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },   // the NEW value is the payoff — it leads (audit UP-2)
  adoptBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  adoptTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  cancelTxt: { color: Colors.textSecondary, fontSize: 14, fontWeight: '700' },
  note: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center', marginTop: 8 },
});
