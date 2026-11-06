import { Tabs } from 'expo-router';
import { View, Platform, Text } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { DesktopSidebar } from '../../desktop/platform/DesktopSidebar';   // approved desktop shell (web only)
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../../src/utils/theme';
import TopBar from '../../src/components/TopBar';
import { useStore } from '../../src/store/useStore';
import { resolveLens, tabOrder } from '../../src/domain/profile/lens';
import { TAB_META } from '../../src/constants/tabs';

// Active tab = label + underline, never color alone (FCC accessibility rule); filled icon when active.
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 56 }}>
      <View style={{ height: 3, width: 22, borderRadius: 2, marginBottom: 5, backgroundColor: focused ? Colors.primary : 'transparent' }} />
      <Ionicons name={(focused ? name : `${name}-outline`) as any} size={23} color={focused ? Colors.primary : Colors.textTertiary} />
    </View>
  );
}

export default function TabLayout() {
  const store = useStore() as any;
  // Lens sets the tab ORDER (approved design): working = Home · Net worth · Performance · Cash flow ·
  // Plan; retired = Home · Cash flow · Net worth · Plan · Performance (the paycheck sits next to Home).
  // The route key is `invest`; the TITLE is Performance (founder, 2026-08-04).
  const lens = resolveLens(store.onboardingProfile, store.lensOverride);
  const order = tabOrder(lens);

  // DESKTOP shell (founder-approved mock, 2026-08-03): on web the five surfaces render as the
  // sidebar; the bottom bar disappears. Same TAB_META map, same lens order — one nav, two faces.
  // DESKTOP shell only when the window is actually desktop-wide — a narrow browser (or a phone
  // browser) gets the real phone layout, which is also how a small window should behave.
  const { width: winW } = useWindowDimensions();
  if (Platform.OS === 'web' && winW >= 900) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <DesktopSidebar order={order} />
        <View style={{ flex: 1, alignItems: 'center', backgroundColor: Colors.bgSecondary }}>
          {/* approved desktop UX rule: content never wider than comfortable reading */}
          <View style={{ flex: 1, width: '100%', maxWidth: 1160 }}>
          <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
            {order.map((name) => (
              <Tabs.Screen key={name} name={name} />
            ))}
            <Tabs.Screen name="budget" options={{ href: null }} />
            <Tabs.Screen name="retirement" options={{ href: null }} />
            <Tabs.Screen name="goals" options={{ href: null }} />
            <Tabs.Screen name="tips" options={{ href: null }} />
            <Tabs.Screen name="rewards" options={{ href: null }} />
            <Tabs.Screen name="settings" options={{ href: null }} />
          </Tabs>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.cardBg,
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
          height: 84,
          paddingBottom: 20,
          paddingTop: 6,
        },
        // THE BAR THE APP DRAWS IS THE DESIGN (the lead's ruling R9, 2026-10-27): the approved Net worth v08 (DEC-0644) draws these
        // names, colours and the green bar; the picked tab is brand green #178F6B (UX design v1.2, the screen standard §2.5). The
        // names sit at 11, the scale's smallest step (DEC-0059) — they were 10.5, the one size in the app off the scale.
        tabBarLabelStyle: { fontSize: Typography.sizes.xs, fontWeight: '700' },
        header: () => <TopBar />,
      }}
    >
      {order.map((name) => (
        <Tabs.Screen key={name} name={name} options={{
          title: TAB_META[name].title,
          tabBarAccessibilityLabel: `${TAB_META[name].title} tab`,
          tabBarIcon: ({ focused }) => <TabIcon name={TAB_META[name].icon} focused={focused} />,
          // A TAB'S NAME IS NEVER CUT OFF (design review, 2026-11-06): "Performance" read "Performa…" on his phone (Build 55,
          // IMG_0891, IMG_0893); Net worth v08 and Performance v17 draw it in full. One line, at 11, shrinking only as far as it
          // must to fit the tab's width.
          tabBarLabel: ({ color }) => (
            <Text testID={`tab-label-${name}`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
              style={{ fontSize: Typography.sizes.xs, fontWeight: '700', color, paddingHorizontal: 2 }}>{TAB_META[name].title}</Text>
          ),
        }} />
      ))}
      {/* legacy destinations — routable (Menu / deep links), hidden from the bar */}
      <Tabs.Screen name="budget"     options={{ href: null }} />
      <Tabs.Screen name="retirement" options={{ href: null }} />
      <Tabs.Screen name="goals"      options={{ href: null }} />
      <Tabs.Screen name="tips"       options={{ href: null }} />
      <Tabs.Screen name="rewards"    options={{ href: null }} />
      <Tabs.Screen name="settings"   options={{ href: null }} />
    </Tabs>
  );
}
