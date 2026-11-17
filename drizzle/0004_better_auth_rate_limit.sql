-- Better Auth rateLimit table untuk storage: "database"
-- Diperlukan ketika rateLimit.storage diset ke "database" di better-auth config

CREATE TABLE IF NOT EXISTS "rate_limit" (
  "id"         TEXT        NOT NULL PRIMARY KEY,
  "key"        TEXT,
  "count"      INTEGER,
  "last_request" BIGINT
);
