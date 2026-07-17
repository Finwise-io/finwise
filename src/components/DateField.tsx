// Tap-to-pick date (and optional time) field — replaces hand-typed YYYY-MM-DD inputs
// (design audit 2026-07-16: error-prone for a 55-70 audience; the Bonds editor set the pattern).
import React, { useState } from 'react';
import { Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Radii } from '../utils/theme';

const fmtISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseISO = (s: string) => { const [y, m, dd] = (s || '').split('-').map(Number); return y ? new Date(y, (m || 1) - 1, dd || 1) : new Date(); };
const human = (s: string) => (s ? parseISO(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '');

export function DateField({ value, onChange, label, style }: {
  value: string;                       // 'YYYY-MM-DD' ('' = unset)
  onChange: (iso: string) => void;
  label?: string;                      // a11y label; defaults to 'date'
  style?: any;                         // container style (defaults to the standard input box)
}) {
  const [show, setShow] = useState(false);
  return (
    <>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} style={[df.box, style]}
        accessibilityLabel={value ? `${label ?? 'date'}, ${human(value)}. Tap to change.` : `Pick a ${label ?? 'date'}`}
        onPress={() => { if (!show && !value) onChange(fmtISO(new Date())); setShow((v) => !v); }}>
        <Text style={{ fontSize: 16, color: value ? Colors.textPrimary : Colors.textTertiary }}>
          {value ? human(value) : 'Tap to pick a date'}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker value={value ? parseISO(value) : new Date()} mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e: any, d?: Date) => {
            if (Platform.OS !== 'ios') setShow(false);
            if (e?.type === 'dismissed') return;
            if (d) onChange(fmtISO(d));
          }} />
      )}
    </>
  );
}

const df = StyleSheet.create({
  box: { backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, minHeight: 48, justifyContent: 'center' },
});
