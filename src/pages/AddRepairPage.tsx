import { Check, Mic, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Input, Label, Panel, SectionTitle, Textarea } from "../components/Ui";
import { formatCurrency, numbersOnly } from "../lib/format";
import { analyzeRepairTranscript, createRepairDraft, fetchMotorcycleDetail } from "../lib/mockApi";
import type { AiRepairDraft, Motorcycle, PaymentStatus } from "../types";

const repairChecklistSections = [
  {
    title: "Periyodik Bakım",
    items: ["Motor yağı değişti", "Yağ filtresi değişti", "Hava filtresi değişti", "Buji değişti", "Bakım yapıldı"]
  },
  {
    title: "Fren",
    items: ["Ön fren balatası değişti", "Arka fren balatası değişti", "Fren merkezi değişti", "Fren hidroliği değişti", "Disk kontrol edildi"]
  },
  {
    title: "Aktarma",
    items: ["Debriyaj balatası değişti", "Debriyaj seti değişti", "Varyatör seti değişti", "Kayış değişti", "Zincir ayarı yapıldı", "Zincir değişti"]
  },
  {
    title: "Ön Takım",
    items: ["Baga değişti", "Keçe değişti", "Burç değişti", "Rulman değişti", "Amortisör kontrol edildi", "Ön takım kontrol edildi"]
  },
  {
    title: "Elektrik",
    items: ["Akü değişti", "Akü şarj edildi", "Far ampulü değişti", "Konjektör değişti", "Sigorta değişti", "Marş motoru kontrol edildi"]
  },
  {
    title: "Motor",
    items: ["Subap ayarı yapıldı", "Enjektör temizlendi", "Karbüratör temizlendi", "Conta değişti", "Segman değişti"]
  },
  {
    title: "Lastik",
    items: ["Ön lastik değişti", "Arka lastik değişti", "Lastik tamiri yapıldı", "Hava basıldı"]
  }
] as const;

const refinedRepairChecklistSections = [
  {
    title: "Periyodik Bakım",
    items: ["Motor yağı değişti", "Yağ filtresi değişti", "Hava filtresi değişti", "Buji değişti", "Yağ bakımı yapıldı"]
  },
  {
    title: "Fren",
    items: ["Ön fren balatası değişti", "Arka fren balatası değişti", "Fren merkezi değişti", "Fren hidroliği değişti", "Disk değişti"]
  },
  {
    title: "Aktarma",
    items: ["Debriyaj balatası değişti", "Debriyaj seti değişti", "Varyatör seti değişti", "Kayış değişti", "Zincir değişti", "Dişli seti değişti"]
  },
  {
    title: "Süspansiyon",
    items: ["Keçe değişti", "Burç değişti", "Rulman değişti", "Amortisör değişti", "Gidon bilyası değişti"]
  },
  {
    title: "Elektrik",
    items: ["Akü değişti", "Far ampulü değişti", "Konjektör değişti", "Sigorta değişti", "Marş kömürü değişti"]
  },
  {
    title: "Motor",
    items: ["Subap ayarı yapıldı", "Enjektör temizlendi", "Karbüratör temizlendi", "Conta değişti", "Segman değişti"]
  },
  {
    title: "Lastik",
    items: ["Ön lastik değişti", "Arka lastik değişti", "Lastik tamiri yapıldı", "Sibop değişti"]
  }
] as const;

const emptyDraft: AiRepairDraft = {
  description: "",
  laborCost: null,
  partsCost: null,
  kilometer: null,
  paymentStatus: null,
  paidAmount: null,
  notes: "",
  assistantSummary: ""
};

type RecognitionEventLike = Event & {
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
    length: number;
  }>;
};

type RecognitionErrorEventLike = Event & {
  error?: string;
};

type BrowserRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserRecognitionCtor = new () => BrowserRecognition;

function normalizeRecognizedTranscript(rawValue: string) {
  return rawValue
    .replace(/\bbabalar\b/giu, "bagalar")
    .replace(/\bbakanlar\b/giu, "bagalar")
    .replace(/\bbakan\b/giu, "baga")
    .replace(/\bbaba\b/giu, "baga")
    .replace(/\bbagan\b/giu, "baga")
    .replace(/\bkese\b/giu, "kece")
    .replace(/\bvurc\b/giu, "burc")
    .replace(/\bburca\b/giu, "burc")
    .replace(/\bfurca\b/giu, "furc")
    .replace(/\s+/g, " ")
    .trim();
}

