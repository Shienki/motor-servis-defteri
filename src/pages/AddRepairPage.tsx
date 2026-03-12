import { Mic, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Input, Label, Panel, SectionTitle, Textarea } from "../components/Ui";
import { formatCurrency, numbersOnly } from "../lib/format";
import { analyzeRepairTranscript, createRepairDraft, fetchMotorcycleDetail } from "../lib/mockApi";
import type { AiRepairDraft, Motorcycle, PaymentStatus } from "../types";

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionResultLike = {
  0?: {
    transcript?: string;
  };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type BrowserWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
};

const emptyDraft: AiRepairDraft = {
  description: "",
  laborCost: null,
  partsCost: null,
  kilometer: null,
  paymentStatus: null,
  notes: "",
  assistantSummary: ""
};

function buildAssistantSummary(draft: AiRepairDraft) {
  const parts = [
    draft.description ? `İşlem: ${draft.description}` : null,
    draft.laborCost !== null ? `İşçilik: ${draft.laborCost} TL` : null,
    draft.partsCost !== null ? `Parça: ${draft.partsCost} TL` : null,
    draft.kilometer !== null ? `Kilometre: ${draft.kilometer}` : null,
    draft.paymentStatus
      ? `Ödeme durumu: ${
          draft.paymentStatus === "paid" ? "ödendi" : draft.paymentStatus === "partial" ? "kısmi" : "ödenmedi"
        }`
      : null,
    draft.notes ? `Not: ${draft.notes}` : null
  ].filter(Boolean);

  return parts.length ? `Şu şekilde kaydedilecek: ${parts.join(". ")}.` : "AI kaydı hazırlıyor.";
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9çğıöşü\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isClearlyDemoDraft(transcript: string, draft: AiRepairDraft) {
  const normalizedTranscript = normalizeText(transcript);
  const normalizedDescription = normalizeText(draft.description);

  if (!normalizedTranscript) {
    return false;
  }

  if (draft.laborCost === 950 && draft.partsCost === 700 && draft.kilometer === 18720) {
    return true;
  }

  if (!normalizedDescription) {
    return true;
  }

  const transcriptWords = normalizedTranscript.split(" ").filter((item) => item.length > 3);
  const overlapCount = transcriptWords.filter((word) => normalizedDescription.includes(word)).length;
  const hasFinancialGuess =
    draft.laborCost !== null || draft.partsCost !== null || draft.kilometer !== null || draft.paymentStatus !== null;
  const transcriptNumbers: string[] = normalizedTranscript.match(/\d+/g) ?? [];
  const guessedNumbers = [draft.laborCost, draft.partsCost, draft.kilometer]
    .filter((value): value is number => value !== null)
    .map((value) => String(value));
  const numericOverlapCount = guessedNumbers.filter((value) => transcriptNumbers.includes(value)).length;

  if (overlapCount === 0) {
    return true;
  }

  if (overlapCount <= 1 && hasFinancialGuess) {
    return true;
  }

  if (guessedNumbers.length > 0 && numericOverlapCount === 0) {
    return true;
  }

  return false;
}

function fallbackDraftFromTranscript(transcript: string): AiRepairDraft {
  const cleanedTranscript = transcript.trim();

  return {
    ...emptyDraft,
    description: cleanedTranscript,
    notes: cleanedTranscript,
    assistantSummary: "AI şu an net ayrıştırma yapamadı. Duyulan metin taslak olarak aktarıldı, alanları kontrol et."
  };
}

export function AddRepairPage() {
  const navigate = useNavigate();
  const { motorcycleId = "" } = useParams();
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Mikrofona bas, yapılan işi anlat, sistem özeti hazırlasın.");
  const [heardTranscript, setHeardTranscript] = useState("");
  const [draft, setDraft] = useState<AiRepairDraft>(emptyDraft);

  useEffect(() => {
    fetchMotorcycleDetail(motorcycleId).then((data) => setMotorcycle(data.motorcycle));

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [motorcycleId]);

  const totalCost = useMemo(() => (draft.laborCost ?? 0) + (draft.partsCost ?? 0), [draft.laborCost, draft.partsCost]);
  const assistantSummary = useMemo(
    () => draft.assistantSummary?.trim() || buildAssistantSummary(draft),
    [draft]
  );

  async function analyzeTranscript(transcript: string) {
    setAnalyzing(true);
    setStatusMessage("AI notu çözümlüyor ve kaydı hazırlıyor.");

    try {
      const result = await analyzeRepairTranscript(transcript);
      const safeResult = isClearlyDemoDraft(transcript, result) ? fallbackDraftFromTranscript(transcript) : result;

      setDraft({
        ...safeResult,
        assistantSummary: safeResult.assistantSummary?.trim() || buildAssistantSummary(safeResult)
      });
      setStatusMessage("AI kaydı hazırladı. Aşağıdaki özet üzerinden onay verebilirsin.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleVoiceFlow() {
    const browserWindow = window as BrowserWindow;
    const RecognitionCtor = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      setStatusMessage("Bu tarayıcıda sesli yazıya çevirme desteği yok. Şimdilik alanları elle doldurabilirsin.");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatusMessage("Mikrofon izni verilmedi. Tarayıcıdan izin verip tekrar dene.");
      return;
    }

    setDraft(emptyDraft);
    setHeardTranscript("");
    transcriptRef.current = "";
    setRecording(true);
    setStatusMessage("Dinliyorum. İş bitince tekrar basarak kaydı durdurabilirsin.");

    const recognition = new RecognitionCtor();
    recognition.lang = "tr-TR";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      transcriptRef.current = transcript;
      setHeardTranscript(transcript);
    };

    recognition.onerror = () => {
      setRecording(false);
      setStatusMessage("Ses alındı ama net çözülemedi. Daha kısa ve net konuşup tekrar dene.");
    };

    recognition.onend = () => {
      const finalTranscript = transcriptRef.current.trim();
      setRecording(false);
      recognitionRef.current = null;

      if (!finalTranscript) {
        setStatusMessage("Anlaşılır bir ses kaydı alınamadı. Tekrar deneyebilirsin.");
        return;
      }

      void analyzeTranscript(finalTranscript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function handleMicButton() {
    if (recording && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    void handleVoiceFlow();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await createRepairDraft(motorcycleId, draft);
    setDraft(emptyDraft);
    setHeardTranscript("");
    setSaving(false);
    navigate(`/motosiklet/${motorcycleId}`);
  }

  if (!motorcycle) {
    return (
      <div className="px-4 py-5">
        <Panel>
          <SectionTitle title="Motosiklet bulunamadı" description="Yeni işlem açmak için önce kayıtlı bir motosiklet seç." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 py-5">
      <Panel className="bg-gradient-to-br from-ink via-slate to-steel text-white">
        <SectionTitle
          eyebrow="Sesli kayıt"
          title={`${motorcycle.licensePlate} için yeni işlem`}
          titleClassName="text-white"
          eyebrowClassName="text-amber-200"
          description="Mikrofona bas, yapılan işi anlat, AI önce ne kaydedileceğini söylesin, sonra onay ver."
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
          <button
            type="button"
            onClick={handleMicButton}
            disabled={analyzing}
            className={`flex min-h-56 flex-col items-center justify-center rounded-[28px] border border-white/10 px-6 py-8 text-center transition ${
              recording ? "bg-danger text-white" : "bg-white/15 text-white hover:bg-white/20"
            } ${analyzing ? "cursor-wait opacity-80" : ""}`}
          >
            <Mic size={36} />
            <p className="mt-4 text-xl font-semibold text-white">
              {recording ? "Kaydı durdur" : analyzing ? "AI hazırlıyor" : "Bas ve kaydı başlat"}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/92">
              Örnek: Ön fren balatası değişti, işçilik 600, parça 450, kilometre 18720, 500 peşin alındı.
            </p>
          </button>

          <div className="rounded-[28px] border border-white/10 bg-white/15 p-5">
            <div className="flex items-center gap-2 text-white">
              <Sparkles size={18} className="text-amber-200" />
              <p className="text-sm font-semibold text-white">AI geri bildirimi</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/92">{statusMessage}</p>
            <div className="mt-4 rounded-2xl bg-amber/20 px-4 py-3 text-sm text-white">
              {assistantSummary}
            </div>
            <div className="mt-4 rounded-2xl bg-ink/30 px-4 py-4 text-sm text-white/90">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Duyulan metin</p>
              <p className="mt-2 min-h-10">{heardTranscript || "Henüz ses kaydı alınmadı."}</p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Onay ekranı"
          title="Kaydetmeden önce düzenle"
          description="AI önce özeti hazırlar. Son kontrol her zaman ustadadır."
        />

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <div>
            <Label>İşlem açıklaması</Label>
            <Textarea
              placeholder="Yapılan işlemi detaylı yazın"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>İşçilik ücreti</Label>
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
              <Label>Yedek parça ücreti</Label>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Kilometre</Label>
              <Input
                inputMode="numeric"
                placeholder="Örnek: 18720"
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
              <Label>Ödeme durumu</Label>
              <select
                className="min-h-12 w-full rounded-2xl border border-slate/10 bg-sand px-4 py-3 text-sm outline-none focus:border-amber"
                value={draft.paymentStatus ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    paymentStatus: (event.target.value || null) as PaymentStatus | null
                  }))
                }
              >
                <option value="">Seçin</option>
                <option value="paid">Ödendi</option>
                <option value="partial">Kısmi</option>
                <option value="unpaid">Ödenmedi</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Notlar</Label>
            <Textarea
              placeholder="Ek notlar"
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
            <Button type="button" variant="ghost" onClick={() => setDraft(emptyDraft)}>
              Temizle
            </Button>
            <Link to={`/motosiklet/${motorcycleId}`}>
              <Button className="w-full" type="button" variant="secondary">
                İptal
              </Button>
            </Link>
          </div>
        </form>
      </Panel>
    </div>
  );
}
