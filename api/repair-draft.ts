import { categorizeRepairTranscript } from "./_repair-ai";
import { applyRateLimit, getClientIp } from "./_rateLimit";
import { requireAuthenticatedUser } from "./_supabase";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authenticatedUser = await requireAuthenticatedUser(req);
  if (!authenticatedUser.user) {
    res.status(401).json({ error: "Oturum gerekli." });
    return;
  }

  const ip = getClientIp(req);
  if (
    !applyRateLimit(res, `repair-draft:${ip}:${authenticatedUser.user.id}`, {
      windowMs: 5 * 60 * 1000,
      max: 20
    })
  ) {
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({ error: "OPENAI_API_KEY tanımlı değil." });
    return;
  }

  const transcript = typeof req.body?.transcript === "string" ? req.body.transcript.trim() : "";
  if (!transcript) {
    res.status(400).json({ error: "Transcript zorunlu." });
    return;
  }

  try {
    const parsed = await categorizeRepairTranscript(transcript, process.env.OPENAI_API_KEY);
    res.status(200).json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI işlenemedi.";
    res.status(502).json({ error: message });
  }
}
