const COOKIE_NAME = "msd_admin_session";

function requireEnv(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} tanımlı değil.`);
  }
  return value;
}

function readAdminToken(req: any) {
  const cookieHeader = String(req?.headers?.cookie || "");
  const cookies = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split("=");
    if (name === COOKIE_NAME) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return "";
}

function getAdminSession() {
  const username = requireEnv("ADMIN_USERNAME").toLowerCase();
  const sessionSecret = requireEnv("ADMIN_SESSION_SECRET");
  return {
    username,
    token: `admin:${sessionSecret}`
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const admin = getAdminSession();
  const token = readAdminToken(req);

  if (!token || token !== admin.token) {
    res.status(401).json({ error: "Yönetici oturumu bulunamadı." });
    return;
  }

  res.status(200).json({
    systemAdmin: {
      username: admin.username,
      displayName: admin.username
    },
    totals: {
      serviceCount: 0,
      motorcycleCount: 0,
      activeWorkOrderCount: 0,
      readyCount: 0,
      unpaidTotal: 0
    },
    services: []
  });
}
