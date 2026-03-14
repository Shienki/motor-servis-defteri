import { clearAdminCookie } from "./_adminAuth";
import { applyApiSecurityHeaders } from "./_security";

export default async function handler(req: any, res: any) {
  applyApiSecurityHeaders(res, { privateResponse: true });

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  clearAdminCookie(res);
  res.status(200).json({ success: true });
}
