// The ONE odds spectrum (founder-approved Plan mock v9, 2026-08-01): the five-color arc Home has
// always shown, now shared. With a percent → a needle marks it. Without one → the locked sample
// state (the honest tease — never a fake number presented as real).
import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { Colors, GaugeRamp } from '../utils/theme';

const ARCS = [
  'M 8 56 A 44 44 0 0 1 17.4 29.2',
  'M 21.2 24.4 A 44 44 0 0 1 44.6 8.6',
  'M 50.6 7.2 A 44 44 0 0 1 74.9 12.9',
  'M 80.1 16.4 A 44 44 0 0 1 93.9 39.1',
  'M 95.6 44.9 A 44 44 0 0 1 96 56',
];

export function GaugeArc({ pct, locked }: { pct?: number | null; locked?: boolean }) {
  const p = pct != null ? Math.min(100, Math.max(0, pct)) : null;
  const a = p != null ? (Math.PI * p) / 100 : null;
  return (
    <View accessible={false} style={{ position: 'relative' }}>
      <Svg width={104} height={62} viewBox="0 0 104 62">
        {ARCS.map((d, i) => (
          <Path key={d} d={d} stroke={GaugeRamp[i]} strokeWidth={9} strokeLinecap="round" fill="none" opacity={0.9} />
        ))}
        {a != null && (
          <>
            <Line x1={52} y1={56} x2={52 - 34 * Math.cos(a)} y2={56 - 34 * Math.sin(a)} stroke={Colors.textPrimary} strokeWidth={3} strokeLinecap="round" />
            <Circle cx={52} cy={56} r={4} fill={Colors.textPrimary} />
          </>
        )}
      </Svg>
      {locked && <Text style={{ position: 'absolute', left: 40, top: 26, fontSize: 15 }}>🔒</Text>}
    </View>
  );
}
