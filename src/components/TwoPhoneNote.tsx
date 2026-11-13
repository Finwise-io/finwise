// THE NOTE WHEN ONE ITEM WAS CHANGED ON TWO PHONES — two-phone change note v01 (2026-11-12, cloud copy R9; his confirmation form,
// DEC-10471). Under the item it is about, on the phone whose change was not kept: what the other phone indicates and when, what you
// entered and when, which one counts, then "Confirm keeping …", with Keep / Change. After Keep, one quiet line with "Change ›".
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radii, Tap } from '../utils/theme';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const clock = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Aug 20 at 10:20" — and the second time of a pair on the same day as only "10:00", as the drawing writes it. */
export function whenChanged(iso: string | null | undefined, sameDayAs?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (sameDayAs && sameDay(d, new Date(sameDayAs))) return clock(d);
  return `${MON[d.getMonth()]} ${d.getDate()} at ${clock(d)}`;
}

export interface TwoPhoneNoteProps {
  item: string;            // "Grocery"
  otherPhone: string;      // "Sam’s phone", or "your other phone"
  otherChange: string;     // "Sam’s change", or "your other phone’s change"
  kept: string;            // "$950/month" — the value that counts
  keptAt: string | null;   // when the other phone set it
  mine: string;            // "$1,000/month" — what this phone entered
  mineAt: string | null;   // when this phone entered it
  totalLabel: string;      // "Planned expenses"
  keptTotal: string;       // "$2,050"
  mineTotal: string;       // "$2,100"
  answered: boolean;       // Keep was chosen
  onKeep: () => void;
  onChange: () => void;    // saves a new change, stamped now (R9)
  onReopen: () => void;    // "Change ›" on the quiet line
}

export function TwoPhoneNote(p: TwoPhoneNoteProps) {
  if (p.answered) {
    return (
      <View style={s.kept} testID="two-phone-kept">
        <Text style={s.keptT}>
          <Text style={s.keptMark}>✓ Kept</Text>  {p.item} at {p.kept}, {p.otherChange} of {whenChanged(p.keptAt)}. Your {p.mine} was not used.
        </Text>
        <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="button" onPress={p.onReopen} style={s.reopen}>
          <Text style={s.door}>Change ›</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={s.box} testID="two-phone-note">
      <Text style={s.head}>{p.item} was changed on two phones</Text>
      <Text style={s.line}>
        The information from {p.otherPhone} indicates {p.item} {p.kept}, set {whenChanged(p.keptAt)}; you entered {p.mine} on this phone at {whenChanged(p.mineAt, p.keptAt)}, before it was online. The later one counts. Confirm keeping {p.item} at {p.kept}.
      </Text>
      <View style={s.choices}>
        <TouchableOpacity accessibilityRole="button" style={[s.choice, s.choiceFill]} onPress={p.onKeep}>
          <Text style={[s.choiceT, s.choiceTFill]}>Keep {p.kept}</Text>
          <Text style={[s.choiceSub, s.choiceTFill]}>{p.totalLabel} stay {p.keptTotal}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={[s.choice, s.choiceLine]} onPress={p.onChange}>
          <Text style={[s.choiceT, s.choiceTLine]}>Change to {p.mine}</Text>
          <Text style={[s.choiceSub, s.choiceTLine]}>{p.totalLabel} become {p.mineTotal}</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.small}>Nothing is lost: your {p.mine} is kept in this note until you choose.</Text>
    </View>
  );
}

// THE ONE AMBER BOX (account page v02's question box; DataGapsBanner): the headline at 700 in amber, the doors in the box
const s = StyleSheet.create({
  box: { backgroundColor: Colors.amberLight, borderWidth: 1, borderColor: Colors.amber, borderRadius: Radii.md, paddingVertical: 10, paddingHorizontal: Spacing.md, marginHorizontal: 16, marginBottom: Spacing.sm },
  head: { fontSize: 13, fontWeight: '700', color: Colors.amber },
  line: { fontSize: 13, color: Colors.textPrimary, marginTop: 2, lineHeight: 18 },
  choices: { flexDirection: 'row', gap: 8, marginTop: 8 },
  choice: { flex: 1, minHeight: 44, borderRadius: Radii.md, paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center' },
  choiceFill: { backgroundColor: Colors.primaryDeep },
  choiceLine: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primaryDeep },
  choiceT: { fontSize: 13, fontWeight: '800' },
  choiceSub: { fontSize: 11, marginTop: 1 },
  choiceTFill: { color: Colors.white },
  choiceTLine: { color: Colors.primaryDeep },
  small: { fontSize: 11, color: Colors.textSecondary, marginTop: 6 },
  kept: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: Spacing.sm, gap: 8 },
  keptT: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  keptMark: { color: Colors.primary, fontWeight: '700' },
  reopen: { minHeight: 44, justifyContent: 'center' },
  door: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
