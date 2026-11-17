-- Tabel review_reports untuk dedup laporan ulasan berdasarkan (review_id, ip_hash)
CREATE TABLE IF NOT EXISTS "review_reports" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "review_id" UUID NOT NULL REFERENCES "reviews"("id") ON DELETE CASCADE,
  "ip_hash" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "review_reports_review_id_idx" ON "review_reports" ("review_id");
CREATE UNIQUE INDEX IF NOT EXISTS "review_reports_review_ip_idx" ON "review_reports" ("review_id", "ip_hash");
