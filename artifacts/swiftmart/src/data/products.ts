import { Product } from "@/types";

export const mockProducts: Product[] = [
  // Groceries
  { id: "g1", name: "Aashirvaad Whole Wheat Atta", category: "groceries", price: 240, unit: "5 kg", image: "/assets/cat-groceries.png", description: "Premium quality wheat atta for soft and fluffy rotis.", stock: 50, rating: 4.8, vendorId: "v1", trending: true },
  { id: "g2", name: "Tata Salt", category: "groceries", price: 25, unit: "1 kg", image: "/assets/cat-groceries.png", description: "Vacuum evaporated iodised salt.", stock: 100, rating: 4.9, vendorId: "v1" },
  { id: "g3", name: "India Gate Basmati Rice", category: "groceries", price: 180, unit: "1 kg", image: "/assets/cat-groceries.png", description: "Long grain basmati rice, perfect for biryani.", stock: 30, rating: 4.7, vendorId: "v1", trending: true },
  { id: "g4", name: "Fortune Sunlite Sunflower Oil", category: "groceries", price: 145, unit: "1 L", image: "/assets/cat-groceries.png", description: "Light and healthy cooking oil.", stock: 60, rating: 4.6, vendorId: "v1" },
  { id: "g5", name: "Maggi 2-Minute Noodles", category: "groceries", price: 56, unit: "280 g", image: "/assets/cat-groceries.png", description: "Classic instant noodles.", stock: 200, rating: 4.9, vendorId: "v1", trending: true },
  { id: "g6", name: "Everest Turmeric Powder", category: "groceries", price: 32, unit: "100 g", image: "/assets/cat-groceries.png", description: "Pure haldi powder.", stock: 80, rating: 4.8, vendorId: "v1" },
  { id: "g7", name: "Amul Taaza Milk", category: "groceries", price: 27, unit: "500 ml", image: "/assets/cat-groceries.png", description: "Toned milk, pasteurized.", stock: 150, rating: 4.8, vendorId: "v1" },
  { id: "g8", name: "Brooke Bond Red Label Tea", category: "groceries", price: 130, unit: "250 g", image: "/assets/cat-groceries.png", description: "Strong and flavourful tea leaves.", stock: 40, rating: 4.7, vendorId: "v1" },

  // Vegetables
  { id: "v1", name: "Fresh Onion", category: "vegetables", price: 40, unit: "1 kg", image: "/assets/cat-vegetables.png", description: "Freshly harvested red onions.", stock: 100, rating: 4.5, vendorId: "v2", trending: true },
  { id: "v2", name: "Tomato", category: "vegetables", price: 30, unit: "1 kg", image: "/assets/cat-vegetables.png", description: "Farm fresh red tomatoes.", stock: 80, rating: 4.6, vendorId: "v2", trending: true },
  { id: "v3", name: "Potato", category: "vegetables", price: 25, unit: "1 kg", image: "/assets/cat-vegetables.png", description: "Regular potatoes, good for daily cooking.", stock: 120, rating: 4.4, vendorId: "v2" },
  { id: "v4", name: "Green Chilli", category: "vegetables", price: 15, unit: "100 g", image: "/assets/cat-vegetables.png", description: "Spicy fresh green chillies.", stock: 50, rating: 4.7, vendorId: "v2" },
  { id: "v5", name: "Coriander Leaves", category: "vegetables", price: 20, unit: "1 bunch", image: "/assets/cat-vegetables.png", description: "Fresh dhaniya leaves.", stock: 40, rating: 4.8, vendorId: "v2" },
  { id: "v6", name: "Cauliflower", category: "vegetables", price: 45, unit: "1 pc", image: "/assets/cat-vegetables.png", description: "Fresh whole cauliflower.", stock: 30, rating: 4.3, vendorId: "v2" },
  { id: "v7", name: "Carrot", category: "vegetables", price: 60, unit: "1 kg", image: "/assets/cat-vegetables.png", description: "Crunchy orange carrots.", stock: 60, rating: 4.6, vendorId: "v2" },
  { id: "v8", name: "Lemon", category: "vegetables", price: 10, unit: "4 pcs", image: "/assets/cat-vegetables.png", description: "Fresh juicy lemons.", stock: 100, rating: 4.5, vendorId: "v2" },

  // Personal Care
  { id: "p1", name: "Himalaya Neem Face Wash", category: "personal-care", price: 150, unit: "150 ml", image: "/assets/cat-personal-care.png", description: "Purifying neem face wash for clear skin.", stock: 40, rating: 4.7, vendorId: "v1", trending: true },
  { id: "p2", name: "Dove Beauty Bathing Bar", category: "personal-care", price: 180, unit: "3x100 g", image: "/assets/cat-personal-care.png", description: "Moisturizing soaping bar.", stock: 60, rating: 4.8, vendorId: "v1" },
  { id: "p3", name: "Colgate Strong Teeth", category: "personal-care", price: 110, unit: "200 g", image: "/assets/cat-personal-care.png", description: "Anti-cavity toothpaste.", stock: 90, rating: 4.9, vendorId: "v1" },
  { id: "p4", name: "Head & Shoulders Shampoo", category: "personal-care", price: 320, unit: "340 ml", image: "/assets/cat-personal-care.png", description: "Anti-dandruff shampoo.", stock: 30, rating: 4.6, vendorId: "v1" },
  { id: "p5", name: "Nivea Body Lotion", category: "personal-care", price: 250, unit: "200 ml", image: "/assets/cat-personal-care.png", description: "Nourishing body lotion for dry skin.", stock: 25, rating: 4.8, vendorId: "v1" },
  { id: "p6", name: "Gillette Mach 3 Razor", category: "personal-care", price: 199, unit: "1 pc", image: "/assets/cat-personal-care.png", description: "Men's shaving razor.", stock: 15, rating: 4.7, vendorId: "v1" },
  { id: "p7", name: "Stayfree Cottony Pads", category: "personal-care", price: 350, unit: "40 pcs", image: "/assets/cat-personal-care.png", description: "Sanitary napkins.", stock: 50, rating: 4.9, vendorId: "v1" },
  { id: "p8", name: "Dettol Liquid Handwash", category: "personal-care", price: 99, unit: "200 ml", image: "/assets/cat-personal-care.png", description: "Germ protection handwash.", stock: 70, rating: 4.8, vendorId: "v1" },

  // Books
  { id: "b1", name: "Atomic Habits", category: "books", price: 350, unit: "1 pc", image: "/assets/cat-books.png", description: "An easy and proven way to build good habits by James Clear.", stock: 20, rating: 4.9, vendorId: "v1", trending: true },
  { id: "b2", name: "The Psychology of Money", category: "books", price: 300, unit: "1 pc", image: "/assets/cat-books.png", description: "Timeless lessons on wealth, greed, and happiness by Morgan Housel.", stock: 25, rating: 4.8, vendorId: "v1" },
  { id: "b3", name: "Ikigai", category: "books", price: 280, unit: "1 pc", image: "/assets/cat-books.png", description: "The Japanese secret to a long and happy life.", stock: 30, rating: 4.7, vendorId: "v1" },
  { id: "b4", name: "Rich Dad Poor Dad", category: "books", price: 250, unit: "1 pc", image: "/assets/cat-books.png", description: "What the rich teach their kids about money.", stock: 40, rating: 4.8, vendorId: "v1" },
  { id: "b5", name: "Do Epic Shit", category: "books", price: 200, unit: "1 pc", image: "/assets/cat-books.png", description: "By Ankur Warikoo.", stock: 35, rating: 4.6, vendorId: "v1" },
  { id: "b6", name: "Deep Work", category: "books", price: 320, unit: "1 pc", image: "/assets/cat-books.png", description: "Rules for focused success in a distracted world.", stock: 15, rating: 4.8, vendorId: "v1" },
  { id: "b7", name: "The Alchemist", category: "books", price: 290, unit: "1 pc", image: "/assets/cat-books.png", description: "A fable about following your dream.", stock: 45, rating: 4.7, vendorId: "v1" },
  { id: "b8", name: "Think and Grow Rich", category: "books", price: 220, unit: "1 pc", image: "/assets/cat-books.png", description: "Financial advice.", stock: 50, rating: 4.6, vendorId: "v1" },

  // Clothing
  { id: "c1", name: "Men's Cotton T-Shirt", category: "clothing", price: 499, unit: "1 pc", image: "/assets/cat-clothing.png", description: "Comfortable solid black t-shirt.", stock: 30, rating: 4.5, vendorId: "v1", trending: true },
  { id: "c2", name: "Women's Kurti", category: "clothing", price: 799, unit: "1 pc", image: "/assets/cat-clothing.png", description: "Printed cotton kurti for daily wear.", stock: 20, rating: 4.6, vendorId: "v1" },
  { id: "c3", name: "Unisex Gym Shorts", category: "clothing", price: 399, unit: "1 pc", image: "/assets/cat-clothing.png", description: "Breathable fabric shorts.", stock: 40, rating: 4.4, vendorId: "v1" },
  { id: "c4", name: "Men's Formal Shirt", category: "clothing", price: 899, unit: "1 pc", image: "/assets/cat-clothing.png", description: "Slim fit formal shirt, blue.", stock: 15, rating: 4.7, vendorId: "v1" },
  { id: "c5", name: "Women's Leggings", category: "clothing", price: 299, unit: "1 pc", image: "/assets/cat-clothing.png", description: "Stretchable ankle length leggings.", stock: 50, rating: 4.5, vendorId: "v1" },
  { id: "c6", name: "Kids Pyjama Set", category: "clothing", price: 599, unit: "1 set", image: "/assets/cat-clothing.png", description: "Cute printed nightwear for kids.", stock: 25, rating: 4.8, vendorId: "v1" },
  { id: "c7", name: "Cotton Socks Pack", category: "clothing", price: 199, unit: "3 pairs", image: "/assets/cat-clothing.png", description: "Ankle length socks.", stock: 100, rating: 4.9, vendorId: "v1" },
  { id: "c8", name: "Winter Beanie Cap", category: "clothing", price: 250, unit: "1 pc", image: "/assets/cat-clothing.png", description: "Warm woolen cap.", stock: 10, rating: 4.6, vendorId: "v1" }
];
