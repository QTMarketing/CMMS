import { Tabs } from 'expo-router';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Text, View } from 'react-native';

const TAB_CONFIG: Record<
  string,
  { label: string; activeIcon: keyof typeof Ionicons.glyphMap; icon: keyof typeof Ionicons.glyphMap }
> = {
  index: { label: 'Home', activeIcon: 'home', icon: 'home-outline' },
  history: { label: 'History', activeIcon: 'time', icon: 'time-outline' },
  alerts: { label: 'Alerts', activeIcon: 'notifications', icon: 'notifications-outline' },
  user: { label: 'Profile', activeIcon: 'person', icon: 'person-outline' },
};

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();

  return (
    <View
      className="bg-white"
      style={{
        paddingBottom: Math.max(bottom, 18),
        paddingTop: 18,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View className="flex-row justify-around">
        {state.routes
          .filter((route) => TAB_CONFIG[route.name])
          .map((route, index) => {
            const isFocused = state.index === index;
            const config = TAB_CONFIG[route.name];
            const icon = isFocused ? config.activeIcon : config.icon;
            const color = isFocused ? '#1f6eff' : '#98a2b3';

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                className="items-center gap-1"
                onPress={() => navigation.navigate(route.name)}
              >
                <Ionicons name={icon} size={24} color={color} />
                <Text className="text-xs font-medium" style={{ color }}>
                  {config.label}
                </Text>
              </Pressable>
            );
          })}
      </View>
      <Pressable
        accessibilityLabel="Create work order"
        className="absolute self-center items-center justify-center"
        style={{
          top: -28,
          height: 64,
          width: 64,
          borderRadius: 999,
          backgroundColor: '#1f6eff',
          shadowColor: '#1f6eff',
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 10,
        }}
        onPress={() => router.push('/(tabs)/create')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </Pressable>
    </View>
  );
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="user" options={{ title: 'Profile' }} />
      <Tabs.Screen
        name="create"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

