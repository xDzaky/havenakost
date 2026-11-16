import { ownerRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { photoConfirmSchema } from "@/lib/validators/photo.schema";
import { confirmListingPhoto } from "@/lib/services/photo.service";

type Params = { id: string };

export const POST = ownerRoute<Params>(async (request, context, session) => {
  const id = uuidSchema.parse((await context.params).id);
  const input = await parseJson(request, photoConfirmSchema);
  const photo = await confirmListingPhoto(session.user.id, id, input);
  return jsonSuccess(photo, {
    status: 201,
    message: "Foto berhasil dikonfirmasi",
  });
});
