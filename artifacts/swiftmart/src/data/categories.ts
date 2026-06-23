export interface Category {
  id: string;
  name: string;
  emoji: string;
  image?: string;
  color: string;
  icon: string;
  subcategories: string[];
}

export const categories: Category[] = [
  {
    id: "grocery",
    name: "Grocery",
    emoji: "🛒",
    color: "hsl(35, 90%, 55%)",
    icon: "shopping-basket",
    subcategories: ["Rice", "Atta", "Dal", "Oil", "Spices", "Biscuits", "Packaged Foods", "Pulses", "Daily Needs"],
  },
  {
    id: "vegetables",
    name: "Vegetables",
    emoji: "🥦",
    color: "hsl(140, 60%, 45%)",
    icon: "leaf",
    subcategories: ["Leafy Greens", "Root Vegetables", "Gourds", "Seasonal Vegetables", "Herbs"],
  },
  {
    id: "fruits",
    name: "Fruits",
    emoji: "🍎",
    color: "hsl(10, 80%, 55%)",
    icon: "apple",
    subcategories: ["Seasonal Fruits", "Tropical Fruits", "Citrus", "Berries", "Dry Fruits"],
  },
  {
    id: "dairy",
    name: "Dairy & Eggs",
    emoji: "🥛",
    color: "hsl(200, 70%, 55%)",
    icon: "milk",
    subcategories: ["Milk", "Curd", "Paneer", "Butter", "Cheese", "Eggs", "Ghee"],
  },
  {
    id: "sweet-shop",
    name: "Sweet Shop",
    emoji: "🍬",
    color: "hsl(350, 80%, 60%)",
    icon: "cake",
    subcategories: ["Rasgulla", "Gulab Jamun", "Ladoo", "Barfi", "Peda", "Mishti Doi", "Traditional Sweets"],
  },
  {
    id: "bakery",
    name: "Bakery",
    emoji: "🍞",
    color: "hsl(30, 75%, 55%)",
    icon: "chef-hat",
    subcategories: ["Bread", "Cakes", "Pastries", "Cookies", "Muffins", "Croissants"],
  },
  {
    id: "restaurant",
    name: "Restaurant",
    emoji: "🍽️",
    color: "hsl(20, 90%, 55%)",
    icon: "utensils",
    subcategories: ["Biryani", "Thali", "Chinese", "South Indian", "Tandoor", "Desserts", "Beverages"],
  },
  {
    id: "fast-food",
    name: "Fast Food",
    emoji: "🍟",
    color: "hsl(15, 90%, 55%)",
    icon: "zap",
    subcategories: ["Burgers", "Pizza", "Momos", "Rolls", "Sandwiches", "Wraps"],
  },
  {
    id: "cloud-kitchen",
    name: "Cloud Kitchen",
    emoji: "🏠",
    color: "hsl(45, 90%, 50%)",
    icon: "chef-hat",
    subcategories: ["Home-made Food", "Tiffin Service", "Meal Box", "Snacks", "Home Bakers"],
  },
  {
    id: "snacks",
    name: "Snacks",
    emoji: "🍿",
    color: "hsl(38, 90%, 52%)",
    icon: "package",
    subcategories: ["Namkeen", "Chips", "Biscuits", "Cookies", "Nuts", "Popcorn"],
  },
  {
    id: "drinks",
    name: "Drinks",
    emoji: "🥤",
    color: "hsl(190, 75%, 50%)",
    icon: "cup-soda",
    subcategories: ["Cold Drinks", "Juices", "Water", "Tea & Coffee", "Energy Drinks", "Milkshakes"],
  },
  {
    id: "medicine",
    name: "Medicine & Healthcare",
    emoji: "💊",
    color: "hsl(210, 80%, 55%)",
    icon: "pill",
    subcategories: ["Medicines", "Health Supplements", "First Aid", "Baby Care", "Medical Devices", "Vitamins"],
  },
  {
    id: "clothing",
    name: "Clothes & Fashion",
    emoji: "👗",
    color: "hsl(280, 60%, 60%)",
    icon: "shirt",
    subcategories: ["Men's Wear", "Women's Wear", "Kids Wear", "Ethnic Wear", "Western Wear"],
  },
  {
    id: "fashion",
    name: "Fashion & Accessories",
    emoji: "👜",
    color: "hsl(270, 55%, 58%)",
    icon: "shopping-bag",
    subcategories: ["Bags", "Jewellery", "Footwear", "Watches", "Belts", "Sunglasses"],
  },
  {
    id: "handmade",
    name: "Handmade & Artisan",
    emoji: "🎨",
    color: "hsl(170, 60%, 45%)",
    icon: "palette",
    subcategories: ["Handmade Jewellery", "Crochet", "Handicrafts", "Resin Art", "Candles", "Paintings"],
  },
  {
    id: "book-store",
    name: "Books & Stationery",
    emoji: "📚",
    color: "hsl(200, 80%, 50%)",
    icon: "book-open",
    subcategories: ["School Books", "Office Supplies", "Novels", "Art Materials", "Notebooks", "Pens"],
  },
  {
    id: "gift-shop",
    name: "Gift Shop",
    emoji: "🎁",
    color: "hsl(350, 80%, 60%)",
    icon: "gift",
    subcategories: ["Gift Hampers", "Greeting Cards", "Photo Frames", "Showpieces", "Customised Gifts"],
  },
  {
    id: "electronics",
    name: "Electronics & Appliances",
    emoji: "🔌",
    color: "hsl(230, 60%, 55%)",
    icon: "cpu",
    subcategories: ["Home Appliances", "Fans", "Mixers", "Irons", "Geysers", "Coolers", "Mobile Accessories"],
  },
];

export const getCategoryById = (id: string): Category | undefined =>
  categories.find(c => c.id === id);

export const getAllSubcategories = (): string[] =>
  categories.flatMap(c => c.subcategories);
