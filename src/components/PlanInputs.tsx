// THE PLAN'S OWN INPUTS, on the Plan tab (founder 2026-08-12: "inputs on the tab").
//
// FACTS SAVE · CHOICES COMMIT. The rule that made merging the answers screen into the sandbox
// possible: a fact is true whether or not you like it — your age, what you spend, what counts, the
// roof in 2028 — so it writes the moment you change it. A choice is something you are trying on —
// retire at 67, put $500 more away — so it stays a draft until "Use as my plan". The chips are the
// tell: FACT on the saved rows, DRAFT on the ones in play.
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../utils/theme';
import { SectionBand } from './SectionBand';
import { maskedMoney, spokenMoney } from './useMoney';
import { useStore } from '../store/useStore';
import { DOORS } from '../constants/doors';
import { accountDisplayNames, earmarkedAmount, retirementEarmarkedValue, primaryCarIdOf, earmarkDefault } from '../domain/assets';

export interface PlanDraft { retireAge: number; horizonAge: number; extraMonthly: number }

const THIS_YEAR = new Date().getFullYear();
const MIN_AGE = 18, MAX_AGE = 100;

export function PlanInputs({ draft, onDraft, onCommit, committed, missing = [], focus, onOpenDoor }: {
  draft: PlanDraft;
  onDraft: (d: PlanDraft) => void;
  onCommit: () => void;
  committed: PlanDraft;
  /** the answers the odds are still waiting on — these rows wear MISSING and the choices stand down,
   *  because there is nothing yet for a choice to change (design: "Section 1 — Missing Age"). */
  missing?: string[];
  /** which answer to draw attention to when arriving from Home or Net worth */
  focus?: string | null;
  /** the three ways to add what is missing — one wording, shared with Home and Sharpen */
  onOpenDoor?: (route: string) => void;
}) {
  const needsAge = missing.includes('your age');
  const needsSpend = missing.includes('what you spend');
  const blocked = missing.length > 0;
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const accounts = store.assetAccounts ?? [];
  const bigCosts = store.bigCosts ?? [];
  const names = accountDisplayNames(accounts);
  const carId = primaryCarIdOf(accounts);

  const age = op.birthYear ? THIS_YEAR - Number(op.birthYear) : null;
  const [ageText, setAgeText] = useState(age != null ? String(age) : '');
  const spend = Math.round(store.retirementAssumptions?.spendMonthly ?? (Number(op.monthlySpending) || 0));
  const [spendText, setSpendText] = useState(spend ? String(spend) : '');

  // a fact writes through the moment it changes — no draft layer, nothing to remember to save
  const saveAge = (t: string) => {
    setAgeText(t);
    const n = Number(t);
    if (n >= MIN_AGE && n <= MAX_AGE) store.setOnboardingProfile?.({ ...op, birthYear: String(THIS_YEAR - n) });
  };
  const saveSpend = (t: string) => {
    setSpendText(t);
    const n = Number(t.replace(/[^0-9]/g, ''));
    if (n > 0) store.setRetirementAssumptions?.({ spendMonthly: n });
  };

  const dirty = draft.retireAge !== committed.retireAge
    || draft.horizonAge !== committed.horizonAge
    || draft.extraMonthly !== committed.extraMonthly;
  const counted = retirementEarmarkedValue(accounts);

  return (
    <View>
      <SectionBand title="FACTS — SAVE AS YOU GO" />

      <View style={[s.field, needsAge && s.missingRow, focus === 'your age' && s.focused]}>
        <Text style={[s.label, needsAge && s.missingLabel]}>Your age{needsAge ? <Chip kind="missing" /> : <Chip kind="fact" />}</Text>
        <TextInput style={s.input} value={ageText} onChangeText={saveAge} keyboardType="number-pad"
          placeholder="—" placeholderTextColor={Colors.textTertiary} maxLength={3}
          accessibilityLabel="Your age in years" />
      </View>

      <View style={[s.field, needsSpend && s.missingRow, focus === 'what you spend' && s.focused]}>
        <Text style={[s.label, needsSpend && s.missingLabel]}>Monthly spending in retirement{needsSpend ? <Chip kind="missing" /> : <Chip kind="fact" />}</Text>
        <View style={s.moneyIn}>
          <Text style={s.dollar}>$</Text>
          <TextInput style={s.input} value={spendText} onChangeText={saveSpend} keyboardType="number-pad"
            placeholder="—" placeholderTextColor={Colors.textTertiary} maxLength={7}
            accessibilityLabel="Monthly spending in retirement" />
        </View>
      </View>
      {/* the app asked what they spend TODAY and quietly adjusted it — now it asks the real question */}
      <Text style={s.hint}>What your savings actually have to cover. Prefilled from what you spend now.</Text>

      <SectionBand title="WHAT COUNTS TOWARD RETIREMENT" value={maskedMoney(counted)} />
      <Text style={s.hint}>Everything you own counts, except the home you live in and the car you drive. Tap any row to change it.</Text>
      {accounts.map((a: any) => {
        const counts = earmarkedAmount(a, carId) > 0 || (a.retirement_pct ?? earmarkDefault(a, carId)) > 0;
        return (
          <TouchableOpacity key={a.asset_id} style={s.row} accessibilityRole="button"
            accessibilityLabel={`${names.get(a.asset_id)}, ${spokenMoney(Math.round(a.balance ?? 0))}. ${counts ? 'Counts toward retirement' : "Doesn't count"}. Tap to change.`}
            onPress={() => store.updateAsset?.(a.asset_id, { retirement_pct: counts ? 0 : 100 })}>
            <Text style={[s.rowLabel, !counts && s.muted]}>{counts ? '✓ ' : '— '}{names.get(a.asset_id)}</Text>
            <Text style={[s.rowValue, !counts && s.muted]}>{maskedMoney(a.balance ?? 0)}</Text>
          </TouchableOpacity>
        );
      })}

      {/* THE THREE WAYS IN — the same wording as Home and Sharpen, never re-typed per screen */}
      <Text style={s.hint}>Missing something? Add it here:</Text>
      {DOORS.map((d) => (
        <TouchableOpacity key={d.route} style={s.row} accessibilityRole="button" accessibilityLabel={d.title.replace(' ›', '')}
          onPress={() => onOpenDoor?.(d.route)}>
          <Text style={s.rowLabel}>{d.icon}  {d.title}</Text>
        </TouchableOpacity>
      ))}

      <SectionBand title="BIG ONE-TIME COSTS" value={maskedMoney(bigCosts.reduce((t: number, c: any) => t + c.amount, 0))} />
      {bigCosts.map((c: any) => (
        <View key={c.id} style={s.row} accessible accessibilityLabel={`${c.label}, ${c.year}: ${spokenMoney(Math.round(c.amount))}`}>
          <Text style={s.rowLabel}>{c.label}, {c.year}<Chip kind="fact" /></Text>
          <Text style={s.rowValue}>{maskedMoney(c.amount)}</Text>
        </View>
      ))}
      {/* say WHY it matters where the choice is made, not in a help screen */}
      <Text style={s.hint}>
        {bigCosts.length === 0
          ? 'Nothing here yet — your odds currently assume no big one-time costs. Leave them out and the plan quietly assumes the roof never needs doing.'
          : 'Counted in the year you named, grown by inflation to that year.'}
      </Text>

      <SectionBand title="CHOICES — TRY THEM, NOTHING CHANGES YET" />
      <View style={blocked ? s.dimmed : undefined} pointerEvents={blocked ? 'none' : 'auto'}>
      <Stepper label="Retire at" value={draft.retireAge}
        onChange={(v) => onDraft({ ...draft, retireAge: Math.max(50, Math.min(80, v)) })} />
      <Stepper label="Plan to age" value={draft.horizonAge}
        onChange={(v) => onDraft({ ...draft, horizonAge: Math.max(draft.retireAge + 1, Math.min(110, v)) })} />
      <Stepper label="Extra saving each month" value={draft.extraMonthly} money step={100}
        onChange={(v) => onDraft({ ...draft, extraMonthly: Math.max(0, v) })} />

      </View>

      {blocked ? (
        <Text style={s.hint}>Nothing to try yet — the odds need {missing.join(' and ')} first.</Text>
      ) : dirty ? (
        <View style={s.commitWrap}>
          <TouchableOpacity style={s.commit} accessibilityRole="button" accessibilityLabel="Use this as my plan" onPress={onCommit}>
            <Text style={s.commitTxt}>Use as my plan</Text>
          </TouchableOpacity>
          <Text style={s.hint}>These are drafts — nothing changes until you tap Use as my plan.</Text>
        </View>
      ) : (
        <Text style={s.hint}>No changes to try yet — nothing to commit.</Text>
      )}
    </View>
  );
}

