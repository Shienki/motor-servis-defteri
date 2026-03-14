import { getSupabaseServiceClient } from "./_supabase";
import { applyRateLimit, getClientIp } from "./_rateLimit";

type MotorcycleRow = {
  id: string;
  user_id: string;
  license_plate: string;
  model: string | null;
};

type WorkOrderRow = {
  id: string;
  motorcycle_id: string;
  complaint: string | null;
  status: string;
  estimated_delivery_date: string | null;
  updated_at: string;
  customer_visible_note: string | null;
};

function normalizePlate(plate: string) {
  return plate
    .toLocaleUpperCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

function defaultCustomerStatusNote(status: string | null) {
  if (status === "received") return "Motosiklet sıraya alındı.";
  if (status === "in_progress") return "Servis işlemi hazırlanıyor.";
  if (status === "ready") return "Motosiklet hazır, teslim için bilgi alabilirsiniz.";
  return "Şu an aktif iş bulunmuyor.";
}

async function fetchMotorcycleById(motorcycleId: string) {
  const client = getSupabaseServiceClient();
  const { data, error } = await client
    .from("motorcycles")
    .select("id,user_id,license_plate,model")
    .eq("id", motorcycleId)
    .maybeSingle();

  if (error) {
    throw new Error(`Motosiklet okunamadı: ${error.message}`);
  }

  return (data as MotorcycleRow | null) ?? null;
}

async function fetchMotorcycleByQr(qrValue: string) {
  const client = getSupabaseServiceClient();
  const { data, error } = await client
    .from("work_orders")
    .select("motorcycle_id")
    .eq("qr_value", qrValue)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`QR eşleşmesi okunamadı: ${error.message}`);
  }

  if (!data?.motorcycle_id) {
    return null;
  }

  return fetchMotorcycleById(data.motorcycle_id);
}

async function fetchMotorcycleByPlate(plate: string) {
  const client = getSupabaseServiceClient();
  const formattedPlate = normalizePlate(plate);
  const compactPlate = formattedPlate.replace(/\s+/g, "");

  const formattedQuery = await client
    .from("motorcycles")
    .select("id,user_id,license_plate,model")
    .eq("license_plate", formattedPlate)
    .limit(1)
    .maybeSingle();

  if (formattedQuery.error) {
    throw new Error(`Plaka sorgusu okunamadı: ${formattedQuery.error.message}`);
  }

  if (formattedQuery.data) {
    return formattedQuery.data as MotorcycleRow;
  }

  if (compactPlate !== formattedPlate) {
    const compactQuery = await client
      .from("motorcycles")
      .select("id,user_id,license_plate,model")
      .eq("license_plate", compactPlate)
      .limit(1)
      .maybeSingle();

    if (compactQuery.error) {
      throw new Error(`Plaka sorgusu okunamadı: ${compactQuery.error.message}`);
    }

    return (compactQuery.data as MotorcycleRow | null) ?? null;
  }

  return null;
}

async function findMotorcycleByTokenOrPlateOrQr(token: string, plate: string, qr: string) {
  if (token.startsWith("moto:")) {
    return fetchMotorcycleById(token.slice("moto:".length));
  }

  if (qr) {
    return fetchMotorcycleByQr(qr);
  }

  if (plate) {
    return fetchMotorcycleByPlate(plate);
  }

  return null;
}

