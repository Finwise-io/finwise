// A MONEY BOX, AS THE INCOME DRAWING DRAWS IT (income-end-to-end_v07, phones 5 to 11; READ THIS FIRST row 2026-10-25).
//
// The box shows its figure the way a figure is printed — "$7,000", "$1,850.50" — while it is typed, where it showed "7000".
// What is STORED is the plain amount ("7000"), exactly as before, so no reader of the profile changes: the $ and the
// thousands marks are added for the eye and stripped on the way back in. A change that carries a letter is refused whole
// (DEC-3768c, 2026-10-10: stripping the letters out of "about 2k" would leave "2", the $2 the decision forbids).
//
// `tail` is what the drawing prints inside the box after the typed figure — the unit and what it is worth: the match box
// reads "50% · $400/month" (typed 50, then "% · $400/month") or "$150/month · a set amount". It is said with the box.
import React from 'react';
import { View, Text, TextInput, StyleSheet, type TextStyle } from 'react-native';
import { Colors, Radii } from '../utils/theme';
import { saidSentence } from './figure';   // the worth is heard in words: "a month", and "hidden" under hide-balances

/** A typed amount, kept to digits and one decimal point ("$1,850.50" → "1850.50", "1.2.3" → "1.23"). */
/* ─ MK-XS-F-200 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * plainAmount
 *
 * Answers ..... A typed amount kept to digits and one decimal point, the form it is stored in ("$1,850.50" becomes "1850.50"); it calculates nothing.
 *
 * Called by ... MK-XS-F-201 amountInBox · MoneyBox · BasePayScreen
 *
 * Numbered by hand 2026-10-26 (PF-TOOLS, the lead's instruction): the scan that issues identifiers reads functions in the
 *               calculation folders only, so this screen helper has no generated record; this one is written by hand in the generated form,
 *               as MK-NW-F-145's is
 * Changed ..... not in git yet (—)
 */
export function plainAmount(v: string): string {
  const digits = String(v ?? '').replace(/[^0-9.]/g, '');
  const dot = digits.indexOf('.');
  return dot < 0 ? digits : digits.slice(0, dot + 1) + digits.slice(dot + 1).replace(/\./g, '');
}

/** A stored amount as the box shows it: "$" and the thousands marks, the decimals kept as typed ("1850." → "$1,850.").
 *  Empty stays empty, so the box's placeholder shows. No rounding: the box shows what was typed, digit for digit. */
/* ─ MK-XS-F-201 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * amountInBox
 *
 * Answers ..... A stored amount as a money box shows it, with "$" and the thousands marks and the decimals as typed; empty stays empty; it calculates nothing.
 *
 * Called by ... MoneyBox · BasePayScreen
 *
 * Numbered by hand 2026-10-26 (PF-TOOLS, the lead's instruction): the scan that issues identifiers reads functions in the
 *               calculation folders only, so this screen helper has no generated record; this one is written by hand in the generated form,
 *               as MK-NW-F-145's is
 * Changed ..... not in git yet (—)
 */
export function amountInBox(raw: unknown, dollar = true): string {
  const s = plainAmount(raw == null ? '' : String(raw));
  if (!s) return '';
  const [int, dec] = s.split('.');
  const whole = (int.replace(/^0+(?=\d)/, '') || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${dollar ? '$' : ''}${whole}${dec != null ? `.${dec}` : ''}`;
}

/* ─ MK-XS-F-202 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * MoneyBox
 *
 * Answers ..... A money box as the income drawing draws it: the figure shown the way a figure is printed while it is typed, stored as the plain amount; a typed letter is refused whole (DEC-3768c); it calculates nothing.
 *
 * Called by ... BasePayScreen · IncomeManagerScreen
 *
 * Numbered by hand 2026-10-26 (PF-TOOLS, the lead's instruction): the scan that issues identifiers reads functions in the
 *               calculation folders only, so this screen helper has no generated record; this one is written by hand in the generated form,
 *               as MK-NW-F-145's is
 * Changed ..... not in git yet (—)
 */
export function MoneyBox({ value, onChangeText, a11y, placeholder, tail, share, bad, style }: {
  value: unknown; onChangeText: (plain: string) => void; a11y: string; placeholder?: string;
  /** printed inside the box after the typed figure — "% · $400/month", "/month · a set amount" */
  tail?: string;
  /** a share, not money: the box shows the digits with no $ (the % sign is in `tail`) */
  share?: boolean;
  /** the drawing's marked box (phone 7): this figure is one of three that cannot all be right */
  bad?: boolean;
  style?: TextStyle;
}) {
  return (
    <View style={[s.box, bad && s.bad]}>
      <TextInput style={[s.input, tail ? { flex: 0, minWidth: 24 } : null, style]} keyboardType="decimal-pad"
        accessibilityLabel={a11y} accessibilityHint={tail ? saidSentence(tail.replace(/^[·\s]+/, '')) : undefined}
        placeholder={placeholder} placeholderTextColor={Colors.textTertiary}
        value={amountInBox(value, !share)}
        onChangeText={(t) => { if (!/[A-Za-z]/.test(t)) onChangeText(plainAmount(t)); }} />
      {!!tail && <Text testID="box-tail" style={s.tail} importantForAccessibility="no" accessibilityElementsHidden>{tail}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.borderStrong, borderRadius: Radii.md,
         paddingHorizontal: 12, marginTop: 8, backgroundColor: Colors.cardBg, minHeight: 48 },
  bad: { borderColor: Colors.red, backgroundColor: Colors.redLight },
  input: { flex: 1, paddingVertical: 12, paddingHorizontal: 0, fontSize: 17, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  tail: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
});
