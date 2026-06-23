import { db, categories } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

interface CategorySeed {
  name: string;
  slug: string;
  emoji: string;
  color: string;
  subcategories: string[];
}

const RICH_CATEGORIES: CategorySeed[] = [
  { name: "Grocery & Daily Needs", slug: "grocery", emoji: "🛒", color: "hsl(35, 90%, 55%)", subcategories: ["Rice", "Atta", "Dal", "Oil", "Spices", "Biscuits", "Snacks", "Cold Drinks", "Packaged Foods", "Pulses"] },
  { name: "Kirana Store", slug: "kirana-store", emoji: "🏪", color: "hsl(40, 85%, 50%)", subcategories: ["Namkeen", "Masala", "Oil", "Ghee", "Soaps", "Detergents", "Daily Needs"] },
  { name: "Fruits & Vegetables", slug: "fruits-vegetables", emoji: "🥦", color: "hsl(140, 60%, 45%)", subcategories: ["Fresh Vegetables", "Seasonal Fruits", "Organic Produce", "Herbs"] },
  { name: "Sweet Shop", slug: "sweet-shop", emoji: "🍬", color: "hsl(350, 80%, 60%)", subcategories: ["Rasgulla", "Gulab Jamun", "Ladoo", "Barfi", "Peda", "Mishti Doi", "Traditional Sweets"] },
  { name: "Bakery", slug: "bakery", emoji: "🍞", color: "hsl(30, 75%, 55%)", subcategories: ["Bread", "Cakes", "Pastries", "Cookies", "Muffins", "Croissants"] },
  { name: "Dairy & Eggs", slug: "dairy", emoji: "🥛", color: "hsl(200, 70%, 55%)", subcategories: ["Milk", "Curd", "Paneer", "Butter", "Cheese", "Eggs", "Ghee"] },
  { name: "Restaurant", slug: "restaurant", emoji: "🍽️", color: "hsl(20, 90%, 55%)", subcategories: ["Biryani", "Thali", "Chinese", "South Indian", "Tandoor", "Desserts", "Beverages"] },
  { name: "Cloud Kitchen", slug: "cloud-kitchen", emoji: "🏠", color: "hsl(45, 90%, 50%)", subcategories: ["Home-made Food", "Tiffin Service", "Home Bakers", "Meal Box", "Snacks"] },
  { name: "Fast Food", slug: "fast-food", emoji: "🍟", color: "hsl(15, 90%, 55%)", subcategories: ["Burgers", "Pizza", "Momos", "Rolls", "Sandwiches", "Wraps"] },
  { name: "Meat & Fish", slug: "meat-fish", emoji: "🐟", color: "hsl(0, 65%, 50%)", subcategories: ["Fish", "Chicken", "Mutton", "Prawns", "Eggs"] },
  { name: "Meat Shop", slug: "meat-shop", emoji: "🥩", color: "hsl(5, 65%, 50%)", subcategories: ["Chicken", "Mutton", "Fish", "Prawns", "Eggs"] },
  { name: "Fish Shop", slug: "fish-shop", emoji: "🐟", color: "hsl(195, 70%, 48%)", subcategories: ["Rohu", "Katla", "Hilsa", "Prawn", "Crab", "Pomfret"] },
  { name: "Medicine & Healthcare", slug: "medicine", emoji: "💊", color: "hsl(210, 80%, 55%)", subcategories: ["Medicines", "Health Supplements", "First Aid", "Baby Care", "Medical Devices"] },
  { name: "Pharmacy", slug: "pharmacy", emoji: "🏥", color: "hsl(195, 80%, 50%)", subcategories: ["Prescription Medicines", "OTC Drugs", "Vitamins", "Baby Products"] },
  { name: "Cosmetics Shop", slug: "cosmetics", emoji: "💄", color: "hsl(330, 70%, 60%)", subcategories: ["Lipstick", "Foundation", "Kajal", "Face Cream", "Perfumes", "Nail Polish"] },
  { name: "Beauty & Personal Care", slug: "personal-care", emoji: "✨", color: "hsl(310, 60%, 60%)", subcategories: ["Skincare", "Haircare", "Grooming Products", "Deodorants", "Sunscreen"] },
  { name: "Clothes & Fashion", slug: "clothing", emoji: "👗", color: "hsl(280, 60%, 60%)", subcategories: ["Men's Wear", "Women's Wear", "Kids Wear", "Ethnic Wear", "Western Wear"] },
  { name: "Fashion & Accessories", slug: "fashion", emoji: "👜", color: "hsl(270, 55%, 58%)", subcategories: ["Bags", "Jewellery", "Footwear", "Watches", "Belts", "Sunglasses"] },
  { name: "Handmade & Artisan", slug: "handmade", emoji: "🎨", color: "hsl(170, 60%, 45%)", subcategories: ["Handmade Jewellery", "Crochet", "Handicrafts", "Resin Art", "Candles", "Paintings"] },
  { name: "Custom & Designer", slug: "custom-designer", emoji: "✂️", color: "hsl(260, 55%, 55%)", subcategories: ["Custom Punjabi", "Embroidery", "Tailoring", "Boutique Products", "Custom Gifts"] },
  { name: "Electronics & Appliances", slug: "electronics", emoji: "🔌", color: "hsl(230, 60%, 55%)", subcategories: ["Home Appliances", "Fans", "Mixers", "Irons", "Geysers", "Coolers"] },
  { name: "Mobile & Phone Shop", slug: "mobile-shop", emoji: "📱", color: "hsl(225, 65%, 55%)", subcategories: ["Mobile Phones", "Chargers", "Earphones", "Cases", "Screen Guards", "Accessories"] },
  { name: "Computer & Gaming", slug: "computer-gaming", emoji: "💻", color: "hsl(250, 55%, 55%)", subcategories: ["Laptops", "Desktops", "Keyboards", "Mouse", "Gaming Gear", "Webcams"] },
  { name: "Gift Products", slug: "gift-shop", emoji: "🎁", color: "hsl(350, 80%, 60%)", subcategories: ["Gift Hampers", "Greeting Cards", "Photo Frames", "Showpieces", "Customised Gifts"] },
  { name: "Gift & Toy Shop", slug: "gifts-toys", emoji: "🎀", color: "hsl(345, 70%, 62%)", subcategories: ["Gifts", "Toys", "Greeting Cards", "Decorative Items"] },
  { name: "Toy Store", slug: "toy-shop", emoji: "🧸", color: "hsl(200, 70%, 55%)", subcategories: ["Board Games", "Action Figures", "Dolls", "Educational Toys", "Soft Toys", "Puzzles"] },
  { name: "Household & Kitchen", slug: "household", emoji: "🏠", color: "hsl(190, 55%, 50%)", subcategories: ["Utensils", "Cooker", "Plates", "Storage Containers", "Cleaning Supplies", "Bedsheets"] },
  { name: "Hardware & Construction", slug: "hardware", emoji: "🔨", color: "hsl(25, 40%, 45%)", subcategories: ["Hardware Shop", "Paint", "Electrical Goods", "Plumbing Materials", "Building Materials"] },
  { name: "Furniture & Home Decor", slug: "furniture", emoji: "🛋️", color: "hsl(30, 60%, 50%)", subcategories: ["Furniture", "Home Decor", "Lighting", "Curtains", "Storage Items"] },
  { name: "Automobile Accessories", slug: "automobile", emoji: "🏍️", color: "hsl(220, 30%, 50%)", subcategories: ["Bike Accessories", "Car Accessories", "Helmets", "Lubricants", "Batteries"] },
  { name: "Pet Supplies", slug: "pet-supplies", emoji: "🐾", color: "hsl(20, 70%, 55%)", subcategories: ["Pet Food", "Pet Accessories", "Pet Care", "Aquarium", "Bird Supplies"] },
  { name: "Pet Shop", slug: "pet-shop", emoji: "🐕", color: "hsl(25, 65%, 52%)", subcategories: ["Dogs", "Cats", "Birds", "Fish", "Pet Food", "Pet Medicines"] },
  { name: "Books & Stationery", slug: "book-store", emoji: "📚", color: "hsl(200, 80%, 50%)", subcategories: ["School Books", "Office Supplies", "Novels", "Art Materials", "Notebooks"] },
  { name: "Sports & Fitness", slug: "sports-fitness", emoji: "🏏", color: "hsl(160, 60%, 40%)", subcategories: ["Cricket", "Football", "Badminton", "Gym Equipment", "Sports Accessories"] },
  { name: "Salon & Beauty", slug: "salon", emoji: "💇", color: "hsl(320, 65%, 60%)", subcategories: ["Haircut", "Hair Color", "Facial", "Waxing", "Manicure", "Pedicure"] },
  { name: "Local Services", slug: "local-services", emoji: "🔧", color: "hsl(190, 65%, 45%)", subcategories: ["Tailor", "Electrician", "Plumber", "Home Cleaning", "Repair Services"] },
  { name: "Local Brands & Own Products", slug: "local-brands", emoji: "🏷️", color: "hsl(15, 75%, 52%)", subcategories: ["Homemade Pickles", "Homemade Snacks", "Local Food Brands", "Boutique Brands"] },
  { name: "Gardening", slug: "gardening", emoji: "🌱", color: "hsl(130, 55%, 45%)", subcategories: ["Plants", "Pots", "Seeds", "Fertilizers", "Gardening Tools"] },
  { name: "Baby & Kids", slug: "baby-kids", emoji: "🍼", color: "hsl(345, 65%, 65%)", subcategories: ["Baby Food", "Toys", "Baby Care", "School Products", "Clothes"] },
  { name: "Other", slug: "other", emoji: "🛍️", color: "hsl(220, 20%, 55%)", subcategories: ["Miscellaneous", "General Items"] },
];

export async function seedCategories(): Promise<void> {
  let inserted = 0;
  let updated = 0;

  for (const cat of RICH_CATEGORIES) {
    const existing = await db.select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, cat.slug))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(categories).values({
        name: cat.name,
        slug: cat.slug,
        emoji: cat.emoji,
        color: cat.color,
        subcategories: cat.subcategories,
        isActive: true,
      });
      inserted++;
    } else {
      await db.update(categories)
        .set({ name: cat.name, emoji: cat.emoji, color: cat.color, subcategories: cat.subcategories })
        .where(eq(categories.slug, cat.slug));
      updated++;
    }
  }

  if (inserted > 0 || updated > 0) {
    logger.info(`Categories synced: ${inserted} inserted, ${updated} updated`);
  }
}
