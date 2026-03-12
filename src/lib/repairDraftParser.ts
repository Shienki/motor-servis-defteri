import type { AiRepairDraft, PaymentStatus } from "../types";

function clampText(value: unknown, max = 250) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, max);
}

function toAscii(value: string) {
  return value
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "G")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "O")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "U");
}

function parseTurkishNumber(rawValue: string) {
  const sanitized = rawValue.replace(/[^\d.,]/g, "").trim().replace(/[.,]+$/g, "");
  if (!sanitized) return null;

  let normalized = sanitized;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/,/g, "");
  } else if (normalized.includes(",") && !normalized.includes(".")) {
    normalized = normalized.replace(",", ".");
  } else if (/^\d+\.\d{3}(?:\.\d{3})*$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

export function normalizeTranscriptForExtraction(transcript: string) {
  return toAscii(transcript)
    .toLocaleLowerCase("tr-TR")
    .replace(/\bbabalar\b/gu, "bagalar")
    .replace(/\bbakanlar\b/gu, "bagalar")
    .replace(/\bbakan\b/gu, "baga")
    .replace(/\bbaba\b/gu, "baga")
    .replace(/\bbagan\b/gu, "baga")
    .replace(/\bkese\b/gu, "kece")
    .replace(/\bvurc\b/gu, "burc")
    .replace(/\bburca\b/gu, "burc")
    .replace(/\bfurca\b/gu, "furc")
    .replace(
      /((?:iscilik|yedek\s*parca|parca|kilometre|kilometer|km)(?:\s+ucreti|\s+tutari)?)\s*[.:;=-]+\s*(\d)/gu,
      "$1 $2"
    )
    .replace(/\b(\d{1,3}(?:\.\d{3})+(?:,\d+)?)\b/gu, (_, value: string) => value.replace(/\./g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function extractNumberByPatterns(transcript: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    const candidate = match?.[1] ?? match?.[2];
    if (!candidate) continue;
    const parsed = parseTurkishNumber(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function extractLabeledAmount(transcript: string, labels: string[]) {
  const source = normalizeTranscriptForExtraction(transcript);
  const alternation = labels.join("|");
  return extractNumberByPatterns(source, [
    new RegExp(`(?:${alternation})(?:\\s+ucreti|\\s+tutari)?\\s*(?:[:=-]\\s*)?(\\d[\\d.,]*)`, "i"),
    new RegExp(`(?:${alternation})\\s+(?:da|de|tuttu|oldu)\\s+(\\d[\\d.,]*)`, "i"),
    new RegExp(`(\\d[\\d.,]*)\\s*(?:tl)?\\s+(?:${alternation})\\b`, "i")
  ]);
}

function extractKilometerValue(transcript: string) {
  const source = normalizeTranscriptForExtraction(transcript);
  const afterLabel = source.match(/(?:kilometre|kilometer|km)(?:\s*(?:de|deki))?([\s:=.,;-]*\d[\d.,\s]*)/i)?.[1] ?? "";
  const numericMatches = afterLabel.match(/\d[\d.,]*/g) ?? [];

  for (const candidate of numericMatches) {
    const parsed = parseTurkishNumber(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return extractNumberByPatterns(source, [/(\d[\d.,]*)\s*(?:km|kilometre|kilometer)\b/i]);
}

function stripStructuredFieldsFromDescription(value: string) {
  return value
    .replace(/\b(?:iscilik)(?:\s+(?:ucreti|tutari))?(?:\s*[:=.,;-]\s*)*\d[\d.,]*\s*(?:tl)?/gu, " ")
    .replace(/\b\d[\d.,]*\s*(?:tl)?\s+iscilik\b/gu, " ")
    .replace(/\b(?:iscilik)(?:\s+(?:ucreti|tutari))\b/gu, " ")
    .replace(/\biscilik\b/gu, " ")
    .replace(/\b(?:yedek\s*parca|parca)(?:\s+(?:ucreti|tutari))?(?:\s*[:=.,;-]\s*)*\d[\d.,]*\s*(?:tl)?/gu, " ")
    .replace(/\b\d[\d.,]*\s*(?:tl)?\s+(?:yedek\s*parca|parca)\b/gu, " ")
    .replace(/\b(?:yedek\s*parca|parca)(?:\s+(?:ucreti|tutari))\b/gu, " ")
    .replace(/\b(?:yedek\s*parca|parca)\b/gu, " ")
    .replace(/\b(?:kilometre|kilometer|km)\b(?:\s*(?:de|deki))?(?:\s*[:=.,;-]\s*)*\d[\d.,]*/gu, " ")
    .replace(/\d[\d.,]*\s*(?:km|kilometre|kilometer)\b/gu, " ")
    .replace(/\b(?:kilometre|kilometer|km)\b/gu, " ")
    .replace(/\b(?:odeme)\s+durumu\b\s*(?:paid|unpaid|partial|odendi|odenmedi|kismi)?/gu, " ")
    .replace(/\b(?:paid|unpaid|partial)\b/gu, " ")
    .replace(/\b(?:pesin alindi|kalan haftaya|gelecek hafta.*|haftaya.*|tekrar bakilacak.*|odemenin yarisi alindi)\b/gu, " ")
    .replace(/\b\d[\d.,]*\b/gu, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,+/g, ",")
    .replace(/^,\s*|\s*,\s*$|^,\s*,/g, "")
    .trim();
}

function cleanStructuredDescription(value: string) {
  const sanitized = clampText(value, 220)
    .replace(/bagalar degisti/gi, "bagalar degisti")
    .replace(/baga degisti/gi, "baga degisti")
    .replace(/debriyaj balatasi/gi, "debriyaj balatasi")
    .replace(/\b0{2,}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/,+/g, ",")
    .replace(/^,\s*|\s*,\s*$/g, "")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();

  if (!sanitized) {
    return "";
  }

  if (!/[a-z]/i.test(sanitized)) {
    return "";
  }

  return sanitized;
}

export function buildAssistantSummary(draft: AiRepairDraft) {
  const summaryParts = [
    draft.description ? `Islem: ${draft.description}` : null,
    draft.laborCost !== null ? `Iscilik: ${draft.laborCost} TL` : null,
    draft.partsCost !== null ? `Parca: ${draft.partsCost} TL` : null,
    draft.kilometer !== null ? `Kilometre: ${draft.kilometer}` : null,
    draft.paymentStatus ? `Odeme durumu: ${draft.paymentStatus}` : null,
    draft.paidAmount !== null ? `Alinan odeme: ${draft.paidAmount} TL` : null,
    draft.notes ? `Not: ${draft.notes}` : null
  ].filter(Boolean);

  return summaryParts.length
    ? `Su sekilde kaydedilecek: ${summaryParts.join(". ")}.`
    : "AI net ayrisim yapamadi. Metni kontrol et.";
}

function inferPaymentStatus(transcript: string): PaymentStatus | null {
  const lower = normalizeTranscriptForExtraction(transcript);

  if (/(yarisi|yarim|kismi|pesin|kapora|kalan)/i.test(lower)) return "partial";
  if (/(odendi|odedi|hesap kapandi|tamamlandi)/i.test(lower)) return "paid";
  if (/(odenmedi|veresiye|sonra alinacak|haftaya alinacak|para sonra)/i.test(lower)) return "unpaid";

  return null;
}

export function buildLocalRepairDraft(transcript: string): AiRepairDraft {
  const cleaned = normalizeTranscriptForExtraction(transcript);
  const segments = cleaned
    .split(/[.!?;,]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const laborCost = extractLabeledAmount(cleaned, ["iscilik"]);
  const partsCost = extractLabeledAmount(cleaned, ["yedek\\s*parca", "parca"]);
  const kilometer = extractKilometerValue(cleaned);
  const paymentStatus = inferPaymentStatus(cleaned) ?? (/(yarisi|yarim|kismi|pesin|kapora|kalan)/i.test(cleaned) ? "partial" : null);
  const hasPaymentPhrase = /(odeme|odendi|odedi|odenmedi|pesin|kalan|yarisi|yarim|veresiye|para sonra)/i.test(cleaned);

  const noteSegments = segments.filter((segment) =>
    /(haftaya|sonra|tekrar|gelecek|kontrol edilecek|bakilacak|degisecek|aranacak|haber verilecek|kalan)/i.test(segment)
  );
  const descriptionSegments = segments
    .map((segment) => stripStructuredFieldsFromDescription(segment))
    .filter((segment) => Boolean(segment) && /(degisti|yapildi|takildi|kontrol edildi|temizlendi|ayarlandi|degisen)/i.test(segment));

  const draft: AiRepairDraft = {
    description: cleanStructuredDescription(descriptionSegments.join(". ")),
    laborCost,
    partsCost,
    kilometer,
    paymentStatus,
    paidAmount: null,
    notes: clampText(noteSegments.join(". "), 500),
    assistantSummary: ""
  };

  if (hasPaymentPhrase && draft.laborCost === null && draft.partsCost === null) {
    draft.laborCost = 0;
    draft.partsCost = 0;
  }

  if (paymentStatus === "partial" && /(yarisi|yarim)/i.test(cleaned)) {
    const total = (draft.laborCost ?? 0) + (draft.partsCost ?? 0);
    if (total > 0) {
      draft.paidAmount = Math.round(total / 2);
    }
    draft.notes = draft.notes ? clampText(`${draft.notes}. toplam odemenin yarisi alindi.`, 500) : "toplam odemenin yarisi alindi.";
  }

  const explicitPaidAmount = extractNumberByPatterns(cleaned, [
    /(\d[\d.,]*)\s*(?:tl)?\s*(?:pesin)\s*(?:alindi|verdiler)/i,
    /(\d[\d.,]*)\s*(?:tl)?\s*(?:kapora)\s*(?:alindi|verdiler|verdi)/i,
    /(\d[\d.,]*)\s*(?:tl)?\s*(?:alindi|verdiler|verdi)/i
  ]);
  if (draft.paymentStatus === "partial" && explicitPaidAmount !== null) {
    draft.paidAmount = explicitPaidAmount;
  }

  draft.assistantSummary = buildAssistantSummary(draft);
  return draft;
}
