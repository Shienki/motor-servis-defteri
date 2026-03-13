const DEFAULT_ADMIN_USERNAME = "shienki";
const DEFAULT_ADMIN_PASSWORD = "Arcelik123.";
const DEFAULT_SESSION_SECRET = "motor-servis-defteri-admin-secret";
const COOKIE_NAME = "msd_admin_session";

function getEnv(name: string, fallback = "") {
  return process.env[name] || fallback;
}

function getAdminSessionToken() {
  return `admin:${getEnv("ADMIN_SESSION_SECRET", DEFAULT_SESSION_SECRET)}`;
}

export function getAdminCredentials() {
  return {
    username: getEnv("ADMIN_USERNAME", DEFAULT_ADMIN_USERNAME).trim().toLowerCase(),
    password: getEnv("ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD)
  };
}

export function createAdminToken() {
  return getAdminSessionToken();
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
  if (!token || token !== getAdminSessionToken()) {
    return null;
  }

  return {
    username: getAdminCredentials().username
  };
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
