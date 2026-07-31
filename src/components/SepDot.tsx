// The separator dot as a DESIGNED glyph (founder pick C, 2026-07-31): every separator renders one
// step DARKER than its surrounding text — chosen over lighter so 55-70 eyes never lose the
// structure. One token, identical everywhere; that consistency is the professional finish.
import React from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import { Colors } from '../utils/theme';

export const SEP_DOT_COLOR = Colors.sepDot;   // darker than textSecondary/textTertiary, calmer than pure text-primary

/** Join text parts with dark separator dots inside ONE Text line. */
export function DotJoined({ parts, style, numberOfLines }: {
  parts: (string | null | undefined | false)[]; style?: StyleProp<TextStyle>; numberOfLines?: number;
}) {
  const real = parts.filter(Boolean) as string[];
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {real.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Text style={{ color: SEP_DOT_COLOR, fontWeight: '700' }}> · </Text>}
          {p}
        </React.Fragment>
      ))}
    </Text>
  );
}
