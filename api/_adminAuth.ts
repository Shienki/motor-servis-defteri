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

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createSignature(payload: string) {
  const secret = new TextEncoder().encode(getAdminSecret());
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(signature);
}

export function getAdminCredentials() {
  return {
    username: requireEnv("ADMIN_USERNAME").toLowerCase(),
    password: requireEnv("ADMIN_PASSWORD")
  };
}

export async function createAdminToken(rememberMe = true) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  const expiresAt = Date.now() + maxAge * 1000;
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const payload = `${getAdminCredentials().username}.${expiresAt}.${nonce}`;
  const signature = await createSignature(payload);
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

export async function verifyAdminToken(token: string) {
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
  const expectedSignature = await createSignature(payload);
  if (signature !== expectedSignature) {
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

export async function requireAdmin(req: any) {
  const token = readAdminToken(req);
  const verified = await verifyAdminToken(token);
  if (!verified) {
    return null;
  }

  return {
    username: verified.username,
    displayName: verified.username
  };
}
