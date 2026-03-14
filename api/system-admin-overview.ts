import { requireAdmin } from "./_adminAuth";
import { applyApiSecurityHeaders } from "./_security";

function requireEnv(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} tanımlı değil.`);
  }
  return value;
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

function getLatestIso(values: Array<string | null | undefined>) {
  const filtered = values.filter((value): value is string => Boolean(value)).sort((a, b) => b.localeCompare(a));
  return filtered[0] ?? null;
}

export default async function handler(req: any, res: any) {
  applyApiSecurityHeaders(res, { privateResponse: true });

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const admin = await requireAdmin(req);
    if (!admin) {
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
        id: item.id,
        userId: item.user_id,
        createdAt: item.created_at,
        remaining: Math.max(Number(item.total_cost ?? 0) - paid, 0)
      };
    });

    const services = (profiles ?? []).map((row: any) => {
      const userMotorcycles = (motorcycles ?? []).filter((item: any) => item.user_id === row.id);
      const userRepairs = normalizedRepairs.filter((item: any) => item.userId === row.id);
      const userWorkOrders = (workOrders ?? []).filter((item: any) => item.user_id === row.id);
      const latestWorkOrder = [...userWorkOrders].sort((a: any, b: any) =>
        String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? ""))
      )[0];

      const qrBindings = userWorkOrders
        .filter((item: any) => item.qr_value)
        .map((item: any) => {
          const motorcycle = userMotorcycles.find((motorcycleItem: any) => motorcycleItem.id === item.motorcycle_id);
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

      const latestMotorcycles = [...userMotorcycles]
        .sort((a: any, b: any) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
        .slice(0, 3)
        .map((item: any) => ({
          id: item.id,
          licensePlate: item.license_plate,
          model: item.model ?? "Model girilmedi",
          customerName: item.customer_name ?? "",
          createdAt: item.created_at
        }));

      const customerKeys = new Set(
        userMotorcycles
          .map((item: any) => `${String(item.customer_name ?? "").trim()}|${String(item.phone ?? "").trim()}`)
          .filter((item: string) => item !== "|")
      );

      return {
        id: row.id,
        shopName: row.shop_name ?? "Servis adı girilmedi",
        ownerName: row.name ?? "Usta adı girilmedi",
        username: row.username || "",
        phone: row.phone ?? "",
        customerCount: customerKeys.size,
        motorcycleCount: userMotorcycles.length,
        activeWorkOrderCount: userWorkOrders.filter((item: any) => item.status !== "delivered").length,
        readyCount: userWorkOrders.filter((item: any) => item.status === "ready").length,
        unpaidRepairCount: userRepairs.filter((item: any) => item.remaining > 0).length,
        unpaidTotal: userRepairs.reduce((sum: number, item: any) => sum + item.remaining, 0),
        subscriptionStatus: "Aktif",
        lastActivityAt: getLatestIso([
          ...userMotorcycles.map((item: any) => item.created_at),
          ...userRepairs.map((item: any) => item.createdAt),
          ...userWorkOrders.map((item: any) => item.updated_at)
        ]),
        latestComplaint: latestWorkOrder?.complaint ?? null,
        latestWorkOrderStatus: latestWorkOrder?.status ?? null,
        latestMotorcycles,
        officialQrCount: qrBindings.length,
        officialQrBindings: qrBindings
      };
    });

    res.status(200).json({
      systemAdmin: {
        username: admin.username,
        displayName: admin.displayName
      },
      totals: {
        serviceCount: services.length,
        motorcycleCount: (motorcycles ?? []).length,
        activeWorkOrderCount: (workOrders ?? []).filter((item: any) => item.status !== "delivered").length,
        readyCount: (workOrders ?? []).filter((item: any) => item.status === "ready").length,
        unpaidTotal: services.reduce((sum: number, item: any) => sum + item.unpaidTotal, 0),
        officialQrCount: services.reduce((sum: number, item: any) => sum + item.officialQrCount, 0),
        servicesWithDebtCount: services.filter((item: any) => item.unpaidTotal > 0).length,
        servicesWithoutPhoneCount: services.filter((item: any) => !String(item.phone || "").trim()).length
      },
      services
    });
  } catch (error) {
    console.error("[system-admin-overview]", error);
    res.status(500).json({
      error: "Yönetici paneli verileri alınamadı."
    });
  }
}
