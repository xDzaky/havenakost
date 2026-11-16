import { ownerRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { occupancyUpdateSchema } from "@/lib/validators/room.schema";
import {
  deleteOccupancy,
  updateOccupancy,
} from "@/lib/services/occupancy.service";

type Params = { occupancyId: string };

export const PATCH = ownerRoute<Params>(
  async (request, context, session) => {
    const occupancyId = uuidSchema.parse(
      (await context.params).occupancyId,
    );
    const input = await parseJson(request, occupancyUpdateSchema);
    const occupancy = await updateOccupancy(
      session.user.id,
      occupancyId,
      input,
    );
    return jsonSuccess(occupancy, {
      message: "Data penghuni berhasil diperbarui",
    });
  },
);

export const DELETE = ownerRoute<Params>(
  async (_request, context, session) => {
    const occupancyId = uuidSchema.parse(
      (await context.params).occupancyId,
    );
    await deleteOccupancy(session.user.id, occupancyId);
    return jsonSuccess(
      { id: occupancyId },
      { message: "Data penghuni berhasil dihapus" },
    );
  },
);
