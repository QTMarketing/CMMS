import { useRouter } from 'expo-router';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkStore } from '../../store/useWorkStore';

const statusColors: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-emerald-100 text-emerald-700',
  'Pending Review': 'bg-purple-100 text-purple-700',
  Cancelled: 'bg-amber-100 text-amber-700',
  Completed: 'bg-slate-100 text-slate-700',
};

const statusLabels: Record<string, string> = {
  Open: 'Open',
  'In Progress': 'In Progress',
  'Pending Review': 'Pending Review',
  Cancelled: 'Cancelled',
  Completed: 'Completed',
};

export default function HomeScreen() {
  const router = useRouter();
  const userName = useAuthStore((state) => state.user?.name ?? 'Operator');
  const userAvatar = useAuthStore((state) => state.user?.avatar);
  const orders = useWorkStore((state) => state.orders);
  const isLoading = useWorkStore((state) => state.isLoading);
  const fetchWorkOrders = useWorkStore((state) => state.fetchWorkOrders);

  // Fetch work orders on mount
  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const openOrders = orders.filter((order) => 
    order.status === 'Open' || 
    order.status === 'In Progress' || 
    order.status === 'Pending Review'
  );
  const recentOrders = orders.slice(0, 5);

  return (
    <>
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView
        className="flex-1 px-6 pt-10"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} className="h-12 w-12 rounded-full" />
            ) : (
              <View className="h-12 w-12 items-center justify-center rounded-full bg-orange-200">
                <Ionicons name="person-outline" size={24} color="#1f2937" />
              </View>
            )}
            <View>
              <Text className="text-base text-gray-500">Hello</Text>
              <Text className="text-2xl font-semibold text-gray-900">{userName},</Text>
            </View>
          </View>
          <TouchableOpacity 
            className="h-12 w-12 items-center justify-center rounded-full border border-gray-200"
            onPress={() => router.push('/(tabs)/alerts')}
          >
            <Ionicons name="notifications-outline" size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="mt-6 rounded-xl bg-blue-500 py-4"
          onPress={() => router.push('/(tabs)/create')}
        >
          <Text className="text-center text-lg font-semibold text-white">
            Create New Work Order
          </Text>
        </TouchableOpacity>

        <View className="mt-8">
          <Text className="mb-4 text-xl font-bold text-gray-900">My Open WOs</Text>
          {isLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#1f6eff" />
              <Text className="mt-4 text-gray-500">Loading work orders...</Text>
            </View>
          ) : (
            <>
              {openOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  className="mb-3 rounded-lg bg-white p-4 shadow-sm shadow-black/5"
                  activeOpacity={0.9}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900">
                        {order.title}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-500">
                        {order.site}
                      </Text>
                      <Text className="mt-1 text-xs text-gray-400">
                        Priority:{" "}
                        {order.priority.charAt(0).toUpperCase() +
                          order.priority.slice(1)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          statusColors[order.status] ??
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {statusLabels[order.status] ?? order.status}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#94a3b8"
                        style={{ marginTop: 8 }}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              {openOrders.length === 0 && (
                <Text className="text-sm text-gray-500">
                  No open work orders.
                </Text>
              )}
            </>
          )}
        </View>

        <View className="mt-8">
          <Text className="mb-4 text-xl font-bold text-gray-900">Recent Updates / All WOs</Text>
          {isLoading ? null : (
            <>
              {recentOrders.map((order) => (
            <View
              key={order.id}
              className="mb-3 rounded-lg bg-white p-4 shadow-sm shadow-black/5"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    {order.title}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500">{order.site}</Text>
                  <Text className="mt-1 text-xs text-gray-400" numberOfLines={2}>
                    {order.summary}
                  </Text>
                </View>
                <Text
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[order.status] ?? 'bg-slate-100 text-slate-700'}`}
                >
                  {statusLabels[order.status] ?? order.status}
                </Text>
              </View>
              <Text className="mt-3 text-xs uppercase tracking-wide text-gray-400">
                {new Date(order.scheduledFor).toLocaleDateString()}
              </Text>
            </View>
          ))}
            </>
          )}
        </View>
      </ScrollView>
      </SafeAreaView>
    </>
  );
}

