import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["owner", "admin"]);

export const ownerApprovalStatusEnum = pgEnum("owner_approval_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "pending",
  "published",
  "rejected",
  "archived",
]);

export const genderPolicyEnum = pgEnum("gender_policy", [
  "male",
  "female",
  "mixed",
]);

export const roomStatusEnum = pgEnum("room_status", [
  "available",
  "occupied",
  "unavailable",
]);

export const occupancyStatusEnum = pgEnum("occupancy_status", [
  "active",
  "completed",
  "cancelled",
]);

export const verificationStatusEnum = pgEnum("review_verification_status", [
  "unmatched",
  "possible_match",
  "ambiguous",
  "verified",
  "rejected",
]);

export const publicationStatusEnum = pgEnum("review_publication_status", [
  "pending",
  "published",
  "rejected",
  "hidden",
]);

export const financialRecordTypeEnum = pgEnum("financial_record_type", [
  "income",
  "expense",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "pending",
  "active",
  "expired",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("subscription_payment_status", [
  "pending",
  "approved",
  "rejected",
]);
