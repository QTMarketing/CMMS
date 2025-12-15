import { WorkOrder } from '../store/useWorkStore';

export type DashboardInsight = {
  id: string;
  label: string;
  value: string;
  trend: string;
};

export const dashboardInsights: DashboardInsight[] = [
  { id: 'assignments', label: 'Active assignments', value: '18', trend: '+3 vs last week' },
  { id: 'uptime', label: 'Fleet uptime', value: '97.4%', trend: 'Goal: 98%' },
  { id: 'sla', label: 'SLA compliance', value: '92%', trend: '▲ 4% week over week' },
];

export const fetchDashboardInsights = (orders: WorkOrder[]) =>
  new Promise<{ insights: DashboardInsight[]; openOrders: number }>((resolve) => {
    setTimeout(() => {
      const openOrders = orders.filter((order) => order.status !== 'completed').length;
      resolve({ insights: dashboardInsights, openOrders });
    }, 300);
  });

