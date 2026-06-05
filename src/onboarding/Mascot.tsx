// Centi — FinWise's coin mascot. A friendly gold coin that bobs and wiggles,
// with the step's emoji floating beside it as an "accessory" badge.
// Pure SVG + core Animated (transform, native driver) — no native dependency.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Colors } from '../utils/theme';

type Mood = 'happy' | 'cool' | 'celebrate';

// Accessories that should put the coin in shades 😎
const COOL = new Set(['🏖️', '🛟', '🌴', '✈️']);

export default function Mascot({
  accessory, size = 96, mood,
}: { accessory?: string; size?: number; mood?: Mood }) {
  const resolvedMood: Mood = mood ?? (accessory && COOL.has(accessory) ? 'cool' : 'happy');

  const bob = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;
  const badgeFloat = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // entrance pop
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }).start();
    // gentle perpetual bob
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
    // playful wiggle, slightly out of phase
    Animated.loop(
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
    // badge bobs opposite the coin
    Animated.loop(
      Animated.sequence([
        Animated.timing(badgeFloat, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(badgeFloat, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const rotate = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-5deg', '5deg'] });
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const badgeY = badgeFloat.interpolate({ inputRange: [0, 1], outputRange: [0, 7] });

  const badgeSize = size * 0.42;

  return (
    <View style={{ width: size, height: size + 8, marginBottom: 8 }}>
      {/* soft shadow that breathes with the bob */}
      <Animated.View
        style={[
          styles.shadow,
          { width: size * 0.55, left: size * 0.22, bottom: 0 },
          { transform: [{ scaleX: bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) }] },
        ]}
      />
      <Animated.View style={{ transform: [{ translateY }, { rotate }, { scale }] }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="coin" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FBE08A" />
              <Stop offset="1" stopColor="#EBB23A" />
            </LinearGradient>
          </Defs>
          {/* rim + body */}
          <Circle cx="50" cy="52" r="40" fill="#D99A26" />
          <Circle cx="50" cy="52" r="35" fill="url(#coin)" />
          {/* shine */}
          <Ellipse cx="37" cy="36" rx="9" ry="6" fill="rgba(255,255,255,0.45)" />
          {/* cheeks */}
          <Circle cx="33" cy="58" r="5" fill="rgba(232,90,90,0.35)" />
          <Circle cx="67" cy="58" r="5" fill="rgba(232,90,90,0.35)" />
          {/* eyes */}
          {resolvedMood === 'cool' ? (
            <>
              <Rect x="28" y="44" width="18" height="9" rx="3" fill="#2A2410" />
              <Rect x="54" y="44" width="18" height="9" rx="3" fill="#2A2410" />
              <Rect x="46" y="47" width="8" height="3" fill="#2A2410" />
            </>
          ) : (
            <>
              <Ellipse cx="40" cy="49" rx="3.6" ry="5" fill="#2A2410" />
              <Ellipse cx="60" cy="49" rx="3.6" ry="5" fill="#2A2410" />
              <Circle cx="41.2" cy="47.4" r="1.3" fill="#fff" />
              <Circle cx="61.2" cy="47.4" r="1.3" fill="#fff" />
            </>
          )}
          {/* smile */}
          <Path
            d={resolvedMood === 'celebrate' ? 'M36 58 Q50 76 64 58 Q50 66 36 58 Z' : 'M38 60 Q50 71 62 60'}
            stroke="#2A2410" strokeWidth="3" strokeLinecap="round"
            fill={resolvedMood === 'celebrate' ? '#7A1F1F' : 'none'}
          />
          {/* little feet */}
          <Ellipse cx="40" cy="92" rx="7" ry="4" fill="#D99A26" />
          <Ellipse cx="60" cy="92" rx="7" ry="4" fill="#D99A26" />
        </Svg>
      </Animated.View>

      {!!accessory && (
        <Animated.View
          style={[
            styles.badge,
            { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, right: -2, top: size * 0.04 },
            { transform: [{ translateY: badgeY }] },
          ]}
        >
          <Text style={{ fontSize: badgeSize * 0.55 }}>{accessory}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { position: 'absolute', height: 8, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.10)' },
  badge: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, shadowColor: '#000', shadowOpacity: 0.12,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
});
