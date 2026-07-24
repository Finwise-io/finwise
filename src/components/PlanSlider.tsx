// A pure-JavaScript slider (no native dependency — a native slider package would have to ride a
// build; this works everywhere today). Big 28pt thumb on a 44pt-tall touch strip, live value,
// range words at the ends. Accessibility: adjustable role with increment/decrement actions.
// Approved in lookahead-v3 FINAL (2026-07-19).
import React, { useRef } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import { Colors } from '../utils/theme';

export function PlanSlider({ label, value, min, max, onChange, onSettle }: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void;           // live, while dragging
  onSettle?: (v: number) => void;          // finger up — the moment we SAVE
}) {
  // B45 founder finding ("touch it and it jumps to max"): PanResponder.create runs ONCE, so its
  // callbacks must never close over render-time values — the first version froze trackW at its
  // placeholder (1), making every touch compute x/1 → past max → clamped to max. Everything the
  // handlers need lives in refs that every render refreshes.
  const trackW = useRef(1);
  const valueRef = useRef(value);
  valueRef.current = value;
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v)));
  const fromX = (x: number) => clamp(min + (x / Math.max(1, trackW.current)) * (max - min));
  const api = useRef({ fromX, onChange, onSettle });
  api.current = { fromX, onChange, onSettle };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    // never let a parent ScrollView steal the drag mid-gesture ("you cannot slide it")
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => api.current.onChange(api.current.fromX(e.nativeEvent.locationX)),
    onPanResponderMove: (e) => api.current.onChange(api.current.fromX(e.nativeEvent.locationX)),
    onPanResponderRelease: () => api.current.onSettle?.(valueRef.current),
    onPanResponderTerminate: () => api.current.onSettle?.(valueRef.current),
  })).current;

  const pct = ((value - min) / (max - min)) * 100;
  return (
    <View style={s.wrap}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(ev) => {
        const next = clamp(value + (ev.nativeEvent.actionName === 'increment' ? 1 : -1));
        onChange(next); onSettle?.(next);
      }}>
      <View style={s.top}>
        <Text style={s.lbl}>{label}</Text>
        <Text style={s.val}>{value}</Text>
      </View>
      <View style={s.strip} testID="plan-slider-strip" onLayout={(e) => { trackW.current = e.nativeEvent.layout.width; }} {...pan.panHandlers}>
        <View style={s.track}>
          <View style={[s.fill, { width: `${pct}%` }]} />
        </View>
        <View style={[s.thumb, { left: `${pct}%` }]} pointerEvents="none" />
      </View>
      <View style={s.range}><Text style={s.rangeT}>{min}</Text><Text style={s.rangeT}>{max}</Text></View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  lbl: { fontSize: 15, color: Colors.textPrimary },
  val: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  strip: { height: 44, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: Colors.bgTertiary, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: Colors.primary },
  thumb: { position: 'absolute', top: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    borderWidth: 3, borderColor: Colors.white, marginLeft: -14,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },
  range: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  rangeT: { fontSize: 11, color: Colors.textTertiary },
});
