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

function requireEnv(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} tanımlı değil.`);
  }
  return value;
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

function readAdminToken(req: any) {
  const cookieHeader = String(req?.headers?.cookie || "");
  const cookies = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split("=");
    if (name === "msd_admin_session") {
      return decodeURIComponent(rest.join("="));
    }
  }

  return "";
}

function verifyAdmin(req: any) {
  const token = readAdminToken(req);
  const parts = token.split(".");
  if (parts.length !== 4) {
    return false;
  }

  const [username, expiresAtRaw, nonce, signature] = parts;
  const expiresAt = Number(expiresAtRaw);
  const expectedUsername = requireEnv("ADMIN_USERNAME").toLowerCase();
  if (username !== expectedUsername || !Number.isFinite(expiresAt) || expiresAt <= Date.now() || !nonce || !signature) {
    return false;
  }

  const payload = `${username}.${expiresAtRaw}.${nonce}`;
  const expectedSignature = signValue(payload, requireEnv("ADMIN_SESSION_SECRET"));
  return signature === expectedSignature;
}

async function requestJson(path: string) {
  const baseUrl = requireEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const url = new URL(`/rest/v1/${path}`, baseUrl);

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`REST ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export default async function handler(req: any, res: any) {
  applyPrivateHeaders(res);

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    if (!verifyAdmin(req)) {
      res.status(401).json({ error: "Yönetici oturumu bulunamadı." });
      return;
    }

    const [profiles, motorcycles, repairs, paymentEntries, workOrders, workOrderUpdates, backupEvents] = await Promise.all([
      requestJson("profiles?select=*"),
      requestJson("motorcycles?select=*"),
      requestJson("repairs?select=*"),
      requestJson("payment_entries?select=*"),
      requestJson("work_orders?select=*"),
      requestJson("work_order_updates?select=*"),
      requestJson("backup_events?select=*&order=created_at.desc&limit=5000").catch(() => [])
    ]);

    const snapshot = {
      exportedAt: new Date().toISOString(),
      source: "motor-servis-defteri",
      tables: {
        profiles,
        motorcycles,
        repairs,
        payment_entries: paymentEntries,
        work_orders: workOrders,
        work_order_updates: workOrderUpdates,
        backup_events: backupEvents
      }
    };

    const fileName = `motor-servis-defteri-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(JSON.stringify(snapshot, null, 2));
  } catch (error) {
    console.error("[system-backup-export]", error);
    res.status(500).json({ error: "Yedek dışa aktarma şu an kullanılamıyor." });
  }
}
