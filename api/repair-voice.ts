import { categorizeRepairTranscript } from "./_repair-ai";
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

  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({ error: "OPENAI_API_KEY tanımlı değil." });
    return;
  }

  const audioBase64 = typeof req.body?.audio === "string" ? req.body.audio : "";
  const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType : "audio/webm";

  if (!audioBase64) {
    res.status(400).json({ error: "Ses verisi zorunlu." });
    return;
  }

  try {
    const audioBytes = Buffer.from(audioBase64, "base64");
    const audioFile = new File([audioBytes], "repair-note.webm", { type: mimeType });
    const transcriptionForm = new FormData();
    transcriptionForm.append("file", audioFile);
    transcriptionForm.append("model", "whisper-1");
    transcriptionForm.append("language", "tr");

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: transcriptionForm
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      res.status(transcriptionResponse.status).json({ error: errorText || "Whisper işlenemedi." });
      return;
    }

    const transcriptionData = (await transcriptionResponse.json()) as { text?: string };
    const transcript = transcriptionData.text?.trim() ?? "";

    if (!transcript) {
      res.status(422).json({ error: "Ses kaydı çözülemedi." });
      return;
    }

    const parsed = await categorizeRepairTranscript(transcript, process.env.OPENAI_API_KEY);
    res.status(200).json({
      transcript,
      ...parsed
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ses kaydı işlenemedi.";
    res.status(502).json({ error: message });
  }
}
