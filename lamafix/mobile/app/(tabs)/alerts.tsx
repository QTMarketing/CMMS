import { Pressable, ScrollView, Text, View } from 'react-native';
import { useWorkStore } from '../../store/useWorkStore';

const severityStyles: Record<
  'info' | 'warning' | 'critical',
  { badge: string; label: string }
> = {
  info: { badge: 'bg-blue-50 text-blue-600', label: 'Info' },
  warning: { badge: 'bg-amber-50 text-amber-600', label: 'Warning' },
  critical: { badge: 'bg-rose-50 text-rose-600', label: 'Critical' },
};

export default function AlertsScreen() {
  const alerts = useWorkStore((state) => state.alerts);
  const dismissAlert = useWorkStore((state) => state.dismissAlert);

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-12" contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="text-3xl font-bold text-gray-900">Alerts</Text>
      <Text className="mt-2 text-base text-gray-500">
        Smart monitoring surfaces the most urgent items to keep crews safe.
      </Text>

      <View className="mt-8 gap-4">
        {alerts.map((alert) => (
          <View key={alert.id} className="rounded-2xl border border-gray-100 p-4">
            <View className="flex-row items-center justify-between">
              <Text
                className={`rounded-full px-3 py-1 text-xs font-semibold ${severityStyles[alert.severity].badge}`}
              >
                {severityStyles[alert.severity].label}
              </Text>
              <Pressable onPress={() => dismissAlert(alert.id)}>
                <Text className="text-xs font-semibold uppercase text-gray-400">Dismiss</Text>
              </Pressable>
            </View>
            <Text className="mt-4 text-base text-gray-800">{alert.message}</Text>
          </View>
        ))}
        {alerts.length === 0 && (
          <View className="items-center rounded-2xl border border-dashed border-gray-200 p-8">
            <Text className="text-base font-semibold text-gray-900">All clear</Text>
            <Text className="mt-2 text-center text-sm text-gray-500">
              Predictive monitoring hasn’t flagged any new issues. Crews will ping you here if
              something changes.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

