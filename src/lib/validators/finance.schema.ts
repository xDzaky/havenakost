import { z } from "zod";
import { paginationSchema } from "@/lib/utils/pagination";
import { dateOnlySchema, uuidSchema } from "./common.schema";

const amountSchema = z.coerce
  .number()
  .positive("Nominal harus lebih dari 0")
  .max(1_000_000_000_000);

export const financeCreateSchema = z
  .object({
    kost_id: uuidSchema.optional(),
    room_id: uuidSchema.optional(),
    record_type: z.enum(["income", "expense"]),
    category: z.string().trim().min(2).max(60),
    description: z.string().trim().max(500).nullable().optional(),
    amount: amountSchema,
    transaction_date: dateOnlySchema,
  })
  .strict();

export const financeUpdateSchema = z
  .object({
    kost_id: uuidSchema.nullable().optional(),
    room_id: uuidSchema.nullable().optional(),
    record_type: z.enum(["income", "expense"]).optional(),
    category: z.string().trim().min(2).max(60).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    amount: amountSchema.optional(),
    transaction_date: dateOnlySchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus diubah",
  });

export const financeQuerySchema = paginationSchema.extend({
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  category: z.string().trim().max(60).optional(),
  record_type: z.enum(["income", "expense"]).optional(),
  kost_id: uuidSchema.optional(),
  room_id: uuidSchema.optional(),
});

export const financeSummaryQuerySchema = z
  .object({
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    kost_id: uuidSchema.optional(),
  })
  .strict();
