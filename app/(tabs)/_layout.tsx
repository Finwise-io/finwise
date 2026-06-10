import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/utils/theme';
import TopBar from '../../src/components/TopBar';

// Consistent vector icons (filled when active, outline when not) with a small active indicator —
// cleaner and more app-like than mixed emoji.
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 56 }}>
      <View style={{ height: 3, width: 22, borderRadius: 2, marginBottom: 5, backgroundColor: focused ? Colors.primary : 'transparent' }} />
      <Ionicons name={(focused ? name : `${name}-outline`) as any} size={23} color={focused ? Colors.primary : Colors.textTertiary} />
    </View>
  );
}

export default function TabLayout() {
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
      <Tabs.Screen name="home"       options={{ title: 'Home',   tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }} />
      <Tabs.Screen name="budget"     options={{ title: 'Budget', tabBarIcon: ({ focused }) => <TabIcon name="pie-chart" focused={focused} /> }} />
      <Tabs.Screen name="invest"     options={{ title: 'Invest', tabBarIcon: ({ focused }) => <TabIcon name="trending-up" focused={focused} /> }} />
      <Tabs.Screen name="retirement" options={{ title: 'Retire', tabBarIcon: ({ focused }) => <TabIcon name="umbrella" focused={focused} /> }} />
      <Tabs.Screen name="goals"      options={{ title: 'Plan',   tabBarIcon: ({ focused }) => <TabIcon name="flag" focused={focused} /> }} />
      {/* routable from the Menu grid, hidden from the bar */}
      <Tabs.Screen name="analytics"  options={{ href: null }} />
      <Tabs.Screen name="tips"       options={{ href: null }} />
      <Tabs.Screen name="rewards"    options={{ href: null }} />
      <Tabs.Screen name="settings"   options={{ href: null }} />
    </Tabs>
  );
}
