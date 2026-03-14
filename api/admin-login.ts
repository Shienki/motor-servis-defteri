const COOKIE_NAME = "msd_admin_session";

function readEnv(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} tanımlı değil.`);
  }
  return value;
}

function getClientIp(req: any) {
  const forwarded = String(req?.headers?.["x-forwarded-for"] || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)[0];

  return (
    forwarded ||
    String(req?.headers?.["x-real-ip"] || "").trim() ||
    String(req?.socket?.remoteAddress || "").trim() ||
    "unknown"
  );
}

const buckets = new Map<string, { count: number; resetAt: number }>();

function applyRateLimit(res: any, key: string, windowMs: number, max: number) {
  const now = Date.now();

  for (const [bucketKey, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(bucketKey);
    }
  }

  const current =
    buckets.get(key) && buckets.get(key)!.resetAt > now
      ? buckets.get(key)!
      : { count: 0, resetAt: now + windowMs };

  current.count += 1;
  buckets.set(key, current);

  res.setHeader("X-RateLimit-Limit", String(max));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(max - current.count, 0)));

  if (current.count > max) {
    res.status(429).json({ success: false, error: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin." });
    return false;
  }

  return true;
}

function setAdminCookie(res: any, token: string, rememberMe: boolean) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`
  );
}

function clearAdminCookie(res: any) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const ip = getClientIp(req);
  if (!applyRateLimit(res, `admin-login:${ip}`, 10 * 60 * 1000, 10)) {
    return;
  }

  try {
    const username = String(req?.body?.username || "").trim().toLowerCase();
    const password = String(req?.body?.password || "").trim();
    const rememberMe = Boolean(req?.body?.rememberMe ?? true);

    const adminUsername = readEnv("ADMIN_USERNAME").toLowerCase();
    const adminPassword = readEnv("ADMIN_PASSWORD");
    const sessionSecret = readEnv("ADMIN_SESSION_SECRET");

    if (username !== adminUsername || password !== adminPassword) {
      clearAdminCookie(res);
      res.status(401).json({ success: false, error: "Yönetici kullanıcı adı veya şifre hatalı." });
      return;
    }

    setAdminCookie(res, `admin:${sessionSecret}`, rememberMe);
    res.status(200).json({
      success: true,
      admin: {
        username: adminUsername,
        displayName: adminUsername
      }
    });
  } catch (error: any) {
    clearAdminCookie(res);
    res.status(500).json({ success: false, error: error?.message ?? "Yönetici girişi kurulamadı." });
  }
}
