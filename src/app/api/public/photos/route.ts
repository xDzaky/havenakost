import { and, eq, isNull } from "drizzle-orm";
import { apiRoute } from "@/lib/utils/route";
import { getObject } from "@/lib/storage/r2";
import { AppError, NotFoundError } from "@/lib/utils/api-error";
import { db } from "@/lib/db";
import { kostListings, kostPhotos } from "@/lib/db/schema";

export const GET = apiRoute(async (request) => {
  const key = request.nextUrl.searchParams.get("key");
  if (!key || !key.startsWith("kosts/") || key.includes("..")) {
    throw new AppError("Object key tidak valid", 400);
  }

  const [photo] = await db
    .select({ id: kostPhotos.id })
    .from(kostPhotos)
    .innerJoin(kostListings, eq(kostPhotos.kostId, kostListings.id))
    .where(
      and(
        eq(kostPhotos.objectKey, key),
        eq(kostListings.status, "published"),
        isNull(kostListings.deletedAt),
      ),
    )
    .limit(1);

  if (!photo) throw new NotFoundError("Foto tidak ditemukan");

  const object = await getObject(key);
  if (!object.Body) throw new NotFoundError("Foto tidak ditemukan");

  const headers = new Headers({
    "Content-Type": object.ContentType ?? "application/octet-stream",
    "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    "X-Content-Type-Options": "nosniff",
  });
  if (object.ContentLength !== undefined) {
    headers.set("Content-Length", String(object.ContentLength));
  }
  if (object.ETag) headers.set("ETag", object.ETag);

  return new Response(
    object.Body.transformToWebStream() as ReadableStream,
    { status: 200, headers },
  );
});
