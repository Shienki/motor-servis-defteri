import { getSupabaseServiceClient } from "./_supabase";

const DEFAULT_ADMIN_USERNAME = "shienki";
const DEFAULT_SESSION_SECRET = "motor-servis-defteri-admin-secret";
const COOKIE_NAME = "msd_admin_session";

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
    const client = getSupabaseServiceClient();
    const [
      { data: profiles, error: profilesError },
      { data: motorcycles, error: motorcyclesError },
      { data: repairs, error: repairsError },
      { data: workOrders, error: workOrdersError }
    ] = await Promise.all([
      client.from("profiles").select("*"),
      client.from("motorcycles").select("*"),
      client.from("repairs").select("*, payment_entries(*)"),
      client.from("work_orders").select("*")
    ]);

    if (profilesError || motorcyclesError || repairsError || workOrdersError) {
      throw profilesError || motorcyclesError || repairsError || workOrdersError;
    }

    const normalizedRepairs = (repairs ?? []).map((item: any) => {
      const entries = item.payment_entries ?? [];
      const paid = entries.reduce((sum: number, entry: any) => sum + Number(entry.amount ?? 0), 0);
      const remaining = Math.max(Number(item.total_cost ?? 0) - paid, 0);
      return {
        userId: item.user_id,
        remaining
      };
    });

    const services = (profiles ?? []).map((row: any) => {
      const userRepairs = normalizedRepairs.filter((item) => item.userId === row.id);
      const userWorkOrders = (workOrders ?? []).filter((item: any) => item.user_id === row.id);

      return {
        id: row.id,
        shopName: row.shop_name,
        ownerName: row.name,
        username: row.username || "",
        motorcycleCount: (motorcycles ?? []).filter((item: any) => item.user_id === row.id).length,
        activeWorkOrderCount: userWorkOrders.filter((item: any) => item.status !== "delivered").length,
        readyCount: userWorkOrders.filter((item: any) => item.status === "ready").length,
        unpaidRepairCount: userRepairs.filter((item) => item.remaining > 0).length,
        unpaidTotal: userRepairs.reduce((sum, item) => sum + item.remaining, 0),
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
        unpaidTotal: services.reduce((sum, item) => sum + item.unpaidTotal, 0)
      },
      services
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "Yönetici paneli verileri alınamadı." });
  }
}
