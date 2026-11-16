import { apiRoute } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { getPublicKostBySlug } from "@/lib/services/kost.service";

type Params = { slug: string };

export const GET = apiRoute<Params>(async (_request, context) => {
  const { slug } = await context.params;
  const kost = await getPublicKostBySlug(slug);
  return jsonSuccess(kost);
});
