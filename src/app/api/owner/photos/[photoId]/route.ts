import { ownerRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { photoUpdateSchema } from "@/lib/validators/photo.schema";
import {
  deleteListingPhoto,
  updateListingPhoto,
} from "@/lib/services/photo.service";

type Params = { photoId: string };

export const PATCH = ownerRoute<Params>(
  async (request, context, session) => {
    const photoId = uuidSchema.parse((await context.params).photoId);
    const input = await parseJson(request, photoUpdateSchema);
    const photo = await updateListingPhoto(
      session.user.id,
      photoId,
      input,
    );
    return jsonSuccess(photo, { message: "Foto berhasil diperbarui" });
  },
);

export const DELETE = ownerRoute<Params>(
  async (_request, context, session) => {
    const photoId = uuidSchema.parse((await context.params).photoId);
    await deleteListingPhoto(session.user.id, photoId);
    return jsonSuccess(
      { id: photoId },
      { message: "Foto berhasil dihapus" },
    );
  },
);
