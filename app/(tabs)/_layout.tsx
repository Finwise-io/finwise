import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { Colors } from '../../src/utils/theme';

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
        headerStyle: { backgroundColor: Colors.bgSecondary, shadowColor: 'transparent', elevation: 0 },
        headerTitleStyle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
        headerTintColor: Colors.primary,
      }}
    >
      <Tabs.Screen name="home"       options={{ title: 'Home',         headerTitle: 'FinWise 💰', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="budget"     options={{ title: 'Transactions',                            tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }} />
      <Tabs.Screen name="analytics"  options={{ title: 'Analytics',                               tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }} />
      <Tabs.Screen name="retirement" options={{ title: 'Retirement',                              tabBarIcon: ({ focused }) => <TabIcon emoji="🏖" focused={focused} /> }} />
      <Tabs.Screen name="tips"       options={{ title: 'Tips',                                    tabBarIcon: ({ focused }) => <TabIcon emoji="💡" focused={focused} /> }} />
      <Tabs.Screen name="rewards"    options={{ title: 'Rewards',                                 tabBarIcon: ({ focused }) => <TabIcon emoji="🏅" focused={focused} /> }} />
      <Tabs.Screen name="settings"   options={{ title: 'Settings',                                tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }} />
    </Tabs>
  );
}
