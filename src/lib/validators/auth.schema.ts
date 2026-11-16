import { z } from "zod";
import { emptyToUndefined, phoneSchema } from "./common.schema";

export const ownerProfileUpdateSchema = z
  .object({
    full_name: z.string().trim().min(3).max(120).optional(),
    business_name: emptyToUndefined(
      z.string().trim().max(150).nullable().optional(),
    ),
    phone: emptyToUndefined(phoneSchema.nullable().optional()),
    address: emptyToUndefined(z.string().trim().max(500).nullable().optional()),
    profile_photo: emptyToUndefined(
      z.string().trim().max(500).nullable().optional(),
    ),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus diubah",
  });

export type OwnerProfileUpdateInput = z.infer<
  typeof ownerProfileUpdateSchema
>;
