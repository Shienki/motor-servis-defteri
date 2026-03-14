import { getSupabaseServiceClient } from "./_supabase";

type WorkOrderRow = {
  id: string;
  motorcycle_id: string;
  complaint: string;
  status: string;
  estimated_delivery_date: string | null;
  updated_at: string;
  customer_visible_note: string | null;
};

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} tanımlı değil.`);
  }
  return value;
}

function serviceHeaders() {
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json"
  };
}

function restUrl(path: string) {
  return `${getEnv("VITE_SUPABASE_URL")}/rest/v1/${path}`;
}

async function fetchRest(path: string) {
  const response = await fetch(restUrl(path), { headers: serviceHeaders() });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

async function fetchOptionalRest(path: string) {
  const response = await fetch(restUrl(path), { headers: serviceHeaders() });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function fetchAuthUser(userId: string) {
  try {
    const client = getSupabaseServiceClient();
    const { data, error } = await client.auth.admin.getUserById(userId);
    if (error || !data.user) {
      return null;
    }
    return data.user;
  } catch {
    return null;
  }
}

function defaultCustomerStatusNote(status: string | null) {
  if (status === "received") return "Motosiklet sıraya alındı.";
  if (status === "in_progress") return "Servis işlemi hazırlanıyor.";
  if (status === "ready") return "Motosiklet hazır, teslim için bilgi alabilirsiniz.";
  return "Şu an aktif iş bulunmuyor.";
}

function normalizePlate(plate: string) {
  return plate
    .toLocaleUpperCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

async function findMotorcycleByTokenOrPlateOrQr(token: string, plate: string, qr: string) {
  if (token.startsWith("moto:")) {
    const motorcycleId = token.slice("moto:".length);
    const motorcycles = await fetchRest(`motorcycles?id=eq.${encodeURIComponent(motorcycleId)}&select=*`);
    return motorcycles[0] ?? null;
  }

  if (qr) {
    const workOrders = await fetchRest(
      `work_orders?qr_value=eq.${encodeURIComponent(qr)}&select=motorcycle_id&order=updated_at.desc&limit=1`
    );
    const motorcycleId = workOrders?.[0]?.motorcycle_id;
    if (motorcycleId) {
      const motorcycles = await fetchRest(`motorcycles?id=eq.${encodeURIComponent(motorcycleId)}&select=*`);
      return motorcycles[0] ?? null;
    }
  }

  if (plate) {
    const formattedPlate = normalizePlate(plate);
    const compactPlate = formattedPlate.replace(/\s+/g, "");
    const motorcycles = await fetchRest(
      `motorcycles?select=*&or=(license_plate.eq.${encodeURIComponent(formattedPlate)},license_plate.eq.${encodeURIComponent(compactPlate)})&limit=1`
    );
    return motorcycles[0] ?? null;
  }

  return null;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
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

    const [workOrders, repairRows, profileRows, authUser] = await Promise.all([
      fetchRest(
        `work_orders?motorcycle_id=eq.${encodeURIComponent(
          motorcycle.id
        )}&status=neq.delivered&select=id,motorcycle_id,complaint,status,estimated_delivery_date,updated_at,customer_visible_note&order=updated_at.desc`
      ),
      fetchRest(`repairs?motorcycle_id=eq.${encodeURIComponent(motorcycle.id)}&select=*&order=created_at.desc`),
      fetchOptionalRest(`profiles?id=eq.${encodeURIComponent(motorcycle.user_id)}&select=shop_name,phone&limit=1`),
      fetchAuthUser(motorcycle.user_id)
    ]);

    const workOrder: WorkOrderRow | null = workOrders[0] ?? null;
    const repairIds = (repairRows ?? []).map((item: any) => item.id);
    const paymentRows = repairIds.length
      ? await fetchRest(`payment_entries?repair_id=in.(${repairIds.map(encodeURIComponent).join(",")})&select=*`)
      : [];

    const paymentMap = new Map<string, any[]>();
    for (const payment of paymentRows ?? []) {
      const list = paymentMap.get(payment.repair_id) ?? [];
      list.push(payment);
      paymentMap.set(payment.repair_id, list);
    }

    const normalizedRepairs = (repairRows ?? []).map((item: any) => {
      const payments = paymentMap.get(item.id) ?? [];
      const paid = payments.reduce((sum: number, entry: any) => sum + Number(entry.amount ?? 0), 0);
      return {
        id: item.id,
        description: item.description,
        remaining: Math.max(Number(item.total_cost ?? 0) - paid, 0)
      };
    });

    res.status(200).json({
      shopName: profileRows?.[0]?.shop_name ?? "Motor Servis",
      shopPhone: profileRows?.[0]?.phone ?? authUser?.user_metadata?.phone ?? "",
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
            customerVisibleNote: workOrder.customer_visible_note || defaultCustomerStatusNote(workOrder.status)
          }
        : null,
      customerUpdates: [],
      latestRepair: normalizedRepairs[0] ?? null,
      unpaidTotal: normalizedRepairs.reduce((sum: number, item: any) => sum + item.remaining, 0)
    });
  } catch (error: any) {
    res.status(503).json({ error: error?.message ?? "Takip servisi hazır değil." });
  }
}
