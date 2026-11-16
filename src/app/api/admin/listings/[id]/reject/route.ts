import { adminRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { adminListingRejectSchema } from "@/lib/validators/kost.schema";
import { rejectListing } from "@/lib/services/admin.service";

type Params = { id: string };

export const POST = adminRoute<Params>(async (request, context, admin) => {
  const id = uuidSchema.parse((await context.params).id);
  const input = await parseJson(request, adminListingRejectSchema);
  const listing = await rejectListing(admin.id, id, input.reason);
  return jsonSuccess(listing, { message: "Listing ditolak" });
});
