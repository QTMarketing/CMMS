import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View, useColorScheme, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWorkStore, WorkOrderStatus, type WorkOrder } from '../../store/useWorkStore';

const statusConfig: Record<string, { 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string; 
  bgColor: string;
  iconColor: string;
  date: string;
}> = {
  Open: {
    icon: 'time-outline',
    label: 'Open',
    bgColor: 'bg-slate-100 dark:bg-slate-700',
    iconColor: '#64748b',
    date: 'Created',
  },
  'In Progress': {
    icon: 'hourglass-outline',
    label: 'In Progress',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900',
    iconColor: '#eab308',
    date: 'Started',
  },
  Completed: {
    icon: 'checkmark-circle-outline',
    label: 'Completed',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    iconColor: '#3b82f6',
    date: 'Closed',
  },
  Cancelled: {
    icon: 'close-circle-outline',
    label: 'Cancelled',
    bgColor: 'bg-red-100 dark:bg-red-900',
    iconColor: '#ef4444',
    date: 'Closed',
  },
};

type SortOption = 'date-newest' | 'date-oldest' | 'status' | 'priority';
type FilterStatus = 'all' | WorkOrderStatus;

export default function HistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const orders = useWorkStore((state) => state.orders);
  const isLoading = useWorkStore((state) => state.isLoading);
  const fetchWorkOrders = useWorkStore((state) => state.fetchWorkOrders);
  const addOrder = useWorkStore((state) => state.addOrder);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date-newest');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Fetch work orders on mount
  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  // Filter orders
  let filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Sort orders
  filteredOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'date-newest':
        return new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime();
      case 'date-oldest':
        return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
      case 'status':
        return a.status.localeCompare(b.status);
      case 'priority': {
        const priorityOrder: Record<WorkOrder['priority'], number> = {
          High: 3,
          Medium: 2,
          Low: 1,
        };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      default:
        return 0;
    }
  });

  const handleRequestAgain = async (order: typeof orders[0]) => {
    Alert.alert(
      'Request Again',
      `Create a new work order similar to "${order.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            const result = await addOrder({
              title: order.title,
              site: order.site,
              priority: order.priority,
              scheduledFor: new Date().toISOString(),
              summary: order.summary,
              assetId: order.assetId,
              location: order.location,
            });
            
            if (result.success) {
              Alert.alert('Success', 'New work order created successfully!');
              await fetchWorkOrders();
            } else {
              Alert.alert('Error', result.error || 'Failed to create work order');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc] dark:bg-[#1e293b]" edges={['top', 'left', 'right']}>
      <View className="flex-1">
        {/* Header */}
        <View className="border-b border-slate-200 dark:border-slate-700 bg-[#f8fafc] dark:bg-[#1e293b]">
          <View className="flex-row items-center justify-between px-4 py-4">
            <Pressable onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? '#e2e8f0' : '#1e293b'} />
            </Pressable>
            <Text className="text-xl font-bold text-slate-800 dark:text-slate-200">Work Order History</Text>
            <View className="w-10" />
          </View>
        </View>

        {/* Search and Filter */}
        <View className="px-4 py-4 bg-[#f8fafc] dark:bg-[#1e293b] border-b border-slate-200 dark:border-slate-700">
          <View className="flex-row items-center gap-4">
            <View className="relative flex-1">
              <Ionicons 
                name="search" 
                size={20} 
                color={colorScheme === 'dark' ? '#64748b' : '#94a3b8'} 
                style={{ position: 'absolute', left: 12, top: 12, zIndex: 1 }}
              />
              <TextInput
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg"
                placeholder="Search for work orders"
                placeholderTextColor={colorScheme === 'dark' ? '#64748b' : '#94a3b8'}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <Pressable 
              className={`flex-row items-center gap-2 px-4 py-2.5 border rounded-lg ${
                filterStatus !== 'all' || sortBy !== 'date-newest'
                  ? 'border-[#3b82f6] bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons 
                name="filter" 
                size={18} 
                color={filterStatus !== 'all' || sortBy !== 'date-newest' ? '#3b82f6' : (colorScheme === 'dark' ? '#cbd5e1' : '#475569')} 
              />
              <Text className={`text-sm font-medium ${
                filterStatus !== 'all' || sortBy !== 'date-newest'
                  ? 'text-[#3b82f6]'
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                FILTER
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Work Orders List */}
        <ScrollView 
          className="flex-1 px-4" 
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="mt-4 text-gray-500">Loading work orders...</Text>
            </View>
          ) : (
            <View className="gap-4">
              {filteredOrders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.new;
              const isExpanded = expandedCard === order.id;
              
              return (
                <Pressable 
                  key={order.id} 
                  className="bg-white dark:bg-slate-900 rounded-lg shadow-sm"
                  onPress={() => setExpandedCard(isExpanded ? null : order.id)}
                >
                  {/* Header */}
                  <View className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <View>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">WORK ORDER ID</Text>
                      <Text className="font-medium text-slate-800 dark:text-slate-200">
                        WO-{order.id.slice(0, 8).toUpperCase()}
                      </Text>
                    </View>
                    <Ionicons 
                      name={isExpanded ? "chevron-down" : "chevron-forward"} 
                      size={24} 
                      color="#94a3b8" 
                    />
                  </View>

                  {/* Collapsed Content - Always visible */}
                  <View className="p-4">
                    <View className="flex-row items-center gap-3">
                      <View className={`p-2 rounded-full ${config.bgColor}`}>
                        <Ionicons name={config.icon} size={24} color={config.iconColor} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-lg text-slate-900 dark:text-white">{config.label}</Text>
                        <Text className="text-sm text-slate-500 dark:text-slate-400">
                          {config.date} on {format(new Date(order.scheduledFor), 'do MMMM, yyyy')}
                        </Text>
                      </View>
                    </View>

                    {/* Expanded Content - Shows when clicked */}
                    {isExpanded && (
                      <View>
                        {/* Work Order Details */}
                        <View className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <View className="gap-3">
                            <View>
                              <Text className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                                Title
                              </Text>
                              <Text className="text-base text-slate-900 dark:text-white font-medium">
                                {order.title}
                              </Text>
                            </View>
                            
                            <View>
                              <Text className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                                Location
                              </Text>
                              <Text className="text-base text-slate-900 dark:text-white">
                                {order.site}
                              </Text>
                            </View>
                            
                            <View>
                              <Text className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                                Priority
                              </Text>
                              <View className="flex-row items-center gap-2">
                                <View
                                  className={`px-2.5 py-1 rounded-full ${
                                    order.priority === 'High'
                                      ? 'bg-red-100 dark:bg-red-900'
                                      : order.priority === 'Medium'
                                      ? 'bg-yellow-100 dark:bg-yellow-900'
                                      : 'bg-green-100 dark:bg-green-900'
                                  }`}
                                >
                                  <Text
                                    className={`text-xs font-semibold ${
                                      order.priority === 'High'
                                        ? 'text-red-700 dark:text-red-300'
                                        : order.priority === 'Medium'
                                        ? 'text-yellow-700 dark:text-yellow-300'
                                        : 'text-green-700 dark:text-green-300'
                                    }`}
                                  >
                                    {order.priority.toLowerCase()}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            <View>
                              <Text className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                                Description
                              </Text>
                              <Text className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                {order.summary}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Additional Info for In Progress */}
                        {order.status === 'In Progress' && (
                          <View className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <View className="flex-row items-start gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                              <Ionicons name="information-circle" size={20} color="#3b82f6" style={{ marginTop: 2 }} />
                              <Text className="flex-1 text-sm text-blue-600 dark:text-blue-400">
                                Work is currently in progress. Check back for updates.
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Action Buttons */}
                        <View className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex-row gap-2">
                          <Pressable 
                            className="flex-1 py-3 px-3 border border-slate-300 dark:border-slate-600 rounded-lg"
                            onPress={(e) => {
                              e.stopPropagation();
                              Alert.alert('Work Order Details', `Full details for ${order.title}\n\nID: WO-${order.id.slice(0, 8).toUpperCase()}\nSite: ${order.site}\nPriority: ${order.priority}\nStatus: ${order.status}\n\n${order.summary}`);
                            }}
                          >
                            <Text className="text-sm font-medium text-center text-slate-700 dark:text-slate-300">
                              View Details
                            </Text>
                          </Pressable>
                          
                          {order.status === 'Completed' && (
                            <Pressable 
                              className="flex-1 py-3 px-3 border border-[#3b82f6] bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                              onPress={(e) => {
                                e.stopPropagation();
                                handleRequestAgain(order);
                              }}
                            >
                              <Text className="text-sm font-medium text-center text-[#3b82f6]">
                                Request Again
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}

              {filteredOrders.length === 0 && (
                <View className="items-center py-12">
                  <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
                  <Text className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">
                    No work orders found
                  </Text>
                  <Text className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">
                    {searchQuery ? 'Try adjusting your search' : 'Your work order history will appear here'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Filter Modal */}
        <Modal
          visible={showFilterModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFilterModal(false)}
        >
          <Pressable 
            className="flex-1 bg-black/50 justify-end"
            onPress={() => setShowFilterModal(false)}
          >
            <Pressable 
              className="bg-white dark:bg-slate-900 rounded-t-3xl"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="p-6 pb-8">
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-2xl font-bold text-slate-900 dark:text-white">
                    Filter & Sort
                  </Text>
                  <Pressable onPress={() => setShowFilterModal(false)}>
                    <Ionicons name="close" size={28} color={colorScheme === 'dark' ? '#e2e8f0' : '#1e293b'} />
                  </Pressable>
                </View>

                {/* Sort Options */}
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
                    Sort By
                  </Text>
                  <View className="gap-2">
                    {[
                      { value: 'date-newest' as SortOption, label: 'Date (Newest First)' },
                      { value: 'date-oldest' as SortOption, label: 'Date (Oldest First)' },
                      { value: 'status' as SortOption, label: 'Status' },
                      { value: 'priority' as SortOption, label: 'Priority' },
                    ].map((option) => (
                      <Pressable
                        key={option.value}
                        className={`flex-row items-center justify-between p-3 rounded-lg border ${
                          sortBy === option.value
                            ? 'border-[#3b82f6] bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                        }`}
                        onPress={() => setSortBy(option.value)}
                      >
                        <Text className={`text-base ${
                          sortBy === option.value
                            ? 'text-[#3b82f6] font-medium'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {option.label}
                        </Text>
                        {sortBy === option.value && (
                          <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Filter by Status */}
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
                    Filter by Status
                  </Text>
                  <View className="gap-2">
                    {[
                      { value: 'all' as FilterStatus, label: 'All Orders' },
                      { value: 'Open' as FilterStatus, label: 'Open' },
                      { value: 'In Progress' as FilterStatus, label: 'In Progress' },
                      { value: 'Completed' as FilterStatus, label: 'Completed' },
                      { value: 'Cancelled' as FilterStatus, label: 'Cancelled' },
                    ].map((option) => (
                      <Pressable
                        key={option.value}
                        className={`flex-row items-center justify-between p-3 rounded-lg border ${
                          filterStatus === option.value
                            ? 'border-[#3b82f6] bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                        }`}
                        onPress={() => setFilterStatus(option.value)}
                      >
                        <Text className={`text-base ${
                          filterStatus === option.value
                            ? 'text-[#3b82f6] font-medium'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {option.label}
                        </Text>
                        {filterStatus === option.value && (
                          <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                  <Pressable
                    className="flex-1 py-3 border border-slate-300 dark:border-slate-600 rounded-lg"
                    onPress={() => {
                      setSortBy('date-newest');
                      setFilterStatus('all');
                    }}
                  >
                    <Text className="text-center text-base font-semibold text-slate-700 dark:text-slate-300">
                      Reset
                    </Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 py-3 bg-[#3b82f6] rounded-lg"
                    onPress={() => setShowFilterModal(false)}
                  >
                    <Text className="text-center text-base font-semibold text-white">
                      Apply
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

