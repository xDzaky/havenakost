import { z } from "zod";
import {
  arrayQuery,
  booleanQuerySchema,
  latitudeSchema,
  longitudeSchema,
  phoneSchema,
  radiusSchema,
  uuidSchema,
} from "./common.schema";
import { paginationSchema } from "@/lib/utils/pagination";

const genderPolicyEnum = z.enum(["male", "female", "mixed"]);

export const kostCreateSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    description: z.string().trim().min(20).max(5_000),
    address: z.string().trim().min(5).max(300),
    province: z.string().trim().min(2).max(100),
    city: z.string().trim().min(2).max(100),
    district: z.string().trim().min(2).max(100),
    subdistrict: z.string().trim().max(100).optional(),
    postal_code: z
      .string()
      .trim()
      .regex(/^[0-9]{5}$/, "Kode pos harus 5 digit")
      .optional(),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    gender_policy: genderPolicyEnum,
    price_min: z.coerce.number().int().min(0).max(1_000_000_000),
    price_max: z.coerce.number().int().min(0).max(1_000_000_000),
    contact_phone: phoneSchema,
    facility_ids: z.array(uuidSchema).max(50).optional(),
  })
  .strict()
  .refine((value) => value.price_max >= value.price_min, {
    message: "Harga maksimum harus lebih besar atau sama dengan harga minimum",
    path: ["price_max"],
  });

export const kostUpdateSchema = z
  .object({
    name: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().min(20).max(5_000).optional(),
    address: z.string().trim().min(5).max(300).optional(),
    province: z.string().trim().min(2).max(100).optional(),
    city: z.string().trim().min(2).max(100).optional(),
    district: z.string().trim().min(2).max(100).optional(),
    subdistrict: z.string().trim().max(100).nullable().optional(),
    postal_code: z
      .string()
      .trim()
      .regex(/^[0-9]{5}$/, "Kode pos harus 5 digit")
      .nullable()
      .optional(),
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    gender_policy: genderPolicyEnum.optional(),
    price_min: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
    price_max: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
    contact_phone: phoneSchema.optional(),
    facility_ids: z.array(uuidSchema).max(50).optional(),
    status: z.enum(["draft", "pending", "archived"]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus diubah",
  })
  .refine(
    (value) =>
      value.price_min === undefined ||
      value.price_max === undefined ||
      value.price_max >= value.price_min,
    {
      message: "Harga maksimum harus lebih besar atau sama dengan harga minimum",
      path: ["price_max"],
    },
  );

export const publicKostQuerySchema = paginationSchema
  .extend({
    q: z.string().trim().max(100).optional(),
    city: z.string().trim().max(100).optional(),
    district: z.string().trim().max(100).optional(),
    gender_policy: genderPolicyEnum.optional(),
    price_min: z.coerce.number().int().min(0).optional(),
    price_max: z.coerce.number().int().min(0).optional(),
    facility: arrayQuery(uuidSchema),
    available: booleanQuerySchema.optional(),
    sort: z
      .enum(["newest", "price_asc", "price_desc", "distance"])
      .default("newest"),
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    radius: radiusSchema.optional(),
  })
  .refine(
    (value) =>
      (value.latitude === undefined) === (value.longitude === undefined),
    {
      message: "latitude dan longitude harus dikirim bersamaan",
      path: ["latitude"],
    },
  )
  .refine(
    (value) =>
      value.price_min === undefined ||
      value.price_max === undefined ||
      value.price_max >= value.price_min,
    {
      message: "price_max harus lebih besar atau sama dengan price_min",
      path: ["price_max"],
    },
  )
  .refine(
    (value) =>
      value.sort !== "distance" ||
      (value.latitude !== undefined && value.longitude !== undefined),
    {
      message: "Sort distance membutuhkan latitude dan longitude",
      path: ["sort"],
    },
  );

export const nearbyQuerySchema = publicKostQuerySchema;

export const facilityIdsSchema = z
  .object({
    facility_ids: z.array(uuidSchema).max(50),
  })
  .strict();

export const ownerListingQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z
    .enum(["draft", "pending", "published", "rejected", "archived"])
    .optional(),
});

export const adminListingQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z
    .enum(["draft", "pending", "published", "rejected", "archived"])
    .optional(),
  owner_id: uuidSchema.optional(),
});

export const adminListingRejectSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const adminListingStatusSchema = z
  .object({
    status: z.enum(["draft", "pending", "published", "rejected", "archived"]),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export type KostCreateInput = z.infer<typeof kostCreateSchema>;
export type KostUpdateInput = z.infer<typeof kostUpdateSchema>;
export type PublicKostQuery = z.infer<typeof publicKostQuerySchema>;
