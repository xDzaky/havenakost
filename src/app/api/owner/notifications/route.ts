import { ownerRoute } from "@/lib/auth/guards";
import { parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { notificationQuerySchema } from "@/lib/validators/admin.schema";
import { listNotifications } from "@/lib/services/notification.service";

export const GET = ownerRoute(async (request, _context, session) => {
  const query = parseQuery(request, notificationQuerySchema);
  const result = await listNotifications(session.user.id, {
    page: query.page,
    limit: query.limit,
    unreadOnly: query.unread_only,
  });
  return jsonSuccess(
    { items: result.items, unreadCount: result.unreadCount },
    { meta: result.meta },
  );
});
