const DEFAULT_ADMIN_USERNAME = "shienki";
const DEFAULT_SESSION_SECRET = "motor-servis-defteri-admin-secret";
const COOKIE_NAME = "msd_admin_session";

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

function readAdminToken(req: any) {
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

function requireAdmin(req: any) {
  const expected = `admin:${process.env.ADMIN_SESSION_SECRET || DEFAULT_SESSION_SECRET}`;
  const token = readAdminToken(req);

  if (token !== expected) {
    return null;
  }

  const username = String(process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME).trim().toLowerCase();
  return {
    username,
    displayName: username === "shienki" ? "Shienki" : username
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const adminSession = requireAdmin(req);
  if (!adminSession) {
    res.status(401).json({ error: "Yönetici oturumu bulunamadı." });
    return;
  }

  try {
    const [profiles, motorcycles, repairs, workOrders] = await Promise.all([
      fetchRest("profiles?select=*"),
      fetchRest("motorcycles?select=*"),
      fetchRest("repairs?select=*"),
      fetchRest("work_orders?select=*"),
      fetchRest("payment_entries?select=*")
    ]).then(([profileRows, motorcycleRows, repairRows, workOrderRows, paymentRows]) => {
      const paymentMap = new Map<string, any[]>();
      for (const payment of paymentRows ?? []) {
        const list = paymentMap.get(payment.repair_id) ?? [];
        list.push(payment);
        paymentMap.set(payment.repair_id, list);
      }

      const normalizedRepairs = (repairRows ?? []).map((item: any) => {
        const entries = paymentMap.get(item.id) ?? [];
        const paid = entries.reduce((sum: number, entry: any) => sum + Number(entry.amount ?? 0), 0);
        return {
          userId: item.user_id,
          remaining: Math.max(Number(item.total_cost ?? 0) - paid, 0)
        };
      });

      return [profileRows ?? [], motorcycleRows ?? [], normalizedRepairs, workOrderRows ?? []];
    });

    const services = (profiles ?? []).map((row: any) => {
      const userRepairs = (repairs ?? []).filter((item: any) => item.userId === row.id);
      const userWorkOrders = (workOrders ?? []).filter((item: any) => item.user_id === row.id);

      return {
        id: row.id,
        shopName: row.shop_name,
        ownerName: row.name,
        username: row.username || "",
        motorcycleCount: (motorcycles ?? []).filter((item: any) => item.user_id === row.id).length,
        activeWorkOrderCount: userWorkOrders.filter((item: any) => item.status !== "delivered").length,
        readyCount: userWorkOrders.filter((item: any) => item.status === "ready").length,
        unpaidRepairCount: userRepairs.filter((item: any) => item.remaining > 0).length,
        unpaidTotal: userRepairs.reduce((sum: number, item: any) => sum + item.remaining, 0),
        subscriptionStatus: "Aktif"
      };
    });

    res.status(200).json({
      systemAdmin: adminSession,
      totals: {
        serviceCount: services.length,
        motorcycleCount: (motorcycles ?? []).length,
        activeWorkOrderCount: (workOrders ?? []).filter((item: any) => item.status !== "delivered").length,
        readyCount: (workOrders ?? []).filter((item: any) => item.status === "ready").length,
        unpaidTotal: services.reduce((sum: number, item: any) => sum + item.unpaidTotal, 0)
      },
      services
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Yönetici paneli verileri alınamadı." });
  }
}
