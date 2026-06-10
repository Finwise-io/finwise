import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ViewStyle, TextStyle, Animated,
} from 'react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../utils/theme';

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
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, style, size = 'lg' }: BtnProps) {
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
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Colors.primary} />
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
    gray: { bg: '#F1EFE8', text: '#5F5E5A' },
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
        <TouchableOpacity onPress={onAction}>
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
  const sizeMap = { md: 20, lg: 24, xl: 30, hero: 38 };
  const safeAmt = (typeof amount === 'number' && !isNaN(amount)) ? amount : 0;
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(safeAmt);
  return (
    <Text style={{ fontSize: sizeMap[size], fontWeight: '600', color: color || Colors.textPrimary }}>
      {fmt}
    </Text>
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
      <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnPrimary: { backgroundColor: Colors.primary },
  btnSecondary: { backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.borderStrong },
  btnGhost: { backgroundColor: 'transparent' },
  btnDanger: { backgroundColor: Colors.redLight, borderWidth: 0.5, borderColor: Colors.redMid },
  btnText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium },
  btnTextPrimary: { color: '#fff' },
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
