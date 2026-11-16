export const PERMISSIONS = {
  owner: [
    "profile:read",
    "profile:update",
    "listing:manage:own",
    "room:manage:own",
    "occupancy:manage:own",
    "review:verify:own",
    "finance:manage:own",
    "notification:read:own",
    "subscription:read:own",
    "subscription:pay:own",
  ],
  admin: [
    "admin:dashboard",
    "owner:manage",
    "listing:manage:all",
    "review:moderate",
    "subscription:manage",
    "audit:read",
  ],
} as const;

export type Role = keyof typeof PERMISSIONS;
export type Permission =
  (typeof PERMISSIONS)[Role][number] | (typeof PERMISSIONS)["admin"][number];

export function hasPermission(
  role: string,
  permission: Permission,
): boolean {
  if (role !== "owner" && role !== "admin") return false;
  return (PERMISSIONS[role] as readonly string[]).includes(permission);
}
