export type Asset = {
  id: string;
  name: string;
  location: string;
  status: "Active" | "Down" | "Retired";
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
};

export const assets: Asset[] = [
  {
    id: "asset-hvac-1",
    name: "HVAC Rooftop Unit 1",
    location: "Store 1 - Roof",
    status: "Active",
    lastMaintenanceDate: new Date("2025-10-01"),
    nextMaintenanceDate: new Date("2025-12-01"),
  },
  {
    id: "asset-pump-3",
    name: "Gas Pump #3",
    location: "Store 1 - Forecourt",
    status: "Active",
    lastMaintenanceDate: new Date("2025-11-10"),
    nextMaintenanceDate: new Date("2025-12-10"),
  },
];
