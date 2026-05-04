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

import { PlatformOrder, Report, TransactionLog, AnalyticsPoint } from "@/types";

export const mockPlatformOrders: PlatformOrder[] = [
  { id: "ORD-2001", customerId: "c1", customerName: "Rahul Sharma", customerPhone: "9876543210", vendorId: "v1", vendorName: "Sharma Kirana Store", items: [{ name: "Aashirvaad Atta 5kg", qty: 1, price: 240, category: "groceries" }, { name: "Tata Salt 1kg", qty: 2, price: 25, category: "groceries" }], total: 290, status: "delivered", paymentMethod: "UPI", paymentStatus: "success", placedAt: new Date(Date.now() - 86400000 * 2).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: "ORD-2002", customerId: "c2", customerName: "Priya Patel", customerPhone: "9999999999", vendorId: "v2", vendorName: "Fresh Farm Veggies", items: [{ name: "Fresh Onion", qty: 2, price: 40, category: "vegetables" }], total: 80, status: "placed", paymentMethod: "COD", paymentStatus: "pending", placedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "ORD-2003", customerId: "c3", customerName: "Amit Kumar", customerPhone: "9812345678", vendorId: "v3", vendorName: "StyleZone Fashion", items: [{ name: "Men's Formal Shirt", qty: 1, price: 899, category: "clothing" }], total: 899, status: "packed", paymentMethod: "Card", paymentStatus: "success", placedAt: new Date(Date.now() - 86400000 * 1).toISOString(), updatedAt: new Date().toISOString() },
  { id: "ORD-2004", customerId: "c4", customerName: "Sunita Verma", customerPhone: "9734561234", vendorId: "v1", vendorName: "Sharma Kirana Store", items: [{ name: "Atomic Habits", qty: 1, price: 350, category: "books" }], total: 350, status: "out_for_delivery", paymentMethod: "UPI", paymentStatus: "success", placedAt: new Date(Date.now() - 86400000 * 1).toISOString(), updatedAt: new Date().toISOString() },
  { id: "ORD-2005", customerId: "c5", customerName: "Rohit Singh", customerPhone: "9654321098", vendorId: "v2", vendorName: "Fresh Farm Veggies", items: [{ name: "Tomato", qty: 2, price: 30, category: "vegetables" }], total: 60, status: "cancelled", paymentMethod: "COD", paymentStatus: "pending", placedAt: new Date(Date.now() - 86400000 * 3).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "ORD-2006", customerId: "c6", customerName: "Kavya Nair", customerPhone: "9876001234", vendorId: "v3", vendorName: "StyleZone Fashion", items: [{ name: "Women's Kurti", qty: 1, price: 799, category: "clothing" }], total: 799, status: "delivered", paymentMethod: "UPI", paymentStatus: "success", placedAt: new Date(Date.now() - 86400000 * 4).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "ORD-2007", customerId: "c8", customerName: "Ananya Das", customerPhone: "9087654321", vendorId: "v1", vendorName: "Sharma Kirana Store", items: [{ name: "Maggi 2-Minute Noodles", qty: 5, price: 56, category: "groceries" }], total: 280, status: "cancelled", paymentMethod: "Card", paymentStatus: "refunded", placedAt: new Date(Date.now() - 86400000 * 5).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(), refundedAt: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: "ORD-2008", customerId: "c1", customerName: "Rahul Sharma", customerPhone: "9876543210", vendorId: "v2", vendorName: "Fresh Farm Veggies", items: [{ name: "Potato", qty: 3, price: 25, category: "vegetables" }], total: 75, status: "delivered", paymentMethod: "COD", paymentStatus: "success", placedAt: new Date(Date.now() - 86400000 * 6).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "ORD-2009", customerId: "c2", customerName: "Priya Patel", customerPhone: "9999999999", vendorId: "v3", vendorName: "StyleZone Fashion", items: [{ name: "Men's Cotton T-Shirt", qty: 2, price: 499, category: "clothing" }], total: 998, status: "packed", paymentMethod: "UPI", paymentStatus: "success", placedAt: new Date(Date.now() - 43200000).toISOString(), updatedAt: new Date().toISOString() },
  { id: "ORD-2010", customerId: "c3", customerName: "Amit Kumar", customerPhone: "9812345678", vendorId: "v1", vendorName: "Sharma Kirana Store", items: [{ name: "Everest Turmeric Powder", qty: 1, price: 32, category: "groceries" }], total: 32, status: "placed", paymentMethod: "UPI", paymentStatus: "success", placedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "ORD-2011", customerId: "c4", customerName: "Sunita Verma", customerPhone: "9734561234", vendorId: "v2", vendorName: "Fresh Farm Veggies", items: [{ name: "Coriander Leaves", qty: 2, price: 20, category: "vegetables" }], total: 40, status: "out_for_delivery", paymentMethod: "COD", paymentStatus: "pending", placedAt: new Date(Date.now() - 86400000 * 1).toISOString(), updatedAt: new Date().toISOString() },
  { id: "ORD-2012", customerId: "c6", customerName: "Kavya Nair", customerPhone: "9876001234", vendorId: "v3", vendorName: "StyleZone Fashion", items: [{ name: "Unisex Gym Shorts", qty: 1, price: 399, category: "clothing" }], total: 399, status: "delivered", paymentMethod: "Card", paymentStatus: "success", placedAt: new Date(Date.now() - 86400000 * 2).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 1).toISOString() }
];

