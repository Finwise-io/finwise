// Tap-to-pick date (and optional time) field — replaces hand-typed YYYY-MM-DD inputs
// (design audit 2026-07-16: error-prone for a 55-70 audience; the Bonds editor set the pattern).
import React, { useState } from 'react';
import { Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Radii } from '../utils/theme';

const fmtISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseISO = (s: string) => { const [y, m, dd] = (s || '').split('-').map(Number); return y ? new Date(y, (m || 1) - 1, dd || 1) : new Date(); };
const human = (s: string) => (s ? parseISO(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '');

export function DateField({ value, onChange, label, style, initial, minimumDate, maximumDate }: {
  value: string;                       // 'YYYY-MM-DD' ('' = unset)
  onChange: (iso: string) => void;
  label?: string;                      // a11y label; defaults to 'date'
  style?: any;                         // container style (defaults to the standard input box)
  // A BOND OR CD DATE IS PICKED, NEVER TYPED (DEC-4059b, 2026-10-10): the date the picker opens on when
  // nothing is chosen yet (a maturity opens ten years out, as the Bonds editor and Add an account do),
  // and the earliest and latest days it offers. All three optional; today is the default opening day.
  initial?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const [show, setShow] = useState(false);
  return (
    <>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} style={[df.box, style]}
        accessibilityLabel={value ? `${label ?? 'date'}, ${human(value)}. Tap to change.` : `Pick a ${label ?? 'date'}`}
        onPress={() => { if (!show && !value) onChange(initial || fmtISO(new Date())); setShow((v) => !v); }}>
        <Text style={{ fontSize: 17, color: value ? Colors.textPrimary : Colors.textTertiary }}>
          {value ? human(value) : 'Tap to pick a date'}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker value={value ? parseISO(value) : initial ? parseISO(initial) : new Date()} mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={minimumDate} maximumDate={maximumDate}
          onChange={(e: any, d?: Date) => {
            if (Platform.OS !== 'ios') setShow(false);
            if (e?.type === 'dismissed') return;
            if (d) onChange(fmtISO(d));
          }} />
      )}
    </>
  );
}

/** A DATE THE APP CANNOT READ IS CORRECTED BY THE PERSON, FROM A PICKER (DEC-4059c, 2026-10-10). His words:
 *  "Say date cannot be read. Edit date. and give user an option to enter or correct date." A link reading
 *  `text` ("Edit date") that opens the same date picker as DateField; the chosen day is handed to onPick. */
export function DateLink({ text, onPick, label, style, maximumDate }: {
  text: string; onPick: (iso: string) => void; label?: string; style?: any; maximumDate?: Date;
}) {
  const [show, setShow] = useState(false);
  const [day, setDay] = useState<Date>(maximumDate ?? new Date());
  return (
    <>
      <Text accessibilityRole="button" accessibilityLabel={label ?? text} style={[df.link, style]} onPress={() => setShow((v) => !v)}>{text}</Text>
      {show && (
        <DateTimePicker value={day} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} maximumDate={maximumDate}
          onChange={(e: any, d?: Date) => {
            if (Platform.OS !== 'ios') setShow(false);
            if (e?.type === 'dismissed' || !d) return;
            setDay(d); onPick(fmtISO(d));
          }} />
      )}
    </>
  );
}

const df = StyleSheet.create({
  link: { color: Colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
  box: { backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, minHeight: 48, justifyContent: 'center' },
});
