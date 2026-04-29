import { Order } from "@/types";

export const mockOrders: Order[] = [
  {
    id: "ORD-1001",
    items: [
      { product: { id: "g1", name: "Aashirvaad Whole Wheat Atta", category: "groceries", price: 240, unit: "5 kg", image: "/assets/cat-groceries.png", description: "", stock: 50, rating: 4.8, vendorId: "v1" }, qty: 1 },
      { product: { id: "v1", name: "Fresh Onion", category: "vegetables", price: 40, unit: "1 kg", image: "/assets/cat-vegetables.png", description: "", stock: 100, rating: 4.5, vendorId: "v2" }, qty: 2 }
    ],
    total: 320,
    status: "delivered",
    address: { id: "a1", label: "Home", line1: "101, Prestige Apartments", city: "Mumbai", pincode: "400001" },
    placedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    eta: new Date(Date.now() - 86400000 * 2 + 600000).toISOString(),
    paymentMethod: "UPI"
  },
  {
    id: "ORD-1002",
    items: [
      { product: { id: "p1", name: "Himalaya Neem Face Wash", category: "personal-care", price: 150, unit: "150 ml", image: "/assets/cat-personal-care.png", description: "", stock: 40, rating: 4.7, vendorId: "v1" }, qty: 1 }
    ],
    total: 150,
    status: "packed",
    address: { id: "a2", label: "Work", line1: "Tech Park, Block B", city: "Mumbai", pincode: "400051" },
    placedAt: new Date(Date.now() - 1800000).toISOString(),
    eta: new Date(Date.now() + 600000).toISOString(),
    paymentMethod: "Card"
  }
];