async function fetchProfileInfo(userId: string) {
  const client = getSupabaseServiceClient();
  const withPhone = await client.from("profiles").select("shop_name,phone").eq("id", userId).limit(1).maybeSingle();

  if (!withPhone.error) {
    return withPhone.data ? { shop_name: withPhone.data.shop_name, phone: withPhone.data.phone ?? "" } : null;
  }

  const fallback = await client.from("profiles").select("shop_name").eq("id", userId).limit(1).maybeSingle();
  if (fallback.error) {
    throw new Error(`Profil bilgisi okunamadı: ${fallback.error.message}`);
  }

  return fallback.data ? { shop_name: fallback.data.shop_name, phone: "" } : null;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const ip = getClientIp(req);
  if (!applyRateLimit(res, `public-tracking:${ip}`, { windowMs: 60 * 1000, max: 90 })) {
    return;
  }

  const token = typeof req.query?.token === "string" ? req.query.token.trim() : "";
  const plate = typeof req.query?.plate === "string" ? req.query.plate.trim() : "";
  const qr = typeof req.query?.qr === "string" ? req.query.qr.trim() : "";

  if (!token && !plate && !qr) {
    res.status(400).json({ error: "Token, plaka veya QR zorunlu." });
    return;
  }

  try {
    const motorcycle = await findMotorcycleByTokenOrPlateOrQr(token, plate, qr);
    if (!motorcycle) {
      res.status(404).json({ error: "Takip kaydı bulunamadı." });
      return;
    }

    const client = getSupabaseServiceClient();
    const [workOrdersResponse, repairsResponse, profile] = await Promise.all([
      client
        .from("work_orders")
        .select("id,motorcycle_id,complaint,status,estimated_delivery_date,updated_at,customer_visible_note")
        .eq("motorcycle_id", motorcycle.id)
        .neq("status", "delivered")
        .order("updated_at", { ascending: false })
        .limit(1),
      client
        .from("repairs")
        .select("id,description,total_cost,created_at")
        .eq("motorcycle_id", motorcycle.id)
        .order("created_at", { ascending: false }),
      fetchProfileInfo(motorcycle.user_id)
    ]);

    if (workOrdersResponse.error) {
      throw new Error(`İş durumu okunamadı: ${workOrdersResponse.error.message}`);
    }

    if (repairsResponse.error) {
      throw new Error(`İşlem geçmişi okunamadı: ${repairsResponse.error.message}`);
    }

    const workOrder = ((workOrdersResponse.data ?? [])[0] as WorkOrderRow | undefined) ?? null;
    const repairs = repairsResponse.data ?? [];
    const repairIds = repairs.map((item: any) => item.id);

    const paymentEntriesResponse = repairIds.length
      ? await client.from("payment_entries").select("repair_id,amount").in("repair_id", repairIds)
      : { data: [], error: null };

    if (paymentEntriesResponse.error) {
      throw new Error(`Tahsilat bilgisi okunamadı: ${paymentEntriesResponse.error.message}`);
    }

    const paymentMap = new Map<string, number>();
    for (const payment of paymentEntriesResponse.data ?? []) {
      const current = paymentMap.get(payment.repair_id) ?? 0;
      paymentMap.set(payment.repair_id, current + Number(payment.amount ?? 0));
    }

    const normalizedRepairs = repairs.map((item: any) => {
      const paid = paymentMap.get(item.id) ?? 0;
      return {
        id: item.id,
        description: item.description,
        remaining: Math.max(Number(item.total_cost ?? 0) - paid, 0)
      };
    });

    res.status(200).json({
      shopName: profile?.shop_name ?? "Motor Servis",
      shopPhone: profile?.phone ?? "",
      motorcycle: {
        licensePlate: motorcycle.license_plate,
        model: motorcycle.model ?? "Model bilgisi girilmedi"
      },
      workOrder: workOrder
        ? {
            complaint: workOrder.complaint ?? "Servis takip süreci",
            status: workOrder.status,
            estimatedDeliveryDate: workOrder.estimated_delivery_date,
            updatedAt: workOrder.updated_at,
            customerVisibleNote: workOrder.customer_visible_note || defaultCustomerStatusNote(workOrder.status)
          }
        : null,
      customerUpdates: [],
      latestRepair: normalizedRepairs[0] ?? null,
      unpaidTotal: normalizedRepairs.reduce((sum, item) => sum + item.remaining, 0)
    });
  } catch (error: any) {
    res.status(503).json({
      error: typeof error?.message === "string" ? error.message : "Takip servisi hazır değil."
    });
  }
}
