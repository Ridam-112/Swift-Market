import { Vendor } from "@/types";

export const vendors: Vendor[] = [
  {
    id: "v1",
    storeName: "Sharma Kirana Store",
    ownerName: "Rajesh Sharma",
    category: "Groceries & Daily Needs",
    tagline: "Your daily needs, delivered fast",
    rating: 4.8,
    totalOrders: 1542,
    isOpen: true,
    eta: "10 mins",
    image: "/assets/cat-groceries.png",
    pincode: "110001",
    city: "New Delhi",
    phone: "9876543210"
  },
  {
    id: "v2",
    storeName: "Fresh Farm Veggies",
    ownerName: "Sunita Devi",
    category: "Vegetables & Fruits",
    tagline: "Fresh from the farm to your home",
    rating: 4.6,
    totalOrders: 890,
    isOpen: true,
    eta: "15 mins",
    image: "/assets/cat-vegetables.png",
    pincode: "110001",
    city: "New Delhi",
    phone: "9876543211"
  },
  {
    id: "v3",
    storeName: "StyleZone Fashion",
    ownerName: "Arjun Mehta",
    category: "Clothing & Accessories",
    tagline: "Trendy clothes for everyone",
    rating: 4.5,
    totalOrders: 432,
    isOpen: true,
    eta: "45 mins",
    image: "/assets/cat-clothing.png",
    pincode: "110001",
    city: "New Delhi",
    phone: "9876543212"
  }
];
