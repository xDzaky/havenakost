import { ownerRoute } from "@/lib/auth/guards";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import {
  disableRoomQr,
  downloadRoomQr,
  ensureRoomQr,
  getRoomQr,
} from "@/lib/services/room.service";

type Params = { roomId: string };

export const GET = ownerRoute<Params>(async (request, context, session) => {
  const roomId = uuidSchema.parse((await context.params).roomId);
  const format = request.nextUrl.searchParams.get("format");

  if (format === "png" || format === "svg") {
    const result = await downloadRoomQr(session.user.id, roomId, format);
    return new Response(result.buffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": format === "png" ? "image/png" : "image/svg+xml",
        "Content-Disposition": `attachment; filename="qr-${result.roomCode}.${format}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const qr = await getRoomQr(session.user.id, roomId);
  return jsonSuccess(qr);
});

export const POST = ownerRoute<Params>(async (_request, context, session) => {
  const roomId = uuidSchema.parse((await context.params).roomId);
  const qr = await ensureRoomQr(session.user.id, roomId);
  return jsonSuccess(qr, {
    status: 201,
    message: "QR Code berhasil dibuat",
  });
});

export const DELETE = ownerRoute<Params>(
  async (_request, context, session) => {
    const roomId = uuidSchema.parse((await context.params).roomId);
    await disableRoomQr(session.user.id, roomId);
    return jsonSuccess(
      { roomId, enabled: false },
      { message: "QR Code dinonaktifkan" },
    );
  },
);
