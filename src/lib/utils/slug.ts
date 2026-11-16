const DIACRITICS = /[\u0300-\u036f]/g;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function slugWithSuffix(base: string, suffix: string): string {
  const safe = slugify(base) || "kost";
  return `${safe}-${suffix}`.slice(0, 90);
}

/**
 * Conservative name normalisation used only to find candidate occupancies.
 * A match is never treated as proof of identity.
 */
export function normalizeName(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function namesLooselyEqual(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}

export function toPublicDisplayName(
  reviewerName: string,
  publicDisplayName?: string | null,
): string {
  const candidate = publicDisplayName?.trim();
  if (candidate) return candidate.slice(0, 80);

  const parts = reviewerName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]!.charAt(0)}.`;
}
