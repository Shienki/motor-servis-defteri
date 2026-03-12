import { getSupabaseServiceClient, requireAuthenticatedUser } from "./_supabase";

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
    const { user } = await requireAuthenticatedUser(req);
    const serviceClient = getSupabaseServiceClient();

    if (isMotorcycleToken(token)) {
      const motorcycleId = token.slice("moto:".length);
      const { data: motorcycle, error } = await serviceClient
        .from("motorcycles")
        .select("id, user_id")
        .eq("id", motorcycleId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!motorcycle) {
        res.status(404).json({ error: "QR kaydı bulunamadı." });
        return;
      }

      if (user && user.id === motorcycle.user_id) {
        res.status(200).json({ path: `/motosiklet/${motorcycle.id}` });
        return;
      }

      res.status(200).json({ path: `/takip/${token}` });
      return;
    }

    const { data: workOrder, error } = await serviceClient
      .from("work_orders")
      .select("motorcycle_id, user_id, public_tracking_token")
      .eq("public_tracking_token", token)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!workOrder) {
      res.status(404).json({ error: "QR kaydı bulunamadı." });
      return;
    }

    if (user && user.id === workOrder.user_id) {
      res.status(200).json({ path: `/motosiklet/${workOrder.motorcycle_id}` });
      return;
    }

    res.status(200).json({ path: `/takip/${workOrder.public_tracking_token}` });
  } catch (error: any) {
    res.status(503).json({ error: error?.message ?? "QR servisi hazır değil." });
  }
}
