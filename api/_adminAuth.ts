import { createHmac } from "crypto";

const DEFAULT_ADMIN_USERNAME = "shienki";
const DEFAULT_ADMIN_PASSWORD = "Arcelik123.";
const COOKIE_NAME = "msd_admin_session";

function getEnv(name: string, fallback = "") {
  return process.env[name] || fallback;
}

function getAdminSecret() {
  return getEnv("ADMIN_SESSION_SECRET", "motor-servis-defteri-admin-secret");
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

export function getAdminCredentials() {
  return {
    username: getEnv("ADMIN_USERNAME", DEFAULT_ADMIN_USERNAME).trim().toLowerCase(),
    password: getEnv("ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD)
  };
}

function sign(value: string) {
  return createHmac("sha256", getAdminSecret()).update(value).digest("hex");
}

export function createAdminToken(username: string) {
  const payload = JSON.stringify({
    username,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30
  });
  const encoded = toBase64Url(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function verifyAdminToken(token: string) {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as {
      username: string;
      exp: number;
    };
    if (!payload.username || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readAdminToken(req: any) {
  const cookieHeader = String(req.headers.cookie || "");
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

export function setAdminCookie(res: any, token: string, rememberMe = true) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`
  );
}

export function clearAdminCookie(res: any) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`);
}

export function requireAdmin(req: any) {
  const token = readAdminToken(req);
  return verifyAdminToken(token);
}
