export type InventoryItem = {
  id: string;
  name: string;
  partNumber: string;
  quantityOnHand: number;
  reorderThreshold: number;
  location?: string;
};

export const inventoryItems: InventoryItem[] = [
  {
    id: "inv-filter-1",
    name: "Fuel Filter Cartridge",
    partNumber: "FFC-100",
    quantityOnHand: 12,
    reorderThreshold: 5,
    location: "Backroom Shelf A1",
  },
  {
    id: "inv-belt-1",
    name: "HVAC Fan Belt",
    partNumber: "HVB-220",
    quantityOnHand: 4,
    reorderThreshold: 3,
    location: "Mechanical Room Bin B3",
  },
];
