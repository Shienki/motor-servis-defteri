import { Mic, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Input, Label, Panel, SectionTitle, Textarea } from "../components/Ui";
import { formatCurrency, numbersOnly } from "../lib/format";
import { createRepairDraft, fetchMotorcycleDetail } from "../lib/mockApi";
import { analyzeRepairAudio } from "../lib/repairVoiceAi";
import type { AiRepairDraft, Motorcycle, PaymentStatus } from "../types";

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

  return parts.length ? `Şu şekilde kaydedilecek: ${parts.join(". ")}.` : "AI kaydı hazırlanıyor.";
}

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }

  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((value) => MediaRecorder.isTypeSupported(value)) ?? "";
}

export function AddRepairPage() {
  const navigate = useNavigate();
  const { motorcycleId = "" } = useParams();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Mikrofona bas, yapılan işi anlat, kayıt bitince sistem çözümlesin.");
  const [heardTranscript, setHeardTranscript] = useState("");
  const [draft, setDraft] = useState<AiRepairDraft>(emptyDraft);

  useEffect(() => {
    fetchMotorcycleDetail(motorcycleId).then((data) => setMotorcycle(data.motorcycle));

    return () => {
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // noop
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      audioChunksRef.current = [];
    };
  }, [motorcycleId]);

  const totalCost = useMemo(() => (draft.laborCost ?? 0) + (draft.partsCost ?? 0), [draft.laborCost, draft.partsCost]);
  const assistantSummary = useMemo(
    () => draft.assistantSummary?.trim() || buildAssistantSummary(draft),
    [draft]
  );

  async function processAudioBlob(audioBlob: Blob) {
    setAnalyzing(true);
    setStatusMessage("Whisper ses kaydını çözüyor, ardından AI alanları hazırlıyor.");

    try {
      const result = await analyzeRepairAudio(audioBlob);
      setHeardTranscript(result.transcript);
      setDraft({
        ...result.draft,
        assistantSummary: result.draft.assistantSummary?.trim() || buildAssistantSummary(result.draft)
      });
      setStatusMessage("AI kaydı hazırladı. Aşağıdaki özet üzerinden onay verebilirsin.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ses kaydı işlenemedi.";
      setStatusMessage(message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatusMessage("Bu tarayıcı gerçek ses kaydı desteği sunmuyor. Chrome veya Edge ile tekrar dene.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setDraft(emptyDraft);
      setHeardTranscript("");
      setRecording(true);
      setStatusMessage("Kayıt başladı. İş bitince tekrar basarak durdur.");

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        audioChunksRef.current = [];
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setRecording(false);

        if (audioBlob.size === 0) {
          setStatusMessage("Ses kaydı alınamadı. Daha uzun konuşup tekrar dene.");
          return;
        }

        void processAudioBlob(audioBlob);
      };

      recorder.start(250);
    } catch {
      setStatusMessage("Mikrofon izni verilmedi ya da kayıt başlatılamadı.");
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current) {
      return;
    }

    setStatusMessage("Kayıt durdu. Ses dosyası Whisper'a gönderiliyor.");
    try {
      mediaRecorderRef.current.requestData();
    } catch {
      // Some browsers may not support requestData reliably.
    }
    mediaRecorderRef.current.stop();
  }

  function handleMicButton() {
    if (recording) {
      stopRecording();
      return;
    }

    void startRecording();
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
          description="Mikrofona bas, ustanın notunu kaydet. Whisper önce sesi yazıya çevirsin, sonra AI alanları doldursun."
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
              {recording ? "Kaydı durdur" : analyzing ? "Ses işleniyor" : "Bas ve kaydı başlat"}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/92">
              Örnek: Debriyaj içindeki balatalar değişti, işçilik 1200, yedek parça 900, kilometre 22000, 500 peşin alındı.
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
              <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Whisper metni</p>
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
