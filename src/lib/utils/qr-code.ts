import QRCode from "qrcode";

export type QrAssets = {
  dataUrl: string;
  svg: string;
};

export async function generateQrAssets(url: string): Promise<QrAssets> {
  const [dataUrl, svg] = await Promise.all([
    QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 512,
      color: { dark: "#111827", light: "#ffffff" },
    }),
    QRCode.toString(url, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      color: { dark: "#111827", light: "#ffffff" },
    }),
  ]);

  return { dataUrl, svg };
}

export async function generateQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 1024,
    color: { dark: "#111827", light: "#ffffff" },
  });
}

export function buildReviewUrl(token: string): string {
  const base = (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  return `${base}/review/${encodeURIComponent(token)}`;
}