export const mockReports: Report[] = [
  { id: "RPT-001", type: "shop", targetId: "v2", targetName: "Fresh Farm Veggies", reportedBy: "Amit Kumar", reporterPhone: "9812345678", reason: "fake_product", description: "Vegetables are not fresh as advertised. Received rotten onions.", reportedAt: new Date(Date.now() - 86400000 * 3).toISOString(), status: "open" },
  { id: "RPT-002", type: "product", targetId: "c1-prod", targetName: "Men's Formal Shirt", reportedBy: "Sunita Verma", reporterPhone: "9734561234", reason: "wrong_delivery", description: "Received wrong size product.", reportedAt: new Date(Date.now() - 86400000 * 5).toISOString(), status: "open" },
  { id: "RPT-003", type: "shop", targetId: "v3", targetName: "StyleZone Fashion", reportedBy: "Rohit Singh", reporterPhone: "9654321098", reason: "rude_behavior", description: "Delivery person was rude and unprofessional.", reportedAt: new Date(Date.now() - 86400000 * 7).toISOString(), status: "resolved" },
  { id: "RPT-004", type: "product", targetId: "g1-prod", targetName: "Aashirvaad Whole Wheat Atta", reportedBy: "Kavya Nair", reporterPhone: "9876001234", reason: "fraud", description: "Product seal was broken.", reportedAt: new Date(Date.now() - 86400000 * 10).toISOString(), status: "ignored" },
  { id: "RPT-005", type: "shop", targetId: "v1", targetName: "Sharma Kirana Store", reportedBy: "Deepak Joshi", reporterPhone: "9123456780", reason: "other", description: "Charged extra delivery fee that was not shown.", reportedAt: new Date(Date.now() - 86400000 * 1).toISOString(), status: "open" },
  { id: "RPT-006", type: "product", targetId: "v2-prod", targetName: "Fresh Tomatoes", reportedBy: "Ananya Das", reporterPhone: "9087654321", reason: "fake_product", description: "Tomatoes were unripe despite being marked as fresh.", reportedAt: new Date(Date.now() - 86400000 * 14).toISOString(), status: "resolved" },
];

export const mockTransactions: TransactionLog[] = [
  { id: "TXN-3001", orderId: "ORD-2001", customerName: "Rahul Sharma", vendorName: "Sharma Kirana Store", amount: 290, method: "UPI", status: "success", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "TXN-3002", orderId: "ORD-2003", customerName: "Amit Kumar", vendorName: "StyleZone Fashion", amount: 899, method: "Card", status: "success", createdAt: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: "TXN-3003", orderId: "ORD-2004", customerName: "Sunita Verma", vendorName: "Sharma Kirana Store", amount: 350, method: "UPI", status: "success", createdAt: new Date(Date.now() - 86400000 * 1).toISOString() },
  { id: "TXN-3004", orderId: "ORD-2006", customerName: "Kavya Nair", vendorName: "StyleZone Fashion", amount: 799, method: "UPI", status: "success", createdAt: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: "TXN-3005", orderId: "ORD-2007", customerName: "Ananya Das", vendorName: "Sharma Kirana Store", amount: 280, method: "Card", status: "refunded", createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "TXN-3006", orderId: "ORD-2008", customerName: "Rahul Sharma", vendorName: "Fresh Farm Veggies", amount: 75, method: "COD", status: "success", createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "TXN-3007", orderId: "ORD-2009", customerName: "Priya Patel", vendorName: "StyleZone Fashion", amount: 998, method: "UPI", status: "success", createdAt: new Date(Date.now() - 43200000).toISOString() },
  { id: "TXN-3008", orderId: "ORD-2010", customerName: "Amit Kumar", vendorName: "Sharma Kirana Store", amount: 32, method: "UPI", status: "success", createdAt: new Date().toISOString() },
  { id: "TXN-3009", orderId: "ORD-2012", customerName: "Kavya Nair", vendorName: "StyleZone Fashion", amount: 399, method: "Card", status: "success", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "TXN-3010", orderId: "ORD-2013", customerName: "Sunita Verma", vendorName: "Sharma Kirana Store", amount: 450, method: "UPI", status: "failed", createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: "TXN-3011", orderId: "ORD-2014", customerName: "Priya Patel", vendorName: "Fresh Farm Veggies", amount: 120, method: "Card", status: "failed", createdAt: new Date(Date.now() - 86400000 * 9).toISOString() },
  { id: "TXN-3012", orderId: "ORD-2015", customerName: "Rohit Singh", vendorName: "Sharma Kirana Store", amount: 650, method: "UPI", status: "pending", createdAt: new Date().toISOString() },
  { id: "TXN-3013", orderId: "ORD-2016", customerName: "Ananya Das", vendorName: "StyleZone Fashion", amount: 1599, method: "Card", status: "pending", createdAt: new Date().toISOString() },
  { id: "TXN-3014", orderId: "ORD-2017", customerName: "Rahul Sharma", vendorName: "StyleZone Fashion", amount: 2000, method: "UPI", status: "success", createdAt: new Date(Date.now() - 86400000 * 12).toISOString() },
  { id: "TXN-3015", orderId: "ORD-2018", customerName: "Amit Kumar", vendorName: "Fresh Farm Veggies", amount: 180, method: "COD", status: "success", createdAt: new Date(Date.now() - 86400000 * 15).toISOString() }
];

