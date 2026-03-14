function applyPrivateHeaders(res: any) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

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

function signValue(value: string, secret: string) {
  let hash = 2166136261;
  const input = `${value}|${secret}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function createAdminToken(username: string, rememberMe: boolean) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  const expiresAt = Date.now() + maxAge * 1000;
  const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  const payload = `${username}.${expiresAt}.${nonce}`;
  const signature = signValue(payload, readEnv("ADMIN_SESSION_SECRET"));
  return `${payload}.${signature}`;
}

function setAdminCookie(res: any, token: string, rememberMe: boolean) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  res.setHeader(
    "Set-Cookie",
    `msd_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}; Secure; Priority=High`
  );
}

function clearAdminCookie(res: any) {
  res.setHeader("Set-Cookie", "msd_admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure; Priority=High");
}

export default async function handler(req: any, res: any) {
  applyPrivateHeaders(res);

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
    const adminUsername = readEnv("ADMIN_USERNAME").toLowerCase();
    const adminPassword = readEnv("ADMIN_PASSWORD");

    if (username !== adminUsername || password !== adminPassword) {
      clearAdminCookie(res);
      res.status(401).json({ success: false, error: "Yönetici kullanıcı adı veya şifre hatalı." });
      return;
    }

    setAdminCookie(res, createAdminToken(adminUsername, rememberMe), rememberMe);
    res.status(200).json({
      success: true,
      admin: {
        username: adminUsername,
        displayName: adminUsername
      }
    });
  } catch (error) {
    console.error("[admin-login]", error);
    clearAdminCookie(res);
    res.status(500).json({ success: false, error: "Yönetici girişi şu an kullanılamıyor." });
  }
}
