import { z } from "zod";
import { paginationSchema } from "@/lib/utils/pagination";
import { dateOnlySchema, uuidSchema } from "./common.schema";

const ratingSchema = z.coerce
  .number()
  .int("Rating harus bilangan bulat")
  .min(1, "Rating minimal 1")
  .max(5, "Rating maksimal 5");

export const reviewSubmitSchema = z
  .object({
    qr_token: z.string().trim().min(10).max(200),
    reviewer_name: z.string().trim().min(2).max(120),
    public_display_name: z.string().trim().max(80).optional(),
    claimed_check_in_date: dateOnlySchema,
    claimed_check_out_date: dateOnlySchema.nullable().optional(),
    rating: ratingSchema,
    comment: z.string().trim().min(10).max(2_000),
    turnstile_token: z.string().trim().min(1).max(4_096),
  })
  .strict()
  .refine(
    (value) =>
      !value.claimed_check_out_date ||
      value.claimed_check_out_date >= value.claimed_check_in_date,
    {
      message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
      path: ["claimed_check_out_date"],
    },
  );

export const ownerReviewQuerySchema = paginationSchema.extend({
  publication_status: z
    .enum(["pending", "published", "rejected", "hidden"])
    .optional(),
  verification_status: z
    .enum([
      "unmatched",
      "possible_match",
      "ambiguous",
      "verified",
      "rejected",
    ])
    .optional(),
  kost_id: uuidSchema.optional(),
  room_id: uuidSchema.optional(),
});

export const reviewVerifySchema = z
  .object({
    occupancy_id: uuidSchema.optional(),
  })
  .strict()
  .optional();

export const reviewRejectSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const reviewModerationSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const reviewPublishSchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .strict()
  .optional();

export const adminReviewQuerySchema = paginationSchema.extend({
  publication_status: z
    .enum(["pending", "published", "rejected", "hidden"])
    .optional(),
  verification_status: z
    .enum([
      "unmatched",
      "possible_match",
      "ambiguous",
      "verified",
      "rejected",
    ])
    .optional(),
  kost_id: uuidSchema.optional(),
  q: z.string().trim().max(100).optional(),
});

export const publicReviewQuerySchema = paginationSchema.extend({
  room_id: uuidSchema.optional(),
});

export type ReviewSubmitInput = z.infer<typeof reviewSubmitSchema>;
