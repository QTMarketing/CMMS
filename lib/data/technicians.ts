export type Technician = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  active: boolean;
};

export const technicians: Technician[] = [
  {
    id: "tech-david",
    name: "David Johnson",
    email: "david@example.com",
    phone: "+1-555-1000",
    active: true,
  },
  {
    id: "tech-priya",
    name: "Priya Sharma",
    email: "priya@example.com",
    phone: "+1-555-2000",
    active: true,
  },
];
