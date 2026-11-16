import { adminRoute } from "@/lib/auth/guards";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { approveListing } from "@/lib/services/admin.service";

type Params = { id: string };

export const POST = adminRoute<Params>(async (_request, context, admin) => {
  const id = uuidSchema.parse((await context.params).id);
  const listing = await approveListing(admin.id, id);
  return jsonSuccess(listing, {
    message: "Listing disetujui dan dipublikasikan",
  });
});
