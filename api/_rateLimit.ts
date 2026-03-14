type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function now() {
  return Date.now();
}

function cleanup() {
  const current = now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= current) {
      buckets.delete(key);
    }
  }
}

export function getClientIp(req: any) {
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

export function applyRateLimit(
  res: any,
  key: string,
  options: {
    windowMs: number;
    max: number;
  }
) {
  cleanup();

  const current = now();
  const existing = buckets.get(key);
  const bucket =
    !existing || existing.resetAt <= current
      ? {
          count: 0,
          resetAt: current + options.windowMs
        }
      : existing;

  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(options.max - bucket.count, 0);
  res.setHeader("X-RateLimit-Limit", String(options.max));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > options.max) {
    res.status(429).json({ error: "Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar dene." });
    return false;
  }

  return true;
}
