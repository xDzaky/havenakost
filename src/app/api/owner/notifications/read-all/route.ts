import { ownerRoute } from "@/lib/auth/guards";
import { jsonSuccess } from "@/lib/utils/api-response";
import { markAllNotificationsRead } from "@/lib/services/notification.service";

export const POST = ownerRoute(async (_request, _context, session) => {
  const result = await markAllNotificationsRead(session.user.id);
  return jsonSuccess(result, {
    message: "Semua notifikasi ditandai sudah dibaca",
  });
});
