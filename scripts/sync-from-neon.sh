#!/bin/bash
# Sync data from Neon (source) → Replit PostgreSQL (destination)
# Strategy: truncate all tables in Replit, then COPY from Neon via psql pipe

TABLES=(
  otp_sessions
  notifications
  push_subscriptions
  fcm_tokens
  reports
  payouts
  commission_rules
  coupons
  delivery_charge_rules
  delivery_settings
  delivery_partners
  hero_banners
  homepage_sections
  service_pincodes
  admin_broadcasts
  support_tickets
  orders
  products
  shops
  categories
  shop_types
  admins
  users
)

# Reverse order for inserts (parent tables first)
TABLES_INSERT=(
  users
  admins
  shop_types
  categories
  shops
  products
  orders
  otp_sessions
  payouts
  coupons
  commission_rules
  reports
  notifications
  push_subscriptions
  hero_banners
  delivery_partners
  delivery_charge_rules
  delivery_settings
  support_tickets
  fcm_tokens
  homepage_sections
  service_pincodes
  admin_broadcasts
)

echo "=== Neon → Replit PostgreSQL Sync ==="
echo ""

# Step 1: truncate all tables in reverse dependency order (disabling FK checks)
echo "Truncating all Replit tables..."
psql "$DATABASE_URL" -c "
  SET session_replication_role = 'replica';
  TRUNCATE TABLE
    otp_sessions, notifications, push_subscriptions, fcm_tokens, reports,
    payouts, commission_rules, coupons, delivery_charge_rules, delivery_settings,
    delivery_partners, hero_banners, homepage_sections, service_pincodes,
    admin_broadcasts, support_tickets, orders, products, shops,
    categories, shop_types, admins, users
  RESTART IDENTITY CASCADE;
  SET session_replication_role = 'DEFAULT';
" 2>&1
echo ""

# Step 2: pipe COPY from Neon directly into Replit for each table
TOTAL=0
for TABLE in "${TABLES_INSERT[@]}"; do
  COUNT=$(psql "$NEON_DATABASE_URL" -t -c "SELECT COUNT(*) FROM public.\"$TABLE\";" 2>/dev/null | tr -d ' \n')
  if [ -z "$COUNT" ] || [ "$COUNT" = "0" ]; then
    echo "   $TABLE: 0 rows — skipping"
    continue
  fi

  # Pipe COPY TO STDOUT from Neon → COPY FROM STDIN to Replit
  psql "$NEON_DATABASE_URL" -c "\COPY (SELECT * FROM public.\"$TABLE\") TO STDOUT BINARY" 2>/dev/null \
    | psql "$DATABASE_URL" -c "\COPY \"$TABLE\" FROM STDIN BINARY" 2>&1

  echo "   $TABLE: $COUNT rows copied"
  TOTAL=$((TOTAL + COUNT))
done

# Step 3: reset all sequences
echo ""
echo "Resetting sequences..."
psql "$DATABASE_URL" -t -c "
  SELECT 'SELECT setval(''' || s.sequence_name || ''', COALESCE((SELECT MAX(id) FROM \"' || t.table_name || '\"), 1), true);'
  FROM information_schema.sequences s
  JOIN information_schema.tables t ON t.table_name = replace(s.sequence_name, '_id_seq', '')
  WHERE s.sequence_schema = 'public' AND t.table_schema = 'public'
" 2>/dev/null | grep "setval" | while read stmt; do
  psql "$DATABASE_URL" -c "$stmt" 2>/dev/null
done
echo "Sequences reset."

echo ""
echo "🎉 Sync complete — $TOTAL total rows copied from Neon to Replit."
