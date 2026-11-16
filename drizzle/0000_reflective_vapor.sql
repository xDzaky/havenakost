CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE TYPE "public"."financial_record_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."gender_policy" AS ENUM('male', 'female', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'pending', 'published', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."occupancy_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."owner_approval_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."subscription_payment_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_publication_status" AS ENUM('pending', 'published', 'rejected', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."room_status" AS ENUM('available', 'occupied', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('pending', 'active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin');--> statement-breakpoint
CREATE TYPE "public"."review_verification_status" AS ENUM('unmatched', 'possible_match', 'ambiguous', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"icon" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kost_listing_facilities" (
	"kost_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kost_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"address" text NOT NULL,
	"province" text NOT NULL,
	"city" text NOT NULL,
	"district" text NOT NULL,
	"subdistrict" text,
	"postal_code" text,
	"location" "geography",
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"gender_policy" "gender_policy" NOT NULL,
	"price_min" integer NOT NULL,
	"price_max" integer NOT NULL,
	"contact_phone" text NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"rejection_reason" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "kost_listings_latitude_check" CHECK ("kost_listings"."latitude" BETWEEN -90 AND 90),
	CONSTRAINT "kost_listings_longitude_check" CHECK ("kost_listings"."longitude" BETWEEN -180 AND 180),
	CONSTRAINT "kost_listings_price_check" CHECK ("kost_listings"."price_min" >= 0 AND "kost_listings"."price_max" >= "kost_listings"."price_min"),
	CONSTRAINT "kost_listings_contact_phone_check" CHECK ("kost_listings"."contact_phone" ~ '^62[0-9]{8,15}$')
);
--> statement-breakpoint
CREATE TABLE "kost_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kost_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"image_url" text NOT NULL,
	"alt_text" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owner_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"full_name" text NOT NULL,
	"business_name" text,
	"phone" text,
	"address" text,
	"profile_photo" text,
	"approval_status" "owner_approval_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_profiles_phone_format_check" CHECK ("owner_profiles"."phone" IS NULL OR "owner_profiles"."phone" ~ '^62[0-9]{8,15}$')
);
--> statement-breakpoint
CREATE TABLE "kost_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kost_id" uuid NOT NULL,
	"room_code" text NOT NULL,
	"room_name" text,
	"description" text,
	"monthly_price" numeric(12, 2) NOT NULL,
	"room_status" "room_status" DEFAULT 'available' NOT NULL,
	"qr_public_token" text,
	"qr_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kost_rooms_monthly_price_check" CHECK ("kost_rooms"."monthly_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "room_occupancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kost_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"tenant_name" text NOT NULL,
	"check_in_date" date NOT NULL,
	"check_out_date" date,
	"occupancy_status" "occupancy_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_occupancies_date_order_check" CHECK ("room_occupancies"."check_out_date" IS NULL OR "room_occupancies"."check_out_date" >= "room_occupancies"."check_in_date")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kost_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"matched_occupancy_id" uuid,
	"verified_occupancy_id" uuid,
	"reviewer_name" text NOT NULL,
	"public_display_name" text,
	"claimed_check_in_date" date NOT NULL,
	"claimed_check_out_date" date,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"verification_status" "review_verification_status" DEFAULT 'unmatched' NOT NULL,
	"publication_status" "review_publication_status" DEFAULT 'pending' NOT NULL,
	"owner_reviewed_by" text,
	"owner_reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"moderated_by" text,
	"moderated_at" timestamp with time zone,
	"moderation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_check" CHECK ("reviews"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "reviews_claimed_date_order_check" CHECK ("reviews"."claimed_check_out_date" IS NULL OR "reviews"."claimed_check_out_date" >= "reviews"."claimed_check_in_date")
);
--> statement-breakpoint
CREATE TABLE "financial_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"kost_id" uuid,
	"room_id" uuid,
	"record_type" "financial_record_type" NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"amount" numeric(14, 2) NOT NULL,
	"transaction_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_records_amount_check" CHECK ("financial_records"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_entity_type" text,
	"related_entity_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "owner_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "subscription_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_subscriptions_date_order_check" CHECK ("owner_subscriptions"."end_date" >= "owner_subscriptions"."start_date")
);
--> statement-breakpoint
CREATE TABLE "subscription_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"subscription_id" uuid,
	"payment_method" text NOT NULL,
	"payment_amount" numeric(14, 2) NOT NULL,
	"payment_proof" text,
	"status" "subscription_payment_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_payments_amount_check" CHECK ("subscription_payments"."payment_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(14, 2) NOT NULL,
	"duration_days" integer NOT NULL,
	"max_listings" integer,
	"features" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_price_check" CHECK ("subscription_plans"."price" >= 0),
	CONSTRAINT "subscription_plans_duration_check" CHECK ("subscription_plans"."duration_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "admin_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kost_listing_facilities" ADD CONSTRAINT "kost_listing_facilities_kost_id_kost_listings_id_fk" FOREIGN KEY ("kost_id") REFERENCES "public"."kost_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kost_listing_facilities" ADD CONSTRAINT "kost_listing_facilities_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kost_listings" ADD CONSTRAINT "kost_listings_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kost_photos" ADD CONSTRAINT "kost_photos_kost_id_kost_listings_id_fk" FOREIGN KEY ("kost_id") REFERENCES "public"."kost_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_profiles" ADD CONSTRAINT "owner_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kost_rooms" ADD CONSTRAINT "kost_rooms_kost_id_kost_listings_id_fk" FOREIGN KEY ("kost_id") REFERENCES "public"."kost_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_occupancies" ADD CONSTRAINT "room_occupancies_kost_id_kost_listings_id_fk" FOREIGN KEY ("kost_id") REFERENCES "public"."kost_listings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_occupancies" ADD CONSTRAINT "room_occupancies_room_id_kost_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."kost_rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_kost_id_kost_listings_id_fk" FOREIGN KEY ("kost_id") REFERENCES "public"."kost_listings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_room_id_kost_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."kost_rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_matched_occupancy_id_room_occupancies_id_fk" FOREIGN KEY ("matched_occupancy_id") REFERENCES "public"."room_occupancies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_verified_occupancy_id_room_occupancies_id_fk" FOREIGN KEY ("verified_occupancy_id") REFERENCES "public"."room_occupancies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_owner_reviewed_by_user_id_fk" FOREIGN KEY ("owner_reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_user_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_records" ADD CONSTRAINT "financial_records_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_records" ADD CONSTRAINT "financial_records_kost_id_kost_listings_id_fk" FOREIGN KEY ("kost_id") REFERENCES "public"."kost_listings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_records" ADD CONSTRAINT "financial_records_room_id_kost_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."kost_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_subscriptions" ADD CONSTRAINT "owner_subscriptions_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_subscriptions" ADD CONSTRAINT "owner_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_owner_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."owner_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_id_user_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "facilities_name_unique" ON "facilities" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "facilities_slug_unique" ON "facilities" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "kost_listing_facilities_pk" ON "kost_listing_facilities" USING btree ("kost_id","facility_id");--> statement-breakpoint
CREATE INDEX "kost_listing_facilities_facility_id_idx" ON "kost_listing_facilities" USING btree ("facility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kost_listings_slug_unique" ON "kost_listings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "kost_listings_owner_id_idx" ON "kost_listings" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "kost_listings_status_idx" ON "kost_listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kost_listings_city_idx" ON "kost_listings" USING btree ("city");--> statement-breakpoint
CREATE INDEX "kost_listings_district_idx" ON "kost_listings" USING btree ("district");--> statement-breakpoint
CREATE INDEX "kost_listings_deleted_at_idx" ON "kost_listings" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "kost_photos_object_key_unique" ON "kost_photos" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "kost_photos_kost_id_idx" ON "kost_photos" USING btree ("kost_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kost_photos_one_cover_per_kost" ON "kost_photos" USING btree ("kost_id") WHERE "kost_photos"."is_cover" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "owner_profiles_user_id_unique" ON "owner_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "owner_profiles_approval_status_idx" ON "owner_profiles" USING btree ("approval_status");--> statement-breakpoint
CREATE UNIQUE INDEX "kost_rooms_kost_code_unique" ON "kost_rooms" USING btree ("kost_id","room_code");--> statement-breakpoint
CREATE UNIQUE INDEX "kost_rooms_qr_public_token_unique" ON "kost_rooms" USING btree ("qr_public_token");--> statement-breakpoint
CREATE INDEX "kost_rooms_kost_id_idx" ON "kost_rooms" USING btree ("kost_id");--> statement-breakpoint
CREATE INDEX "kost_rooms_room_status_idx" ON "kost_rooms" USING btree ("room_status");--> statement-breakpoint
CREATE INDEX "room_occupancies_kost_id_idx" ON "room_occupancies" USING btree ("kost_id");--> statement-breakpoint
CREATE INDEX "room_occupancies_room_id_idx" ON "room_occupancies" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "room_occupancies_occupancy_status_idx" ON "room_occupancies" USING btree ("occupancy_status");--> statement-breakpoint
CREATE INDEX "reviews_kost_id_idx" ON "reviews" USING btree ("kost_id");--> statement-breakpoint
CREATE INDEX "reviews_room_id_idx" ON "reviews" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "reviews_publication_status_idx" ON "reviews" USING btree ("publication_status");--> statement-breakpoint
CREATE INDEX "reviews_verification_status_idx" ON "reviews" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_verified_occupancy_unique" ON "reviews" USING btree ("verified_occupancy_id") WHERE "reviews"."verified_occupancy_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "financial_records_owner_id_idx" ON "financial_records" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "financial_records_transaction_date_idx" ON "financial_records" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "financial_records_kost_id_idx" ON "financial_records" USING btree ("kost_id");--> statement-breakpoint
CREATE INDEX "financial_records_type_idx" ON "financial_records" USING btree ("record_type");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_user_id");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("recipient_user_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "owner_subscriptions_owner_id_idx" ON "owner_subscriptions" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "owner_subscriptions_status_idx" ON "owner_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "owner_subscriptions_one_active_per_owner" ON "owner_subscriptions" USING btree ("owner_id") WHERE "owner_subscriptions"."status" = 'active';--> statement-breakpoint
CREATE INDEX "subscription_payments_owner_id_idx" ON "subscription_payments" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "subscription_payments_status_idx" ON "subscription_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscription_payments_plan_id_idx" ON "subscription_payments" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_plans_code_unique" ON "subscription_plans" USING btree ("code");--> statement-breakpoint
CREATE INDEX "subscription_plans_is_active_idx" ON "subscription_plans" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "admin_logs_admin_id_idx" ON "admin_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "admin_logs_created_at_idx" ON "admin_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_logs_entity_idx" ON "admin_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "rate_limit_buckets_expires_at_idx" ON "rate_limit_buckets" USING btree ("expires_at");