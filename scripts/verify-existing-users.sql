-- Skrip untuk menandai semua akun yang ada sebagai email_verified = true
-- Jalankan skrip ini sebelum atau sesudah mengaktifkan requireEmailVerification: true
-- agar akun admin dan pemilik kost yang sudah terdaftar tidak terkunci.

UPDATE "user"
SET "email_verified" = true
WHERE "email_verified" = false;
