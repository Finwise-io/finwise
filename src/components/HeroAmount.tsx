// THE hero money number (Build-47 walk row 11, audit UX #4): every screen's big money figure
// renders through this one component. Sizes stay per-screen (the founder kept the approved
// sizes — 2026-07-28 decision); what can no longer drift is the family: weight 800 and
// tabular numerals are guaranteed here, not re-typed per screen.
import React from 'react';
import { Text, type TextProps } from 'react-native';

export function HeroAmount({ style, children, ...rest }: TextProps) {
  return (
    <Text {...rest} style={[{ fontWeight: '800', fontVariant: ['tabular-nums'] }, style]}>
      {children}
    </Text>
  );
}
