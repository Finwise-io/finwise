import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { Colors } from '../../src/utils/theme';
import TopBar from '../../src/components/TopBar';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
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
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', marginTop: 2 },
        header: () => <TopBar />,
      }}
    >
      <Tabs.Screen name="home"       options={{ title: 'Home',   tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="budget"     options={{ title: 'Budget', tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }} />
      <Tabs.Screen name="retirement" options={{ title: 'Retire', tabBarIcon: ({ focused }) => <TabIcon emoji="🏖" focused={focused} /> }} />
      <Tabs.Screen name="goals"      options={{ title: 'Goals',  tabBarIcon: ({ focused }) => <TabIcon emoji="🎯" focused={focused} /> }} />
      {/* routable from the Menu grid, hidden from the bar */}
      <Tabs.Screen name="analytics"  options={{ href: null }} />
      <Tabs.Screen name="tips"       options={{ href: null }} />
      <Tabs.Screen name="rewards"    options={{ href: null }} />
      <Tabs.Screen name="settings"   options={{ href: null }} />
    </Tabs>
  );
}
