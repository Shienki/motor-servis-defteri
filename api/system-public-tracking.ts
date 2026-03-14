type MotorcycleRow = {
  id: string;
  user_id: string;
  license_plate: string;
  model: string | null;
};

type WorkOrderRow = {
  complaint: string | null;
  status: string;
  estimated_delivery_date: string | null;
  updated_at: string;
  customer_visible_note: string | null;
};

function requireEnv(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} tanımlı değil.`);
  }
  return value;
}

function getClientIp(req: any) {
  const forwarded = String(req?.headers?.["x-forwarded-for"] || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)[0];

  return (
    forwarded ||
    String(req?.headers?.["x-real-ip"] || "").trim() ||
    String(req?.socket?.remoteAddress || "").trim() ||
    "unknown"
  );
}

const buckets = new Map<string, { count: number; resetAt: number }>();

function applyRateLimit(res: any, key: string, windowMs: number, max: number) {
  const now = Date.now();

  for (const [bucketKey, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(bucketKey);
    }
  }

  const current = buckets.get(key);
  const bucket =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

  bucket.count += 1;
  buckets.set(key, bucket);

  res.setHeader("X-RateLimit-Limit", String(max));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(max - bucket.count, 0)));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > max) {
    res.status(429).json({ error: "Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar dene." });
    return false;
  }

  return true;
}

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

async function fetchMotorcycleById(motorcycleId: string) {
  const rows = await requestJson(`motorcycles?id=eq.${encodeURIComponent(motorcycleId)}&select=id,user_id,license_plate,model&limit=1`);
  return (rows?.[0] as MotorcycleRow | undefined) ?? null;
}

async function fetchMotorcycleByQr(qrValue: string) {
  const workOrders = await requestJson(
    `work_orders?qr_value=eq.${encodeURIComponent(qrValue)}&select=motorcycle_id&order=updated_at.desc&limit=1`
  );
  const motorcycleId = workOrders?.[0]?.motorcycle_id;
  if (!motorcycleId) {
    return null;
  }
  return fetchMotorcycleById(motorcycleId);
}

async function fetchMotorcycleByPlate(plate: string) {
  const formattedPlate = normalizePlate(plate);
  const compactPlate = formattedPlate.replace(/\s+/g, "");

  const formattedRows = await requestJson(
    `motorcycles?license_plate=eq.${encodeURIComponent(formattedPlate)}&select=id,user_id,license_plate,model&limit=1`
  );
  if (formattedRows?.[0]) {
    return formattedRows[0] as MotorcycleRow;
  }

  if (compactPlate !== formattedPlate) {
    const compactRows = await requestJson(
      `motorcycles?license_plate=eq.${encodeURIComponent(compactPlate)}&select=id,user_id,license_plate,model&limit=1`
    );
    if (compactRows?.[0]) {
      return compactRows[0] as MotorcycleRow;
    }
  }

  return null;
}

async function fetchProfileInfo(userId: string) {
  try {
    const rows = await requestJson(`profiles?id=eq.${encodeURIComponent(userId)}&select=shop_name,phone&limit=1`);
    return rows?.[0] ? { shop_name: rows[0].shop_name, phone: rows[0].phone ?? "" } : null;
  } catch {
    const rows = await requestJson(`profiles?id=eq.${encodeURIComponent(userId)}&select=shop_name&limit=1`);
    return rows?.[0] ? { shop_name: rows[0].shop_name, phone: "" } : null;
  }
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

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const ip = getClientIp(req);
  if (!applyRateLimit(res, `system-public-tracking:${ip}`, 60 * 1000, 90)) {
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

    const [workOrders, repairs, profile] = await Promise.all([
      requestJson(
        `work_orders?motorcycle_id=eq.${encodeURIComponent(
          motorcycle.id
        )}&status=neq.delivered&select=complaint,status,estimated_delivery_date,updated_at,customer_visible_note&order=updated_at.desc&limit=1`
      ),
      requestJson(
        `repairs?motorcycle_id=eq.${encodeURIComponent(motorcycle.id)}&select=id,description,total_cost,created_at&order=created_at.desc`
      ),
      fetchProfileInfo(motorcycle.user_id)
    ]);

    const workOrder = (workOrders?.[0] as WorkOrderRow | undefined) ?? null;
    const repairIds = (repairs ?? []).map((item: any) => item.id);
    const paymentEntries = repairIds.length
      ? await requestJson(`payment_entries?repair_id=in.(${repairIds.map(encodeURIComponent).join(",")})&select=repair_id,amount`)
      : [];

    const paymentMap = new Map<string, number>();
    for (const payment of paymentEntries ?? []) {
      const current = paymentMap.get(payment.repair_id) ?? 0;
      paymentMap.set(payment.repair_id, current + Number(payment.amount ?? 0));
    }

    const normalizedRepairs = (repairs ?? []).map((item: any) => {
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
      unpaidTotal: normalizedRepairs.reduce((sum: number, item: any) => sum + item.remaining, 0)
    });
  } catch (error: any) {
    res.status(503).json({
      error: typeof error?.message === "string" ? error.message : "Takip servisi hazır değil."
    });
  }
}
