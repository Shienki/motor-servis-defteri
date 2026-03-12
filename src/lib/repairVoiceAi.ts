import { getAccessToken } from "./supabase";
import type { AiRepairDraft } from "../types";

export type VoiceRepairAnalysis = {
  transcript: string;
  draft: AiRepairDraft;
};

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export async function analyzeRepairAudio(audioBlob: Blob): Promise<VoiceRepairAnalysis> {
  const authToken = await getAccessToken();
  const audioBuffer = await audioBlob.arrayBuffer();
  const audioBase64 = arrayBufferToBase64(audioBuffer);

  const response = await fetch("/api/repair-voice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken
        ? {
            Authorization: `Bearer ${authToken}`
          }
        : {})
    },
    body: JSON.stringify({
      audio: audioBase64,
      mimeType: audioBlob.type || "audio/webm"
    })
  });

  if (!response.ok) {
    const rawText = await response.text();
    let errorMessage = "";

    try {
      const data = JSON.parse(rawText) as { error?: string };
      errorMessage = data.error ?? "";
    } catch {
      errorMessage = rawText;
    }

    throw new Error(errorMessage || `Ses kaydı işlenemedi. Durum kodu: ${response.status}`);
  }

  const parsed = (await response.json()) as {
    transcript: string;
    description?: string;
    labor_cost?: number | null;
    parts_cost?: number | null;
    kilometer?: number | null;
    payment_status?: "paid" | "unpaid" | "partial" | null;
    notes?: string;
    assistant_summary?: string;
  };

  return {
    transcript: parsed.transcript ?? "",
    draft: {
      description: parsed.description ?? "",
      laborCost: parsed.labor_cost ?? null,
      partsCost: parsed.parts_cost ?? null,
      kilometer: parsed.kilometer ?? null,
      paymentStatus: parsed.payment_status ?? null,
      notes: parsed.notes ?? "",
      assistantSummary: parsed.assistant_summary ?? ""
    }
  };
}
