import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, requireR2Config } from "@/lib/env";
import { AppError, NotFoundError } from "@/lib/utils/api-error";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

let cachedClient: S3Client | null = null;

function getClient(): { client: S3Client; bucket: string } {
  const config = requireR2Config();
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: config.R2_ENDPOINT,
      credentials: {
        accessKeyId: config.R2_ACCESS_KEY_ID,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  }
  return { client: cachedClient, bucket: config.R2_BUCKET_NAME };
}

export function isAllowedImageType(contentType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(contentType);
}

export function publicUrlForKey(objectKey: string): string {
  const base = env.R2_PUBLIC_URL?.replace(/\/+$/, "");
  if (base) return `${base}/${objectKey}`;
  // The bucket is private by default. Serve through the authenticated proxy
  // route until a public R2 domain is configured.
  return `/api/public/photos?key=${encodeURIComponent(objectKey)}`;
}

export async function createPresignedPhotoUpload(input: {
  kostId: string;
  contentType: string;
  size: number;
}): Promise<{
  objectKey: string;
  uploadUrl: string;
  expiresIn: number;
  headers: Record<string, string>;
}> {
  if (!isAllowedImageType(input.contentType)) {
    throw new AppError(
      "Tipe file harus JPEG, PNG, atau WebP",
      422,
      null,
      "INVALID_IMAGE_TYPE",
    );
  }

  const { client, bucket } = getClient();
  const extension = EXTENSIONS[input.contentType] ?? "bin";
  const objectKey = `kosts/${input.kostId}/${randomUUID()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: input.contentType,
    ContentLength: input.size,
  });

  const expiresIn = 300;
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  return {
    objectKey,
    uploadUrl,
    expiresIn,
    headers: {
      "Content-Type": input.contentType,
      "Content-Length": String(input.size),
    },
  };
}

export function isObjectKeyForKost(objectKey: string, kostId: string): boolean {
  if (objectKey.includes("..") || objectKey.startsWith("/")) return false;
  return objectKey.startsWith(`kosts/${kostId}/`);
}

export async function headObject(objectKey: string): Promise<{
  contentType: string | undefined;
  contentLength: number | undefined;
  etag: string | undefined;
}> {
  const { client, bucket } = getClient();
  try {
    const result = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: objectKey }),
    );
    return {
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      etag: result.ETag,
    };
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    if (status === 404 || status === 403) {
      throw new NotFoundError(
        "File tidak ditemukan di storage. Upload mungkin belum selesai.",
      );
    }
    throw error;
  }
}

export async function getObject(objectKey: string) {
  const { client, bucket } = getClient();
  return client.send(
    new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
  );
}

export async function verifyImageMagicBytes(
  objectKey: string,
  contentType: string,
): Promise<boolean> {
  const { client, bucket } = getClient();
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Range: "bytes=0-15",
      }),
    );
    if (!res.Body) return false;
    const byteArray = await res.Body.transformToByteArray();
    const buf = Buffer.from(byteArray);
    if (contentType === "image/jpeg") {
      return (
        buf.length >= 3 &&
        buf[0] === 0xff &&
        buf[1] === 0xd8 &&
        buf[2] === 0xff
      );
    }
    if (contentType === "image/png") {
      return (
        buf.length >= 8 &&
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47 &&
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a
      );
    }
    if (contentType === "image/webp") {
      return (
        buf.length >= 12 &&
        buf.toString("ascii", 0, 4) === "RIFF" &&
        buf.toString("ascii", 8, 12) === "WEBP"
      );
    }
    return false;
  } catch {
    return false;
  }
}

export async function deleteObject(objectKey: string): Promise<void> {
  const { client, bucket } = getClient();
  await client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }),
  );
}

export async function checkR2Connection(): Promise<boolean> {
  try {
    const config = requireR2Config();
    const client = new S3Client({
      region: "auto",
      endpoint: config.R2_ENDPOINT,
      credentials: {
        accessKeyId: config.R2_ACCESS_KEY_ID,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
    await client.send(
      new HeadObjectCommand({
        Bucket: config.R2_BUCKET_NAME,
        Key: "__healthcheck__",
      }),
    );
    return true;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    return status === 404 || status === 403;
  }
}
