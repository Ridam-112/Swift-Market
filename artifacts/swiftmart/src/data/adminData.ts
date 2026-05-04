import { AdminCustomer, PlatformRevenuePoint } from "@/types";

export const mockAdminCustomers: AdminCustomer[] = [
  {
    id: "c1",
    name: "Rahul Sharma",
    phone: "9876543210",
    email: "rahul@example.com",
    joinedAt: "2024-01-20T10:00:00.000Z",
    totalOrders: 12,
    totalSpent: 4320,
    status: 'active',
    lastOrderAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    orders: [
      {
        id: "ORD-C1-1",
        items: [
          { name: "Aashirvaad Whole Wheat Atta", qty: 1, price: 240, category: "groceries" },
          { name: "Tata Salt", qty: 2, price: 25, category: "groceries" }
        ],
        total: 290,
        status: "delivered",
        paymentMethod: "UPI",
        placedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        vendorId: "v1",
        vendorName: "Sharma Kirana Store"
      }
    ]
  },
  {
    id: "c2",
    name: "Priya Patel",
    phone: "9999999999",
    email: "priya@example.com",
    joinedAt: "2024-02-15T11:30:00.000Z",
    totalOrders: 8,
    totalSpent: 2890,
    status: 'active',
    lastOrderAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    orders: [
      {
        id: "ORD-C2-1",
        items: [
          { name: "Fresh Onion", qty: 2, price: 40, category: "vegetables" },
          { name: "Tomato", qty: 1, price: 30, category: "vegetables" }
        ],
        total: 110,
        status: "delivered",
        paymentMethod: "COD",
        placedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        vendorId: "v2",
        vendorName: "Fresh Farm Veggies"
      }
    ]
  },
  {
    id: "c3",
    name: "Amit Kumar",
    phone: "9812345678",
    email: "amit.k@example.com",
    joinedAt: "2024-03-05T09:15:00.000Z",
    totalOrders: 3,
    totalSpent: 780,
    status: 'active',
    lastOrderAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    orders: [
      {
        id: "ORD-C3-1",
        items: [
          { name: "Himalaya Neem Face Wash", qty: 1, price: 150, category: "personal-care" },
          { name: "Dove Beauty Bathing Bar", qty: 1, price: 180, category: "personal-care" }
        ],
        total: 330,
        status: "delivered",
        paymentMethod: "Card",
        placedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        vendorId: "v1",
        vendorName: "Sharma Kirana Store"
      }
    ]
  },
  {
    id: "c4",
    name: "Sunita Verma",
    phone: "9734561234",
    email: "sunita.v@example.com",
    joinedAt: "2024-01-10T14:45:00.000Z",
    totalOrders: 15,
    totalSpent: 6720,
    status: 'active',
    lastOrderAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    orders: [
      {
        id: "ORD-C4-1",
        items: [
          { name: "Atomic Habits", qty: 1, price: 350, category: "books" },
          { name: "The Psychology of Money", qty: 1, price: 300, category: "books" }
        ],
        total: 650,
        status: "placed",
        paymentMethod: "UPI",
        placedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        vendorId: "v1",
        vendorName: "Sharma Kirana Store"
      }
    ]
  },
  {
    id: "c5",
    name: "Rohit Singh",
    phone: "9654321098",
    email: "rohit.s@example.com",
    joinedAt: "2024-04-12T16:20:00.000Z",
    totalOrders: 1,
    totalSpent: 240,
    status: 'active',
    lastOrderAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    orders: [
      {
        id: "ORD-C5-1",
        items: [
          { name: "Aashirvaad Whole Wheat Atta", qty: 1, price: 240, category: "groceries" }
        ],
        total: 240,
        status: "delivered",
        paymentMethod: "COD",
        placedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
        vendorId: "v1",
        vendorName: "Sharma Kirana Store"
      }
    ]
  },
  {
    id: "c6",
    name: "Kavya Nair",
    phone: "9876001234",
    email: "kavya.n@example.com",
    joinedAt: "2024-02-28T08:10:00.000Z",
    totalOrders: 7,
    totalSpent: 2100,
    status: 'active',
    lastOrderAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    orders: [
      {
        id: "ORD-C6-1",
        items: [
          { name: "Women's Kurti", qty: 1, price: 799, category: "clothing" },
          { name: "Women's Leggings", qty: 1, price: 299, category: "clothing" }
        ],
        total: 1098,
        status: "out_for_delivery",
        paymentMethod: "UPI",
        placedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        vendorId: "v3",
        vendorName: "StyleZone Fashion"
      }
    ]
  },
  {
    id: "c7",
    name: "Deepak Joshi",
    phone: "9123456780",
    email: "deepak.j@example.com",
    joinedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    totalOrders: 0,
    totalSpent: 0,
    status: 'active',
    orders: []
  },
  {
    id: "c8",
    name: "Ananya Das",
    phone: "9087654321",
    email: "ananya.d@example.com",
    joinedAt: "2024-01-05T12:00:00.000Z",
    totalOrders: 22,
    totalSpent: 9870,
    status: 'active',
    lastOrderAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    orders: [
      {
        id: "ORD-C8-1",
        items: [
          { name: "Men's Formal Shirt", qty: 1, price: 899, category: "clothing" },
          { name: "Men's Cotton T-Shirt", qty: 1, price: 499, category: "clothing" }
        ],
        total: 1398,
        status: "delivered",
        paymentMethod: "Card",
        placedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        vendorId: "v3",
        vendorName: "StyleZone Fashion"
      }
    ]
  }
];

export const platformRevenue: PlatformRevenuePoint[] = [
  { date: "Mon", revenue: 18400, orders: 42, commission: 920 },
  { date: "Tue", revenue: 22100, orders: 51, commission: 1105 },
  { date: "Wed", revenue: 19500, orders: 45, commission: 975 },
  { date: "Thu", revenue: 21000, orders: 48, commission: 1050 },
  { date: "Fri", revenue: 25600, orders: 58, commission: 1280 },
  { date: "Sat", revenue: 32400, orders: 75, commission: 1620 },
  { date: "Sun", revenue: 35800, orders: 82, commission: 1790 }
];