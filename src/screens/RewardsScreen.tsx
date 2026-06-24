import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useStore, useLevel } from '../store/useStore';
import { Card, DarkCard, ProgressBar, Button, Badge, TipCard } from '../components/UI';
import { InputModal } from '../components/InputModal';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';

export default function RewardsScreen() {
  const { badges, goals, streak, addGoal, updateGoal } = useStore();
  const level = useLevel();

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalLabel, setGoalLabel] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalIcon, setGoalIcon] = useState('🎯');
  const [modalVisible, setModalVisible] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [activeGoalSaved, setActiveGoalSaved] = useState(0);

  const earnedBadges = badges.filter((b) => b.earned);
  const lockedBadges = badges.filter((b) => !b.earned);

  function handleAddGoal() {
    if (!goalLabel.trim()) {
      Alert.alert('Goal name required', 'Please enter a name for your goal (e.g. "Vacation fund", "New car").');
      return;
    }
    if (!goalTarget || parseFloat(goalTarget) <= 0) {
      Alert.alert('Target amount required', 'Please enter how much you want to save for this goal.');
      return;
    }
    addGoal({ label: goalLabel, icon: goalIcon, target: parseFloat(goalTarget), saved: 0, color: Colors.primary });
    setGoalLabel('');
    setGoalTarget('');
    setShowAddGoal(false);
  }

  function openAddToGoal(goalId: string, current: number) {
    setActiveGoalId(goalId);
    setActiveGoalSaved(current);
    setModalVisible(true);
  }

  function handleAddToGoal(value: string) {
    const amt = parseFloat(value || '0');
    if (amt > 0 && activeGoalId) {
      updateGoal(activeGoalId, { saved: activeGoalSaved + amt });
    }
    setModalVisible(false);
    setActiveGoalId(null);
  }

  const GOAL_ICONS = ['🎯', '✈️', '🏠', '🚗', '📚', '💍', '🐕', '🏖', '💻', '🎓'];

  return (
    <KeyboardAwareScreen style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <InputModal
        visible={modalVisible}
        title="Add to goal"
        message="How much are you adding today?"
        placeholder="0.00"
        keyboardType="decimal-pad"
        confirmLabel="Add"
        onConfirm={handleAddToGoal}
        onCancel={() => setModalVisible(false)}
      />

      {/* Level card */}
      <DarkCard>
        <View style={styles.levelRow}>
          <View>
            <Text style={styles.levelNum}>Level {level.level}</Text>
            <Text style={styles.levelName}>{level.name}</Text>
          </View>
          <Text style={{ fontSize: 52 }}>
            {level.level <= 2 ? '🌱' : level.level <= 4 ? '🌿' : level.level <= 6 ? '🌳' : level.level <= 8 ? '⭐' : '🏆'}
          </Text>
        </View>
        <Text style={styles.xpLabel}>{level.xp.toLocaleString()} / {level.next.min.toLocaleString()} XP to Level {level.next.level}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${level.pct}%` as any }]} />
        </View>
        {streak > 0 && (
          <View style={styles.streakRow}>
            <Text style={styles.streakText}>🔥 {streak}-day check-in streak!</Text>
            <Text style={styles.streakHint}>Come back tomorrow to keep it going</Text>
          </View>
        )}
      </DarkCard>

      {/* XP guide */}
      <Card>
        <Text style={styles.sectionTitle}>How to earn XP</Text>
        <View style={styles.xpGuideGrid}>
          {[
            ['Log income', '15 XP'], ['Log expense', '10 XP'],
            ['Add savings', '20 XP'], ['Log investment', '25 XP'],
            ['Set a goal', '30 XP'], ['Earn a badge', '50 XP'],
            ['Daily streak', '5/day'], ['AI analysis', '50 XP'],
          ].map(([action, pts]) => (
            <View key={action} style={styles.xpGuideItem}>
              <Text style={styles.xpGuideAction}>{action}</Text>
              <Text style={styles.xpGuidePts}>{pts}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Earned badges */}
      <Text style={styles.sectionTitle}>Badges earned ({earnedBadges.length})</Text>
      {earnedBadges.length === 0 ? (
        <TipCard color="green">
          <Text style={{ fontSize: Typography.sizes.base, color: Colors.primaryDeep }}>
            Start logging income and expenses to earn your first badge!
          </Text>
        </TipCard>
      ) : (
        <View style={styles.badgeGrid}>
          {earnedBadges.map((badge) => (
            <TouchableOpacity
              key={badge.id}
              style={styles.badgeCard}
              onPress={() => Alert.alert(badge.icon + ' ' + badge.label, badge.description + '\n\n+50 XP earned!')}
            >
              <Text style={{ fontSize: 32 }}>{badge.icon}</Text>
              <Text style={styles.badgeLabel}>{badge.label}</Text>
              <Badge label="Earned" color="green" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Locked badges */}
      {lockedBadges.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Locked ({lockedBadges.length})</Text>
          <View style={styles.badgeGrid}>
            {lockedBadges.map((badge) => (
              <TouchableOpacity
                key={badge.id}
                style={[styles.badgeCard, styles.badgeLocked]}
                onPress={() => Alert.alert('How to unlock', badge.description)}
              >
                <Text style={{ fontSize: 32, opacity: 0.3 }}>{badge.icon}</Text>
                <Text style={[styles.badgeLabel, { color: Colors.textTertiary }]}>{badge.label}</Text>
                <Badge label="Locked" color="gray" />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Goals */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Savings goals</Text>
        <TouchableOpacity onPress={() => setShowAddGoal(!showAddGoal)}>
          <Text style={styles.addLink}>+ Add goal</Text>
        </TouchableOpacity>
      </View>

      {showAddGoal && (
        <Card>
          <Text style={styles.subsection}>New goal</Text>
          <Text style={styles.label}>Choose an icon</Text>
          <View style={styles.iconRow}>
            {GOAL_ICONS.map((ic) => (
              <TouchableOpacity key={ic} style={[styles.iconBtn, goalIcon === ic && styles.iconBtnOn]} onPress={() => setGoalIcon(ic)}>
                <Text style={{ fontSize: 22 }}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { marginTop: Spacing.md }]}>Goal name</Text>
          <TextInput
            style={styles.input}
            value={goalLabel}
            onChangeText={setGoalLabel}
            placeholder="e.g. Emergency fund, Vacation"
            placeholderTextColor={Colors.textTertiary}
          />
          <Text style={[styles.label, { marginTop: Spacing.sm }]}>Target amount ($)</Text>
          <TextInput
            style={styles.input}
            value={goalTarget}
            onChangeText={setGoalTarget}
            placeholder="5000"
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.textTertiary}
          />
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
            <Button label="Cancel" onPress={() => setShowAddGoal(false)} variant="secondary" style={{ flex: 1 }} size="md" />
            <Button label="Create goal" onPress={handleAddGoal} style={{ flex: 1 }} size="md" />
          </View>
        </Card>
      )}

      {goals.map((goal) => {
        const pct = Math.min((goal.saved / goal.target) * 100, 100);
        const done = pct >= 100;
        return (
          <Card key={goal.id} style={done ? { borderColor: Colors.primaryMid, borderWidth: 1 } : {}}>
            <View style={styles.goalRow}>
              <Text style={{ fontSize: 28 }}>{goal.icon}</Text>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <View style={styles.goalTitleRow}>
                  <Text style={styles.goalName}>{goal.label}</Text>
                  {done && <Badge label="Complete! 🎉" color="green" />}
                </View>
                <View style={styles.goalAmtRow}>
                  <Text style={styles.goalAmt}>${goal.saved.toLocaleString()}</Text>
                  <Text style={styles.goalOf}> of ${goal.target.toLocaleString()}</Text>
                </View>
                <ProgressBar pct={pct} color={goal.color} height={7} />
                <Text style={styles.goalPct}>{Math.round(pct)}% complete</Text>
              </View>
            </View>
            {!done && (
              <TouchableOpacity style={styles.addToGoalBtn} onPress={() => openAddToGoal(goal.id, goal.saved)}>
                <Text style={styles.addToGoalText}>+ Add to this goal</Text>
              </TouchableOpacity>
            )}
          </Card>
        );
      })}

      <View style={{ height: 40 }} />
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.base, gap: Spacing.sm },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  levelNum: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  levelName: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: '#fff' },
  xpLabel: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: Colors.successGreen, borderRadius: 8 },
  streakRow: { marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.2)' },
  streakText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: '#fff' },
  streakHint: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  xpGuideGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  xpGuideItem: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7,
    paddingHorizontal: 10, backgroundColor: Colors.bgSecondary, borderRadius: Radii.sm, width: '48%',
  },
  xpGuideAction: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  xpGuidePts: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.primary },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addLink: { fontSize: Typography.sizes.base, color: Colors.primary, fontWeight: Typography.weights.medium },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  badgeCard: {
    width: '30%', alignItems: 'center', gap: 5,
    backgroundColor: Colors.cardBg, borderRadius: Radii.lg,
    borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.sm,
  },
  badgeLocked: { opacity: 0.55 },
  badgeLabel: { fontSize: 11, fontWeight: Typography.weights.medium, color: Colors.textPrimary, textAlign: 'center' },
  subsection: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  label: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, color: Colors.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5,
    borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13,
    fontSize: Typography.sizes.md, color: Colors.textPrimary,
  },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconBtn: { width: 44, height: 44, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  iconBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  goalRow: { flexDirection: 'row', alignItems: 'center' },
  goalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  goalName: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  goalAmtRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  goalAmt: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.primary },
  goalOf: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  goalPct: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 3 },
  addToGoalBtn: { marginTop: Spacing.sm, paddingVertical: 9, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.primaryMid, alignItems: 'center' },
  addToGoalText: { fontSize: Typography.sizes.base, color: Colors.primary, fontWeight: Typography.weights.medium },
});
