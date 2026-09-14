// Draw-order steer sheet (FCC detailed design v1.1, Cash flow r45-r52): the order the math
// would tap the four kinds of accounts, each with its live balance; the user can reorder and
// re-run to see how long the money lasts and what the taxes do. Guide, never advise — the
// suggested order is a starting point, and the required-by-law withdrawal at 73+ is pinned
// and explained, never negotiable. Reordering works by BUTTONS (never drag-only, r-a11y).
// Honesty rules: if a reorder barely moves the answer we say 'about the same' instead of
// inventing precision; and the will-it-last PERCENT is deliberately not re-run per order —
// the odds model isn't order-aware, and a faked shift would be a trust bug.
import React, { useMemo, useState } from 'react';
import { Modal, View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { maskedMoney, spokenMoney } from './useMoney';
import { InfoDot } from './UI';
import {
  taxBucketSplit, withdrawalOrder, drawOrderOutcome, taxableGainShare, rmdAtAge,
  DEFAULT_DRAW_ORDER, rmdStartAgeFor, type DrawBucket,
} from '../domain/decumulation';
import { plannedMonthlySpend } from '../domain/budget';
import { currentRetirementIncomeMonthly, taxableAnnual, filingStatusOf, over65CountOf } from '../domain/income';
import { marginalBracketFor, ltcgRateFor } from '../domain/income/tax';
import { latestClose } from '../domain/performance';
import { ageFromProfile } from '../utils/persona';
import { modalAnimation } from '../hooks/reducedMotion';

const BUCKET_LABEL: Record<DrawBucket, string> = {
  cash: 'Cash', taxable: 'Taxable / brokerage', preTax: 'Pre-tax (401k / IRA)', roth: 'Roth',
};

export function DrawSteerSheet({ visible, onClose, projectionMode }: {
  visible: boolean; onClose: () => void; projectionMode?: boolean;
}) {
  const store = useStore() as any;
  const op = store.onboardingProfile ?? null;
  const accounts = store.assetAccounts ?? [];
  const A = store.retirementAssumptions ?? {};
  const age = ageFromProfile(op) ?? 68;
  const split = useMemo(() => taxBucketSplit(accounts), [accounts]);

  const saved: DrawBucket[] | null = Array.isArray(store.drawOrder) && store.drawOrder.length === 4 ? store.drawOrder as DrawBucket[] : null;
  const [order, setOrder] = useState<DrawBucket[]>(saved ?? [...DEFAULT_DRAW_ORDER]);
  const [ran, setRan] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const isDefault = order.join() === DEFAULT_DRAW_ORDER.join();

  const move = (b: DrawBucket, dir: -1 | 1) => {
    setOrder((o) => {
      const i = o.indexOf(b), j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const next = [...o]; [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setRan(false);
  };

  // the comparison (r50): the math's order vs mine — deterministic depletion, assumptions stated
  const outcome = useMemo(() => {
    const spendAnnual = (plannedMonthlySpend(op) || 0) * 12;
    const guaranteedAnnual = currentRetirementIncomeMonthly(op) * 12;
    if (spendAnnual <= 0) return null;
    const horizon = A.horizonAge ?? 92;
    const realGrowth = Math.max(-0.02, (A.expectedReturn ?? 0.055) - (A.inflation ?? 0.025));
    // G6 (founder ruling 2026-09-08): the person's OWN rates, never 22% / 15% / 50% built in.
    // Income base = everything they told us is taxable this year plus the guaranteed income they
    // receive now (Social Security counted in full — its untaxed share is not modelled, so the band
    // can read one step high). Gain share = the unrealised gain in their taxable holdings.
    const incomeBase = taxableAnnual(op) + guaranteedAnnual;
    const status = filingStatusOf(op), over65 = over65CountOf(op);
    const ordinaryRate = marginalBracketFor(incomeBase, status, over65);
    const capGainsRate = ltcgRateFor(incomeBase, status, over65);
    const gainShare = taxableGainShare(accounts, (t) => latestClose(store.priceCache?.[String(t).toUpperCase()]));
    const base = { age, horizon, spendAnnual, guaranteedAnnual, realGrowth, ordinaryRate, capGainsRate, gainShare };
    return {
      math: drawOrderOutcome(split, DEFAULT_DRAW_ORDER, base),
      mine: drawOrderOutcome(split, order, base),
      horizon, ordinaryRate, capGainsRate, gainShare,
    };
  }, [op, accounts, split, order, age, A.horizonAge, A.expectedReturn, A.inflation, store.priceCache]);

  const comparison = useMemo(() => {
    if (!outcome) return null;
    const { math, mine, horizon, ordinaryRate, capGainsRate, gainShare } = outcome;
    if (math.totalTaxes == null || mine.totalTaxes == null) {
      const why = math.unknown ?? mine.unknown ?? 'the tax on the draw cannot be calculated';
      return { text: `Can't compare the orders yet — ${why}. Add the purchase price of your taxable holdings and this will run.`, spoken: `Cannot compare yet: ${why}.`, rates: null };
    }
    const rates = `Rates used — yours, calculated: ${Math.round(ordinaryRate * 100)}% on pre-tax draws · ${Math.round(capGainsRate * 100)}% on gains · gains are ${Math.round((gainShare ?? 0) * 100)}% of your taxable holdings' value.`;
    const ageTxt = (r: { lastsToAge: number | null }) => (r.lastsToAge == null ? `past ${horizon}` : `${r.lastsToAge}`);
    const sameAge = (math.lastsToAge ?? horizon + 1) === (mine.lastsToAge ?? horizon + 1);
    const taxDelta = mine.totalTaxes - math.totalTaxes;
    const smallTax = Math.abs(taxDelta) < Math.max(500, math.totalTaxes * 0.05);
    if (sameAge && smallTax) return { text: 'With your order: about the same — this reorder changes taxes too little to move the answer.', spoken: 'About the same.', rates };
    return {
      text: `With your order: lasts to ${ageTxt(math)} → ${ageTxt(mine)} · taxes over the plan ~${maskedMoney(Math.round(math.totalTaxes))} → ~${maskedMoney(Math.round(mine.totalTaxes))} (estimates)`,
      spoken: `Lasts to age ${ageTxt(math)} with the math's order, ${ageTxt(mine)} with yours. Estimated taxes ${maskedMoney(Math.round(math.totalTaxes))} versus ${maskedMoney(Math.round(mine.totalTaxes))}.`,
      rates,
    };
  }, [outcome]);

  const keep = () => { store.setDrawOrder?.(isDefault ? null : order); onClose(); };
  const reset = () => { setOrder([...DEFAULT_DRAW_ORDER]); setRan(false); };

  const whySteps = useMemo(() => withdrawalOrder(split, age, order), [split, age, order]);

  return (
    <Modal visible={visible} transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close without saving" style={s.scrim} activeOpacity={1} onPress={onClose} />
      <View style={s.sheet}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Where the draw comes from</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[s.sub, { flex: 1 }]}>The order the math taps your accounts to fund the draw — a starting point. You decide.</Text>
            <InfoDot term="safeDraw" />
          </View>
          {projectionMode && <Text style={s.projBanner}>This is how your future draw would work — a projection, not today's money.</Text>}

          {/* pinned required-withdrawal step (r48) — law, not preference */}
          {age >= rmdStartAgeFor(age) && split.preTax > 0 && (
            <View style={[s.row, s.pinnedRow]} accessible
              accessibilityLabel={`Required withdrawal, first: ${spokenMoney(Math.round(rmdAtAge(split.preTax, age)))}. The law makes you take this from pre-tax accounts whether you need it or not. This step cannot move.`}>
              <Text style={s.rowNum}>⚖</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Required withdrawal — first</Text>
                <Text style={s.rowWhy}>The law takes this from pre-tax first, from {rmdStartAgeFor(age)}. It stays on top.</Text>
              </View>
              <Text style={s.rowVal}>{maskedMoney(Math.round(rmdAtAge(split.preTax, age)))}</Text>
            </View>
          )}

          {/* the four buckets, reorderable by buttons (r47/r52: $0 buckets shown, grayed) */}
          {order.map((b, i) => {
            const bal = split[b];
            const empty = bal <= 0;
            return (
              <View key={b} style={[s.row, empty && { opacity: 0.5 }]} accessible
                accessibilityLabel={`${BUCKET_LABEL[b]}, ${empty ? 'nothing here yet' : spokenMoney(Math.round(bal))}, ${i + 1} of ${order.length}.`}>
                <Text style={s.rowNum}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{BUCKET_LABEL[b]}</Text>
                  {empty && <Text style={s.rowWhy}>nothing here yet</Text>}
                </View>
                <Text style={s.rowVal}>{empty ? '—' : maskedMoney(Math.round(bal))}</Text>
                <TouchableOpacity accessibilityRole="button" disabled={i === 0} onPress={() => move(b, -1)}
                  accessibilityLabel={`Move ${BUCKET_LABEL[b]} up`} style={[s.moveBtn, i === 0 && { opacity: 0.3 }]}>
                  <Text style={s.moveTxt}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" disabled={i === order.length - 1} onPress={() => move(b, 1)}
                  accessibilityLabel={`Move ${BUCKET_LABEL[b]} down`} style={[s.moveBtn, i === order.length - 1 && { opacity: 0.3 }]}>
                  <Text style={s.moveTxt}>▼</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <TouchableOpacity accessibilityRole="button" onPress={() => setWhyOpen(!whyOpen)} accessibilityLabel="Why this order?">
            <Text style={s.link}>Why this order? {whyOpen ? '▴' : '›'}</Text>
          </TouchableOpacity>
          {whyOpen && whySteps.map((st) => (
            <Text key={st.label} style={s.whyLine}>· <Text style={{ fontWeight: '700' }}>{st.label}:</Text> {st.why}</Text>
          ))}

          {/* re-run comparison (r50) — or the honest 'about the same' */}
          {ran && comparison && (
            <View style={s.compareBox} accessible accessibilityLabel={comparison.spoken}>
              <Text style={s.compareTxt}>{comparison.text}</Text>
              {comparison?.rates ? <Text style={s.note}>{comparison.rates}</Text> : null}
              <Text style={s.note}>The will-it-last percent isn't re-run per order — the odds model isn't order-aware, and we won't fake a shift.</Text>
            </View>
          )}

          <TouchableOpacity accessibilityRole="button" style={s.primaryBtn} onPress={() => (ran ? keep() : setRan(true))}
            accessibilityLabel={ran ? 'Keep this order' : 'Re-run with my order'}>
            <Text style={s.primaryTxt}>{ran ? 'Keep this order' : 'Re-run with my order'}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={s.secondaryBtn} onPress={reset} accessibilityLabel="Reset to the math's order">
            <Text style={s.secondaryTxt}>Reset to the math's order</Text>
          </TouchableOpacity>
          <Text style={s.note}>Closing without saving changes nothing.</Text>
          <View style={{ height: 16 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: Colors.cardBg, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.lg, maxHeight: '88%' },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, marginBottom: Spacing.md, lineHeight: 19 },
  projBanner: { fontSize: 13, fontWeight: '700', color: Colors.amber, backgroundColor: Colors.amberLight, borderRadius: Radii.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, minHeight: 52, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pinnedRow: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, paddingHorizontal: 8 },
  rowNum: { width: 24, fontSize: 15, fontWeight: '800', color: Colors.textSecondary, textAlign: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  rowWhy: { fontSize: 13, color: Colors.textTertiary, marginTop: 1 },
  rowVal: { fontSize: 15, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
  moveBtn: { width: 44, height: 44, borderRadius: Radii.md, backgroundColor: Colors.bgTertiary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  moveTxt: { fontSize: 15, color: Colors.primaryDark, fontWeight: '800' },
  link: { fontSize: 15, fontWeight: '700', color: Colors.primaryDark, marginTop: Spacing.md },
  whyLine: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 19 },
  compareBox: { backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.md },
  compareTxt: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, lineHeight: 21 },
  note: { fontSize: 13, color: Colors.textTertiary, marginTop: 8, lineHeight: 17 },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  primaryTxt: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  secondaryBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  secondaryTxt: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
});