function Chip({ kind }: { kind: 'fact' | 'draft' | 'missing' }) {
  const style = kind === 'fact' ? s.factChip : kind === 'draft' ? s.draftChip : s.missingChip;
  return <Text style={style}>  {kind.toUpperCase()}  </Text>;
}

function Stepper({ label, value, onChange, money, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; money?: boolean; step?: number;
}) {
  return (
    <View style={s.stepper}>
      <Text style={s.label}>{label}<Chip kind="draft" /></Text>
      <View style={s.stepRow}>
        <TouchableOpacity style={s.btn} accessibilityRole="button" accessibilityLabel={`Lower ${label}`} onPress={() => onChange(value - step)}>
          <Text style={s.btnTxt}>−</Text>
        </TouchableOpacity>
        <Text style={s.stepVal}>{money ? `+${maskedMoney(value)}` : value}</Text>
        <TouchableOpacity style={s.btn} accessibilityRole="button" accessibilityLabel={`Raise ${label}`} onPress={() => onChange(value + step)}>
          <Text style={s.btnTxt}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  label: { fontSize: Typography.sizes.sm, color: Colors.textPrimary, flex: 1 },
  moneyIn: { flexDirection: 'row', alignItems: 'center' },
  dollar: { fontSize: Typography.sizes.base, color: Colors.textSecondary },
  input: { fontSize: Typography.sizes.base, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right', minWidth: 70, paddingVertical: Spacing.sm },
  hint: { fontSize: Typography.sizes.xs, lineHeight: 17, color: Colors.textSecondary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  rowLabel: { fontSize: Typography.sizes.sm, color: Colors.textPrimary, flex: 1 },
  rowValue: { fontSize: Typography.sizes.base, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  muted: { color: Colors.textSecondary },
  factChip: { fontSize: Typography.sizes.xs, fontWeight: '700', color: Colors.textSecondary, backgroundColor: Colors.bandLight },
  draftChip: { fontSize: Typography.sizes.xs, fontWeight: '700', color: Colors.primaryDeep, backgroundColor: Colors.primaryLight },
  missingChip: { fontSize: Typography.sizes.xs, fontWeight: '700', color: Colors.amber, backgroundColor: Colors.amberLight },
  missingRow: { backgroundColor: Colors.amberLight },
  missingLabel: { fontWeight: '700' },
  focused: { borderLeftWidth: 3, borderLeftColor: Colors.primaryDeep },
  dimmed: { opacity: 0.4 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  btn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontSize: Typography.sizes.md, fontWeight: '800', color: Colors.textPrimary },
  stepVal: { fontSize: Typography.sizes.md, fontWeight: '800', color: Colors.textPrimary, minWidth: 56, textAlign: 'center', fontVariant: ['tabular-nums'] },
  commitWrap: { paddingTop: Spacing.md },
  commit: { backgroundColor: Colors.primaryDeep, marginHorizontal: Spacing.md, paddingVertical: Spacing.md, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  commitTxt: { color: Colors.white, fontSize: Typography.sizes.base, fontWeight: '800' },
});
