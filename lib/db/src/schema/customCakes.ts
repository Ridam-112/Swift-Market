import { pgTable, text, timestamp, doublePrecision, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { shops } from "./shops.js";

export const customCakeRequests = pgTable("custom_cake_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  shopId: text("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  shopName: text("shop_name").notNull().default(""),
  customerId: text("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  customerName: text("customer_name").notNull().default(""),
  customerPhone: text("customer_phone").notNull().default(""),
  occasion: text("occasion").notNull().default("Birthday"),
  flavour: text("flavour").notNull().default("Chocolate"),
  weightKg: doublePrecision("weight_kg").notNull().default(1),
  tierCount: integer("tier_count").notNull().default(1),
  eggless: boolean("eggless").notNull().default(false),
  messageOnCake: text("message_on_cake").default(""),
  description: text("description").default(""),
  referenceImageUrl: text("reference_image_url"),
  requiredDate: text("required_date").notNull(),
  requiredTime: text("required_time").notNull(),
  fulfillmentType: text("fulfillment_type").notNull().default("delivery"), // "delivery" | "self_pickup"
  deliveryAddress: jsonb("delivery_address").default({}),
  
  // Status flow:
  // requested -> quote_sent -> advance_paid / confirmed -> preparing -> ready -> out_for_delivery / ready_for_pickup -> delivered / customer_picked_up (completed)
  status: text("status").notNull().default("requested"),
  
  // Pricing & Advance
  cakePrice: doublePrecision("cake_price").default(0),
  advanceRequired: doublePrecision("advance_required").default(0),
  advancePaid: doublePrecision("advance_paid").default(0),
  preparationTimeHours: doublePrecision("preparation_time_hours").default(4),
  deliveryFee: doublePrecision("delivery_fee").default(0),
  totalAmount: doublePrecision("total_amount").default(0),
  remainingAmount: doublePrecision("remaining_amount").default(0),
  quoteNotes: text("quote_notes"),
  quotedAt: timestamp("quoted_at"),
  quotedByUserId: text("quoted_by_user_id"),
  advancePaidAt: timestamp("advance_paid_at"),
  
  // Linked order in standard orders table (for delivery rider pickup)
  orderId: text("order_id"),
  
  // Self Pickup verification
  pickupCode: text("pickup_code"), // 6-digit PIN e.g. "582914"
  pickupQrCode: text("pickup_qr_code").$defaultFn(() => crypto.randomUUID()),
  pickedUpAt: timestamp("picked_up_at"),
  verifiedByUserId: text("verified_by_user_id"),
  
  deliveredAt: timestamp("delivered_at"),
  cancelReason: text("cancel_reason"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("custom_cakes_shop_id_idx").on(t.shopId),
  index("custom_cakes_customer_id_idx").on(t.customerId),
  index("custom_cakes_status_idx").on(t.status),
  index("custom_cakes_pickup_code_idx").on(t.pickupCode),
  index("custom_cakes_created_at_idx").on(t.createdAt),
]);

export type CustomCakeRequest = typeof customCakeRequests.$inferSelect;
export type InsertCustomCakeRequest = typeof customCakeRequests.$inferInsert;
