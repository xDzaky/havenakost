import { apiRoute } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";

export const GET = apiRoute(async () => {
  return jsonSuccess({ status: "ok" });
});
