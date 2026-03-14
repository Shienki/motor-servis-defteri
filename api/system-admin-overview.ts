import { requireAdmin } from "./_adminAuth";

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

  res.status(200).json({
    systemAdmin: adminSession,
    totals: {
      serviceCount: 0,
      motorcycleCount: 0,
      activeWorkOrderCount: 0,
      readyCount: 0,
      unpaidTotal: 0
    },
    services: []
  });
}
