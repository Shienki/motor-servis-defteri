import { supabase } from "./supabase";
import type { AiRepairDraft } from "../types";

export type VoiceRepairAnalysis = {
  transcript: string;
  draft: AiRepairDraft;
};

export async function analyzeRepairAudio(audioBlob: Blob): Promise<VoiceRepairAnalysis> {
  const formData = new FormData();
  formData.append("file", audioBlob, `repair-note.${audioBlob.type.includes("mp4") ? "m4a" : "webm"}`);

  if (!supabase) {
    throw new Error("Supabase bağlantısı hazır değil.");
  }

  const { data, error } = await supabase.functions.invoke("repair-voice", {
    body: formData
  });

  if (error) {
    if ("context" in error && error.context instanceof Response) {
      const rawText = await error.context.text();
      let errorMessage = "";

      try {
        const parsed = JSON.parse(rawText) as { error?: string };
        errorMessage = parsed.error ?? "";
      } catch {
        errorMessage = rawText;
      }

      throw new Error(errorMessage || error.message || "Ses kaydı işlenemedi.");
    }

    throw new Error(error.message || "Ses kaydı işlenemedi.");
  }

  const parsed = data as {
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
