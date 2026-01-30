export type Vendor = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  active: boolean;
};

export const vendors: Vendor[] = [
  {
    id: "vendor-david",
    name: "David Johnson",
    email: "david@example.com",
    phone: "+1-555-1000",
    active: true,
  },
  {
    id: "vendor-priya",
    name: "Priya Sharma",
    email: "priya@example.com",
    phone: "+1-555-2000",
    active: true,
  },
];
