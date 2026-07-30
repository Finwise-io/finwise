// THE hero money number (Build-47 walk row 11, audit UX #4): every screen's big money figure
// renders through this one component. Sizes stay per-screen (the founder kept the approved
// sizes — 2026-07-28 decision); what can no longer drift is the family: weight 800 and
// tabular numerals are guaranteed here, not re-typed per screen.
//
// Walk row 21 (audit UX #16): the component carries a spoken label BY DEFAULT — masked dots are
// spoken as "hidden", so a screen that forgets its own label still reads honestly. An explicit
// accessibilityLabel always wins.
import React from 'react';
import { Text, type TextProps } from 'react-native';

export function HeroAmount({ style, children, accessibilityLabel, ...rest }: TextProps) {
  const derived = typeof children === 'string' ? children.replace(/•+/g, 'hidden') : undefined;
  return (
    <Text accessibilityLabel={accessibilityLabel ?? derived} {...rest}
      style={[{ fontWeight: '800', fontVariant: ['tabular-nums'] }, style]}>
      {children}
    </Text>
  );
}
