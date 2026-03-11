import { ClipboardCheck, PackageSearch, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Label, Panel, SectionTitle, Textarea } from "../components/Ui";
import { formatPlateDisplay, formatShortDate, workOrderStatusLabel, workOrderStatusTone } from "../lib/format";
import { addWorkOrderUpdate, fetchServiceManagementSummary, updateWorkOrderStatus } from "../lib/mockApi";
import type { WorkOrderStatus, WorkOrderUpdate } from "../types";

type WorkOrderWithMotorcycle = Awaited<ReturnType<typeof fetchServiceManagementSummary>>["workOrders"][number];
type FilterKey = "all" | "active" | "ready" | "waiting" | "delivered";

const statusOptions: { value: WorkOrderStatus; label: string }[] = [
  { value: "received", label: "Kabul edildi" },
  { value: "inspection", label: "İnceleniyor" },
  { value: "in_progress", label: "İşlem başladı" },
  { value: "waiting_parts", label: "Parça bekleniyor" },
  { value: "waiting_approval", label: "Onay bekleniyor" },
  { value: "testing", label: "Test ediliyor" },
  { value: "ready", label: "Hazır" },
  { value: "delivered", label: "Teslim edildi" }
];

export function ServiceManagementPage() {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchServiceManagementSummary>> | null>(null);
  const [selected, setSelected] = useState<WorkOrderWithMotorcycle | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateVisibleToCustomer, setUpdateVisibleToCustomer] = useState(true);

  async function loadSummary() {
    const data = await fetchServiceManagementSummary();
    setSummary(data);
    setSelected((current) => {
      if (!current) {
        return data.workOrders[0] ?? null;
      }
      return data.workOrders.find((item) => item.id === current.id) ?? data.workOrders[0] ?? null;
    });
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  const filteredWorkOrders = useMemo(() => {
    if (!summary) {
      return [];
    }

    if (activeFilter === "active") {
      return summary.workOrders.filter((item) => item.status !== "delivered");
    }
    if (activeFilter === "ready") {
      return summary.workOrders.filter((item) => item.status === "ready");
    }
    if (activeFilter === "waiting") {
      return summary.workOrders.filter((item) => item.status === "waiting_parts" || item.status === "waiting_approval");
    }
    if (activeFilter === "delivered") {
      return summary.workOrders.filter((item) => item.status === "delivered");
    }
    return summary.workOrders;
  }, [activeFilter, summary]);

  async function handleSave() {
    if (!selected) return;

    setSaving(true);
    await updateWorkOrderStatus(selected.id, {
      status: selected.status,
      customerVisibleNote: selected.customerVisibleNote,
      internalNote: selected.internalNote,
      estimatedDeliveryDate: selected.estimatedDeliveryDate
    });
    setSaving(false);
    setNotice("İş emri güncellendi.");
    await loadSummary();
  }

  async function handleAddUpdate() {
    if (!selected || !updateMessage.trim()) {
      return;
    }

    await addWorkOrderUpdate({
      workOrderId: selected.id,
      message: updateMessage,
      visibleToCustomer: updateVisibleToCustomer
    });
    setUpdateMessage("");
    setUpdateVisibleToCustomer(true);
    setNotice("Durum güncellemesi eklendi.");
    await loadSummary();
  }

  return (
    <div className="space-y-5 px-4 py-5">
      <Panel className="bg-ink text-white">
        <SectionTitle
          eyebrow="Servis yönetimi"
          title="Aktif işler ve teslim durumu"
          description="Kendi servisine ait iş emirlerini tek ekrandan yönet, müşteriye görünen notu ayrı tut."
        />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-1">
            <Panel>
              <div className="flex items-center justify-between">
                <SectionTitle eyebrow="Aktif işler" title={`${summary?.totalActive ?? 0}`} />
                <Wrench size={22} className="text-warning" />
              </div>
            </Panel>
            <Panel>
              <div className="flex items-center justify-between">
                <SectionTitle eyebrow="Hazır" title={`${summary?.readyCount ?? 0}`} />
                <ClipboardCheck size={22} className="text-success" />
              </div>
            </Panel>
            <Panel>
              <div className="flex items-center justify-between">
                <SectionTitle eyebrow="Parça bekliyor" title={`${summary?.waitingPartsCount ?? 0}`} />
                <PackageSearch size={22} className="text-danger" />
              </div>
            </Panel>
            <Panel>
              <div className="flex items-center justify-between">
                <SectionTitle eyebrow="Teslim edildi" title={`${summary?.deliveredToday ?? 0}`} />
                <ClipboardCheck size={22} className="text-steel" />
              </div>
            </Panel>
          </div>

          <Panel>
            <SectionTitle
              eyebrow="İş emri listesi"
              title={`${filteredWorkOrders.length} kayıt`}
              description="Bir iş emrine dokun, sağ tarafta durumunu ve notlarını güncelle."
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { key: "all", label: "Tümü" },
                { key: "active", label: "Aktif" },
                { key: "ready", label: "Hazır" },
                { key: "waiting", label: "Bekleyen" },
                { key: "delivered", label: "Teslim" }
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key as FilterKey)}
                  className={`rounded-full px-3 py-2 text-sm transition ${
                    activeFilter === filter.key ? "bg-ink text-white" : "bg-sand text-steel"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {filteredWorkOrders.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                    selected?.id === item.id ? "border-amber bg-amber/10" : "border-slate/10 bg-sand"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">
                        {item.motorcycle ? formatPlateDisplay(item.motorcycle.licensePlate) : "Bilinmeyen plaka"}
                      </p>
                      <p className="mt-1 text-sm text-steel">{item.complaint}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs ${workOrderStatusTone(item.status)}`}>
                      {workOrderStatusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-mist">Tahmini teslim: {formatShortDate(item.estimatedDeliveryDate)}</p>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        <Panel>
          {selected ? (
            <>
              <SectionTitle
                eyebrow="İş emri düzenle"
                title={selected.motorcycle ? formatPlateDisplay(selected.motorcycle.licensePlate) : "Aktif iş"}
                description="Müşteri görünümüne çıkacak not ile iç notu ayrı yönet."
              />
              <div className="mt-5 grid gap-4">
                <div className="grid gap-3 rounded-2xl bg-sand p-4 text-sm text-steel sm:grid-cols-2">
                  <div>
                    <p className="text-mist">Müşteri</p>
                    <p className="mt-1 font-medium text-ink">{selected.motorcycle?.customerName ?? "Bilinmiyor"}</p>
                  </div>
                  <div>
                    <p className="text-mist">Telefon</p>
                    <p className="mt-1 font-medium text-ink">{selected.motorcycle?.phone ?? "-"}</p>
                  </div>
                </div>
                <div>
                  <Label>Şikayet / talep</Label>
                  <Textarea value={selected.complaint} disabled />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Durum</Label>
                    <select
                      className="min-h-12 w-full rounded-2xl border border-slate/10 bg-sand px-4 py-3 text-sm outline-none focus:border-amber"
                      value={selected.status}
                      onChange={(event) =>
                        setSelected((current) =>
                          current ? { ...current, status: event.target.value as WorkOrderStatus } : current
                        )
                      }
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Tahmini teslim günü</Label>
                    <Input
                      type="date"
                      value={selected.estimatedDeliveryDate ?? ""}
                      onChange={(event) =>
                        setSelected((current) =>
                          current ? { ...current, estimatedDeliveryDate: event.target.value || null } : current
                        )
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Müşteri görünür not</Label>
                  <Textarea
                    value={selected.customerVisibleNote}
                    onChange={(event) =>
                      setSelected((current) =>
                        current ? { ...current, customerVisibleNote: event.target.value } : current
                      )
                    }
                  />
                </div>
                <div>
                  <Label>İç not</Label>
                  <Textarea
                    value={selected.internalNote}
                    onChange={(event) =>
                      setSelected((current) => (current ? { ...current, internalNote: event.target.value } : current))
                    }
                  />
                </div>
                <div className="rounded-2xl bg-sand px-4 py-3 text-sm text-steel">
                  QR değeri: <span className="font-medium text-ink">{selected.qrValue}</span>
                </div>
                <div className="rounded-3xl border border-slate/10 p-4">
                  <SectionTitle
                    eyebrow="Durum akışı"
                    title="Yeni güncelleme ekle"
                    description="Müşteri görebilsin istersen tik işaretini açık bırak."
                  />
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label>Güncelleme mesajı</Label>
                      <Textarea value={updateMessage} onChange={(event) => setUpdateMessage(event.target.value)} />
                    </div>
                    <label className="flex items-center gap-3 text-sm text-steel">
                      <input
                        type="checkbox"
                        checked={updateVisibleToCustomer}
                        onChange={(event) => setUpdateVisibleToCustomer(event.target.checked)}
                      />
                      Müşteri takip ekranında görünsün
                    </label>
                    <Button variant="ghost" onClick={() => void handleAddUpdate()}>
                      Güncellemeyi ekle
                    </Button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {selected.updates?.map((item: WorkOrderUpdate) => (
                      <div key={item.id} className="rounded-2xl bg-sand px-4 py-3 text-sm text-steel">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-ink">{formatShortDate(item.createdAt.slice(0, 10))}</span>
                          <span className={item.visibleToCustomer ? "text-success" : "text-steel"}>
                            {item.visibleToCustomer ? "Müşteriye açık" : "İç kullanım"}
                          </span>
                        </div>
                        <p className="mt-2">{item.message}</p>
                      </div>
                    ))}
                    {!selected.updates?.length ? (
                      <div className="rounded-2xl bg-sand px-4 py-3 text-sm text-steel">Henüz güncelleme eklenmedi.</div>
                    ) : null}
                  </div>
                </div>
                {notice ? <p className="text-sm font-medium text-success">{notice}</p> : null}
                <Button onClick={() => void handleSave()}>{saving ? "Kaydediliyor..." : "İş emrini güncelle"}</Button>
              </div>
            </>
          ) : (
            <SectionTitle title="İş emri seç" description="Soldaki listeden bir iş emri seçerek devam et." />
          )}
        </Panel>
      </div>
    </div>
  );
}
