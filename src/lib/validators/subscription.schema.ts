import { z } from "zod";
import { paginationSchema } from "@/lib/utils/pagination";
import { uuidSchema } from "./common.schema";

export const planCreateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(40)
      .regex(/^[a-z0-9-]+$/, "Kode hanya huruf kecil, angka, dan strip"),
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(1_000).nullable().optional(),
    price: z.coerce.number().min(0).max(1_000_000_000_000),
    duration_days: z.coerce.number().int().min(1).max(3_650),
    max_listings: z.coerce.number().int().min(0).max(10_000).nullable().optional(),
    features: z.string().trim().max(2_000).nullable().optional(),
    is_active: z.boolean().default(true),
  })
  .strict();

export const planUpdateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(40)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(1_000).nullable().optional(),
    price: z.coerce.number().min(0).max(1_000_000_000_000).optional(),
    duration_days: z.coerce.number().int().min(1).max(3_650).optional(),
    max_listings: z.coerce
      .number()
      .int()
      .min(0)
      .max(10_000)
      .nullable()
      .optional(),
    features: z.string().trim().max(2_000).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus diubah",
  });

export const subscriptionPaymentSchema = z
  .object({
    plan_id: uuidSchema,
    payment_method: z.string().trim().min(2).max(50),
    payment_amount: z.coerce.number().positive().max(1_000_000_000_000),
    payment_proof: z.string().trim().max(1_000).optional(),
  })
  .strict();

export const adminSubscriptionQuerySchema = paginationSchema.extend({
  status: z
    .enum(["pending", "approved", "rejected"])
    .optional(),
  owner_id: uuidSchema.optional(),
});

export const adminSubscriptionPlanQuerySchema = paginationSchema;
