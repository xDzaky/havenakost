import { ownerRoute } from "@/lib/auth/guards";
import { parseJson, parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { occupancyCreateSchema } from "@/lib/validators/room.schema";
import { z } from "zod";
import { paginationSchema } from "@/lib/utils/pagination";
import {
  createOccupancy,
  listOccupancies,
} from "@/lib/services/occupancy.service";

type Params = { roomId: string };

const querySchema = paginationSchema.extend({
  status: z.enum(["active", "completed", "cancelled"]).optional(),
});

export const GET = ownerRoute<Params>(async (request, context, session) => {
  const roomId = uuidSchema.parse((await context.params).roomId);
  const query = parseQuery(request, querySchema);
  const result = await listOccupancies(session.user.id, roomId, {
    page: query.page,
    limit: query.limit,
    status: query.status,
  });
  return jsonSuccess(result.items, { meta: result.meta });
});

export const POST = ownerRoute<Params>(async (request, context, session) => {
  const roomId = uuidSchema.parse((await context.params).roomId);
  const input = await parseJson(request, occupancyCreateSchema);
  const occupancy = await createOccupancy(
    session.user.id,
    roomId,
    input,
  );
  return jsonSuccess(occupancy, {
    status: 201,
    message: "Data penghuni berhasil disimpan",
  });
});
