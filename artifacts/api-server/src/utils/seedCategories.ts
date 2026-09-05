import { db, categories } from "@workspace/db";
import { eq, notInArray } from "drizzle-orm";
import { logger } from "../lib/logger.js";

interface CategorySeed {
  name: string;
  slug: string;
  emoji: string;
  color: string;
  parentTab: string;
  group: string;
  subcategories?: string[];
}

export const MASTER_CATEGORIES: CategorySeed[] = [
  { name: "Fruits & Vegetables", slug: "fruits-vegetables", emoji: "🥦", color: "#22C55E", parentTab: "swiftmart", group: "Grocery & Kitchen", subcategories: ["Leafy Greens", "Root Vegetables", "Gourds", "Seasonal Vegetables", "Herbs"] },
  { name: "Dairy, Bread & Eggs", slug: "dairy-bread-eggs", emoji: "🥛", color: "#F59E0B", parentTab: "swiftmart", group: "Grocery & Kitchen", subcategories: ["Milk", "Curd", "Paneer", "Butter", "Cheese", "Ice Cream", "Ghee"] },
  { name: "Atta, Rice, Oil & Dals", slug: "grocery", emoji: "🌾", color: "#10B981", parentTab: "swiftmart", group: "Grocery & Kitchen", subcategories: ["Rice", "Atta", "Dal", "Oil", "Spices", "Grains", "Pulses"] },
  { name: "Meat, Fish & Eggs", slug: "meat-seafood", emoji: "🍗", color: "#DC2626", parentTab: "swiftmart", group: "Grocery & Kitchen", subcategories: ["Fresh Meat", "Fish & Seafood", "Poultry", "Eggs"] },
  { name: "Masala & Dry Fruits", slug: "spices-dryfruits", emoji: "🌶️", color: "#EF4444", parentTab: "swiftmart", group: "Grocery & Kitchen", subcategories: ["Ground Spices", "Whole Spices", "Dry Fruits", "Nuts", "Seeds"] },
  { name: "Breakfast & Sauces", slug: "breakfast-sauces", emoji: "🥞", color: "#F59E0B", parentTab: "swiftmart", group: "Grocery & Kitchen", subcategories: ["Sauces & Ketchup", "Spreads & Jams", "Oats & Cereals", "Honey & Syrups"] },
  { name: "Packaged Food", slug: "packaged-food", emoji: "🥫", color: "#EF4444", parentTab: "swiftmart", group: "Grocery & Kitchen", subcategories: ["Noodles & Pasta", "Canned Goods", "Ready to Eat", "Soups & Mixes"] },
  { name: "SwiftMart Cafe", slug: "food_junction", emoji: "🍔", color: "#EC4899", parentTab: "food", group: "Snacks & Drinks", subcategories: ["Burgers", "Pizza", "Momos", "Rolls", "Sandwiches", "Beverages"] },
  { name: "Tea, Coffee & More", slug: "tea-coffee", emoji: "☕", color: "#8B5CF6", parentTab: "swiftmart", group: "Snacks & Drinks", subcategories: ["Tea Bags", "Loose Tea", "Instant Coffee", "Ground Coffee", "Milk Powder"] },
  { name: "Ice Creams & More", slug: "ice-cream", emoji: "🍦", color: "#EC4899", parentTab: "swiftmart", group: "Snacks & Drinks", subcategories: ["Tubs", "Cones", "Popsicles", "Kulfi", "Frozen Desserts"] },
  { name: "Frozen Food", slug: "frozen-foods", emoji: "🧊", color: "#06B6D4", parentTab: "swiftmart", group: "Grocery & Kitchen", subcategories: ["Frozen Veggies", "Frozen Snacks", "Frozen Meals"] },
  { name: "Sweet Cravings", slug: "sweets", emoji: "🍬", color: "#F472B6", parentTab: "swiftmart", group: "Snacks & Drinks", subcategories: ["Rasgulla", "Gulab Jamun", "Ladoo", "Barfi", "Peda", "Traditional Sweets"] },
  { name: "Cold Drinks & Juices", slug: "cold-drinks", emoji: "🥤", color: "#3B82F6", parentTab: "swiftmart", group: "Snacks & Drinks", subcategories: ["Soft Drinks", "Fruit Juices", "Energy Drinks", "Soda & Water"] },
  { name: "Munchies", slug: "snacks-drinks", emoji: "🍿", color: "#EF4444", parentTab: "swiftmart", group: "Snacks & Drinks", subcategories: ["Chips & Crisps", "Namkeen", "Popcorn", "Puffs & Extruded"] },
  { name: "Biscuits & Cookies", slug: "biscuits-cookies", emoji: "🍪", color: "#F97316", parentTab: "swiftmart", group: "Snacks & Drinks", subcategories: ["Sweet Biscuits", "Salted Biscuits", "Cookies", "Cream Biscuits"] },
  { name: "Apparel", slug: "fashion", emoji: "👕", color: "#F97316", parentTab: "super", group: "Fashion & Lifestyle", subcategories: ["Men's Wear", "Women's Wear", "Kids Wear", "Ethnic Wear", "Western Wear"] },
  { name: "Jewellery", slug: "jewellery", emoji: "💎", color: "#EC4899", parentTab: "super", group: "Fashion & Lifestyle", subcategories: ["Rings", "Necklaces", "Earrings", "Bracelets", "Bangles"] },
  { name: "Personal Care Studio", slug: "beauty-personal-care", emoji: "💅", color: "#EC4899", parentTab: "swiftmart", group: "Beauty & Personal Care", subcategories: ["Nail Care", "Hygiene", "Personal Care Tools"] },
  { name: "Skincare", slug: "skincare", emoji: "🧴", color: "#EC4899", parentTab: "swiftmart", group: "Beauty & Personal Care", subcategories: ["Moisturizers", "Cleansers", "Sunscreen", "Face Serums"] },
  { name: "Makeup & Beauty", slug: "makeup", emoji: "💄", color: "#EC4899", parentTab: "swiftmart", group: "Beauty & Personal Care", subcategories: ["Lipstick", "Kajal & Eyeliner", "Foundation", "Blush & Highlighter"] },
  { name: "Fragrance", slug: "fragrance", emoji: "💨", color: "#3B82F6", parentTab: "swiftmart", group: "Beauty & Personal Care", subcategories: ["Perfumes", "Deodorants", "Body Mists", "Room Fresheners"] },
  { name: "Bath & Body", slug: "bath-body", emoji: "🧼", color: "#10B981", parentTab: "swiftmart", group: "Beauty & Personal Care", subcategories: ["Soaps", "Body Wash", "Handwash", "Body Lotions"] },
  { name: "Haircare", slug: "haircare", emoji: "💇", color: "#8B5CF6", parentTab: "swiftmart", group: "Beauty & Personal Care", subcategories: ["Shampoo", "Conditioner", "Hair Oil", "Hair Color", "Hair Styling"] },
  { name: "Baby Care", "slug": "baby-care", emoji: "👶", color: "#F472B6", parentTab: "swiftmart", group: "Beauty & Personal Care", subcategories: ["Baby Diapers", "Baby Wipes", "Baby Bath & Body", "Baby Food"] },
  { name: "Protein & Nutrition", slug: "protein-nutrition", emoji: "💪", color: "#EF4444", parentTab: "swiftmart", group: "Beauty & Personal Care", subcategories: ["Protein Powders", "Nutrition Bars", "Health Supplements"] },
  { name: "Pharmacy & Wellness", slug: "medicines", emoji: "💊", color: "#14B8A6", parentTab: "swiftmart", group: "Beauty & Personal Care", subcategories: ["Medicines", "First Aid", "Wellness Supplements", "Medical Devices"] },
  { name: "Feminine Hygiene", slug: "feminine-hygiene", emoji: "🚺", color: "#8B5CF6", parentTab: "swiftmart", group: "Beauty & Personal Care", subcategories: ["Sanitary Pads", "Panty Liners", "Intimate Wash"] },
  { name: "Home Needs", slug: "home-kitchen", emoji: "🧹", color: "#8B5CF6", parentTab: "swiftmart", group: "Household Essentials", subcategories: ["Detergents", "Floor Cleaners", "Kitchen Cleaners", "Brooms & Brushes"] },
  { name: "Kitchenware & Appliances", slug: "kitchenware", emoji: "🍳", color: "#78716C", parentTab: "swiftmart", group: "Household Essentials", subcategories: ["Cookware", "Tableware", "Kitchen Tools", "Small Appliances"] },
  { name: "Cleaning Essentials", slug: "cleaning-essentials", emoji: "🧽", color: "#0EA5E9", parentTab: "swiftmart", group: "Household Essentials", subcategories: ["Sponges & Wipes", "Garbage Bags", "Toilet Cleaners"] },
  { name: "Electronics Store", slug: "electronics", emoji: "🔌", color: "#3B82F6", parentTab: "super", group: "Household Essentials", subcategories: ["Mobile Accessories", "Chargers & Cables", "Batteries", "Bulbs & LED"] },
  { name: "Pet Care", slug: "pet-care", emoji: "🐾", color: "#84CC16", parentTab: "swiftmart", group: "Household Essentials", subcategories: ["Dog Food", "Cat Food", "Pet Toys", "Pet Hygiene"] },
  { name: "Paan Corner", slug: "paan", emoji: "🍃", color: "#22C55E", parentTab: "swiftmart", group: "Household Essentials", subcategories: ["Mouth Fresheners", "Paan Items", "Chutneys"] },
  { name: "Toys & Games", slug: "toys-games", emoji: "🎮", color: "#A855F7", parentTab: "super", group: "Hobbies & Interests", subcategories: ["Board Games", "Action Figures", "Puzzles", "Soft Toys"] },
  { name: "Stationery & Crafts", slug: "stationery-crafts", emoji: "🎨", color: "#6366F1", parentTab: "swiftmart", group: "Hobbies & Interests", subcategories: ["Pens & Pencils", "Notebooks & Diaries", "Art Supplies", "Office Supplies"] },
  { name: "Sports & Fitness", slug: "sports-fitness", emoji: "⚽", color: "#0EA5E9", parentTab: "swiftmart", group: "Hobbies & Interests", subcategories: ["Fitness Accessories", "Sports Gear", "Yoga Mats"] },
  { name: "Book Store", slug: "books-stationery", emoji: "📚", color: "#6366F1", parentTab: "swiftmart", group: "Hobbies & Interests", subcategories: ["Novels & Fiction", "Educational Books", "Children Books", "Art Materials"] },
  { name: "Gift Store", slug: "flowers-gifts", emoji: "🎁", color: "#F43F5E", parentTab: "swiftmart", group: "Shop by Store", subcategories: ["Gift Hampers", "Greeting Cards", "Photo Frames", "Flowers"] },
  { name: "Ayush Store", slug: "ayush", emoji: "🌱", color: "#10B981", parentTab: "swiftmart", group: "Shop by Store", subcategories: ["Ayurvedic Products", "Herbal Supplements", "Organic Powders"] },
  { name: "Pooja Store", slug: "pooja", emoji: "🪔", color: "#F59E0B", parentTab: "swiftmart", group: "Shop by Store", subcategories: ["Incense Sticks", "Pooja Thali", "Diya & Oil", "Camphor & Sindoor"] },
  { name: "Derma Store", slug: "derma", emoji: "🧴", color: "#EC4899", parentTab: "swiftmart", group: "Shop by Store", subcategories: ["Derma Face Washes", "Derma Creams", "Anti-Acne Serums"] },
  { name: "Global Store", slug: "global-store", emoji: "🌐", color: "#3B82F6", parentTab: "swiftmart", group: "Shop by Store", subcategories: ["Imported Chocolates", "Global Snacks", "International Brands"] },
  { name: "Sports Store", slug: "sports-store", emoji: "👟", color: "#0EA5E9", parentTab: "swiftmart", group: "Shop by Store", subcategories: ["Running Shoes", "Activewear", "Gym Shakers"] },
  { name: "Gaming Gift Cards", slug: "gaming-cards", emoji: "🎮", color: "#8B5CF6", parentTab: "swiftmart", group: "Shop by Store", subcategories: ["Console Cards", "Mobile Gaming Cards", "Gift Vouchers"] },
  { name: "Baby Store", slug: "baby-store", emoji: "🍼", color: "#F472B6", parentTab: "swiftmart", group: "Shop by Store", subcategories: ["Baby Clothes", "Baby Gear", "Baby Strollers"] },
  { name: "Pleasure Store", slug: "pleasure", emoji: "🕯️", color: "#EC4899", parentTab: "swiftmart", group: "Shop by Store", subcategories: ["Wellness Candles", "Massage Oils", "Wellness Accessories"] },
  { name: "Automotive Store", slug: "automotive", emoji: "🚗", color: "#78716C", parentTab: "swiftmart", group: "Shop by Store", subcategories: ["Car Fresheners", "Car Wash Shampoo", "Cleaning Cloths", "Mobile Mounts"] }
];

const MASTER_SLUGS = MASTER_CATEGORIES.map(c => c.slug);

export async function seedCategories(): Promise<void> {
  // Remove any categories not in the master list
  await db.delete(categories).where(notInArray(categories.slug, MASTER_SLUGS));

  let inserted = 0;
  let updated = 0;

  for (const cat of MASTER_CATEGORIES) {
    const existing = await db.select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, cat.slug))
      .limit(1);

    const subcats = cat.subcategories ?? [];

    if (existing.length === 0) {
      await db.insert(categories).values({
        name: cat.name,
        slug: cat.slug,
        emoji: cat.emoji,
        color: cat.color,
        parentTab: cat.parentTab,
        group: cat.group,
        subcategories: subcats,
        isActive: true,
      });
      inserted++;
    } else {
      await db.update(categories)
        .set({
          name: cat.name,
          emoji: cat.emoji,
          color: cat.color,
          parentTab: cat.parentTab,
          group: cat.group,
          subcategories: subcats,
        })
        .where(eq(categories.slug, cat.slug));
      updated++;
    }
  }

  logger.info(`Categories synced: ${inserted} inserted, ${updated} updated (${MASTER_SLUGS.length} total)`);
}
