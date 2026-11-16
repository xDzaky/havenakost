import { ownerRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { kostUpdateSchema } from "@/lib/validators/kost.schema";
import { uuidSchema } from "@/lib/validators/common.schema";
import {
  getOwnerListing,
  softDeleteOwnerListing,
  updateOwnerListing,
} from "@/lib/services/kost.service";

type Params = { id: string };

export const GET = ownerRoute<Params>(async (_request, context, session) => {
  const id = uuidSchema.parse((await context.params).id);
  const listing = await getOwnerListing(session.user.id, id);
  return jsonSuccess(listing);
});

export const PATCH = ownerRoute<Params>(async (request, context, session) => {
  const id = uuidSchema.parse((await context.params).id);
  const input = await parseJson(request, kostUpdateSchema);
  const listing = await updateOwnerListing(session.user.id, id, input);
  return jsonSuccess(listing, { message: "Listing berhasil diperbarui" });
});

export const DELETE = ownerRoute<Params>(
  async (_request, context, session) => {
    const id = uuidSchema.parse((await context.params).id);
    await softDeleteOwnerListing(session.user.id, id);
    return jsonSuccess(
      { id },
      { message: "Listing diarsipkan dan dihapus dari pencarian publik" },
    );
  },
);
