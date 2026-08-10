import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal,
  ViewStyle, TextStyle, Animated,
} from 'react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../utils/theme';
import { formatMoney } from '../domain/_shared/money';
import { GLOSSARY, type GlossaryTerm } from '../domain/glossary';
import { useStore } from '../store/useStore';

// ── Card ─────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function DarkCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.darkCard, style]}>{children}</View>;
}

// ── Button ───────────────────────────────────────────────────────────
type BtnProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
  accessibilityLabel?: string;   // override when `label` isn't descriptive on its own (e.g. "Next")
  accessibilityHint?: string;    // F-4: what happens on activation, for screen readers
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, style, size = 'lg', accessibilityLabel, accessibilityHint }: BtnProps) {
  const variantStyle = {
    primary: styles.btnPrimary,
    secondary: styles.btnSecondary,
    ghost: styles.btnGhost,
    danger: styles.btnDanger,
  }[variant];

  const textStyle = {
    primary: styles.btnTextPrimary,
    secondary: styles.btnTextSecondary,
    ghost: styles.btnTextGhost,
    danger: styles.btnTextDanger,
  }[variant];

  const sizeStyle = {
    sm: { paddingVertical: 9, paddingHorizontal: 14 },
    md: { paddingVertical: 12, paddingHorizontal: 16 },
    lg: { paddingVertical: 16, paddingHorizontal: 16 },
  }[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, variantStyle, sizeStyle, disabled && { opacity: 0.5 }, style]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.white : Colors.primary} />
      ) : (
        <Text style={[styles.btnText, textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── Badge / Pill ─────────────────────────────────────────────────────
type BadgeColor = 'green' | 'red' | 'amber' | 'blue' | 'gray';
export function Badge({ label, color = 'green' }: { label: string; color?: BadgeColor }) {
  const colorMap: Record<BadgeColor, { bg: string; text: string }> = {
    green: { bg: Colors.primaryLight, text: Colors.primaryDeep },
    red: { bg: Colors.redLight, text: Colors.red },
    amber: { bg: Colors.amberLight, text: Colors.amber },
    blue: { bg: Colors.blueLight, text: Colors.blue },
    gray: { bg: Colors.bgTertiary, text: Colors.textSecondary },
  };
  const { bg, text } = colorMap[color];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────
export function ProgressBar({ pct, color = Colors.primary, height = 8 }: { pct: number; color?: string; height?: number }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return (
    <View style={[styles.progressTrack, { height }]}>
      <View style={[styles.progressFill, { width: `${clamped}%`, backgroundColor: color, height }]} />
    </View>
  );
}

// ── Segmented Control ─────────────────────────────────────────────────
export function SegmentedControl({
  options, selected, onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.segTrack}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.segBtn, selected === opt && styles.segBtnOn]}
          onPress={() => onSelect(opt)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={opt}
          accessibilityState={{ selected: selected === opt }}
        >
          <Text style={[styles.segText, selected === opt && styles.segTextOn]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction} accessibilityRole="button" accessibilityLabel={action}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Tip Card ──────────────────────────────────────────────────────────
export function TipCard({ children, color = 'green' }: { children: React.ReactNode; color?: 'green' | 'amber' | 'red' | 'blue' }) {
  const bg = { green: Colors.primaryLight, amber: Colors.amberLight, red: Colors.redLight, blue: Colors.blueLight }[color];
  const border = { green: Colors.primaryMid, amber: Colors.amberMid, red: Colors.redMid, blue: Colors.blueMid }[color];
  return (
    <View style={[styles.tipCard, { backgroundColor: bg, borderColor: border }]}>{children}</View>
  );
}

// ── Amount Display ────────────────────────────────────────────────────
export function AmountText({ amount, color, size = 'xl' }: { amount: number; color?: string; size?: 'md' | 'lg' | 'xl' | 'hero' }) {
  const hide = useStore((s) => s.hideBalances);
  const sizeMap = { md: 20, lg: 24, xl: 30, hero: 38 };
  const safeAmt = (typeof amount === 'number' && !isNaN(amount)) ? amount : 0;
  // canonical formatter (currency/locale-aware) + respects the global Hide-balances toggle
  const fmt = hide ? '••••' : formatMoney(safeAmt);
  return (
    <Text style={{ fontSize: sizeMap[size], fontWeight: '600', color: color || Colors.textPrimary }}>
      {fmt}
    </Text>
  );
}

// ── InfoDot (§3.3 in-context education) ───────────────────────────────
// A small tappable ⓘ next to a term; opens its plain-English GLOSSARY definition. One component, one
// glossary — so a term is never explained on one screen and left bare on another.
export function InfoDot({ term, color }: { term: GlossaryTerm; color?: string }) {
  const [open, setOpen] = useState(false);
  const def = GLOSSARY[term];
  return (
    <>
      {/* a pressable Text, deliberately NOT a Touchable: info dots often sit inside tappable
          cards, and a button nested in a button is invalid DOM on web (the browser re-parents it
          and scrambles the card). Text.onPress works on native and web alike. */}
      <Text onPress={() => setOpen(true)} suppressHighlighting
        accessibilityRole="button" accessibilityLabel={`What is ${def.title}?`}
        style={{ fontSize: 13, color: color || Colors.textTertiary, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 4 }}>ⓘ</Text>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.infoBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.infoCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.infoTitle}>{def.title}</Text>
            <Text style={styles.infoBody}>{def.body}</Text>
            <TouchableOpacity style={styles.infoClose} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close definition">
              <Text style={styles.infoCloseTxt}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Icon Circle ───────────────────────────────────────────────────────
export function IconCircle({ icon, bg = Colors.primaryLight, size = 40 }: { icon: string; bg?: string; size?: number }) {
  return (
    <View style={[styles.iconCircle, { backgroundColor: bg, width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ fontSize: size * 0.45 }}>{icon}</Text>
    </View>
  );
}

// ── Empty State ───────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={{ fontSize: 38, marginBottom: Spacing.md }}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  infoBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.lg },
  infoCard: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.lg, padding: Spacing.lg },
  infoTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  infoBody: { fontSize: 15, lineHeight: 20, color: Colors.textSecondary },
  infoClose: { alignSelf: 'flex-end', marginTop: Spacing.md, paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radii.md, backgroundColor: Colors.primaryLight },
  infoCloseTxt: { color: Colors.primaryDark, fontWeight: '700' },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.base,
    ...Shadows.card,
  },
  darkCard: {
    backgroundColor: Colors.primaryDark,
    borderRadius: Radii.lg,
    padding: Spacing.base,
  },
  btn: {
    borderRadius: Radii.lg,
    minHeight: 44,            // F-4 (G-14): minimum 44pt touch target
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnPrimary: { backgroundColor: Colors.primary },
  btnSecondary: { backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.borderStrong },
  btnGhost: { backgroundColor: 'transparent' },
  btnDanger: { backgroundColor: Colors.redLight, borderWidth: 0.5, borderColor: Colors.redMid },
  btnText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium },
  btnTextPrimary: { color: Colors.white },
  btnTextSecondary: { color: Colors.textPrimary },
  btnTextGhost: { color: Colors.primary },
  btnTextDanger: { color: Colors.red },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  progressTrack: { backgroundColor: Colors.bgSecondary, borderRadius: 99, overflow: 'hidden', width: '100%' },
  progressFill: { borderRadius: 99 },
  segTrack: {
    flexDirection: 'row',
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radii.md,
    padding: 3,
    gap: 3,
  },
  segBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: Radii.sm - 2 },
  segBtnOn: { backgroundColor: Colors.cardBg, borderWidth: 0.5, borderColor: Colors.border },
  segText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium, color: Colors.textSecondary },
  segTextOn: { color: Colors.primary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium, color: Colors.textPrimary },
  sectionAction: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.medium },
  tipCard: { borderRadius: Radii.lg, borderWidth: 0.5, padding: Spacing.md },
  iconCircle: { alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium, color: Colors.textPrimary, marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: Typography.sizes.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});

/** Walk row 12 (audit UX #10): THE estimate tag — one word, one look, wherever a figure is an
 *  estimate. Screens must render this instead of a local styled "estimate" text. */
export const ESTIMATE_TAG_STYLE = { fontSize: 13, fontWeight: '600' as const, color: Colors.textTertiary };
export function EstimateTag() {
  return <Text style={ESTIMATE_TAG_STYLE}>estimate</Text>;
}

/** Walk row 12 (audit UX #13): THE trying-it-out sentence — one wording on every scenario surface. */
export const TRYING_IT_OUT = 'Trying it out — nothing changes until you tap Use as my plan.';
