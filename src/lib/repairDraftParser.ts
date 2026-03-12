import type { AiRepairDraft, PaymentStatus } from "../types";

function clampText(value: unknown, max = 250) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, max);
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
  } else if (/^\d+\.\d{3}$/.test(normalized) || /^\d+\.\d{3}\.\d{3}$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

export function normalizeTranscriptForExtraction(transcript: string) {
  return transcript
    .replace(/\bbabalar\b/giu, "bagalar")
    .replace(/\bbakanlar\b/giu, "bagalar")
    .replace(/\bbakan\b/giu, "baga")
    .replace(/\bbaba\b/giu, "baga")
    .replace(/\bbagan\b/giu, "baga")
    .replace(/\bkese\b/giu, "kece")
    .replace(/\bvurc\b/giu, "burc")
    .replace(/\bburca\b/giu, "burc")
    .replace(/\bfurca\b/giu, "furc")
    .replace(
      /((?:iscilik|işçilik|yedek\s*parca|yedek\s*parça|parca|parça|kilometre|kilometer|km)(?:\s+ucreti|\s+ücreti|\s+tutari|\s+tutarı)?)\s*[.:;=-]+\s*(\d)/giu,
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
    if (parsed !== null) return parsed;
  }

  return null;
}

function toAsciiExtractionText(transcript: string) {
  return transcript
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/iş/g, "is")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u");
}

function extractLabeledAmount(transcript: string, labels: string[]) {
  const alternation = labels.join("|");
  const segments = toAsciiExtractionText(transcript)
    .split(/[.!?;]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    if (!new RegExp(`(?:${alternation})`, "i").test(segment)) {
      continue;
    }

    const parsed = extractNumberByPatterns(segment, [
      new RegExp(`(?:${alternation})(?:\\s+ucreti|\\s+ucreti|\\s+tutari|\\s+tutari)?(?:\\s*[:=.-]\\s*)*(\\d[\\d.,]*)`, "i"),
      new RegExp(`(\\d[\\d.,]*)\\s*(?:tl\\s+)?(?:${alternation})\\b`, "i")
    ]);

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function extractKilometerValue(transcript: string) {
  const source = toAsciiExtractionText(transcript);
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
    .replace(
      /\b(?:iscilik|işçilik|iscilik)\b(?:\s+(?:ucreti|ücreti|tutari|tutarı))?(?:\s*[:=.,;-]\s*)*\d[\d.,]*\s*(?:tl)?/giu,
      " "
    )
    .replace(
      /\b(?:yedek\s*parca|yedek\s*parça|parca|parça)\b(?:\s+(?:ucreti|ücreti|tutari|tutarı))?(?:\s*[:=.,;-]\s*)*\d[\d.,]*\s*(?:tl)?/giu,
      " "
    )
    .replace(/\b(?:kilometre|kilometer|km)\b(?:\s*(?:de|deki))?(?:\s*[:=.,;-]\s*)*\d[\d.,]*/giu, " ")
    .replace(/\d[\d.,]*\s*(?:km|kilometre|kilometer)\b/giu, " ")
    .replace(/\b(?:odeme|ödeme)\s+durumu\b\s*(?:paid|unpaid|partial|ödendi|odendi|ödenmedi|odenmedi|kısmi|kismi)?/giu, " ")
    .replace(/\b(?:paid|unpaid|partial)\b/giu, " ")
    .replace(/\b\d[\d.,]*\b/gu, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanStructuredDescription(value: string) {
  const sanitized = clampText(value, 220)
    .replace(/bagalar degisti/gi, "Bagalar değişti")
    .replace(/baga degisti/gi, "Baga değişti")
    .replace(/debriyaj balatasi/gi, "Debriyaj balatası")
    .replace(/degisti/gi, "değişti")
    .replace(/yapildi/gi, "yapıldı")
    .replace(/takildi/gi, "takıldı")
    .replace(/\b0{2,}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();

  if (!sanitized) {
    return "";
  }

  if (!/[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(sanitized)) {
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
  const lower = transcript.toLocaleLowerCase("tr-TR");

  if (/(kismi|kısmi|pesin|peşin|kapora|kalan)/i.test(lower)) return "partial";
  if (/(odendi|ödendi|odedi|ödedi|hesap kapandi|hesap kapandı|tamamlandi|tamamlandı)/i.test(lower)) return "paid";
  if (/(odenmedi|ödenmedi|veresiye|sonra alinacak|sonra alınacak|haftaya alinacak|haftaya alınacak)/i.test(lower)) {
    return "unpaid";
  }

  return null;
}

export function buildLocalRepairDraft(transcript: string): AiRepairDraft {
  const cleaned = normalizeTranscriptForExtraction(transcript);
  const lower = cleaned.toLocaleLowerCase("tr-TR");
  const segments = cleaned
    .split(/[.!?;,]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const laborCost = extractLabeledAmount(cleaned, ["iscilik", "işçilik"]);
  const partsCost = extractLabeledAmount(cleaned, ["yedek\\s*parca", "yedek\\s*parça", "parca", "parça"]);
  const kilometer = extractKilometerValue(cleaned);
  const paymentStatus =
    inferPaymentStatus(cleaned) ??
    (/(yarisi|yarısı|yarim|yarım|kismi|kısmi|pesin|peşin|kapora|kalan)/i.test(lower) ? "partial" : null);
  const hasPaymentPhrase = /(odeme|ödeme|odendi|ödendi|odedi|ödedi|odenmedi|ödenmedi|pesin|peşin|kalan|yarisi|yarısı|yarim|yarım|veresiye|para sonra|para sonra)/i.test(
    lower
  );

  const noteSegments = segments.filter((segment) =>
    /(haftaya|sonra|tekrar|gelecek|kontrol edilecek|bakilacak|bakılacak|degisecek|değişecek|aranacak|haber verilecek)/i.test(
      segment
    )
  );
  const descriptionSegments = segments
    .map((segment) => stripStructuredFieldsFromDescription(segment))
    .filter(
      (segment) =>
        Boolean(segment) &&
        /(degisti|değişti|yapildi|yapıldı|takildi|takıldı|kontrol edildi|temizlendi|ayarlandi|ayarlandı|degisen|değişen)/i.test(
          segment
        )
    );

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

  if (paymentStatus === "partial" && /(yarisi|yarısı|yarim|yarım)/i.test(lower)) {
    const total = (draft.laborCost ?? 0) + (draft.partsCost ?? 0);
    if (total > 0) {
      draft.paidAmount = Math.round(total / 2);
    }
    draft.notes = draft.notes
      ? clampText(`${draft.notes}. Toplam odemenin yarisi alindi.`, 500)
      : "Toplam odemenin yarisi alindi.";
  }

  const explicitPaidAmount = extractNumberByPatterns(cleaned, [
    /(\d[\d.,]*)\s*(?:tl)?\s*(?:pesin|peşin)\s*(?:alindi|alındı)/i,
    /(\d[\d.,]*)\s*(?:tl)?\s*(?:pesin|peşin)\s*verdiler/i,
    /(\d[\d.,]*)\s*(?:tl)?\s*(?:alindi|alındı|verdiler|verdi)/i
  ]);
  if (draft.paymentStatus === "partial" && explicitPaidAmount !== null) {
    draft.paidAmount = explicitPaidAmount;
  }

  draft.assistantSummary = buildAssistantSummary(draft);
  return draft;
}