function getRecognitionCtor(): BrowserRecognitionCtor | null {
  const browserWindow = window as Window & {
    SpeechRecognition?: BrowserRecognitionCtor;
    webkitSpeechRecognition?: BrowserRecognitionCtor;
  };

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

function buildAssistantSummary(draft: AiRepairDraft) {
  const parts = [
    draft.description ? `Islem: ${draft.description}` : null,
    draft.laborCost !== null ? `Iscilik: ${draft.laborCost} TL` : null,
    draft.partsCost !== null ? `Parca: ${draft.partsCost} TL` : null,
    draft.kilometer !== null ? `Kilometre: ${draft.kilometer}` : null,
    draft.paymentStatus
      ? `Odeme durumu: ${draft.paymentStatus === "paid" ? "odendi" : draft.paymentStatus === "partial" ? "kismi" : "odenmedi"}`
      : null,
    draft.paymentStatus === "partial" && draft.paidAmount !== null ? `Alinan odeme: ${draft.paidAmount} TL` : null,
    draft.notes ? `Not: ${draft.notes}` : null
  ].filter(Boolean);

  return parts.length ? `Su sekilde kaydedilecek: ${parts.join(". ")}.` : "AI ayrisma sonucu burada gorunecek.";
}

export function AddRepairPage() {
  const navigate = useNavigate();
  const { motorcycleId = "" } = useParams();
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const transcriptRef = useRef("");
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [listening, setListening] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Mikrofona bas, usta konussun, metin olussun. Gerekirse metni duzelt, sonra AI alanlari hazirlasin."
  );
  const [heardTranscript, setHeardTranscript] = useState("");
  const [draft, setDraft] = useState<AiRepairDraft>(emptyDraft);
  const [selectedChecklistItems, setSelectedChecklistItems] = useState<string[]>([]);
  const [manualDescription, setManualDescription] = useState("");

  useEffect(() => {
    fetchMotorcycleDetail(motorcycleId).then((data) => setMotorcycle(data.motorcycle));

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // noop
      }
      recognitionRef.current = null;
    };
  }, [motorcycleId]);

  const totalCost = useMemo(() => (draft.laborCost ?? 0) + (draft.partsCost ?? 0), [draft.laborCost, draft.partsCost]);
  const combinedDescription = useMemo(() => {
    const selectedText = selectedChecklistItems.join("\n").trim();
    const freeText = manualDescription.trim();
    if (selectedText && freeText) return `${selectedText}\n${freeText}`;
    return selectedText || freeText;
  }, [manualDescription, selectedChecklistItems]);
  const assistantSummary = useMemo(
    () => draft.assistantSummary?.trim() || buildAssistantSummary({ ...draft, description: combinedDescription }),
    [combinedDescription, draft]
  );

  async function runAnalysis(rawTranscript: string) {
    const transcript = normalizeRecognizedTranscript(rawTranscript);
    transcriptRef.current = transcript;
    setHeardTranscript(transcript);

    if (!transcript) {
      setStatusMessage("AI analiz icin once bir metin olusmali.");
      return;
    }

    setAnalyzing(true);
    setStatusMessage("AI metni duzeltiyor ve alanlari hazirliyor.");

    try {
      const parsedDraft = await analyzeRepairTranscript(transcript);
      setManualDescription(parsedDraft.description ?? "");
      setDraft({
        ...parsedDraft,
        paidAmount: parsedDraft.paidAmount ?? null,
        assistantSummary: parsedDraft.assistantSummary?.trim() || buildAssistantSummary(parsedDraft)
      });
      setStatusMessage("AI kaydi hazirladi. Metni ve alanlari kontrol edip kaydedebilirsin.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI metni isleyemedi.";
      setStatusMessage(message);
    } finally {
      setAnalyzing(false);
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop();
    } catch {
      // noop
    }
  }

  function startListening() {
    const RecognitionCtor = getRecognitionCtor();
    if (!RecognitionCtor) {
      setStatusMessage("Bu tarayicida canli konusma tanima destegi yok. Chrome veya Edge ile dene.");
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = "tr-TR";
    recognition.continuous = true;
    recognition.interimResults = true;

    transcriptRef.current = "";
    setHeardTranscript("");
    setDraft(emptyDraft);
    setListening(true);
    setStatusMessage("Dinleme basladi. Bitince tekrar basa ve AI analizi baslatsin.");

    recognition.onresult = (event) => {
      let combinedTranscript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const chunk = event.results[index]?.[0]?.transcript ?? "";
        combinedTranscript += `${chunk} `;
      }

      const normalized = normalizeRecognizedTranscript(combinedTranscript);
      transcriptRef.current = normalized;
      setHeardTranscript(normalized);
    };

    recognition.onerror = (event) => {
      setListening(false);
      const reason =
        event.error === "not-allowed"
          ? "Mikrofon izni verilmedi."
          : event.error === "no-speech"
            ? "Ses algilanamadi. Daha net ve biraz daha uzun konus."
            : "Konusma algilama baslatilamadi.";
      setStatusMessage(reason);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;

      if (transcriptRef.current.trim()) {
        void runAnalysis(transcriptRef.current);
      } else {
        setStatusMessage("Konusma metne dokulemedi. Metni elle de girebilirsin.");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function handleMicButton() {
    if (listening) {
      stopListening();
      return;
    }

    startListening();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await createRepairDraft(motorcycleId, {
      ...draft,
      description: combinedDescription
    });
    setDraft(emptyDraft);
    setHeardTranscript("");
    setManualDescription("");
    setSelectedChecklistItems([]);
    transcriptRef.current = "";
    setSaving(false);
    navigate(`/motosiklet/${motorcycleId}`);
  }

  function toggleChecklistItem(item: string) {
    setSelectedChecklistItems((current) => (current.includes(item) ? current.filter((value) => value !== item) : [...current, item]));
  }

  if (!motorcycle) {
    return (
      <div className="px-4 py-5">
        <Panel>
          <SectionTitle title="Motosiklet bulunamadi" description="Yeni islem acmak icin once kayitli bir motosiklet sec." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 py-5">
      <Panel className="bg-gradient-to-br from-ink via-slate to-steel text-white">
        <SectionTitle
          eyebrow="Sesli kayit"
          title={`${motorcycle.licensePlate} icin yeni islem`}
          titleClassName="text-white"
          eyebrowClassName="text-amber-200"
          description="Usta konussun, sistem metne doksun. Gerekirse metni duzelt, sonra AI duzelterek kategorilere ayirsin."
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
          <button
            type="button"
            onClick={handleMicButton}
            disabled={analyzing}
            className={`flex min-h-56 flex-col items-center justify-center rounded-[28px] border border-white/10 px-6 py-8 text-center transition ${
              listening ? "bg-danger text-white" : "bg-white/15 text-white hover:bg-white/20"
            } ${analyzing ? "cursor-wait opacity-80" : ""}`}
          >
            <Mic size={36} />
            <p className="mt-4 text-xl font-semibold text-white">
              {listening ? "Dinlemeyi durdur" : analyzing ? "AI analiz ediyor" : "Bas ve konus"}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/92">
              Ornek: Debriyaj balatasi degisti, iscilik 1200, yedek parca 900, kilometre 22000, 500 pesin alindi.
            </p>
          </button>

          <div className="rounded-[28px] border border-white/10 bg-white/15 p-5">
            <div className="flex items-center gap-2 text-white">
              <Sparkles size={18} className="text-amber-200" />
              <p className="text-sm font-semibold text-white">AI geri bildirimi</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/92">{statusMessage}</p>
            <div className="mt-4 rounded-2xl bg-amber/20 px-4 py-3 text-sm text-white">{assistantSummary}</div>
            <div className="mt-4 rounded-2xl bg-ink/30 px-4 py-4 text-sm text-white/90">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Duyulan metin</p>
                <Button type="button" variant="ghost" className="min-h-10 px-4 text-xs" onClick={() => void runAnalysis(heardTranscript)}>
                  <Wand2 size={16} />
                  AI ile analiz et
                </Button>
              </div>
              <Textarea
                className="mt-3 min-h-28 bg-white/10 text-white placeholder:text-white/60"
                placeholder="Konusma burada metne donecek. Gerekirse duzeltip tekrar AI ile analiz et."
                value={heardTranscript}
                onChange={(event) => {
                  const normalized = normalizeRecognizedTranscript(event.target.value);
                  transcriptRef.current = normalized;
                  setHeardTranscript(normalized);
                }}
              />
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Onay ekrani"
          title="Kaydetmeden once duzenle"
          description="AI once metni duzeltir ve alanlari hazirlar. Son kontrol her zaman ustadadir."
        />

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <div>
            <Label>Hazır işlem seç</Label>
            <div className="grid gap-4 lg:grid-cols-2">
              {refinedRepairChecklistSections.map((section) => (
                <div key={section.title} className="rounded-[24px] border border-slate/10 bg-sand p-4">
                  <p className="text-sm font-semibold text-ink">{section.title}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {section.items.map((item) => {
                      const selected = selectedChecklistItems.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleChecklistItem(item)}
                          className={`rounded-full border px-3 py-2 text-sm transition ${
                            selected
                              ? "border-amber bg-amber text-ink shadow-soft"
                              : "border-slate/10 bg-white text-steel hover:border-amber/50 hover:text-ink"
                          }`}
                        >
                          {selected ? "✓ " : ""}
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
              <Label>Islem aciklamasi</Label>
              {selectedChecklistItems.length ? (
                <div className="mb-3 rounded-2xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-ink">
                  <p className="font-medium">Secilen islemler:</p>
                  <ul className="mt-2 space-y-1">
                    {selectedChecklistItems.map((item) => (
                      <li key={`selected-${item}`} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            <Textarea
              placeholder="Ek islem aciklamasi veya ustanin serbest notu"
              value={manualDescription}
              onChange={(event) => setManualDescription(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Iscilik ucreti</Label>
              <Input
                inputMode="numeric"
                placeholder="0"
                value={draft.laborCost ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    laborCost: numbersOnly(event.target.value) ? Number(numbersOnly(event.target.value)) : null
                  }))
                }
              />
            </div>

            <div>
              <Label>Yedek parca ucreti</Label>
              <Input
                inputMode="numeric"
                placeholder="0"
                value={draft.partsCost ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    partsCost: numbersOnly(event.target.value) ? Number(numbersOnly(event.target.value)) : null
                  }))
                }
              />
            </div>
          </div>

          <div className={`grid gap-4 ${draft.paymentStatus === "partial" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <div>
              <Label>Kilometre</Label>
              <Input
                inputMode="numeric"
                placeholder="Ornek: 18720"
                value={draft.kilometer ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    kilometer: numbersOnly(event.target.value) ? Number(numbersOnly(event.target.value)) : null
                  }))
                }
              />
            </div>

            <div>
              <Label>Odeme durumu</Label>
              <select
                className="min-h-12 w-full rounded-2xl border border-slate/10 bg-sand px-4 py-3 text-sm outline-none focus:border-amber"
                value={draft.paymentStatus ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    paymentStatus: (event.target.value || null) as PaymentStatus | null,
                    paidAmount: event.target.value === "partial" ? current.paidAmount : null
                  }))
                }
              >
                <option value="">Secin</option>
                <option value="paid">Odendi</option>
                <option value="partial">Kismi</option>
                <option value="unpaid">Odenmedi</option>
              </select>
            </div>

            {draft.paymentStatus === "partial" ? (
              <div>
                <Label>Alinan odeme</Label>
                <Input
                  inputMode="numeric"
                  placeholder="Ornek: 500"
                  value={draft.paidAmount ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      paidAmount: numbersOnly(event.target.value) ? Number(numbersOnly(event.target.value)) : null
                    }))
                  }
                />
              </div>
            ) : null}
          </div>

          <div>
            <Label>Notlar</Label>
            <Textarea
              placeholder="Ileriye donuk veya ek notlar"
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>

          <div className="rounded-[24px] bg-sand p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-steel">Toplam tutar</span>
              <span className="text-lg font-semibold text-ink">{formatCurrency(totalCost)}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Button type="submit" disabled={saving || analyzing}>
              {saving ? "Kaydediliyor..." : "Onayla ve Kaydet"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraft(emptyDraft);
                setHeardTranscript("");
                setManualDescription("");
                setSelectedChecklistItems([]);
                transcriptRef.current = "";
              }}
            >
              Temizle
            </Button>
            <Link to={`/motosiklet/${motorcycleId}`}>
              <Button className="w-full" type="button" variant="secondary">
                Iptal ve geri don
              </Button>
            </Link>
          </div>
        </form>
      </Panel>
    </div>
  );
}
