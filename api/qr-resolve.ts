function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} tanımlı değil.`);
  }
  return value;
}

function restUrl(path: string) {
  return `${getEnv("VITE_SUPABASE_URL")}/rest/v1/${path}`;
}

function serviceHeaders() {
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json"
  };
}

async function fetchRest(path: string) {
  const response = await fetch(restUrl(path), { headers: serviceHeaders() });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

async function getAuthenticatedUserId(req: any) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return null;
  }

  const response = await fetch(`${getEnv("VITE_SUPABASE_URL")}/auth/v1/user`, {
    headers: {
      apikey: getEnv("VITE_SUPABASE_ANON_KEY"),
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const user = await response.json();
  return user?.id ?? null;
}

function isMotorcycleToken(token: string) {
  return token.startsWith("moto:");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = typeof req.query?.token === "string" ? req.query.token.trim() : "";
  if (!token) {
    res.status(400).json({ error: "Token zorunlu." });
    return;
  }

  try {
    const userId = await getAuthenticatedUserId(req);

    if (isMotorcycleToken(token)) {
      const motorcycleId = token.slice("moto:".length);
      const motorcycles = await fetchRest(`motorcycles?id=eq.${encodeURIComponent(motorcycleId)}&select=id,user_id&limit=1`);
      const motorcycle = motorcycles[0] ?? null;

      if (!motorcycle) {
        res.status(404).json({ error: "QR kaydı bulunamadı." });
        return;
      }

      if (userId && userId === motorcycle.user_id) {
        res.status(200).json({ path: `/motosiklet/${motorcycle.id}` });
        return;
      }

      res.status(200).json({ path: `/takip/${token}` });
      return;
    }

    const workOrders = await fetchRest(
      `work_orders?public_tracking_token=eq.${encodeURIComponent(token)}&select=motorcycle_id,user_id,public_tracking_token&limit=1`
    );
    const workOrder = workOrders[0] ?? null;

    if (!workOrder) {
      res.status(404).json({ error: "QR kaydı bulunamadı." });
      return;
    }

    if (userId && userId === workOrder.user_id) {
      res.status(200).json({ path: `/motosiklet/${workOrder.motorcycle_id}` });
      return;
    }

    res.status(200).json({ path: `/takip/${workOrder.public_tracking_token}` });
  } catch (error: any) {
    res.status(503).json({ error: error?.message ?? "QR servisi hazır değil." });
  }
}
