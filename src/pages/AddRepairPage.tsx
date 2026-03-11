import { Mic, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Input, Label, Panel, SectionTitle, Textarea } from "../components/Ui";
import { formatCurrency, numbersOnly } from "../lib/format";
import { analyzeRepairTranscript, createRepairDraft, fetchMotorcycleDetail } from "../lib/mockApi";
import type { AiRepairDraft, Motorcycle, PaymentStatus } from "../types";

const emptyDraft: AiRepairDraft = {
  description: "",
  laborCost: null,
  partsCost: null,
  kilometer: null,
  paymentStatus: null,
  notes: ""
};

export function AddRepairPage() {
  const navigate = useNavigate();
  const { motorcycleId = "" } = useParams();
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<AiRepairDraft>(emptyDraft);

  useEffect(() => {
    fetchMotorcycleDetail(motorcycleId).then((data) => setMotorcycle(data.motorcycle));
  }, [motorcycleId]);

  const totalCost = useMemo(() => (draft.laborCost ?? 0) + (draft.partsCost ?? 0), [draft.laborCost, draft.partsCost]);

  async function handleVoiceFlow() {
    setRecording(true);
    setDraft(emptyDraft);

    window.setTimeout(async () => {
      setRecording(false);
      setAnalyzing(true);
      const result = await analyzeRepairTranscript();
      setDraft(result);
      setAnalyzing(false);
    }, 1200);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await createRepairDraft(motorcycleId, draft);
    setDraft(emptyDraft);
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
          description="Butona bas, yapılan işi anlat, sistem özet çıkarıp onaya sunsun."
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
          <button
            type="button"
            onClick={() => void handleVoiceFlow()}
            className={`flex min-h-56 flex-col items-center justify-center rounded-[28px] border border-white/10 px-6 py-8 text-center transition ${
              recording ? "bg-danger text-white" : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            <Mic size={36} />
            <p className="mt-4 text-lg font-semibold">{recording ? "Kayıt alınıyor..." : "Bas ve kaydı başlat"}</p>
            <p className="mt-2 max-w-xs text-sm text-sand/80">
              Örnek: Ön fren balatası değişti, işçilik 600, parça 450, kilometre 18720, 500 peşin alındı.
            </p>
          </button>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-amber">
              <Sparkles size={18} />
              <p className="text-sm font-medium">Yapay zeka özeti</p>
            </div>
            <p className="mt-3 text-sm text-sand/80">
              {analyzing
                ? "Ses çözümleniyor ve alanlar otomatik dolduruluyor..."
                : draft.description
                  ? "Alanlar dolduruldu. Kaydetmeden önce istersen düzenle."
                  : "Henüz ses kaydı alınmadı. Kayıt sonrası burada özet görünecek."}
            </p>
            <div className="mt-4 rounded-2xl bg-amber/10 px-4 py-3 text-sm text-sand">
              Sistemin amacı zamanı azaltmak; son karar her zaman usta onayında kalır.
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Onay ekranı"
          title="Kaydetmeden önce düzenle"
          description="Yapay zeka sonucunu gerekirse düzelt, sonra tek dokunuşla kaydet."
        />

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <div>
            <Label>İşlem Açıklaması</Label>
            <Textarea
              placeholder="Yapılan işlemi detaylı yazın"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>İşçilik Ücreti</Label>
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
              <Label>Yedek Parça Ücreti</Label>
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
              <Label>Ödeme Durumu</Label>
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
              <span className="text-sm text-steel">Toplam Tutar</span>
              <span className="text-lg font-semibold text-ink">{formatCurrency(totalCost)}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Button type="submit" disabled={saving}>
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
