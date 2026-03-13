import { clearAdminCookie, createAdminToken, getAdminCredentials, setAdminCookie } from "./_adminAuth";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { username = "", password = "", rememberMe = true } = req.body ?? {};
    const normalizedUsername = String(username).trim().toLowerCase();
    const normalizedPassword = String(password);
    const admin = getAdminCredentials();

    if (normalizedUsername !== admin.username || normalizedPassword !== admin.password) {
      clearAdminCookie(res);
      res.status(401).json({ success: false, error: "Yönetici kullanıcı adı veya şifre hatalı." });
      return;
    }

    const token = createAdminToken(admin.username);
    setAdminCookie(res, token, Boolean(rememberMe));

    res.status(200).json({
      success: true,
      admin: {
        username: admin.username,
        displayName: admin.username === "shienki" ? "Shienki" : admin.username
      }
    });
  } catch (error: any) {
    clearAdminCookie(res);
    res.status(500).json({ success: false, error: error?.message ?? "Yönetici girişi kurulamadı." });
  }
}
