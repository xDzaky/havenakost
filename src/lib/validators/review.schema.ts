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
    comment: z
      .string()
      .trim()
      .min(10)
      .max(2_000)
      .refine(
        (val) => !/(https?:\/\/|www\.)[^\s]+/i.test(val),
        "Komentar tidak boleh mengandung tautan/link",
      )
      .refine(
        (val) => !/(?:\+?62|08)[0-9]{8,13}/.test(val.replace(/[\s-]/g, "")),
        "Komentar tidak boleh mengandung nomor telepon",
      ),
    turnstile_token: z.string().trim().min(1).max(4_096),
    consent_privacy: z.boolean().optional(),
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
    .enum(["pending", "published", "rejected", "hidden", "owner_rejected"])
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
    override_reason: z.string().trim().min(15).max(500).optional(),
  })
  .strict()
  .optional();

export const reviewRejectSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const reviewReportSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
    turnstile_token: z.string().trim().min(1).max(4_096).optional(),
  })
  .strict();

export const reviewReplySchema = z
  .object({
    reply: z.string().trim().min(5).max(1_000),
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
