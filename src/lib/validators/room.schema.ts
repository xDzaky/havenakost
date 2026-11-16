import { z } from "zod";
import { paginationSchema } from "@/lib/utils/pagination";
import { uuidSchema } from "./common.schema";

const roomStatusEnum = z.enum(["available", "occupied", "unavailable"]);

export const roomCreateSchema = z
  .object({
    room_code: z
      .string()
      .trim()
      .min(1)
      .max(20)
      .regex(
        /^[A-Za-z0-9._-]+$/,
        "Kode kamar hanya boleh huruf, angka, titik, garis bawah, dan strip",
      ),
    room_name: z.string().trim().max(100).optional(),
    description: z.string().trim().max(1_000).optional(),
    monthly_price: z.coerce.number().min(0).max(1_000_000_000),
    room_status: roomStatusEnum.default("available"),
  })
  .strict();

export const roomUpdateSchema = z
  .object({
    room_code: z
      .string()
      .trim()
      .min(1)
      .max(20)
      .regex(/^[A-Za-z0-9._-]+$/)
      .optional(),
    room_name: z.string().trim().max(100).nullable().optional(),
    description: z.string().trim().max(1_000).nullable().optional(),
    monthly_price: z.coerce.number().min(0).max(1_000_000_000).optional(),
    room_status: roomStatusEnum.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus diubah",
  });

export const roomListQuerySchema = paginationSchema.extend({
  status: roomStatusEnum.optional(),
});

export const occupancyCreateSchema = z
  .object({
    tenant_name: z.string().trim().min(2).max(120),
    check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    check_out_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    occupancy_status: z
      .enum(["active", "completed", "cancelled"])
      .default("active"),
    notes: z.string().trim().max(1_000).nullable().optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.check_out_date || value.check_out_date >= value.check_in_date,
    {
      message: "Tanggal keluar tidak boleh sebelum tanggal masuk",
      path: ["check_out_date"],
    },
  );

export const occupancyUpdateSchema = z
  .object({
    tenant_name: z.string().trim().min(2).max(120).optional(),
    check_in_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    check_out_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    occupancy_status: z
      .enum(["active", "completed", "cancelled"])
      .optional(),
    notes: z.string().trim().max(1_000).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus diubah",
  });

export const qrRegenerateSchema = z
  .object({
    regenerate: z.boolean().optional(),
  })
  .strict()
  .optional();

export const roomIdParamsSchema = z.object({ roomId: uuidSchema });
