import { ownerRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import {
  deleteOwnerRoom,
  getOwnerRoom,
  updateOwnerRoom,
} from "@/lib/services/room.service";
import { roomUpdateSchema } from "@/lib/validators/room.schema";

type Params = { roomId: string };

export const GET = ownerRoute<Params>(async (_request, context, session) => {
  const roomId = uuidSchema.parse((await context.params).roomId);
  const room = await getOwnerRoom(session.user.id, roomId);
  return jsonSuccess(room);
});

export const PATCH = ownerRoute<Params>(
  async (request, context, session) => {
    const roomId = uuidSchema.parse((await context.params).roomId);
    const input = await parseJson(request, roomUpdateSchema);
    const room = await updateOwnerRoom(session.user.id, roomId, input);
    return jsonSuccess(room, { message: "Kamar berhasil diperbarui" });
  },
);

export const DELETE = ownerRoute<Params>(
  async (_request, context, session) => {
    const roomId = uuidSchema.parse((await context.params).roomId);
    await deleteOwnerRoom(session.user.id, roomId);
    return jsonSuccess({ id: roomId }, { message: "Kamar berhasil dihapus" });
  },
);
