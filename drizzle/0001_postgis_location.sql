-- PostGIS spatial support for Havena Kost.
-- The application stores latitude/longitude and lets this trigger maintain the
-- authoritative geography(Point,4326) column.

ALTER TABLE "kost_listings"
  ALTER COLUMN "location" TYPE geography(Point,4326)
  USING "location"::geography(Point,4326);

CREATE OR REPLACE FUNCTION havenakost_sync_kost_location()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(
      ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision),
      4326
    )::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS havenakost_sync_kost_location_trigger ON "kost_listings";

CREATE TRIGGER havenakost_sync_kost_location_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude
ON "kost_listings"
FOR EACH ROW
EXECUTE FUNCTION havenakost_sync_kost_location();

CREATE INDEX IF NOT EXISTS "kost_listings_location_gist"
ON "kost_listings"
USING gist ("location");

UPDATE "kost_listings"
SET location = ST_SetSRID(
  ST_MakePoint(longitude::double precision, latitude::double precision),
  4326
)::geography
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location IS NULL;
