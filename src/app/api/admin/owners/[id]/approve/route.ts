import { adminRoute } from "@/lib/auth/guards";
import { jsonSuccess } from "@/lib/utils/api-response";
import { approveOwner } from "@/lib/services/admin.service";
import { z } from "zod";

type Params = { id: string };

export const POST = adminRoute<Params>(async (_request, context, admin) => {
  const id = z.string().min(1).max(100).parse((await context.params).id);
  const profile = await approveOwner(admin.id, id);
  return jsonSuccess(profile, {
    message: "Pemilik berhasil disetujui",
  });
});
