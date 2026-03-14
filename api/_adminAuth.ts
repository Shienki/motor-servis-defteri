const COOKIE_NAME = "msd_admin_session";

function requireEnv(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} tanımlı değil.`);
  }
  return value;
}

function getAdminSessionToken() {
  return `admin:${requireEnv("ADMIN_SESSION_SECRET")}`;
}

export function getAdminCredentials() {
  return {
    username: requireEnv("ADMIN_USERNAME").toLowerCase(),
    password: requireEnv("ADMIN_PASSWORD")
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
  const verified = verifyAdminToken(token);
  if (!verified) {
    return null;
  }

  return {
    username: verified.username,
    displayName: verified.username
  };
}
