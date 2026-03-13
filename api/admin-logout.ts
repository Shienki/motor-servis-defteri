import { clearAdminCookie } from "./_adminAuth";

export default async function handler(_req: any, res: any) {
  clearAdminCookie(res);
  res.status(200).json({ success: true });
}
