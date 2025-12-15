import { create } from 'zustand';
import { apiService } from '../lib/api';

export type WorkOrderStatus = 'Open' | 'In Progress' | 'Pending Review' | 'Completed' | 'Cancelled';

export type WorkOrder = {
  id: string;
  title: string;
  site: string; // location + asset name
  priority: 'Low' | 'Medium' | 'High';
  scheduledFor: string; // createdAt or dueDate
  status: WorkOrderStatus;
  summary: string; // description or problemDescription
  assetId?: string;
  location?: string;
};

type WorkStore = {
  orders: WorkOrder[];
  assets: { id: string; name: string; location: string }[];
  alerts: { id: string; message: string; severity: 'info' | 'warning' | 'critical' }[];
  isLoading: boolean;
  fetchWorkOrders: () => Promise<void>;
  fetchAssets: () => Promise<void>;
  addOrder: (payload: Omit<WorkOrder, 'id' | 'status'> & { status?: WorkOrderStatus }) => Promise<{ success: boolean; error?: string }>;
  completeOrder: (id: string) => void;
  dismissAlert: (id: string) => void;
};

// Map backend work order to mobile format
const mapWorkOrder = (wo: any): WorkOrder => {
  const assetName = wo.asset?.name || 'Unknown Asset';
  const location = wo.location || '';
  const site = location ? `${location} • ${assetName}` : assetName;

  // Map backend status to mobile status
  let status: WorkOrderStatus = 'Open';
  if (wo.status === 'In Progress') status = 'In Progress';
  else if (wo.status === 'Pending Review') status = 'Pending Review';
  else if (wo.status === 'Completed') status = 'Completed';
  else if (wo.status === 'Cancelled') status = 'Cancelled';

  // Map backend priority to mobile priority
  let priority: 'Low' | 'Medium' | 'High' = 'Medium';
  if (wo.priority === 'High') priority = 'High';
  else if (wo.priority === 'Low') priority = 'Low';

  return {
    id: wo.id,
    title: wo.title,
    site,
    priority,
    scheduledFor: wo.dueDate || wo.createdAt,
    status,
    summary: wo.problemDescription || wo.description || wo.helpDescription || '',
    assetId: wo.assetId,
    location: wo.location,
  };
};

const initialAlerts: WorkStore['alerts'] = [
  {
    id: '1',
    message: 'Remember to upload photos when creating work orders.',
    severity: 'info',
  },
];

export const useWorkStore = create<WorkStore>((set, get) => ({
  orders: [],
  assets: [],
  alerts: initialAlerts,
  isLoading: false,

  fetchWorkOrders: async () => {
    set({ isLoading: true });
    try {
      const result = await apiService.getWorkOrders();
      if (result.success && result.data) {
        set({ 
          orders: result.data.map(mapWorkOrder),
          isLoading: false 
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Fetch work orders error:', error);
      set({ isLoading: false });
    }
  },

  fetchAssets: async () => {
    try {
      const result = await apiService.getAssets();
      if (result.success && result.data) {
        set({ 
          assets: result.data.map((asset: any) => ({
            id: asset.id,
            name: asset.name,
            location: asset.location || '',
          }))
        });
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  },

  addOrder: async (payload) => {
    try {
      // Map mobile format to backend format
      // Extract location from site (format: "location • asset name")
      const siteParts = payload.site.split(' • ');
      const location = siteParts[0] || payload.location || '';
      const assetName = siteParts[1] || siteParts[0] || '';

      // Find asset ID from name
      const selectedAsset = get().assets.find(
        a => a.name === assetName || a.id === payload.assetId
      );

      if (!selectedAsset && !payload.assetId) {
        return { success: false, error: 'Please select a valid asset' };
      }

      // Extract problem and help from summary
      const summaryParts = payload.summary.split('\n\n');
      const problemDescription = summaryParts[0] || payload.summary;
      const helpDescription = summaryParts[1] || summaryParts[0] || '';

      const workOrderData = {
        title: payload.title,
        location: location,
        assetId: payload.assetId || selectedAsset!.id,
        partsRequired: false, // Can be extracted from summary if needed
        problemDescription: problemDescription,
        helpDescription: helpDescription,
        priority: payload.priority,
        attachments: [], // Handle separately with upload
      };

      const result = await apiService.createWorkOrder(workOrderData);
      
      if (result.success) {
        // Refresh work orders
        await get().fetchWorkOrders();
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to create work order' };
      }
    } catch (error) {
      console.error('Add order error:', error);
      return { success: false, error: 'Network error' };
    }
  },

  completeOrder: (id) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === id ? { ...order, status: 'Completed' } : order,
      ),
    })),
  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== id),
    })),
}));

