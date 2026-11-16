import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./api-error";

export type ApiMeta = Record<string, unknown> | null;

export function jsonSuccess<T>(
  data: T,
  options: { message?: string; status?: number; meta?: ApiMeta } = {},
) {
  return NextResponse.json(
    {
      success: true,
      message: options.message ?? "Request berhasil",
      data,
      meta: options.meta ?? null,
    },
    { status: options.status ?? 200 },
  );
}

export function jsonError(
  message: string,
  status = 400,
  errors: unknown = null,
) {
  return NextResponse.json(
    {
      success: false,
      message,
      errors,
    },
    { status },
  );
}

function isPostgresError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return jsonError(error.message, error.status, error.errors);
  }

  if (error instanceof ZodError) {
    return jsonError(
      "Data yang dikirim tidak valid",
      422,
      error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  if (isPostgresError(error)) {
    if (error.code === "23505") {
      return jsonError("Data sudah ada (duplikat)", 409, null);
    }
    if (error.code === "23503") {
      return jsonError(
        "Data masih berhubungan dengan data lain",
        409,
        null,
      );
    }
    if (error.code === "23514") {
      return jsonError("Data melanggar aturan validasi database", 422, null);
    }
  }

  console.error("[api] unhandled error", error);
  return jsonError("Terjadi kesalahan pada server", 500, null);
}