export const analyticsDaily: AnalyticsPoint[] = [
  { label: "Mon", revenue: 18400, orders: 42, newUsers: 4, commission: 920 },
  { label: "Tue", revenue: 22100, orders: 51, newUsers: 6, commission: 1105 },
  { label: "Wed", revenue: 19500, orders: 45, newUsers: 3, commission: 975 },
  { label: "Thu", revenue: 21000, orders: 48, newUsers: 7, commission: 1050 },
  { label: "Fri", revenue: 25600, orders: 58, newUsers: 9, commission: 1280 },
  { label: "Sat", revenue: 32400, orders: 75, newUsers: 12, commission: 1620 },
  { label: "Sun", revenue: 35800, orders: 82, newUsers: 15, commission: 1790 },
];

export const analyticsWeekly: AnalyticsPoint[] = [
  { label: "Week 1", revenue: 95000, orders: 218, newUsers: 32, commission: 4750 },
  { label: "Week 2", revenue: 108000, orders: 251, newUsers: 41, commission: 5400 },
  { label: "Week 3", revenue: 121400, orders: 280, newUsers: 38, commission: 6070 },
  { label: "Week 4", revenue: 174800, orders: 401, newUsers: 56, commission: 8740 },
];

export const analyticsMonthly: AnalyticsPoint[] = [
  { label: "Jan", revenue: 285000, orders: 652, newUsers: 89, commission: 14250 },
  { label: "Feb", revenue: 312000, orders: 714, newUsers: 104, commission: 15600 },
  { label: "Mar", revenue: 298000, orders: 681, newUsers: 97, commission: 14900 },
  { label: "Apr", revenue: 341000, orders: 781, newUsers: 123, commission: 17050 },
  { label: "May", revenue: 389000, orders: 892, newUsers: 148, commission: 19450 },
  { label: "Jun", revenue: 421000, orders: 963, newUsers: 167, commission: 21050 },
];

export const topSellingProducts = [
  { id: "ts1", name: "Aashirvaad Whole Wheat Atta 5kg", category: "groceries", unitsSold: 184, revenue: 44160, vendorName: "Sharma Kirana Store", image: "/assets/cat-groceries.png" },
  { id: "ts2", name: "Fresh Onion 1kg", category: "vegetables", unitsSold: 142, revenue: 5680, vendorName: "Fresh Farm Veggies", image: "/assets/cat-vegetables.png" },
  { id: "ts3", name: "Himalaya Neem Face Wash", category: "personal-care", unitsSold: 98, revenue: 14700, vendorName: "Sharma Kirana Store", image: "/assets/cat-personal-care.png" },
  { id: "ts4", name: "Men's Formal Shirt", category: "clothing", unitsSold: 76, revenue: 68324, vendorName: "StyleZone Fashion", image: "/assets/cat-clothing.png" },
  { id: "ts5", name: "Atomic Habits", category: "books", unitsSold: 64, revenue: 22400, vendorName: "Sharma Kirana Store", image: "/assets/cat-books.png" },
];