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
    hint: "Varyatör, kayış ve günlük servis işleri",
    presets: [
      {
        label: "Bakım paketi",
        description: "Yağ, filtre ve buji bakımı",
        items: ["Motor yağı değişti", "Yağ filtresi değişti", "Hava filtresi değişti", "Buji değişti"]
      },
      {
        label: "Varyatör bakımı",
        description: "Kayış ve debriyaj tarafı",
        items: ["Kayış değişti", "Varyatör seti değişti", "Debriyaj balatası değişti"]
      },
      {
        label: "Ön fren işi",
        description: "Ön fren ve hidrolik tarafı",
        items: ["Ön fren balatası değişti", "Fren hidroliği değişti"]
      }
    ],
    quickPicks: [
      "Motor yağı değişti",
      "Kayış değişti",
      "Varyatör seti değişti",
      "Debriyaj balatası değişti",
      "Ön fren balatası değişti",
      "Akü değişti"
    ],
    sections: [
      {
        title: "Bakım",
        items: ["Motor yağı değişti", "Yağ filtresi değişti", "Hava filtresi değişti", "Buji değişti", "Subap ayarı yapıldı"]
      },
      {
        title: "Varyatör ve Debriyaj",
        items: ["Kayış değişti", "Varyatör seti değişti", "Debriyaj balatası değişti", "Debriyaj seti değişti", "Rulman değişti"]
      },
      {
        title: "Fren",
        items: ["Ön fren balatası değişti", "Arka fren balatası değişti", "Fren merkezi değişti", "Fren hidroliği değişti"]
      },
      {
        title: "Elektrik",
        items: ["Akü değişti", "Konjektör değişti", "Marş kömürü değişti", "Far ampulü değişti", "Sigorta değişti"]
      },
      {
        title: "Lastik",
        items: ["Ön lastik değişti", "Arka lastik değişti", "Lastik tamiri yapıldı", "Sibop değişti"]
      }
    ]
  },
  motorcycle: {
    label: "Motosiklet",
    hint: "Zincir, dişli, ön takım ve motor işleri",
    presets: [
      {
        label: "Bakım paketi",
        description: "Yağ, filtre ve buji bakımı",
        items: ["Motor yağı değişti", "Yağ filtresi değişti", "Hava filtresi değişti", "Buji değişti"]
      },
      {
        label: "Alt takım",
        description: "Keçe, burç ve rulman tarafı",
        items: ["Keçe değişti", "Burç değişti", "Rulman değişti"]
      },
      {
        label: "Zincir dişli",
        description: "Aktarma grubu toplu seçim",
        items: ["Zincir ayarı yapıldı", "Zincir değişti", "Dişli seti değişti"]
      }
    ],
    quickPicks: [
      "Motor yağı değişti",
      "Zincir ayarı yapıldı",
      "Zincir değişti",
      "Dişli seti değişti",
      "Keçe değişti",
      "Ön fren balatası değişti"
    ],
    sections: [
      {
        title: "Bakım",
        items: ["Motor yağı değişti", "Yağ filtresi değişti", "Hava filtresi değişti", "Buji değişti", "Subap ayarı yapıldı"]
      },
      {
        title: "Aktarma",
        items: ["Zincir ayarı yapıldı", "Zincir değişti", "Dişli seti değişti", "Debriyaj seti değişti", "Debriyaj balatası değişti"]
      },
      {
        title: "Ön takım ve Süspansiyon",
        items: ["Keçe değişti", "Burç değişti", "Rulman değişti", "Amortisör değişti", "Gidon bilyası değişti"]
      },
      {
        title: "Fren",
        items: ["Ön fren balatası değişti", "Arka fren balatası değişti", "Disk değişti", "Fren merkezi değişti"]
      },
      {
        title: "Motor",
        items: ["Subap ayarı yapıldı", "Enjektör temizlendi", "Karbüratör temizlendi", "Conta değişti", "Segman değişti"]
      },
      {
        title: "Lastik",
        items: ["Ön lastik değişti", "Arka lastik değişti", "Lastik tamiri yapıldı", "Sibop değişti"]
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

  function applyPreset(items: readonly string[]) {
    setSelectedChecklistItems((current) => Array.from(new Set([...current, ...items])));
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
          <SectionTitle title="Motosiklet bulunamadı" description="Yeni işlem açmak için önce kayıtlı bir motosiklet seç." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 py-5">
      <Panel className="bg-gradient-to-br from-ink via-slate to-steel text-white">
        <SectionTitle
          eyebrow="Yeni iş emri"
          title={`${motorcycle.licensePlate} için yeni işlem`}
          titleClassName="text-white"
          eyebrowClassName="text-amber-200"
          description="Ses kaydı ve AI analizi bu ekranda gizlendi. Burada usta gibi hızlı seç, ek notu yaz, tutarı gir ve kaydet."
        />
        <div className="mt-5 grid gap-3 lg:grid-cols-[auto_1fr]">
          <div className="rounded-2xl bg-white/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Motor</p>
            <p className="mt-2 text-lg font-semibold text-white">{motorcycle.model}</p>
            <p className="mt-1 text-sm text-white/75">{motorcycle.customerName || "Müşteri adı girilmedi"}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Çalışma şekli</p>
            <p className="mt-2 text-sm leading-6 text-white/85">
              Önce araç tipini seç. Sonra yapılan işleri tıkla. En alta sadece eksik kalan açıklamayı ve ücreti yaz.
            </p>
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Hazır seçim"
          title="Usta gibi hızlı işaretle"
          description="Gereksiz genel seçenekler yok. Tıklananlar doğrudan işlem açıklamasına eklenir."
        />

        <form className="mt-5 grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-4">
              <div>
                <Label>Araç tipi</Label>
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
                <p className="text-sm font-semibold text-ink">Hazır paketler</p>
                <div className="mt-3 space-y-3">
                  {activeTemplate.presets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset.items)}
                      className="w-full rounded-[20px] border border-slate/10 bg-white px-4 py-4 text-left transition hover:border-amber/40 hover:bg-amber/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{preset.label}</p>
                          <p className="mt-1 text-sm leading-6 text-steel">{preset.description}</p>
                        </div>
                        <span className="rounded-full bg-sand px-3 py-1 text-xs font-medium text-steel">{preset.items.length} iş</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate/10 bg-sand p-4">
                <p className="text-sm font-semibold text-ink">Sık kullanılanlar</p>
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
                        {selected ? "Seçildi: " : ""}
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
            <Label>İşlem açıklaması</Label>
            {selectedChecklistItems.length ? (
              <div className="mb-3 rounded-2xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-ink">
                <p className="font-medium">Seçilen işlemler</p>
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
              placeholder="Hazır tiklerin dışında kalan ek iş, ses, arıza veya müşteri notunu yaz"
              value={manualDescription}
              onChange={(event) => setManualDescription(event.target.value)}
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

          <div className={`grid gap-4 ${draft.paymentStatus === "partial" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <div>
              <Label>Kilometre</Label>
              <Input
                inputMode="numeric"
                placeholder="Örnek: 22000"
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
                    paymentStatus: (event.target.value || null) as PaymentStatus | null,
                    paidAmount: event.target.value === "partial" ? current.paidAmount : null
                  }))
                }
              >
                  <option value="">Seçin</option>
                  <option value="paid">Ödendi</option>
                  <option value="partial">Kısmi</option>
                  <option value="unpaid">Ödenmedi</option>
              </select>
            </div>

            {draft.paymentStatus === "partial" ? (
              <div>
                <Label>Alınan ödeme</Label>
                <Input
                  inputMode="numeric"
                    placeholder="Örnek: 500"
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
              placeholder="Müşteriye bilgi, ileri tarih notu veya teslime dair detay"
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
                İptal ve geri dön
              </Button>
            </Link>
          </div>
        </form>
      </Panel>
    </div>
  );
}
