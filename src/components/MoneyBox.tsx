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
import { View, Text, TextInput, StyleSheet, type TextStyle, type StyleProp, type ReturnKeyTypeOptions } from 'react-native';
import { Colors, Radii } from '../utils/theme';
import { saidSentence } from './figure';   // the worth is heard in words: "a month", and "hidden" under hide-balances

/** A typed amount, kept to digits and one decimal point ("$1,850.50" → "1850.50", "1.2.3" → "1.23"). */
/* ─ MK-XS-F-200 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * plainAmount
 *
 * Answers ..... A typed amount kept to digits and one decimal point, the form it is stored in ("$1,850.50" becomes "1850.50"); it calculates nothing.
 *
 * Called by ... MK-XS-F-201 amountInBox · MK-XS-F-202 MoneyBox
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

/** A SAVED PRICE OR AMOUNT, AS A BOX OPENS ON IT (2026-10-31, FX-PF, NW3-03 / PF3-5; Q49: a price per share and cents have two
 *  decimals; the money-box rows of 2026-10-27, DEC-8930: ‘$192.50’ where ‘192.5’). A figure saved with one decimal opens with two —
 *  192.5 → "192.50" — so the box reads "$192.50", as the page under it and the activity sheet print it. A whole figure stays whole
 *  ("168"), and one with more decimals is handed over as saved (amountInBox shows it to the cent; nothing stored is rounded).
 *  Nothing saved: empty. It calculates nothing. */
/* ─ MK-XS-F-210 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * savedAmountForBox
 *
 * Answers ..... A saved price or amount as a money box opens on it: one decimal opens with two (192.5 → "192.50"), a whole figure stays whole, more decimals are handed over as saved, nothing saved is empty; it calculates nothing.
 *
 * Called by ... AccountPortfolioScreen · PerformanceScreen
 *
 * Numbered by hand 2026-11-01 (PF-TOOLS, the lead's instruction): the scan that issues identifiers reads functions in the
 *               calculation folders only, so this screen helper has no generated record; this one is written by hand in the generated form,
 *               as MK-NW-F-145's is
 * Changed ..... not in git yet (—)
 */
export function savedAmountForBox(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '';
  const s = String(n);
  return /\.\d$/.test(s) ? `${s}0` : s;
}

/** A stored amount as the box shows it: "$" and the thousands marks, the decimals kept as typed ("1850." → "$1,850.").
 *  Empty stays empty, so the box's placeholder shows. No rounding: the box shows what was typed, digit for digit. */
/* ─ MK-XS-F-201 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * amountInBox
 *
 * Answers ..... A stored amount as a money box shows it, with "$" and the thousands marks; one or two decimals as typed, more shown to the cent (half up, at display, on the digits; Q49 — 2026-10-30); empty stays empty; it calculates nothing.
 *
 * Called by ... MK-XS-F-202 MoneyBox
 *
 * Numbered by hand 2026-10-26 (PF-TOOLS, the lead's instruction): the scan that issues identifiers reads functions in the
 *               calculation folders only, so this screen helper has no generated record; this one is written by hand in the generated form,
 *               as MK-NW-F-145's is
 * Changed ..... not in git yet (—)
 */
