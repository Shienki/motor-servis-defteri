import { requireAdmin } from "./_adminAuth";

function getEnv(name: string) {
  const value = String(process.env[name] || "").trim();
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
  const response = await fetch(restUrl(path), {
    headers: serviceHeaders()
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`REST ${response.status}: ${body}`);
  }

  return response.json();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const adminSession = requireAdmin(req);
    if (!adminSession) {
      res.status(401).json({ error: "Yönetici oturumu bulunamadı." });
      return;
    }

    const [profileRows, motorcycleRows, repairRows, workOrderRows, paymentRows] = await Promise.all([
      fetchRest("profiles?select=*"),
      fetchRest("motorcycles?select=*"),
      fetchRest("repairs?select=*"),
      fetchRest("work_orders?select=*"),
      fetchRest("payment_entries?select=*")
    ]);

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

    const services = (profileRows ?? []).map((row: any) => {
      const userRepairs = normalizedRepairs.filter((item: any) => item.userId === row.id);
      const userWorkOrders = (workOrderRows ?? []).filter((item: any) => item.user_id === row.id);
      const qrBindings = userWorkOrders
        .filter((item: any) => item.qr_value)
        .map((item: any) => {
          const motorcycle = (motorcycleRows ?? []).find(
            (motorcycleItem: any) => motorcycleItem.id === item.motorcycle_id
          );
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
        motorcycleCount: (motorcycleRows ?? []).filter((item: any) => item.user_id === row.id).length,
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
      systemAdmin: adminSession,
      totals: {
        serviceCount: services.length,
        motorcycleCount: (motorcycleRows ?? []).length,
        activeWorkOrderCount: (workOrderRows ?? []).filter((item: any) => item.status !== "delivered").length,
        readyCount: (workOrderRows ?? []).filter((item: any) => item.status === "ready").length,
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
