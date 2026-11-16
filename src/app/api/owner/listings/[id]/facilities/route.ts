import { ownerRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { facilityIdsSchema } from "@/lib/validators/kost.schema";
import {
  listOwnerListingFacilities,
  setOwnerListingFacilities,
} from "@/lib/services/kost.service";

type Params = { id: string };

export const GET = ownerRoute<Params>(async (_request, context, session) => {
  const id = uuidSchema.parse((await context.params).id);
  const facilities = await listOwnerListingFacilities(session.user.id, id);
  return jsonSuccess(facilities);
});

export const PUT = ownerRoute<Params>(async (request, context, session) => {
  const id = uuidSchema.parse((await context.params).id);
  const input = await parseJson(request, facilityIdsSchema);
  const facilities = await setOwnerListingFacilities(
    session.user.id,
    id,
    input.facility_ids,
  );
  return jsonSuccess(facilities, { message: "Fasilitas berhasil disimpan" });
});
