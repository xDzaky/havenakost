import { ownerRoute } from "@/lib/auth/guards";
import { parseJson, parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import {
  roomCreateSchema,
  roomListQuerySchema,
} from "@/lib/validators/room.schema";
import {
  createOwnerRoom,
  listOwnerRooms,
} from "@/lib/services/room.service";

type Params = { id: string };

export const GET = ownerRoute<Params>(async (request, context, session) => {
  const kostId = uuidSchema.parse((await context.params).id);
  const query = parseQuery(request, roomListQuerySchema);
  const result = await listOwnerRooms(session.user.id, kostId, {
    page: query.page,
    limit: query.limit,
    status: query.status,
  });
  return jsonSuccess(result.items, { meta: result.meta });
});

export const POST = ownerRoute<Params>(async (request, context, session) => {
  const kostId = uuidSchema.parse((await context.params).id);
  const input = await parseJson(request, roomCreateSchema);
  const room = await createOwnerRoom(session.user.id, kostId, input);
  return jsonSuccess(room, {
    status: 201,
    message: "Kamar berhasil dibuat",
  });
});
