import { ownerRoute } from "@/lib/auth/guards";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { markNotificationRead } from "@/lib/services/notification.service";

type Params = { id: string };

export const PATCH = ownerRoute<Params>(async (_request, context, session) => {
  const id = uuidSchema.parse((await context.params).id);
  const notification = await markNotificationRead(session.user.id, id);
  return jsonSuccess(notification, {
    message: "Notifikasi ditandai sudah dibaca",
  });
});
