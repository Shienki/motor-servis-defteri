import { categorizeRepairTranscript } from "./_repair-ai";
import { requireAuthenticatedUser } from "./_supabase";

export const config = {
  api: {
    bodyParser: false
  }
};

function getFilenameFromMimeType(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "repair-note.m4a";
  }

  if (mimeType.includes("ogg")) {
    return "repair-note.ogg";
  }

  return "repair-note.webm";
}

function buildMultipartBody(audioBytes: Buffer, mimeType: string) {
  const boundary = `----motor-servis-${Date.now().toString(16)}`;
  const filename = getFilenameFromMimeType(mimeType);
  const chunks: Buffer[] = [];

  const pushText = (value: string) => {
    chunks.push(Buffer.from(value, "utf8"));
  };

  pushText(`--${boundary}\r\n`);
  pushText(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`);
  pushText(`Content-Type: ${mimeType || "audio/webm"}\r\n\r\n`);
  chunks.push(audioBytes);
  pushText("\r\n");

  pushText(`--${boundary}\r\n`);
  pushText('Content-Disposition: form-data; name="model"\r\n\r\n');
  pushText("whisper-1\r\n");

  pushText(`--${boundary}\r\n`);
  pushText('Content-Disposition: form-data; name="language"\r\n\r\n');
  pushText("tr\r\n");

  pushText(`--${boundary}--\r\n`);

  return {
    boundary,
    body: Buffer.concat(chunks)
  };
}

async function readRawBody(req: any) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const authenticatedUser = await requireAuthenticatedUser(req);
    if (!authenticatedUser.user) {
      res.status(401).json({ error: "Oturum gerekli." });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(503).json({ error: "OPENAI_API_KEY tanımlı değil." });
      return;
    }

    const mimeTypeHeader = req.headers["x-audio-mime-type"];
    const mimeType = Array.isArray(mimeTypeHeader)
      ? mimeTypeHeader[0]
      : typeof mimeTypeHeader === "string"
        ? mimeTypeHeader
        : "audio/webm";

    const audioBytes = await readRawBody(req);

    if (!audioBytes.length) {
      res.status(400).json({ error: "Ses verisi zorunlu." });
      return;
    }

    const { boundary, body } = buildMultipartBody(audioBytes, mimeType || "audio/webm");

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`
      },
      body
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error("Whisper transcription failed", {
        status: transcriptionResponse.status,
        mimeType,
        size: audioBytes.length,
        errorText
      });
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
    console.error("repair-voice route failed", error);
    const message = error instanceof Error ? error.message : "Ses kaydı işlenemedi.";
    res.status(502).json({ error: `Whisper route hatası: ${message || "Ses kaydı işlenemedi."}` });
  }
}
