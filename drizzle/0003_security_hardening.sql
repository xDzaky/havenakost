ALTER TYPE "review_publication_status" ADD VALUE IF NOT EXISTS 'owner_rejected';

ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "ip_hash" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "user_agent_hash" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "override_reason" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "is_flagged" boolean DEFAULT false NOT NULL;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "flag_reason" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "owner_reply" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "owner_replied_at" timestamp with time zone;

ALTER TABLE "admin_logs" ADD COLUMN IF NOT EXISTS "ip_hash" text;
ALTER TABLE "admin_logs" ADD COLUMN IF NOT EXISTS "user_agent" text;
ALTER TABLE "admin_logs" ADD COLUMN IF NOT EXISTS "before" jsonb;
ALTER TABLE "admin_logs" ADD COLUMN IF NOT EXISTS "after" jsonb;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "kost_listings_name_trgm" ON "kost_listings" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "kost_listings_address_trgm" ON "kost_listings" USING gin ("address" gin_trgm_ops);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_payments_one_pending_per_owner" ON "subscription_payments" USING btree ("owner_id") WHERE "subscription_payments"."status" = 'pending';
