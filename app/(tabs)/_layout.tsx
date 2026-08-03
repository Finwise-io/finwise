import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { DesktopSidebar } from '../../desktop/platform/DesktopSidebar';   // approved desktop shell (web only)
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/utils/theme';
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
  // Lens sets the tab ORDER (approved design): working = Home · Net worth · Invest · Cash flow · Plan;
  // retired = Home · Cash flow · Net worth · Plan · Invest (the paycheck sits next to Home).
  const lens = resolveLens(store.onboardingProfile, store.lensOverride);
  const order = tabOrder(lens);

  // DESKTOP shell (founder-approved mock, 2026-08-03): on web the five surfaces render as the
  // sidebar; the bottom bar disappears. Same TAB_META map, same lens order — one nav, two faces.
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <DesktopSidebar order={order} />
        <View style={{ flex: 1 }}>
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
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700' },
        header: () => <TopBar />,
      }}
    >
      {order.map((name) => (
        <Tabs.Screen key={name} name={name} options={{
          title: TAB_META[name].title,
          tabBarAccessibilityLabel: `${TAB_META[name].title} tab`,
          tabBarIcon: ({ focused }) => <TabIcon name={TAB_META[name].icon} focused={focused} />,
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
