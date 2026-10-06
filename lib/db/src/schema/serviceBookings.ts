import { pgTable, text, timestamp, doublePrecision, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { shops } from "./shops.js";

export const serviceBookings = pgTable("service_bookings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  bookingNumber: text("booking_number").notNull().unique(), // e.g. "SRV-202610-1234"
  idempotencyKey: text("idempotency_key"),
  shopId: text("shop_id").references(() => shops.id, { onDelete: "set null" }),
  shopName: text("shop_name").notNull().default("Upahar Electronics Lab"),
  
  customerId: text("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  customerName: text("customer_name").notNull().default(""),
  customerPhone: text("customer_phone").notNull().default(""),
  
  serviceType: text("service_type").notNull(), // "tv_repair" | "home_theatre" | "ac_service" | "fridge_repair" | "fan_appliances" | "other"
  serviceCategoryTitle: text("service_category_title").notNull().default("Electronics Repair"),
  
  applianceBrandModel: text("appliance_brand_model").default(""), // e.g. "Samsung 43-inch Smart LED TV"
  problemDescription: text("problem_description").notNull().default(""),
  preferredDate: text("preferred_date").notNull(), // e.g. "2026-10-04"
  preferredTimeSlot: text("preferred_time_slot").notNull().default("afternoon"), // "morning" | "afternoon" | "evening"
  
  // Address info
  serviceAddress: text("service_address").notNull().default(""),
  landmark: text("landmark").default(""),
  pincode: text("pincode").default("733101"),
  
  // Status workflow:
  // "requested" -> "inspection_scheduled" -> "quote_provided" -> "in_progress" -> "completed" | "cancelled"
  status: text("status").notNull().default("requested"),
  
  // Dynamic Pricing (editable from Admin Panel after technician inspection):
  visitingFee: doublePrecision("visiting_fee").default(0),
  partsCost: doublePrecision("parts_cost").default(0),
  serviceCharge: doublePrecision("service_charge").default(0),
  totalAmount: doublePrecision("total_amount").default(0),
  isPaid: boolean("is_paid").default(false),
  paymentMethod: text("payment_method").default("cash_on_service"), // "cash_on_service" | "online"
  
  quoteNotes: text("quote_notes"), // Admin / Technician diagnosis notes for customer
  quotedAt: timestamp("quoted_at"),
  
  // Technician Assignment
  technicianName: text("technician_name"),
  technicianPhone: text("technician_phone"),
  assignedAt: timestamp("assigned_at"),
  
  adminNotes: text("admin_notes"), // Internal admin notes
  cancelReason: text("cancel_reason"),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("service_bookings_customer_id_idx").on(t.customerId),
  index("service_bookings_shop_id_idx").on(t.shopId),
  index("service_bookings_status_idx").on(t.status),
  index("service_bookings_booking_num_idx").on(t.bookingNumber),
  index("service_bookings_created_at_idx").on(t.createdAt),
  uniqueIndex("service_bookings_idempotency_idx").on(t.idempotencyKey),
]);

export type ServiceBooking = typeof serviceBookings.$inferSelect;
export type InsertServiceBooking = typeof serviceBookings.$inferInsert;
