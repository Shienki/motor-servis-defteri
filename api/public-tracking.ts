import { getSupabaseServiceClient } from "./_supabase";

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
    const client = getSupabaseServiceClient();
    let motorcycle: any = null;
    let workOrder: any = null;

    if (isMotorcycleToken(token)) {
      const motorcycleId = token.slice("moto:".length);
      const [{ data: motorcycleRow, error: motorcycleError }, { data: workOrders, error: workOrdersError }] =
        await Promise.all([
          client.from("motorcycles").select("*").eq("id", motorcycleId).maybeSingle(),
          client
            .from("work_orders")
            .select("*, motorcycles(*), work_order_updates(*)")
            .eq("motorcycle_id", motorcycleId)
            .neq("status", "delivered")
            .order("updated_at", { ascending: false })
        ]);

      if (motorcycleError) {
        throw motorcycleError;
      }

      if (workOrdersError) {
        throw workOrdersError;
      }

      motorcycle = motorcycleRow;
      workOrder = (workOrders ?? [])[0] ?? null;
    } else {
      const { data: workOrderRow, error: workOrderError } = await client
        .from("work_orders")
        .select("*, motorcycles(*), work_order_updates(*)")
        .eq("public_tracking_token", token)
        .maybeSingle();

      if (workOrderError) {
        throw workOrderError;
      }

      workOrder = workOrderRow;
      motorcycle = workOrderRow?.motorcycles ?? null;
    }

    if (!motorcycle) {
      res.status(404).json({ error: "Takip kaydı bulunamadı." });
      return;
    }

    const [{ data: profile }, { data: repairs }] = await Promise.all([
      client.from("profiles").select("shop_name").eq("id", motorcycle.user_id).maybeSingle(),
      client
        .from("repairs")
        .select("*, payment_entries(*)")
        .eq("motorcycle_id", motorcycle.id)
        .order("created_at", { ascending: false })
    ]);

    const normalizedRepairs = (repairs ?? []).map((item: any) => {
      const paid = Array.isArray(item.payment_entries)
        ? item.payment_entries.reduce((sum: number, entry: any) => sum + Number(entry.amount ?? 0), 0)
        : 0;

      return {
        id: item.id,
        description: item.description,
        paymentStatus: Math.max(Number(item.total_cost ?? 0) - paid, 0) === 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
        remaining: Math.max(Number(item.total_cost ?? 0) - paid, 0)
      };
    });

    const customerUpdates = Array.isArray(workOrder?.work_order_updates)
      ? workOrder.work_order_updates
          .filter((item: any) => item.visible_to_customer)
          .map((item: any) => ({
            id: item.id,
            message: item.message,
            createdAt: item.created_at
          }))
      : [];

    res.status(200).json({
      shopName: profile?.shop_name ?? "Motor Servis",
      shopPhone: "",
      motorcycle: {
        licensePlate: motorcycle.license_plate,
        model: motorcycle.model
      },
      workOrder: workOrder
        ? {
            complaint: workOrder.complaint,
            status: workOrder.status,
            estimatedDeliveryDate: workOrder.estimated_delivery_date,
            updatedAt: workOrder.updated_at,
            customerVisibleNote: workOrder.customer_visible_note
          }
        : null,
      customerUpdates,
      latestRepair: normalizedRepairs[0] ?? null,
      unpaidTotal: normalizedRepairs.reduce((sum: number, item: any) => sum + item.remaining, 0)
    });
  } catch (error: any) {
    res.status(503).json({ error: error?.message ?? "Takip servisi hazır değil." });
  }
}
