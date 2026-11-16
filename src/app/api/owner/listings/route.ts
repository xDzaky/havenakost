import { ownerRoute } from "@/lib/auth/guards";
import { parseJson, parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import {
  kostCreateSchema,
  ownerListingQuerySchema,
} from "@/lib/validators/kost.schema";
import {
  createOwnerListing,
  listOwnerListings,
} from "@/lib/services/kost.service";

export const GET = ownerRoute(async (request, _context, session) => {
  const query = parseQuery(request, ownerListingQuerySchema);
  const result = await listOwnerListings(session.user.id, query);
  return jsonSuccess(result.items, { meta: result.meta });
});

export const POST = ownerRoute(async (request, _context, session) => {
  const input = await parseJson(request, kostCreateSchema);
  const listing = await createOwnerListing(session.user.id, input);
  return jsonSuccess(listing, {
    status: 201,
    message:
      "Listing dibuat sebagai draft. Ajukan status pending untuk direview admin.",
  });
});
