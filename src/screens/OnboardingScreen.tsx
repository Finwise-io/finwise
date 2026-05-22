import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Button, Card, TipCard, ProgressBar } from '../components/UI';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';

type MainGoal = 'budgeting' | 'retirement' | 'both';
type BudgetFreq = 'daily' | 'weekly' | 'monthly' | 'annual';
type SavingsGoalType = 'vacation' | 'renovation' | 'medical' | 'college' | 'emergency' | 'other';
type IncomeFreq = 'hourly' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';
type ExpenseTarget = 'amount' | 'percent';
type SavingsMethod = 'fixed_amount' | 'percent_income' | 'leftover';

export default function OnboardingScreen() {
  const router = useRouter();
  const store = useStore() as any;

  // ── State ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [mainGoal, setMainGoal] = useState<MainGoal | null>(null);

  // Budget
  const [budgetFreq, setBudgetFreq] = useState<BudgetFreq>('monthly');

  // Savings goals
  const [selectedGoals, setSelectedGoals] = useState<SavingsGoalType[]>([]);
  const [goalDetails, setGoalDetails] = useState<Record<string, { target: string; months: string }>>({});

  // Income
  const [incomeFreq, setIncomeFreq] = useState<IncomeFreq>('monthly');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeAuto, setIncomeAuto] = useState<boolean | null>(null);

  // Expenses
  const [expenseTarget, setExpenseTarget] = useState<ExpenseTarget>('percent');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePercent, setExpensePercent] = useState('80');
  const [byCategory, setByCategory] = useState(false);

  // Savings method
  const [savingsMethod, setSavingsMethod] = useState<SavingsMethod>('percent_income');
  const [savingsAmount, setSavingsAmount] = useState('');
  const [savingsPercent, setSavingsPercent] = useState('10');

  // Retirement
  const [currentAge, setCurrentAge] = useState('');
  const [retireAge, setRetireAge] = useState('65');
  const [currentSavings, setCurrentSavings] = useState('');
  const [monthlyContrib, setMonthlyContrib] = useState('');
  const [nestEggYears, setNestEggYears] = useState('20');

  // ── Computed ───────────────────────────────────────────────────────
  const isBudget = mainGoal === 'budgeting' || mainGoal === 'both';
  const isRetirement = mainGoal === 'retirement' || mainGoal === 'both';

  // Build ordered list of steps based on goal
  function getSteps(): string[] {
    const steps = ['goal'];
    if (isBudget) {
      steps.push('budget_freq');
      steps.push('savings_goals');
      steps.push('income');
      steps.push('expenses');
    }
    if (isRetirement) {
      steps.push('retirement');
    }
    steps.push('summary');
    return steps;
  }

  const steps = getSteps();
  const currentStepName = steps[step] || 'goal';
  const totalSteps = steps.length;
  const progress = totalSteps > 1 ? (step / (totalSteps - 1)) * 100 : 0;

  function getMonthlyIncome(): number {
    const amt = parseFloat(incomeAmount) || 0;
    const multipliers: Record<IncomeFreq, number> = {
      hourly: 160, daily: 21.7, weekly: 4.33,
      biweekly: 2.17, monthly: 1, quarterly: 1 / 3, annually: 1 / 12,
    };
    return amt * (multipliers[incomeFreq] || 1);
  }

  function getPeriodIncome(): number {
    const monthly = getMonthlyIncome();
    if (budgetFreq === 'daily') return monthly / 30;
    if (budgetFreq === 'weekly') return monthly / 4.33;
    if (budgetFreq === 'annual') return monthly * 12;
    return monthly;
  }

  function getExpenseAmt(): number {
    if (expenseTarget === 'amount') return parseFloat(expenseAmount) || 0;
    return getPeriodIncome() * (parseFloat(expensePercent) || 80) / 100;
  }

  function getSavingsAmt(): number {
    if (savingsMethod === 'fixed_amount') return parseFloat(savingsAmount) || 0;
    if (savingsMethod === 'percent_income') return getPeriodIncome() * (parseFloat(savingsPercent) || 10) / 100;
    return Math.max(0, getPeriodIncome() - getExpenseAmt());
  }

  function isBalanced(): boolean {
    return getPeriodIncome() >= getExpenseAmt() + getSavingsAmt();
  }

  const freqLabel = budgetFreq === 'daily' ? 'day'
    : budgetFreq === 'weekly' ? 'week'
    : budgetFreq === 'annual' ? 'year' : 'month';

  function toggleGoal(g: SavingsGoalType) {
    setSelectedGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  }

  // ── Navigation ─────────────────────────────────────────────────────
  function goNext() {
    if (currentStepName === 'goal') {
      if (!mainGoal) { Alert.alert('Pick a goal', 'Please select what you want to use FinWise for.'); return; }
    }
    if (currentStepName === 'income') {
      if (!incomeAmount) { Alert.alert('Enter income', 'Please enter your income amount.'); return; }
      if (incomeAuto === null) { Alert.alert('Choose tracking method', 'How do you want to track income?'); return; }
    }
    if (currentStepName === 'expenses') {
      if (incomeAmount && !isBalanced()) {
        const over = (getExpenseAmt() + getSavingsAmt() - getPeriodIncome()).toFixed(2);
        Alert.alert(
          '⚠️ Budget exceeds income',
          `Your expenses ($${getExpenseAmt().toFixed(0)}) + savings ($${getSavingsAmt().toFixed(0)}) exceed your income ($${getPeriodIncome().toFixed(0)}) by $${over}.\n\nWould you like to adjust?`,
          [
            { text: 'Reduce expenses', onPress: () => {
              const newPct = Math.max(0, ((getPeriodIncome() - getSavingsAmt()) / getPeriodIncome()) * 100);
              setExpensePercent(newPct.toFixed(0));
              setExpenseTarget('percent');
            }},
            { text: 'Reduce savings', onPress: () => {
              const newPct = Math.max(0, ((getPeriodIncome() - getExpenseAmt()) / getPeriodIncome()) * 100);
              setSavingsPercent(newPct.toFixed(0));
              setSavingsMethod('percent_income');
            }},
            { text: 'Continue anyway', style: 'cancel', onPress: () => advanceStep() },
          ]
        );
        return;
      }
    }
    if (currentStepName === 'summary') {
      handleFinish();
      return;
    }
    advanceStep();
  }

  function advanceStep() {
    if (step < steps.length - 1) setStep(step + 1);
    else handleFinish();
  }

  function goBack() {
    if (step > 0) setStep(step - 1);
  }

  function handleFinish() {
    // NOTE: Do NOT auto-add income here - it causes duplicate entries every time
    // onboarding runs. Users log income from the Income screen instead.
    // We only save settings: budget target, frequency, goals.
    if (currentSavings && parseFloat(currentSavings) > 0) {
      store.addSavings({
        amount: parseFloat(currentSavings),
        label: 'Starting savings',
        date: new Date().toISOString(),
      });
    }
    const monthlyBudget = budgetFreq === 'daily' ? getExpenseAmt() * 30
      : budgetFreq === 'weekly' ? getExpenseAmt() * 4.33
      : budgetFreq === 'annual' ? getExpenseAmt() / 12
      : getExpenseAmt();
    if (monthlyBudget > 0) store.setMonthlyBudgetTarget(monthlyBudget);

    selectedGoals.forEach(g => {
      const d = goalDetails[g] || {};
      store.addGoal({
        label: goalLabel(g), icon: goalIcon(g),
        target: parseFloat(d.target || '1000'),
        saved: 0, color: Colors.primary,
      });
    });
    if (typeof store.setOnboardingComplete === 'function') store.setOnboardingComplete(true);
    router.replace('/(tabs)/home');
  }

  // ── Render helpers ─────────────────────────────────────────────────
  const incomeFreqOptions: { value: IncomeFreq; label: string; sub: string }[] = [
    { value: 'hourly',    label: 'Hourly',      sub: 'Paid by the hour' },
    { value: 'daily',     label: 'Daily',       sub: 'Paid each day worked' },
    { value: 'weekly',    label: 'Weekly',       sub: 'Paycheck every week' },
    { value: 'biweekly',  label: 'Every 2 weeks', sub: 'Paycheck every 2 weeks' },
    { value: 'monthly',   label: 'Monthly',     sub: 'Paycheck once a month' },
    { value: 'quarterly', label: 'Quarterly',   sub: 'Paid every 3 months' },
    { value: 'annually',  label: 'Annually',    sub: 'Once a year salary' },
  ];

  const incomeLabel = incomeFreqOptions.find(o => o.value === incomeFreq)?.label || 'month';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Progress bar */}
        <View style={styles.progressWrap}>
          <ProgressBar pct={progress} color={Colors.primary} height={5} />
          <Text style={styles.progressText}>Step {step + 1} of {totalSteps}</Text>
        </View>

        {/* ══ STEP: GOAL ════════════════════════════════════════════ */}
        {currentStepName === 'goal' && (
          <>
            <View style={styles.headWrap}>
              <Text style={styles.emoji}>👋</Text>
              <Text style={styles.heading}>Welcome to FinWise!</Text>
              <Text style={styles.sub}>What do you want to use FinWise for?</Text>
            </View>
            {([
              { value: 'budgeting',  icon: '📊', title: 'Budgeting',           sub: 'Track spending and manage your budget' },
              { value: 'retirement', icon: '🏖',  title: 'Retirement planning', sub: 'Build your nest egg for the future' },
              { value: 'both',       icon: '🎯', title: 'Both',                sub: 'Full financial planning — budget + retirement' },
            ] as { value: MainGoal; icon: string; title: string; sub: string }[]).map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.bigCard, mainGoal === opt.value && styles.bigCardOn]}
                onPress={() => setMainGoal(opt.value)}
                activeOpacity={0.85}
              >
                <Text style={styles.bigCardEmoji}>{opt.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bigCardTitle, mainGoal === opt.value && styles.bigCardTitleOn]}>{opt.title}</Text>
                  <Text style={styles.bigCardSub}>{opt.sub}</Text>
                </View>
                <View style={[styles.radio, mainGoal === opt.value && styles.radioOn]}>
                  {mainGoal === opt.value && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ══ STEP: BUDGET FREQUENCY ════════════════════════════════ */}
        {currentStepName === 'budget_freq' && (
          <>
            <View style={styles.headWrap}>
              <Text style={styles.emoji}>📅</Text>
              <Text style={styles.heading}>Budget frequency</Text>
              <Text style={styles.sub}>How often do you want to track your budget?</Text>
            </View>
            <Card>
              {([
                { value: 'daily',   icon: '☀️', title: 'Daily',   sub: 'Track spending every single day' },
                { value: 'weekly',  icon: '📅', title: 'Weekly',  sub: 'Review your budget each week' },
                { value: 'monthly', icon: '📆', title: 'Monthly', sub: 'Classic monthly budgeting' },
                { value: 'annual',  icon: '🗓', title: 'Annual',  sub: 'Yearly big-picture planning' },
              ] as { value: BudgetFreq; icon: string; title: string; sub: string }[]).map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optRow, budgetFreq === opt.value && styles.optRowOn]}
                  onPress={() => setBudgetFreq(opt.value)}
                >
                  <Text style={{ fontSize: 26 }}>{opt.icon}</Text>
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <Text style={[styles.optTitle, budgetFreq === opt.value && styles.optTitleOn]}>{opt.title}</Text>
                    <Text style={styles.optSub}>{opt.sub}</Text>
                  </View>
                  <View style={[styles.radio, budgetFreq === opt.value && styles.radioOn]}>
                    {budgetFreq === opt.value && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </Card>
          </>
        )}

        {/* ══ STEP: SAVINGS GOALS ═══════════════════════════════════ */}
        {currentStepName === 'savings_goals' && (
          <>
            <View style={styles.headWrap}>
              <Text style={styles.emoji}>🎯</Text>
              <Text style={styles.heading}>Savings goals</Text>
              <Text style={styles.sub}>What are you saving for? Select all that apply.</Text>
            </View>
            <View style={styles.chipGrid}>
              {([
                { value: 'vacation',   icon: '✈️', label: 'Vacation' },
                { value: 'renovation', icon: '🏠', label: 'Home renovation' },
                { value: 'medical',    icon: '💊', label: 'Medical' },
                { value: 'college',    icon: '🎓', label: 'College fund' },
                { value: 'emergency',  icon: '🛡',  label: 'Emergency fund' },
                { value: 'other',      icon: '🎯', label: 'Other goal' },
              ] as { value: SavingsGoalType; icon: string; label: string }[]).map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, selectedGoals.includes(opt.value) && styles.chipOn]}
                  onPress={() => toggleGoal(opt.value)}
                >
                  <Text style={{ fontSize: 28 }}>{opt.icon}</Text>
                  <Text style={[styles.chipLabel, selectedGoals.includes(opt.value) && styles.chipLabelOn]}>
                    {opt.label}
                  </Text>
                  {selectedGoals.includes(opt.value) && (
                    <View style={styles.chipCheck}><Text style={styles.chipCheckText}>✓</Text></View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {selectedGoals.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Set up each goal</Text>
                {selectedGoals.map(g => (
                  <Card key={g} style={{ marginBottom: Spacing.xs }}>
                    <Text style={styles.cardTitle}>{goalIcon(g)} {goalLabel(g)}</Text>
                    <Text style={styles.inputLabel}>Target amount ($)</Text>
                    <TextInput
                      style={styles.input}
                      value={goalDetails[g]?.target || ''}
                      onChangeText={v => setGoalDetails(p => ({ ...p, [g]: { ...p[g], target: v } }))}
                      placeholder="e.g. 5000"
                      keyboardType="decimal-pad"
                      placeholderTextColor={Colors.textTertiary}
                    />
                    <Text style={[styles.inputLabel, { marginTop: Spacing.sm }]}>Save over how many months?</Text>
                    <TextInput
                      style={styles.input}
                      value={goalDetails[g]?.months || ''}
                      onChangeText={v => setGoalDetails(p => ({ ...p, [g]: { ...p[g], months: v } }))}
                      placeholder="e.g. 12"
                      keyboardType="number-pad"
                      placeholderTextColor={Colors.textTertiary}
                    />
                    {goalDetails[g]?.target && goalDetails[g]?.months && (
                      <TipCard color="green">
                        <Text style={styles.tipText}>
                          Save <Text style={{ fontWeight: '700' }}>
                            ${(parseFloat(goalDetails[g].target) / Math.max(1, parseFloat(goalDetails[g].months))).toFixed(0)}/month
                          </Text> to reach this goal on time.
                        </Text>
                      </TipCard>
                    )}
                  </Card>
                ))}
              </>
            )}
            {selectedGoals.length === 0 && (
              <TipCard color="amber">
                <Text style={styles.tipText}>No savings goals yet — you can always add them later from the Rewards tab.</Text>
              </TipCard>
            )}
          </>
        )}

        {/* ══ STEP: INCOME ══════════════════════════════════════════ */}
        {currentStepName === 'income' && (
          <>
            <View style={styles.headWrap}>
              <Text style={styles.emoji}>💵</Text>
              <Text style={styles.heading}>Your income</Text>
              <Text style={styles.sub}>Tell us how and how often you get paid.</Text>
            </View>

            <Card>
              <Text style={styles.cardTitle}>How often do you get paid?</Text>
              <View style={styles.freqGrid}>
                {incomeFreqOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.freqBtn, incomeFreq === opt.value && styles.freqBtnOn]}
                    onPress={() => setIncomeFreq(opt.value)}
                  >
                    <Text style={[styles.freqLabel, incomeFreq === opt.value && styles.freqLabelOn]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.freqSub, incomeFreq === opt.value && styles.freqSubOn]} numberOfLines={1}>
                      {opt.sub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            <Card>
              <Text style={styles.cardTitle}>
                What is your {incomeLabel.toLowerCase()} income?
              </Text>
              <TextInput
                style={styles.bigInput}
                value={incomeAmount}
                onChangeText={setIncomeAmount}
                placeholder="$0.00"
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.textTertiary}
                autoFocus
              />
              {incomeAmount !== '' && getMonthlyIncome() > 0 && (
                <View style={styles.calcBox}>
                  <Text style={styles.calcLabel}>Monthly equivalent</Text>
                  <Text style={styles.calcValue}>${getMonthlyIncome().toFixed(2)}/month</Text>
                </View>
              )}
            </Card>

            <Card>
              <Text style={styles.cardTitle}>How do you want to track income?</Text>
              {([
                { value: true,  icon: '🔄', title: 'Use as automatic baseline', sub: `App assumes $${incomeAmount || '0'} every ${freqLabel} automatically` },
                { value: false, icon: '✏️', title: 'Enter manually each time',   sub: 'I will log my income as I receive it' },
              ] as { value: boolean; icon: string; title: string; sub: string }[]).map(opt => (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[styles.optRow, incomeAuto === opt.value && styles.optRowOn]}
                  onPress={() => setIncomeAuto(opt.value)}
                >
                  <Text style={{ fontSize: 24 }}>{opt.icon}</Text>
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <Text style={[styles.optTitle, incomeAuto === opt.value && styles.optTitleOn]}>{opt.title}</Text>
                    <Text style={styles.optSub}>{opt.sub}</Text>
                  </View>
                  <View style={[styles.radio, incomeAuto === opt.value && styles.radioOn]}>
                    {incomeAuto === opt.value && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </Card>
          </>
        )}

        {/* ══ STEP: EXPENSES ════════════════════════════════════════ */}
        {currentStepName === 'expenses' && (
          <>
            <View style={styles.headWrap}>
              <Text style={styles.emoji}>💳</Text>
              <Text style={styles.heading}>Expenses & savings</Text>
              <Text style={styles.sub}>Set your targets for each {freqLabel}.</Text>
            </View>

            <Card>
              <Text style={styles.cardTitle}>Expense target per {freqLabel}</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity style={[styles.toggleBtn, expenseTarget === 'percent' && styles.toggleBtnOn]} onPress={() => setExpenseTarget('percent')}>
                  <Text style={[styles.toggleText, expenseTarget === 'percent' && styles.toggleTextOn]}>% of income</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, expenseTarget === 'amount' && styles.toggleBtnOn]} onPress={() => setExpenseTarget('amount')}>
                  <Text style={[styles.toggleText, expenseTarget === 'amount' && styles.toggleTextOn]}>Fixed $</Text>
                </TouchableOpacity>
              </View>

              {expenseTarget === 'percent' ? (
                <>
                  <View style={styles.pctRow}>
                    {['50', '60', '70', '80', '90'].map(p => (
                      <TouchableOpacity key={p} style={[styles.pctBtn, expensePercent === p && styles.pctBtnOn]} onPress={() => setExpensePercent(p)}>
                        <Text style={[styles.pctText, expensePercent === p && styles.pctTextOn]}>{p}%</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput style={styles.input} value={expensePercent} onChangeText={setExpensePercent}
                    placeholder="80" keyboardType="number-pad" placeholderTextColor={Colors.textTertiary} />
                  {incomeAmount && (
                    <View style={styles.calcBox}>
                      <Text style={styles.calcLabel}>= ${getExpenseAmt().toFixed(2)} per {freqLabel}</Text>
                      <Text style={styles.calcValue}>{expensePercent}% of income</Text>
                    </View>
                  )}
                </>
              ) : (
                <TextInput style={styles.bigInput} value={expenseAmount} onChangeText={setExpenseAmount}
                  placeholder="$0.00" keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} />
              )}

              <View style={[styles.optRow, { marginTop: Spacing.md }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optTitle}>Set budget by category?</Text>
                  <Text style={styles.optSub}>e.g. $400 groceries, $200 dining out</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                  <TouchableOpacity style={[styles.miniBtn, byCategory && styles.miniBtnOn]} onPress={() => setByCategory(true)}>
                    <Text style={[styles.miniText, byCategory && styles.miniTextOn]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.miniBtn, !byCategory && styles.miniBtnOn]} onPress={() => setByCategory(false)}>
                    <Text style={[styles.miniText, !byCategory && styles.miniTextOn]}>Later</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {byCategory && (
                <TipCard color="green">
                  <Text style={styles.tipText}>You can set category budgets from the Transactions tab after setup.</Text>
                </TipCard>
              )}
            </Card>

            <Card>
              <Text style={styles.cardTitle}>How do you want to save?</Text>
              {([
                { value: 'percent_income', icon: '📊', title: '% of income',     sub: 'Save a percentage of what you earn' },
                { value: 'fixed_amount',   icon: '💵', title: 'Fixed $ amount',  sub: 'Save a set amount each period' },
                { value: 'leftover',       icon: '🪣', title: 'Whatever is left', sub: 'Save what remains after expenses' },
              ] as { value: SavingsMethod; icon: string; title: string; sub: string }[]).map(opt => (
                <TouchableOpacity key={opt.value} style={[styles.optRow, savingsMethod === opt.value && styles.optRowOn]} onPress={() => setSavingsMethod(opt.value)}>
                  <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <Text style={[styles.optTitle, savingsMethod === opt.value && styles.optTitleOn]}>{opt.title}</Text>
                    <Text style={styles.optSub}>{opt.sub}</Text>
                  </View>
                  <View style={[styles.radio, savingsMethod === opt.value && styles.radioOn]}>
                    {savingsMethod === opt.value && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              ))}

              {savingsMethod === 'percent_income' && (
                <TextInput style={styles.input} value={savingsPercent} onChangeText={setSavingsPercent}
                  placeholder="10" keyboardType="number-pad" placeholderTextColor={Colors.textTertiary} />
              )}
              {savingsMethod === 'fixed_amount' && (
                <TextInput style={styles.input} value={savingsAmount} onChangeText={setSavingsAmount}
                  placeholder="$0.00" keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} />
              )}
            </Card>

            {/* Live balance check */}
            {incomeAmount !== '' && (
              <View style={[styles.balanceBox, isBalanced() ? styles.balanceOk : styles.balanceBad]}>
                <Text style={styles.balanceTitle}>{isBalanced() ? '✅ Budget balanced' : '⚠️ Expenses + savings exceed income'}</Text>
                <View style={styles.balRow}><Text style={styles.balLabel}>Income per {freqLabel}</Text><Text style={styles.balVal}>${getPeriodIncome().toFixed(2)}</Text></View>
                <View style={styles.balRow}><Text style={styles.balLabel}>Expense target</Text><Text style={styles.balVal}>- ${getExpenseAmt().toFixed(2)}</Text></View>
                <View style={styles.balRow}><Text style={styles.balLabel}>Savings target</Text><Text style={styles.balVal}>- ${getSavingsAmt().toFixed(2)}</Text></View>
                <View style={styles.balDivider} />
                <View style={styles.balRow}>
                  <Text style={[styles.balLabel, { fontWeight: '700' }]}>Remaining</Text>
                  <Text style={[styles.balVal, { fontWeight: '700', color: isBalanced() ? Colors.primary : Colors.red }]}>
                    ${(getPeriodIncome() - getExpenseAmt() - getSavingsAmt()).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* ══ STEP: RETIREMENT ══════════════════════════════════════ */}
        {currentStepName === 'retirement' && (
          <>
            <View style={styles.headWrap}>
              <Text style={styles.emoji}>🏖</Text>
              <Text style={styles.heading}>Retirement planning</Text>
              <Text style={styles.sub}>Let's set up your retirement goals.</Text>
            </View>
            <Card>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Current age</Text>
                  <TextInput style={styles.input} value={currentAge} onChangeText={setCurrentAge}
                    placeholder="e.g. 35" keyboardType="number-pad" placeholderTextColor={Colors.textTertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Retire at age</Text>
                  <TextInput style={styles.input} value={retireAge} onChangeText={setRetireAge}
                    placeholder="65" keyboardType="number-pad" placeholderTextColor={Colors.textTertiary} />
                </View>
              </View>
              {currentAge && retireAge && (
                <View style={styles.calcBox}>
                  <Text style={styles.calcLabel}>Years until retirement</Text>
                  <Text style={styles.calcValue}>{Math.max(0, parseInt(retireAge) - parseInt(currentAge))} years</Text>
                </View>
              )}
              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Current savings / investments ($)</Text>
              <TextInput style={styles.input} value={currentSavings} onChangeText={setCurrentSavings}
                placeholder="0.00 (enter 0 if starting fresh)" keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} />
              <Text style={[styles.inputLabel, { marginTop: Spacing.sm }]}>Monthly contribution ($)</Text>
              <TextInput style={styles.input} value={monthlyContrib} onChangeText={setMonthlyContrib}
                placeholder="500.00" keyboardType="decimal-pad" placeholderTextColor={Colors.textTertiary} />
              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Nest egg — years of income to save</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {['10', '15', '20', '25', '30'].map(y => (
                  <TouchableOpacity key={y} style={[styles.nestBtn, nestEggYears === y && styles.nestBtnOn]} onPress={() => setNestEggYears(y)}>
                    <Text style={[styles.nestText, nestEggYears === y && styles.nestTextOn]}>{y}yr</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {currentAge && retireAge && incomeAmount && (
                <TipCard color="green">
                  <Text style={styles.tipText}>
                    Target: <Text style={{ fontWeight: '700' }}>${(getMonthlyIncome() * 12 * parseInt(nestEggYears)).toLocaleString()}</Text>{'\n'}
                    Years to save: {Math.max(0, parseInt(retireAge) - parseInt(currentAge))}{'\n'}
                    Monthly needed: <Text style={{ fontWeight: '700' }}>
                      ${((getMonthlyIncome() * 12 * parseInt(nestEggYears) - (parseFloat(currentSavings) || 0)) / Math.max(1, (parseInt(retireAge) - parseInt(currentAge)) * 12)).toFixed(0)}/month
                    </Text>
                  </Text>
                </TipCard>
              )}
            </Card>
          </>
        )}

        {/* ══ STEP: SUMMARY ═════════════════════════════════════════ */}
        {currentStepName === 'summary' && (
          <>
            <View style={styles.headWrap}>
              <Text style={styles.emoji}>🎉</Text>
              <Text style={styles.heading}>You're all set!</Text>
              <Text style={styles.sub}>Here's your personalized FinWise plan</Text>
            </View>
            <Card>
              <Text style={styles.cardTitle}>Your plan</Text>
              <SRow label="Goal" value={mainGoal === 'both' ? 'Budgeting + Retirement' : mainGoal === 'budgeting' ? 'Budgeting' : 'Retirement'} />
              {isBudget && <>
                <SRow label="Budget frequency" value={budgetFreq.charAt(0).toUpperCase() + budgetFreq.slice(1)} />
                <SRow label={`Income per ${freqLabel}`} value={`$${getPeriodIncome().toFixed(2)}`} color={Colors.primary} />
                <SRow label="Expense target" value={`$${getExpenseAmt().toFixed(2)} per ${freqLabel}`} />
                <SRow label="Savings target" value={`$${getSavingsAmt().toFixed(2)} per ${freqLabel}`} color={Colors.primary} />
                {selectedGoals.length > 0 && <SRow label="Savings goals" value={selectedGoals.map(goalLabel).join(', ')} />}
              </>}
              {isRetirement && <>
                <SRow label="Retire at age" value={retireAge} />
                <SRow label="Nest egg" value={`${nestEggYears} years of income`} />
                {currentSavings && <SRow label="Starting savings" value={`$${parseFloat(currentSavings).toLocaleString()}`} color={Colors.primary} />}
              </>}
            </Card>
            <TipCard color="green">
              <Text style={styles.tipText}>All set! You can update these settings anytime. Let's start your financial journey! 🚀</Text>
            </TipCard>
          </>
        )}

        {/* ── Nav buttons ─────────────────────────────────────────── */}
        <View style={styles.navRow}>
          {step > 0 && (
            <Button label="← Back" onPress={goBack} variant="secondary" style={{ flex: 1 }} size="md" />
          )}
          <Button
            label={currentStepName === 'summary' ? 'Start FinWise 🚀' : 'Continue →'}
            onPress={goNext}
            style={{ flex: step === 0 ? undefined : 1 }}
            size="md"
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.sRow}>
      <Text style={styles.sLabel}>{label}</Text>
      <Text style={[styles.sVal, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

function goalLabel(g: string): string {
  const m: Record<string, string> = {
    vacation: 'Vacation', renovation: 'Home renovation', medical: 'Medical',
    college: 'College fund', emergency: 'Emergency fund', other: 'Other goal',
  };
  return m[g] || g;
}

function goalIcon(g: string): string {
  const m: Record<string, string> = {
    vacation: '✈️', renovation: '🏠', medical: '💊',
    college: '🎓', emergency: '🛡', other: '🎯',
  };
  return m[g] || '🎯';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.base, gap: Spacing.sm },
  progressWrap: { marginBottom: Spacing.sm },
  progressText: { fontSize: Typography.sizes.xs, color: Colors.textTertiary, textAlign: 'right', marginTop: 4 },
  headWrap: { alignItems: 'center', marginBottom: Spacing.sm },
  emoji: { fontSize: 48, marginBottom: Spacing.sm },
  heading: { fontSize: Typography.sizes.xl, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  sub: { fontSize: Typography.sizes.base, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 22 },
  bigCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.base },
  bigCardOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid, borderWidth: 1.5 },
  bigCardEmoji: { fontSize: 32 },
  bigCardTitle: { fontSize: Typography.sizes.md, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  bigCardTitleOn: { color: Colors.primaryDeep },
  bigCardSub: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: Colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.primary },
  optRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.bgSecondary, marginBottom: Spacing.sm },
  optRowOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  optTitle: { fontSize: Typography.sizes.base, fontWeight: '600', color: Colors.textPrimary },
  optTitleOn: { color: Colors.primaryDeep },
  optSub: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { width: '47%', alignItems: 'center', gap: 6, padding: Spacing.md, backgroundColor: Colors.cardBg, borderRadius: Radii.lg, borderWidth: 0.5, borderColor: Colors.border },
  chipOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  chipLabel: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  chipLabelOn: { color: Colors.primaryDeep },
  chipCheck: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  chipCheckText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.textPrimary },
  cardTitle: { fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  inputLabel: { fontSize: Typography.sizes.base, fontWeight: '500', color: Colors.textPrimary, marginBottom: 6 },
  input: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 13, fontSize: Typography.sizes.md, color: Colors.textPrimary },
  bigInput: { fontSize: 28, fontWeight: '700', textAlign: 'center', paddingVertical: 16, color: Colors.textPrimary, backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, borderWidth: 0.5, borderColor: Colors.border },
  calcBox: { backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: Spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  calcLabel: { fontSize: Typography.sizes.sm, color: Colors.primaryDeep },
  calcValue: { fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.primaryDark },
  freqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  freqBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: Radii.md, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border, minWidth: '30%' },
  freqBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  freqLabel: { fontSize: Typography.sizes.base, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  freqLabelOn: { color: Colors.primaryDeep, fontWeight: '700' },
  freqSub: { fontSize: 10, color: Colors.textTertiary, textAlign: 'center', marginTop: 2 },
  freqSubOn: { color: Colors.primaryDark },
  toggleRow: { flexDirection: 'row', backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, padding: 3, gap: 3, marginBottom: Spacing.md },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radii.sm },
  toggleBtnOn: { backgroundColor: Colors.cardBg, borderWidth: 0.5, borderColor: Colors.border },
  toggleText: { fontSize: Typography.sizes.base, color: Colors.textSecondary, fontWeight: '500' },
  toggleTextOn: { color: Colors.primary, fontWeight: '700' },
  pctRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  pctBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: Radii.md, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  pctBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  pctText: { fontSize: Typography.sizes.base, color: Colors.textSecondary, fontWeight: '600' },
  pctTextOn: { color: Colors.primaryDeep },
  miniBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: Radii.pill, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  miniBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  miniText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: '500' },
  miniTextOn: { color: Colors.primaryDeep, fontWeight: '700' },
  balanceBox: { borderRadius: Radii.lg, padding: Spacing.md, gap: 6 },
  balanceOk: { backgroundColor: Colors.primaryLight },
  balanceBad: { backgroundColor: Colors.redLight },
  balanceTitle: { fontSize: Typography.sizes.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  balRow: { flexDirection: 'row', justifyContent: 'space-between' },
  balLabel: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  balVal: { fontSize: Typography.sizes.sm, fontWeight: '600', color: Colors.textPrimary },
  balDivider: { height: 0.5, backgroundColor: Colors.border, marginVertical: 2 },
  nestBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: Radii.md, backgroundColor: Colors.bgSecondary, borderWidth: 0.5, borderColor: Colors.border },
  nestBtnOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  nestText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: '600' },
  nestTextOn: { color: Colors.primaryDeep, fontWeight: '700' },
  sRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  sLabel: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  sVal: { fontSize: Typography.sizes.base, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right', flex: 1, marginLeft: Spacing.md },
  tipText: { fontSize: Typography.sizes.sm, color: Colors.primaryDeep, lineHeight: 20 },
  navRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
});
