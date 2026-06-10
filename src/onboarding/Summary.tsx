// Final onboarding screen — a celebratory "setup complete" status board.
// Shows which money modules are now ACTIVE (from what the user set up) and which
// complementary ones they can UNLOCK next. Adaptive to the chosen tracks.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../components/UI';
import { Colors, Spacing, Radii } from '../utils/theme';
import { Status, Track } from './engine';
import { num, grossAnnual, retirementMonthlyIncome } from './modules';
import { rsuAnnual, rentalNetAnnual } from '../domain/income';
import Mascot from './Mascot';

// onOpen: finish onboarding FIRST, then deep-link into the module (wired by OnboardingScreen) —
// navigating away without finishing would bounce the user straight back into onboarding.
type Props = { status: Status | null; tracks: Track[]; answers: Record<string, any>; name: string; onOpen?: (route: string) => void };

function joinHuman(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  if (parts.length === 2) return `${parts[0]} & ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`;
}

function incomeStreams(a: Record<string, any>): string {
  const p: string[] = [];
  if (num(a.baseSalary) > 0) p.push('salary');
  if (num(a.bonusAnnual) > 0 || num(a.signingOnetime) > 0) p.push('bonus');
  if (rsuAnnual(a) > 0) p.push('equity');
  if (rentalNetAnnual(a) > 0) p.push('rental');
  if (retirementMonthlyIncome(a) > 0) p.push('retirement income');
  return p.length ? `Monitoring your ${joinHuman(p)}.` : 'Tracking your income streams.';
}

export default function Summary({ status, tracks, answers: a, name, onOpen }: Props) {
  const firstName = name.trim();
  const hasSpend = tracks.includes('spend');
  const hasAcc = tracks.includes('retire_acc');
  const hasDec = tracks.includes('retire_dec');
  const hasGoals = tracks.includes('goals');
  const hasInvest = tracks.includes('invest');

  const incomeActive = grossAnnual(a) > 0 || retirementMonthlyIncome(a) > 0;
  const netWorthActive = hasInvest || num(a.investmentHoldings) > 0
    || num(a.currentRetirementSavings) > 0 || num(a.currentSavingsPortfolio) > 0;
  const retireActive = hasAcc || hasDec;

  const MODULES = [
    { key: 'income', icon: '💵', title: 'Income Tracker', badge: 'SYNCED', active: incomeActive, route: '/income-manager',
      activeDesc: incomeStreams(a), unlockDesc: 'Capture salary, bonus, equity and rental inflows.' },
    { key: 'budget', icon: '🧾', title: 'Budget Ledger', badge: 'ACTIVE', active: hasSpend, route: '/(tabs)/budget',
      activeDesc: 'Spending grouped into fixed, non-monthly & flexible.', unlockDesc: 'Group your spending and track it by category.' },
    { key: 'savings', icon: '🐷', title: 'Savings Engine', badge: 'READY', active: hasSpend, route: '/savings',
      activeDesc: 'A month-by-month plan from your cash flow.', unlockDesc: 'Turn leftover cash flow into a monthly savings plan.' },
    { key: 'networth', icon: '💎', title: 'Net Worth', badge: 'ACTIVE', active: netWorthActive, route: '/(tabs)/analytics',
      activeDesc: 'Your assets minus liabilities, over time.', unlockDesc: 'Aggregate assets and subtract liabilities to find your baseline wealth.' },
    { key: 'retire', icon: '🏖️', title: 'Retirement Planning', badge: 'ACTIVE', active: retireActive, route: '/(tabs)/retirement',
      activeDesc: 'Projected readiness for your target age.', unlockDesc: 'Stress-test inflation, project decades ahead, and size your nest egg.' },
    { key: 'goals', icon: '🎯', title: 'Advanced Goals', badge: 'ACTIVE', active: hasGoals, route: '/(tabs)/goals',
      activeDesc: 'Custom milestones with a priority order.', unlockDesc: 'Set custom milestones — lifestyle or legacy — with priority tiers.' },
  ];
  const active = MODULES.filter((m) => m.active);
  const unlock = MODULES.filter((m) => !m.active);

  return (
    <View>
      <View style={s.hero}>
        <Mascot accessory="🎉" mood="celebrate" size={120} />
        <Text style={s.kicker}>SETUP COMPLETE</Text>
        <Text style={s.heroTitle}>Congratulations{firstName ? `, ${firstName}` : ''}! 🎉</Text>
        <Text style={s.heroSub}>You're all set to manage your income, spending and savings smartly.</Text>
      </View>

      <Text style={s.section}>WHAT'S ACTIVE — TAP TO OPEN</Text>
      <Card>
        {active.map((m, i) => (
          <TouchableOpacity key={m.key} style={[s.statusRow, i > 0 && s.rowDivider]} onPress={() => onOpen?.(m.route)} disabled={!onOpen}>
            <Text style={s.modIcon}>{m.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.modTitle}>{m.title}</Text>
              <Text style={s.modDesc}>{m.activeDesc}</Text>
            </View>
            <View style={s.badge}><Text style={s.badgeTxt}>{m.badge}</Text></View>
          </TouchableOpacity>
        ))}
      </Card>

      {unlock.length > 0 && (
        <>
          <Text style={s.section}>UNLOCK NEXT — WHENEVER YOU'RE READY</Text>
          {unlock.map((m) => (
            <Card key={m.key}>
              <TouchableOpacity style={s.statusRow} onPress={() => onOpen?.(m.route)} disabled={!onOpen}>
                <Text style={s.modIcon}>{m.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.modTitle}>{m.title}</Text>
                  <Text style={s.modDesc}>{m.unlockDesc}</Text>
                </View>
                <Text style={s.arrow}>➔</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </>
      )}

      <Text style={s.tagline}>FinWise — your one-stop shop for managing money smartly.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: Spacing.lg },
  kicker: { fontSize: 12, fontWeight: '800', color: Colors.primary, letterSpacing: 2, marginTop: 4 },
  heroTitle: { fontSize: 25, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginTop: 4 },
  heroSub: { fontSize: 14, color: Colors.primaryDark, textAlign: 'center', marginTop: 6, marginHorizontal: 10 },
  section: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 0.6, marginTop: Spacing.md, marginBottom: Spacing.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 10 },
  rowDivider: { borderTopWidth: 1, borderTopColor: Colors.border },
  modIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  modTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  modDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  badge: { backgroundColor: Colors.primaryLight, borderRadius: Radii.sm, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt: { fontSize: 10, fontWeight: '800', color: Colors.primaryDark, letterSpacing: 0.5 },
  arrow: { fontSize: 18, color: Colors.primary, fontWeight: '700' },
  tagline: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', fontStyle: 'italic', marginTop: Spacing.lg },
});
