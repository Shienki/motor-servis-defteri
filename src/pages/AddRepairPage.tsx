import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Input, Label, Panel, SectionTitle, Textarea } from "../components/Ui";
import { formatCurrency, numbersOnly } from "../lib/format";
import { createRepairDraft, fetchMotorcycleDetail } from "../lib/mockApi";
import type { AiRepairDraft, Motorcycle, PaymentStatus } from "../types";

const repairTemplates = {
  scooter: {
    label: "Scooter",
    hint: "Varyator, kayis ve gunluk servis isleri",
    quickPicks: [
      "Motor yagi degisti",
      "Kayis degisti",
      "Varyator seti degisti",
      "Debriyaj balatasi degisti",
      "On fren balatasi degisti",
      "Aku degisti"
    ],
    sections: [
      {
        title: "Bakim",
        items: ["Motor yagi degisti", "Yag filtresi degisti", "Hava filtresi degisti", "Buji degisti", "Subap ayari yapildi"]
      },
      {
        title: "Varyator ve Debriyaj",
        items: ["Kayis degisti", "Varyator seti degisti", "Debriyaj balatasi degisti", "Debriyaj seti degisti", "Rulman degisti"]
      },
      {
        title: "Fren",
        items: ["On fren balatasi degisti", "Arka fren balatasi degisti", "Fren merkezi degisti", "Fren hidroligi degisti"]
      },
      {
        title: "Elektrik",
        items: ["Aku degisti", "Konjektor degisti", "Mars komuru degisti", "Far ampulu degisti", "Sigorta degisti"]
      },
      {
        title: "Lastik",
        items: ["On lastik degisti", "Arka lastik degisti", "Lastik tamiri yapildi", "Sibop degisti"]
      }
    ]
  },
  motorcycle: {
    label: "Motosiklet",
    hint: "Zincir, disli, on takim ve motor isleri",
    quickPicks: [
      "Motor yagi degisti",
      "Zincir ayari yapildi",
      "Zincir degisti",
      "Disli seti degisti",
      "Kece degisti",
      "On fren balatasi degisti"
    ],
    sections: [
      {
        title: "Bakim",
        items: ["Motor yagi degisti", "Yag filtresi degisti", "Hava filtresi degisti", "Buji degisti", "Subap ayari yapildi"]
      },
      {
        title: "Aktarma",
        items: ["Zincir ayari yapildi", "Zincir degisti", "Disli seti degisti", "Debriyaj seti degisti", "Debriyaj balatasi degisti"]
      },
      {
        title: "On takim ve Suspansiyon",
        items: ["Kece degisti", "Burc degisti", "Rulman degisti", "Amortisor degisti", "Gidon bilyasi degisti"]
      },
      {
        title: "Fren",
        items: ["On fren balatasi degisti", "Arka fren balatasi degisti", "Disk degisti", "Fren merkezi degisti"]
      },
      {
        title: "Motor",
        items: ["Subap ayari yapildi", "Enjektor temizlendi", "Karburator temizlendi", "Conta degisti", "Segman degisti"]
      },
      {
        title: "Lastik",
        items: ["On lastik degisti", "Arka lastik degisti", "Lastik tamiri yapildi", "Sibop degisti"]
      }
    ]
  }
} as const;

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

