const DEFAULT_ADMIN_USERNAME = "shienki";
const DEFAULT_ADMIN_PASSWORD = "Arcelik123.";
const DEFAULT_SESSION_SECRET = "motor-servis-defteri-admin-secret";
const COOKIE_NAME = "msd_admin_session";

function getAdminCredentials() {
  return {
    username: String(process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME).trim().toLowerCase(),
    password: String(process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD)
  };
}

function getSessionToken() {
  return `admin:${process.env.ADMIN_SESSION_SECRET || DEFAULT_SESSION_SECRET}`;
}

function setAdminCookie(res: any, rememberMe = true) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(getSessionToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`
  );
}

function clearAdminCookie(res: any) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`);
}

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

    setAdminCookie(res, Boolean(rememberMe));

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