export function amountInBox(raw: unknown, dollar = true): string {
  const s = plainAmount(raw == null ? '' : String(raw));
  if (!s) return '';
  let [int, dec] = s.split('.');
  // A MONEY BOX HOLDS WHOLE DOLLARS OR CENTS (Q49; FX-NW's finding of 2026-10-30: a stored 24100.375 showed "$24,100.375"). A figure
  // held with more decimals is SHOWN to the cent, rounded once, here at display, half up on the digits themselves (no float
  // arithmetic, so 24100.375 is 24100.38 and never 24100.37); what is stored is not touched.
  if (dec != null && dec.length > 2) {
    const up = Number(dec[2]) >= 5;
    let cents = dec.slice(0, 2);
    if (up) {
      const n = String(Number(int + cents) + 1).padStart(int.length + 2, '0');
      int = n.slice(0, n.length - 2); cents = n.slice(-2);
    }
    dec = cents;
  }
  const whole = (int.replace(/^0+(?=\d)/, '') || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${dollar ? '$' : ''}${whole}${dec != null ? `.${dec}` : ''}`;
}

/* ─ MK-XS-F-202 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * MoneyBox
 *
 * Answers ..... Every money box in the app (DEC-8385): the figure shown the way a figure is printed while it is typed — "$7,000", or "7,000" beside a $ or a unit the screen prints — stored as the plain amount; a typed letter or a third decimal is refused whole (DEC-3768c; Q49); `bare` keeps the screen's own box style; it calculates nothing.
 *
 * Called by ... 97 places in 35 files on 2026-10-30, counted by src/__tests__/every_money_box_is_moneybox.test.tsx
 *
 * Numbered by hand 2026-10-26 (PF-TOOLS, the lead's instruction): the scan that issues identifiers reads functions in the
 *               calculation folders only, so this screen helper has no generated record; this one is written by hand in the generated form,
 *               as MK-NW-F-145's is
 * Changed ..... not in git yet (—)
 */
export function MoneyBox({ value, onChangeText, a11y, placeholder, tail, share, bad, style, bare, inputRef, testID, editable, autoFocus,
  onBlur, onFocus, onSubmitEditing, onEndEditing, returnKeyType, selectTextOnFocus, accessibilityHint, placeholderTextColor, maxDigits, dollarBeside, unitBeside }: {
  value: unknown; onChangeText: (plain: string) => void; a11y?: string; placeholder?: string;
  /** printed inside the box after the typed figure — "% · $400/month", "/month · a set amount" */
  tail?: string;
  /** a share, not money: the box shows the digits with no $ (the % sign is in `tail`) */
  share?: boolean;
  /** the drawing's marked box (phone 7): this figure is one of three that cannot all be right */
  bad?: boolean;
  style?: StyleProp<TextStyle>;
  /** EVERY MONEY BOX, ONE COMPONENT (DEC-8385; FX-SHARED 2026-10-27, NW2-19, MI2-01): a box that keeps its own screen's look — the
   *  input alone, in the `style` it is handed, with no frame of MoneyBox's around it. Only the figure's form is MoneyBox's: "$7,000"
   *  while it is typed, the plain 7000 stored. src/__tests__/every_money_box_is_moneybox.test.tsx counts every box in the app. */
  bare?: boolean;
  inputRef?: React.Ref<TextInput>;
  testID?: string; editable?: boolean; autoFocus?: boolean; selectTextOnFocus?: boolean;
  onBlur?: () => void; onFocus?: () => void; onSubmitEditing?: () => void; onEndEditing?: () => void; returnKeyType?: ReturnKeyTypeOptions;
  accessibilityHint?: string; placeholderTextColor?: string;
  /** the most digits the stored amount may hold — counted on the plain amount, so the $ and the commas never cut a figure short */
  maxDigits?: number;
  /** the screen prints its own $ just before the box: the box reads "1,000", so the figure reads "$ 1,000" with the $ printed once */
  dollarBeside?: boolean;
  /** a $ / % toggle beside the box shows the unit: the box prints the digits with their commas only, so the unit is printed once */
  unitBeside?: boolean;
}) {
  const shown = amountInBox(value, !share && !dollarBeside && !unitBeside);
  const typed = (t: string) => {
    if (/[A-Za-z]/.test(t)) return;
    const plain = plainAmount(t);
    if (maxDigits != null && plain.replace(/\D/g, '').length > maxDigits) return;
    if ((plain.split('.')[1] ?? '').length > 2) return;   // whole dollars or cents (Q49): a third decimal is refused, as a letter is
    onChangeText(plain);
  };
  if (bare) {
    return (
      <TextInput ref={inputRef} style={style} keyboardType="decimal-pad" testID={testID} editable={editable} autoFocus={autoFocus}
        selectTextOnFocus={selectTextOnFocus} onBlur={onBlur} onFocus={onFocus} onSubmitEditing={onSubmitEditing} onEndEditing={onEndEditing} returnKeyType={returnKeyType}
        accessibilityLabel={a11y} accessibilityHint={accessibilityHint}
        placeholder={placeholder} placeholderTextColor={placeholderTextColor ?? Colors.textTertiary}
        value={shown} onChangeText={typed} />
    );
  }
  return (
    <View style={[s.box, bad && s.bad]}>
      <TextInput ref={inputRef} style={[s.input, tail ? { flex: 0, minWidth: 24 } : null, style]} keyboardType="decimal-pad" testID={testID}
        editable={editable} autoFocus={autoFocus} onBlur={onBlur} onFocus={onFocus} onSubmitEditing={onSubmitEditing} onEndEditing={onEndEditing} returnKeyType={returnKeyType}
        accessibilityLabel={a11y} accessibilityHint={accessibilityHint ?? (tail ? saidSentence(tail.replace(/^[·\s]+/, '')) : undefined)}
        placeholder={placeholder} placeholderTextColor={placeholderTextColor ?? Colors.textTertiary}
        value={shown}
        onChangeText={typed} />
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
