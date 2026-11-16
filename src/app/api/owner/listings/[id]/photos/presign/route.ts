import { ownerRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { photoPresignSchema } from "@/lib/validators/photo.schema";
import { presignListingPhoto } from "@/lib/services/photo.service";

type Params = { id: string };

export const POST = ownerRoute<Params>(async (request, context, session) => {
  const id = uuidSchema.parse((await context.params).id);
  const input = await parseJson(request, photoPresignSchema);
  const result = await presignListingPhoto(session.user.id, id, input);
  return jsonSuccess(result, {
    status: 201,
    message:
      "Gunakan uploadUrl untuk mengunggah file, lalu panggil endpoint confirm.",
  });
});
