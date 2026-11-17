import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { ownerProfiles, user } from "@/lib/db/schema";

export type TestUser = {
  id: string;
  email: string;
  password: string;
  cookie: string;
};

function cookieFromResponse(response: Response): string {
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];

  return setCookies
    .filter(Boolean)
    .map((cookie) => cookie.split(";")[0]!)
    .join("; ");
}

export async function createTestUser(
  role: "owner" | "admin",
  label: string,
): Promise<TestUser> {
  const email = `${label}-${crypto.randomUUID()}@example.com`;
  const password = "HavenaTest123!";
  const name = `Test ${label}`;

  await auth.api.signUpEmail({
    body: { email, password, name },
  });

  const [created] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!created) throw new Error("Gagal membuat test user");

  // In test helper, ensure emailVerified is true so test user can sign in
  await db
    .update(user)
    .set({ emailVerified: true })
    .where(eq(user.id, created.id));

  if (role === "admin") {
    await db
      .update(user)
      .set({ role: "admin" })
      .where(eq(user.id, created.id));
    await db
      .delete(ownerProfiles)
      .where(eq(ownerProfiles.userId, created.id));
  }

  const response = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });

  const cookie = cookieFromResponse(response);
  if (!cookie) throw new Error("Cookie session tidak diterima");

  return { id: created.id, email, password, cookie };
}
