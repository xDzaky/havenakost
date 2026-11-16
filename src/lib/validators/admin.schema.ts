import { z } from "zod";
import { paginationSchema } from "@/lib/utils/pagination";
import { uuidSchema } from "./common.schema";

export const adminOwnerQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  approval_status: z
    .enum(["pending", "approved", "rejected", "suspended"])
    .optional(),
});

export const adminOwnerRejectSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const adminOwnerStatusSchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected", "suspended"]),
    reason: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.status === "approved" ||
      value.status === "pending" ||
      Boolean(value.reason && value.reason.length >= 5),
    {
      message: "Alasan wajib diisi untuk status rejected/suspended",
      path: ["reason"],
    },
  );

import { booleanQuerySchema } from "./common.schema";

export const notificationQuerySchema = paginationSchema.extend({
  unread_only: booleanQuerySchema.optional(),
});

export const adminLogQuerySchema = paginationSchema.extend({
  admin_id: z.string().trim().max(100).optional(),
  entity_type: z.string().trim().max(50).optional(),
  action: z.string().trim().max(100).optional(),
});

export const adminDashboardQuerySchema = z
  .object({
    days: z.coerce.number().int().min(1).max(365).default(30),
  })
  .strict();

export const adminIdParamsSchema = z.object({ id: uuidSchema });

export const adminOwnerIdParamsSchema = z.object({ id: z.string().min(1) });

export const adminReviewIdParamsSchema = z.object({ id: uuidSchema });

export const adminPlanIdParamsSchema = z.object({ id: uuidSchema });

export const adminPaymentIdParamsSchema = z.object({ id: uuidSchema });
