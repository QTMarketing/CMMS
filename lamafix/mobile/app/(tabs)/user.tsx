import { Pressable, ScrollView, Text, View, Alert, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkStore } from '../../store/useWorkStore';

export default function UserScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const orders = useWorkStore((state) => state.orders);

  const completed = orders.filter((order) => order.status === 'Completed').length;
  const open = orders.filter((order) => order.status === 'Open' || order.status === 'In Progress').length;

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#1e293b]">
        <Text className="text-gray-500 dark:text-gray-400">Loading user information...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-white dark:bg-[#1e293b] px-6 pt-12" 
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="gap-2">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white">
          {user.name || 'User'}
        </Text>
        <Text className="text-base text-gray-500 dark:text-gray-400">
          {user.email}
        </Text>
        {user.store && (
          <Text className="text-sm text-gray-400 dark:text-gray-500">
            Store: {user.store.name}
          </Text>
        )}
      </View>

      <View className="mt-8 flex-row gap-4">
        <View className="flex-1 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
          <Text className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Open</Text>
          <Text className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{open}</Text>
        </View>
        <View className="flex-1 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
          <Text className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Completed</Text>
          <Text className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{completed}</Text>
        </View>
      </View>

      <View className="mt-10 gap-4">
        <Text className="text-base font-semibold text-gray-900 dark:text-white">Account</Text>
        
        <Pressable
          className="flex-row items-center justify-between rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
          onPress={handleLogout}
        >
          <View className="flex-row items-center gap-3">
            <Ionicons 
              name="log-out-outline" 
              size={24} 
              color={colorScheme === 'dark' ? '#ef4444' : '#dc2626'} 
            />
            <Text className="text-base font-medium text-red-600 dark:text-red-400">
              Logout
            </Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={colorScheme === 'dark' ? '#64748b' : '#94a3b8'} 
          />
        </Pressable>
      </View>
    </ScrollView>
  );
}

