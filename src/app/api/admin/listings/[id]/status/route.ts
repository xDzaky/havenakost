import { adminRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { adminListingStatusSchema } from "@/lib/validators/kost.schema";
import { setListingStatus } from "@/lib/services/admin.service";

type Params = { id: string };

export const PATCH = adminRoute<Params>(async (request, context, admin) => {
  const id = uuidSchema.parse((await context.params).id);
  const input = await parseJson(request, adminListingStatusSchema);
  const listing = await setListingStatus(
    admin.id,
    id,
    input.status,
    input.reason,
  );
  return jsonSuccess(listing, {
    message: `Status listing diubah menjadi ${input.status}`,
  });
});
