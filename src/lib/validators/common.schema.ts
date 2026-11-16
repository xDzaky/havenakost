import { z } from "zod";

export const uuidSchema = z.string().uuid("Format ID tidak valid");

export const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^62[0-9]{8,15}$/,
    "Nomor harus format internasional tanpa +, contoh 6281234567890",
  );

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Tanggal tidak valid");

export const latitudeSchema = z.coerce
  .number()
  .min(-90, "Latitude minimal -90")
  .max(90, "Latitude maksimal 90");

export const longitudeSchema = z.coerce
  .number()
  .min(-180, "Longitude minimal -180")
  .max(180, "Longitude maksimal 180");

export const radiusSchema = z.coerce
  .number()
  .min(100, "Radius minimal 100 meter")
  .max(50_000, "Radius maksimal 50 km")
  .default(5_000);

export const booleanQuerySchema = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((value) => value === true || value === "true" || value === "1");

export function arrayQuery<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value.flatMap((item) =>
        typeof item === "string" ? item.split(",") : [item],
      );
    }
    if (typeof value === "string") return value.split(",");
    return [value];
  }, z.array(schema).optional());
}

export function emptyToUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    schema,
  );
}
