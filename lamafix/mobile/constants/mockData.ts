export type WorkOrder = {
  id: string;
  title: string;
  status: string;
  description: string;
  timestamp: string;
  type: 'open' | 'completed';
};

export const mockWorkOrders: WorkOrder[] = [
  {
    id: '83295',
    title: 'AC Unit',
    status: 'In Progress',
    description: 'Technician assigned and en route.',
    timestamp: '2 hours ago',
    type: 'open',
  },
  {
    id: '83288',
    title: 'Projector Bulb',
    status: 'On Hold',
    description: 'Waiting for parts to arrive.',
    timestamp: '1 day ago',
    type: 'open',
  },
  {
    id: '83291',
    title: 'Restroom Leak',
    status: 'Completed',
    description: 'Main valve replaced and tested.',
    timestamp: '1 day ago',
    type: 'completed',
  },
];

