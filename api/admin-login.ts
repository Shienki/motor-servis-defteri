import { clearAdminCookie, createAdminToken, getAdminCredentials, setAdminCookie } from "./_adminAuth";
import { applyApiSecurityHeaders } from "./_security";

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

export default async function handler(req: any, res: any) {
  applyApiSecurityHeaders(res, { privateResponse: true });

  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const ip = getClientIp(req);
  if (!applyRateLimit(res, `admin-login:${ip}`, 10 * 60 * 1000, 8)) {
    return;
  }

  try {
    const username = String(req?.body?.username || "").trim().toLowerCase();
    const password = String(req?.body?.password || "").trim();
    const rememberMe = Boolean(req?.body?.rememberMe ?? true);
    const adminCredentials = getAdminCredentials();

    if (username !== adminCredentials.username || password !== adminCredentials.password) {
      clearAdminCookie(res);
      res.status(401).json({ success: false, error: "Yönetici kullanıcı adı veya şifre hatalı." });
      return;
    }

    setAdminCookie(res, createAdminToken(rememberMe), rememberMe);
    res.status(200).json({
      success: true,
      admin: {
        username: adminCredentials.username,
        displayName: adminCredentials.username
      }
    });
  } catch (error) {
    console.error("[admin-login]", error);
    clearAdminCookie(res);
    res.status(500).json({ success: false, error: "Yönetici girişi şu an kullanılamıyor." });
  }
}
