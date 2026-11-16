import { z } from "zod";

export const photoPresignSchema = z
  .object({
    filename: z.string().trim().min(1).max(255),
    content_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
    size: z.coerce
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024, "Ukuran file maksimal 10 MB"),
  })
  .strict();

export const photoConfirmSchema = z
  .object({
    object_key: z.string().trim().min(1).max(500),
    alt_text: z.string().trim().max(200).optional(),
    is_cover: z.boolean().default(false),
    sort_order: z.coerce.number().int().min(0).max(1_000).default(0),
  })
  .strict();

export const photoUpdateSchema = z
  .object({
    alt_text: z.string().trim().max(200).nullable().optional(),
    sort_order: z.coerce.number().int().min(0).max(1_000).optional(),
    is_cover: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus diubah",
  });
