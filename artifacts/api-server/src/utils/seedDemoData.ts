import { User } from "../models/User.js";
import { Shop } from "../models/Shop.js";
import { Product } from "../models/Product.js";
import { logger } from "../lib/logger.js";

export async function seedDemoData(): Promise<void> {
  const approvedCount = await Shop.countDocuments({ status: "approved" });
  if (approvedCount > 0) return;

  logger.info("Seeding demo shops and products for Balurghat...");

  const [vendor1, vendor2, vendor3] = await Promise.all([
    User.findOneAndUpdate(
      { phone: "9000000001" },
      { $setOnInsert: { name: "Ravi Sharma", phone: "9000000001", role: "vendor", vendorStatus: "approved" } },
      { upsert: true, new: true }
    ),
    User.findOneAndUpdate(
      { phone: "9000000002" },
      { $setOnInsert: { name: "Anita Das", phone: "9000000002", role: "vendor", vendorStatus: "approved" } },
      { upsert: true, new: true }
    ),
    User.findOneAndUpdate(
      { phone: "9000000003" },
      { $setOnInsert: { name: "Suresh Mondal", phone: "9000000003", role: "vendor", vendorStatus: "approved" } },
      { upsert: true, new: true }
    ),
  ]);

  const [shop1, shop2, shop3] = await Promise.all([
    Shop.create({
      shopName: "Sharma Kirana Store",
      ownerName: "Ravi Sharma",
      phone: "9000000001",
      ownerId: String(vendor1!._id),
      shopType: "grocery",
      category: "grocery",
      description: "Your trusted neighbourhood kirana for daily essentials.",
      status: "approved",
      isOpen: true,
      rating: 4.3,
      totalOrders: 120,
      commissionRate: 5,
      address: { line1: "Station Road, Near Bus Stand", line2: "", city: "Balurghat", pincode: "733101", state: "West Bengal" },
      panNumber: "DEMO0000001",
      bankAccountNumber: "000000000001",
      bankIfscCode: "SBIN0000001",
      upiId: "ravi@oksbi",
    }),
    Shop.create({
      shopName: "Fresh Farm Vegetables",
      ownerName: "Anita Das",
      phone: "9000000002",
      ownerId: String(vendor2!._id),
      shopType: "fruits-vegetables",
      category: "vegetables",
      description: "Farm-fresh vegetables and fruits delivered daily.",
      status: "approved",
      isOpen: true,
      rating: 4.5,
      totalOrders: 85,
      commissionRate: 5,
      address: { line1: "Subhash Market, Court Para", line2: "", city: "Balurghat", pincode: "733101", state: "West Bengal" },
      panNumber: "DEMO0000002",
      bankAccountNumber: "000000000002",
      bankIfscCode: "SBIN0000002",
      upiId: "anita@oksbi",
    }),
    Shop.create({
      shopName: "Balurghat Electronics Hub",
      ownerName: "Suresh Mondal",
      phone: "9000000003",
      ownerId: String(vendor3!._id),
      shopType: "electronics",
      category: "electronics",
      description: "Mobile accessories, cables, and electronics at best prices.",
      status: "approved",
      isOpen: true,
      rating: 4.1,
      totalOrders: 60,
      commissionRate: 5,
      address: { line1: "Gangarampur Road, Near Post Office", line2: "", city: "Balurghat", pincode: "733103", state: "West Bengal" },
      panNumber: "DEMO0000003",
      bankAccountNumber: "000000000003",
      bankIfscCode: "SBIN0000003",
      upiId: "suresh@oksbi",
    }),
  ]);

  await Product.insertMany([
    { name: "Aashirvaad Whole Wheat Atta 5kg", price: 238, category: "grocery", shopId: String(shop1._id), stock: 50, status: "active", unit: "5kg bag", images: [], trending: true },
    { name: "Fortune Sunflower Oil 1L", price: 135, category: "grocery", shopId: String(shop1._id), stock: 40, status: "active", unit: "1L bottle", images: [], trending: false },
    { name: "Tata Salt 1kg", price: 22, category: "grocery", shopId: String(shop1._id), stock: 100, status: "active", unit: "1kg pack", images: [], trending: false },
    { name: "Britannia Milk Bikis 250g", price: 35, category: "grocery", shopId: String(shop1._id), stock: 60, status: "active", unit: "250g pack", images: [], trending: false },
    { name: "Dove Soap 75g", price: 48, category: "grocery", shopId: String(shop1._id), stock: 80, status: "active", unit: "1 bar", images: [], trending: false },
    { name: "Maggi 2-Minute Noodles (Pack of 6)", price: 84, category: "grocery", shopId: String(shop1._id), stock: 45, status: "active", unit: "6-pack", images: [], trending: true },

    { name: "Fresh Potato", price: 28, category: "vegetables", shopId: String(shop2._id), stock: 200, status: "active", unit: "1kg", images: [], trending: false },
    { name: "Fresh Onion", price: 35, category: "vegetables", shopId: String(shop2._id), stock: 150, status: "active", unit: "1kg", images: [], trending: false },
    { name: "Fresh Tomato", price: 42, category: "vegetables", shopId: String(shop2._id), stock: 120, status: "active", unit: "1kg", images: [], trending: false },
    { name: "Fresh Ginger", price: 15, category: "vegetables", shopId: String(shop2._id), stock: 80, status: "active", unit: "100g", images: [], trending: false },
    { name: "Coriander Leaves", price: 10, category: "vegetables", shopId: String(shop2._id), stock: 60, status: "active", unit: "bunch", images: [], trending: false },
    { name: "Green Chilli", price: 12, category: "vegetables", shopId: String(shop2._id), stock: 90, status: "active", unit: "100g", images: [], trending: false },

    { name: "USB Type-C Fast Charger 20W", price: 349, category: "electronics", shopId: String(shop3._id), stock: 30, status: "active", unit: "1 piece", images: [], trending: true },
    { name: "Wired Earphones with Mic", price: 199, category: "electronics", shopId: String(shop3._id), stock: 25, status: "active", unit: "1 piece", images: [], trending: false },
    { name: "USB-C to USB-A Cable 1m", price: 99, category: "electronics", shopId: String(shop3._id), stock: 50, status: "active", unit: "1 piece", images: [], trending: false },
    { name: "10000mAh Power Bank", price: 899, category: "electronics", shopId: String(shop3._id), stock: 15, status: "active", unit: "1 piece", images: [], trending: true },
    { name: "Tempered Glass Screen Protector", price: 79, category: "electronics", shopId: String(shop3._id), stock: 40, status: "active", unit: "1 piece", images: [], trending: false },
    { name: "Mobile Back Cover (Universal)", price: 129, category: "electronics", shopId: String(shop3._id), stock: 35, status: "active", unit: "1 piece", images: [], trending: false },
  ]);

  logger.info("Demo data seeded: 3 shops, 18 products in Balurghat");
}
