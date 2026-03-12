import { supabase } from "./supabase";
import type { AiRepairDraft } from "../types";

export type VoiceRepairAnalysis = {
  transcript: string;
  draft: AiRepairDraft;
};

type ErrorContextLike = {
  status?: number;
  text?: () => Promise<string>;
};

export async function analyzeRepairAudio(audioBlob: Blob): Promise<VoiceRepairAnalysis> {
  const formData = new FormData();
  formData.append("file", audioBlob, `repair-note.${audioBlob.type.includes("mp4") ? "m4a" : "webm"}`);

  if (!supabase) {
    throw new Error("Supabase baglantisi hazir degil.");
  }

  const { data, error } = await supabase.functions.invoke("repair-voice", {
    body: formData
  });

  if (error) {
    const context = ("context" in error ? (error.context as ErrorContextLike | undefined) : undefined);

    if (context && typeof context.text === "function") {
      const rawText = await context.text();
      let errorMessage = "";

      try {
        const parsed = JSON.parse(rawText) as { error?: string };
        errorMessage = parsed.error ?? "";
      } catch {
        errorMessage = rawText;
      }

      const prefix = context.status ? `Durum kodu ${context.status}. ` : "";
      throw new Error(prefix + (errorMessage || error.message || "Ses kaydi islenemedi."));
    }

    throw new Error(error.message || "Ses kaydi islenemedi.");
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
