// THE SECOND DIAL — how far today's money is toward the target nest egg THEY typed.
//
// It sits beside the odds dial and answers a DIFFERENT question, which is the whole point:
//   odds   — will the money last?
//   target — am I hitting my own number?
// They can disagree and both be right. Ray is 67% of the way to his number with 73% odds; Pat can
// be 114% of a modest target with 67% odds. Neither is an error and neither may be drawn as one,
// so this dial deliberately does NOT share a visual language with the odds ramp — one solid fill
// against a neutral remainder, never the five-colour good/bad spectrum, because "far along" is not
// "doing well".
//
// It also never caps the NUMERAL. Someone past their own target reads 114%, because that is true;
// only the arc stops at full, since an arc cannot draw past its own end.
import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { Colors } from '../utils/theme';

// The same geometry as GaugeArc, so the two dials beside each other can never drift apart:
// angle = π · pct/100 sweeping over the top, centre (52,56), needle radius 34, arc radius 44.
const CX = 52, CY = 56, R_ARC = 44, R_NEEDLE = 34;
const pt = (pct: number, r: number) => {
  const a = (Math.PI * Math.min(100, Math.max(0, pct))) / 100;
  return { x: CX - r * Math.cos(a), y: CY - r * Math.sin(a) };
};
const arc = (from: number, to: number) => {
  const a = pt(from, R_ARC), b = pt(to, R_ARC);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R_ARC} ${R_ARC} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
};

export function TargetGauge({ pct }: { pct?: number | null }) {
  const raw = pct ?? null;
  const filled = raw == null ? null : Math.min(100, Math.max(0, raw));
  const n = filled == null ? null : pt(filled, R_NEEDLE);
  return (
    <View accessible={false} style={{ position: 'relative' }}>
      <Svg width={104} height={62} viewBox="0 0 104 62">
        {/* the whole sweep, neutral — what is still to go */}
        <Path d={arc(0, 100)} stroke={Colors.bgTertiary} strokeWidth={9} strokeLinecap="round" fill="none" />
        {/* how far along, one solid tone — never a good/bad ramp */}
        {filled != null && filled > 0 && (
          <Path d={arc(0, filled)} stroke={Colors.primaryDeep} strokeWidth={9} strokeLinecap="round" fill="none" />
        )}
        {n && (
          <>
            <Line x1={CX} y1={CY} x2={n.x} y2={n.y} stroke={Colors.textPrimary} strokeWidth={3} strokeLinecap="round" />
            <Circle cx={CX} cy={CY} r={4} fill={Colors.textPrimary} />
          </>
        )}
      </Svg>
    </View>
  );
}
