import { applyApiSecurityHeaders } from "./_security";

export default async function handler(_req: any, res: any) {
  applyApiSecurityHeaders(res, { privateResponse: true });
  res.status(410).json({
    error: "Bu endpoint artık kullanılmıyor."
  });
}