export function AddRepairPage() {
  const navigate = useNavigate();
  const { motorcycleId = "" } = useParams();
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [saving, setSaving] = useState(false);
  const [repairTemplate, setRepairTemplate] = useState<keyof typeof repairTemplates>("scooter");
  const [selectedChecklistItems, setSelectedChecklistItems] = useState<string[]>([]);
  const [manualDescription, setManualDescription] = useState("");
  const [draft, setDraft] = useState<AiRepairDraft>(emptyDraft);

  useEffect(() => {
    fetchMotorcycleDetail(motorcycleId).then((data) => setMotorcycle(data.motorcycle));
  }, [motorcycleId]);

  const activeTemplate = repairTemplates[repairTemplate];
  const totalCost = useMemo(() => (draft.laborCost ?? 0) + (draft.partsCost ?? 0), [draft.laborCost, draft.partsCost]);
  const combinedDescription = useMemo(() => {
    const selectedText = selectedChecklistItems.join("\n").trim();
    const freeText = manualDescription.trim();
    if (selectedText && freeText) return `${selectedText}\n${freeText}`;
    return selectedText || freeText;
  }, [manualDescription, selectedChecklistItems]);

  function toggleChecklistItem(item: string) {
    setSelectedChecklistItems((current) => (current.includes(item) ? current.filter((value) => value !== item) : [...current, item]));
  }

  function resetForm() {
    setDraft(emptyDraft);
    setManualDescription("");
    setSelectedChecklistItems([]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!combinedDescription.trim()) {
      return;
    }

    setSaving(true);
    await createRepairDraft(motorcycleId, {
      ...draft,
      description: combinedDescription
    });
    resetForm();
    setSaving(false);
    navigate(`/motosiklet/${motorcycleId}`);
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
          eyebrow="Yeni is emri"
          title={`${motorcycle.licensePlate} icin yeni islem`}
          titleClassName="text-white"
          eyebrowClassName="text-amber-200"
          description="Ses kaydi ve AI analizi bu ekranda gizlendi. Burada usta gibi hizli sec, ek notu yaz, tutari gir ve kaydet."
        />
        <div className="mt-5 grid gap-3 lg:grid-cols-[auto_1fr]">
          <div className="rounded-2xl bg-white/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Motor</p>
            <p className="mt-2 text-lg font-semibold text-white">{motorcycle.model}</p>
            <p className="mt-1 text-sm text-white/75">{motorcycle.customerName || "Musteri adi girilmedi"}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Calisma sekli</p>
            <p className="mt-2 text-sm leading-6 text-white/85">
              Once arac tipini sec. Sonra yapilan isleri tikla. En alta sadece eksik kalan aciklamayi ve ucreti yaz.
            </p>
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Hazir secim"
          title="Usta gibi hizli isaretle"
          description="Gereksiz genel secenekler yok. Tiklananlar dogrudan islem aciklamasina eklenir."
        />

        <form className="mt-5 grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-4">
              <div>
                <Label>Arac tipi</Label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {Object.entries(repairTemplates).map(([value, template]) => {
                    const active = repairTemplate === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setRepairTemplate(value as keyof typeof repairTemplates);
                          setSelectedChecklistItems([]);
                        }}
                        className={`rounded-[24px] border px-4 py-4 text-left transition ${
                          active ? "border-amber bg-amber/15 text-ink shadow-soft" : "border-slate/10 bg-sand text-steel hover:border-amber/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{template.label}</p>
                            <p className="mt-1 text-sm leading-6">{template.hint}</p>
                          </div>
                          {active ? <Check size={18} className="mt-1 text-amber-600" /> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate/10 bg-sand p-4">
                <p className="text-sm font-semibold text-ink">Sik kullanilanlar</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeTemplate.quickPicks.map((item) => {
                    const selected = selectedChecklistItems.includes(item);
                    return (
                      <button
                        key={`quick-${item}`}
                        type="button"
                        onClick={() => toggleChecklistItem(item)}
                        className={`rounded-full border px-3 py-2 text-sm transition ${
                          selected
                            ? "border-amber bg-amber text-ink shadow-soft"
                            : "border-slate/10 bg-white text-steel hover:border-amber/50 hover:text-ink"
                        }`}
                      >
                        {selected ? "Secildi: " : ""}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {activeTemplate.sections.map((section) => (
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
                <p className="font-medium">Secilen islemler</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedChecklistItems.map((item) => (
                    <button
                      key={`selected-${item}`}
                      type="button"
                      onClick={() => toggleChecklistItem(item)}
                      className="rounded-full bg-white px-3 py-2 text-sm text-ink ring-1 ring-amber/30"
                    >
                      {item} x
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <Textarea
              placeholder="Hazir tiklerin disinda kalan ek is, ses, ariza veya musteri notunu yaz"
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
                placeholder="Ornek: 22000"
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
            <Label>Ek notlar</Label>
            <Textarea
              placeholder="Musteriye bilgi, ileri tarih notu veya teslime dair detay"
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
            <Button type="submit" disabled={saving || !combinedDescription.trim()}>
              {saving ? "Kaydediliyor..." : "Onayla ve Kaydet"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm}>
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
