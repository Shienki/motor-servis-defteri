import { requireAdmin } from "./_adminAuth";
import { getSupabaseServiceClient } from "./_supabase";

async function fetchTable(label: string, query: PromiseLike<any>) {
  const result = await query;
  if (result?.error) {
    throw new Error(`${label} verisi alınamadı: ${result.error.message}`);
  }
  return result?.data ?? [];
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

    const client = getSupabaseServiceClient();
    const [profiles, motorcycles, repairs, workOrders] = await Promise.all([
      fetchTable("Profil", client.from("profiles").select("*")),
      fetchTable("Motosiklet", client.from("motorcycles").select("*")),
      fetchTable("İşlem", client.from("repairs").select("*, payment_entries(*)")),
      fetchTable("İş emri", client.from("work_orders").select("*"))
    ]);

    const mappedRepairs = (repairs ?? []).map((item: any) => {
      const paymentEntries = Array.isArray(item.payment_entries) ? item.payment_entries : [];
      const paid = paymentEntries.reduce((sum: number, entry: any) => sum + Number(entry.amount ?? 0), 0);
      return {
        userId: item.user_id,
        remaining: Math.max(Number(item.total_cost ?? 0) - paid, 0)
      };
    });

    const services = (profiles ?? []).map((row: any) => {
      const userRepairs = mappedRepairs.filter((item: any) => item.userId === row.id);
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
    res.status(500).json({
      error: typeof error?.message === "string" ? error.message : "Yönetici paneli verileri alınamadı."
    });
  }
}
