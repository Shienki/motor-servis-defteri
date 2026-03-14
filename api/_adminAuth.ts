import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const COOKIE_NAME = "msd_admin_session";

function requireEnv(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} tanımlı değil.`);
  }
  return value;
}

function getAdminSecret() {
  return requireEnv("ADMIN_SESSION_SECRET");
}

function createSignature(payload: string) {
  return createHmac("sha256", getAdminSecret()).update(payload).digest("hex");
}

export function getAdminCredentials() {
  return {
    username: requireEnv("ADMIN_USERNAME").toLowerCase(),
    password: requireEnv("ADMIN_PASSWORD")
  };
}

export function createAdminToken(rememberMe = true) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  const expiresAt = Date.now() + maxAge * 1000;
  const nonce = randomBytes(12).toString("hex");
  const payload = `${getAdminCredentials().username}.${expiresAt}.${nonce}`;
  const signature = createSignature(payload);
  return `${payload}.${signature}`;
}

export function readAdminToken(req: any) {
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

export function verifyAdminToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 4) {
    return null;
  }

  const [username, expiresAtRaw, nonce, signature] = parts;
  const expectedUsername = getAdminCredentials().username;
  const expiresAt = Number(expiresAtRaw);
  if (username !== expectedUsername || !Number.isFinite(expiresAt) || expiresAt <= Date.now() || !nonce || !signature) {
    return null;
  }

  const payload = `${username}.${expiresAtRaw}.${nonce}`;
  const expectedSignature = createSignature(payload);
  const providedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  return { username };
}

export function setAdminCookie(res: any, token: string, rememberMe = true) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}; Secure; Priority=High`
  );
}

export function clearAdminCookie(res: any) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure; Priority=High`);
}

export function requireAdmin(req: any) {
  const token = readAdminToken(req);
  const verified = verifyAdminToken(token);
  if (!verified) {
    return null;
  }

  return {
    username: verified.username,
    displayName: verified.username
  };
}
