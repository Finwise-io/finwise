// A pure-JavaScript slider (no native dependency — a native slider package would have to ride a
// build; this works everywhere today). Big 28pt thumb on a 44pt-tall touch strip, live value,
// range words at the ends. Accessibility: adjustable role with increment/decrement actions.
// Approved in lookahead-v3 FINAL (2026-07-19).
import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../utils/theme';
import { useSliderPan } from './sliderGesture';

export function PlanSlider({ label, value, min, max, onChange, onSettle, onDraggingChange }: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void;           // live, while dragging
  onSettle?: (v: number) => void;          // finger up — the moment we SAVE
  onDraggingChange?: (dragging: boolean) => void;   // parent disables its ScrollView during the drag
}) {
  // The drag lives in the shared engine (sliderGesture.ts) — the B45/B46 device lessons (capture
  // claim, termination refusal, pageX anchoring, scroll stand-down) are encoded ONCE there.
  const valueRef = useRef(value);
  valueRef.current = value;
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v)));
  const { panHandlers, setTrackWidth } = useSliderPan({
    onRatio: (r) => onChange(clamp(min + r * (max - min))),
    onDraggingChange,
    onSettle: () => onSettle?.(valueRef.current),
  });

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
      <View style={s.strip} testID="plan-slider-strip" onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)} {...panHandlers}>
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
