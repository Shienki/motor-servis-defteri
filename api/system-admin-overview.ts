const COOKIE_NAME = "msd_admin_session";

function requireEnv(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} tanımlı değil.`);
  }
  return value;
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

function getAdminSession() {
  const username = requireEnv("ADMIN_USERNAME").toLowerCase();
  const sessionSecret = requireEnv("ADMIN_SESSION_SECRET");
  return {
    username,
    token: `admin:${sessionSecret}`
  };
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
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const admin = getAdminSession();
    const token = readAdminToken(req);

    if (!token || token !== admin.token) {
      res.status(401).json({ error: "Yönetici oturumu bulunamadı." });
      return;
    }

    const [profiles, motorcycles, repairs, workOrders, paymentEntries] = await Promise.all([
      requestJson("profiles?select=*"),
      requestJson("motorcycles?select=*"),
      requestJson("repairs?select=*"),
      requestJson("work_orders?select=*"),
      requestJson("payment_entries?select=*")
    ]);

    const paymentMap = new Map<string, any[]>();
    for (const payment of paymentEntries ?? []) {
      const list = paymentMap.get(payment.repair_id) ?? [];
      list.push(payment);
      paymentMap.set(payment.repair_id, list);
    }

    const normalizedRepairs = (repairs ?? []).map((item: any) => {
      const entries = paymentMap.get(item.id) ?? [];
      const paid = entries.reduce((sum: number, entry: any) => sum + Number(entry.amount ?? 0), 0);
      return {
        userId: item.user_id,
        remaining: Math.max(Number(item.total_cost ?? 0) - paid, 0)
      };
    });

    const services = (profiles ?? []).map((row: any) => {
      const userRepairs = normalizedRepairs.filter((item: any) => item.userId === row.id);
      const userWorkOrders = (workOrders ?? []).filter((item: any) => item.user_id === row.id);
      const qrBindings = userWorkOrders
        .filter((item: any) => item.qr_value)
        .map((item: any) => {
          const motorcycle = (motorcycles ?? []).find((motorcycleItem: any) => motorcycleItem.id === item.motorcycle_id);
          return {
            workOrderId: item.id,
            motorcycleId: item.motorcycle_id,
            licensePlate: motorcycle?.license_plate ?? "Bilinmeyen plaka",
            model: motorcycle?.model ?? "Motosiklet kaydı",
            qrValue: item.qr_value,
            updatedAt: item.updated_at
          };
        })
        .sort((a: any, b: any) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

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
        subscriptionStatus: "Aktif",
        officialQrCount: qrBindings.length,
        officialQrBindings: qrBindings
      };
    });

    res.status(200).json({
      systemAdmin: {
        username: admin.username,
        displayName: admin.username
      },
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
    res.status(500).json({
      error: typeof error?.message === "string" ? error.message : "Yönetici paneli verileri alınamadı."
    });
  }
}
