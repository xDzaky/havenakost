import "dotenv/config";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db, sqlClient } from "@/lib/db";
import { ownerProfiles, user } from "@/lib/db/schema";

/**
 * Creates the first admin account. Admin accounts must never be creatable
 * through public registration; this script is the only bootstrap path.
 *
 * Usage:
 *   ADMIN_BOOTSTRAP_EMAIL=... ADMIN_BOOTSTRAP_PASSWORD=... npm run admin:create
 */
async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const name = process.env.ADMIN_BOOTSTRAP_NAME ?? "Havena Admin";

  if (!email || !password) {
    throw new Error(
      "ADMIN_BOOTSTRAP_EMAIL dan ADMIN_BOOTSTRAP_PASSWORD wajib diisi",
    );
  }
  if (password.length < 12) {
    throw new Error("Password admin minimal 12 karakter");
  }

  const [existing] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    if (existing.role !== "admin") {
      console.log(
        "Email sudah terdaftar sebagai owner. Tidak dipromosikan otomatis. Gunakan akun lain atau promosi manual yang disengaja.",
      );
    } else {
      console.log("Admin sudah ada. Tidak ada perubahan.");
    }
    await sqlClient.end();
    return;
  }

  await auth.api.signUpEmail({
    body: { email, password, name },
  });

  const [created] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email.toLowerCase()))
    .limit(1);

  if (!created) throw new Error("Gagal membuat akun admin");

  await db
    .update(user)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(user.id, created.id));

  // The signup hook creates an owner profile; admins do not need one.
  await db.delete(ownerProfiles).where(eq(ownerProfiles.userId, created.id));

  console.log(`Admin dibuat: ${email}`);
  await sqlClient.end();
}

main().catch(async (error) => {
  console.error("Bootstrap admin gagal", error);
  await sqlClient.end();
  process.exit(1);
});
