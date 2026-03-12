import { MessageSquareMore, Phone, Plus, QrCode, StickyNote, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { QrPreview } from "../components/QrPreview";
import { Button, Input, Label, Panel, SectionTitle } from "../components/Ui";
import {
  addWorkOrderUpdate,
  createTrackingWorkOrder,
  fetchMotorcycleDetail,
  fetchMotorcycleTrackingCard,
  updateRepairDebt,
  updateWorkOrderStatus
} from "../lib/mockApi";
import {
  formatCurrency,
  formatDate,
  formatShortDate,
  paymentStatusLabel,
  paymentStatusTone,
  workOrderStatusLabel,
  workOrderStatusTone
} from "../lib/format";
import type { Motorcycle, PaymentStatus, Repair, WorkOrderStatus } from "../types";

type DebtEditor = {
  repairId: string;
  paymentStatus: PaymentStatus;
  newPaymentAmount: number;
  newPaymentDate: string;
  newPaymentNote: string;
};

type TrackingCard = Awaited<ReturnType<typeof fetchMotorcycleTrackingCard>>;

const quickStatusOptions: { value: WorkOrderStatus; label: string }[] = [
  { value: "received", label: "Sırada" },
  { value: "in_progress", label: "Hazırlanıyor" },
  { value: "ready", label: "Hazır" },
  { value: "delivered", label: "Teslim edildi" }
];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function defaultCustomerStatusNote(status: WorkOrderStatus) {
  if (status === "received") return "Motosiklet sıraya alındı.";
  if (status === "in_progress") return "Servis işlemi hazırlanıyor.";
  if (status === "ready") return "Motosiklet hazır, teslim için bilgi alabilirsiniz.";
  return "";
}

function getPaidAmount(repair: Repair) {
  return repair.paymentEntries.reduce((sum, entry) => sum + entry.amount, 0);
}

function getRemainingAmount(repair: Repair) {
  return Math.max(repair.totalCost - getPaidAmount(repair), 0);
}

export function MotorcyclePage() {
  const { motorcycleId = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [motorcycle, setMotorcycle] = useState<Motorcycle | null>(null);
  const [history, setHistory] = useState<Repair[]>([]);
  const [editor, setEditor] = useState<DebtEditor | null>(null);
  const [showPaidHistory, setShowPaidHistory] = useState(false);
  const [trackingCard, setTrackingCard] = useState<TrackingCard>(null);
  const [trackingStatus, setTrackingStatus] = useState<WorkOrderStatus>("received");
  const [trackingNote, setTrackingNote] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);

  async function loadDetail() {
    setLoading(true);
    const [data, card] = await Promise.all([
      fetchMotorcycleDetail(motorcycleId),
      fetchMotorcycleTrackingCard(motorcycleId)
    ]);
    setMotorcycle(data.motorcycle);
    setHistory(data.history);
    setTrackingCard(card);
    setTrackingStatus(card?.workOrder?.status ?? "received");
    setTrackingNote(card?.workOrder?.customerVisibleNote ?? "");

    const firstOpenDebt = data.history.find((item) => getRemainingAmount(item) > 0);
    if (firstOpenDebt) {
      setEditor({
        repairId: firstOpenDebt.id,
        paymentStatus: firstOpenDebt.paymentStatus,
        newPaymentAmount: 0,
        newPaymentDate: new Date().toISOString().slice(0, 10),
        newPaymentNote: ""
      });
    } else {
      setEditor(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadDetail();
  }, [motorcycleId]);

  const unpaidRepairs = useMemo(() => history.filter((item) => getRemainingAmount(item) > 0), [history]);
  const paidRepairs = useMemo(() => history.filter((item) => getRemainingAmount(item) === 0), [history]);
  const displayedHistory = showPaidHistory ? history : unpaidRepairs;
  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  const unpaidBalance = useMemo(
    () => unpaidRepairs.reduce((sum, item) => sum + getRemainingAmount(item), 0),
    [unpaidRepairs]
  );

  const selectedRepair = useMemo(
    () => history.find((item) => item.id === editor?.repairId) ?? null,
    [editor?.repairId, history]
  );

  function openDebtEditor(repair: Repair) {
    setEditor({
      repairId: repair.id,
      paymentStatus: repair.paymentStatus,
      newPaymentAmount: 0,
      newPaymentDate: new Date().toISOString().slice(0, 10),
      newPaymentNote: ""
    });
  }

  async function saveDebtEditor() {
    if (!editor) return;

    await updateRepairDebt(editor.repairId, {
      paymentStatus: editor.paymentStatus,
      paymentDueDate: selectedRepair?.paymentDueDate ?? null,
      notes: selectedRepair?.notes ?? "",
      newPayment:
        editor.newPaymentAmount > 0
          ? {
              id: crypto.randomUUID(),
              amount: editor.newPaymentAmount,
              paidAt: editor.newPaymentDate || new Date().toISOString().slice(0, 10),
              note: editor.newPaymentNote || "Tahsilat eklendi."
            }
          : null
    });

    await loadDetail();
    setEditor((current) =>
      current
        ? {
            ...current,
            newPaymentAmount: 0,
            newPaymentDate: new Date().toISOString().slice(0, 10),
            newPaymentNote: ""
          }
        : current
    );
  }

  async function printQrLabel() {
    if (!trackingCard || !motorcycle) return;

    const qrUrl = `${origin}/qr/${trackingCard.qrToken}`;
    const qrImage = await QRCode.toDataURL(qrUrl, {
      width: 720,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff"
      }
    });

    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    const dataUrlToBlob = async (dataUrl: string) => {
      const response = await fetch(dataUrl);
      return await response.blob();
    };

    if (isMobile) {
      const blob = await dataUrlToBlob(qrImage);
      const file = new File([blob], `${motorcycle.licensePlate.replace(/\s+/g, "-")}-qr.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${motorcycle.licensePlate} QR etiketi`,
          text: `${motorcycle.licensePlate} için QR etiketi`,
          files: [file]
        });
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      return;
    }

    const printWindow = window.open("", "_blank", "width=420,height=420");
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html lang="tr">
        <head>
          <meta charset="utf-8" />
          <title>QR Etiketi</title>
          <style>
            @page { margin: 10mm; }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: Arial, sans-serif;
            }
            .label {
              box-sizing: border-box;
              width: 80mm;
              min-height: 92mm;
              margin: 0 auto;
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 10px;
              padding: 8mm 6mm;
            }
            .plate {
              font-size: 22px;
              font-weight: 700;
              letter-spacing: 0.18em;
              color: #0f172a;
              text-align: center;
            }
            .model {
              font-size: 14px;
              color: #334155;
              text-align: center;
            }
            img {
              width: 54mm;
              height: 54mm;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="plate">${escapeHtml(motorcycle.licensePlate)}</div>
            <img src="${qrImage}" alt="QR kodu" />
            <div class="model">${escapeHtml(motorcycle.model)}</div>
          </div>
          <script>
            window.onload = function () {
              window.print();
              setTimeout(function () { window.close(); }, 150);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  async function saveTrackingStatus() {
    if (!motorcycle || savingTracking) return;

    setSavingTracking(true);
    const existingWorkOrder = trackingCard?.workOrder ?? (await createTrackingWorkOrder(motorcycle.id));

    await updateWorkOrderStatus(existingWorkOrder.id, {
      status: trackingStatus,
      customerVisibleNote: trackingStatus === "delivered" ? "" : trackingNote || defaultCustomerStatusNote(trackingStatus),
      internalNote: existingWorkOrder.internalNote ?? "",
      estimatedDeliveryDate: existingWorkOrder.estimatedDeliveryDate ?? null
    });

    await addWorkOrderUpdate({
      workOrderId: existingWorkOrder.id,
      message: `Durum güncellendi: ${workOrderStatusLabel(trackingStatus)}`,
      visibleToCustomer: true
    });

    await loadDetail();
    setSavingTracking(false);
  }

  if (loading) {
    return (
      <div className="px-4 py-5">
        <Panel>
          <SectionTitle title="Kayıt açılıyor" description="Motosiklet bilgileri yükleniyor." />
        </Panel>
      </div>
    );
  }

  if (!motorcycle) {
    return (
      <div className="px-4 py-5">
        <Panel>
          <SectionTitle title="Kayıt bulunamadı" description="Bu plaka ile kayıtlı motosiklet bulunamadı." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 py-5">
      <Panel className="bg-gradient-to-br from-ink via-slate to-steel text-white">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-amber-200">Motosiklet kaydı</p>
            <div className="mt-3 inline-flex rounded-2xl border-2 border-amber bg-white px-5 py-3 text-ink shadow-sm">
              <h2 className="text-3xl font-black tracking-[0.18em]">{motorcycle.licensePlate}</h2>
            </div>
            <p className="mt-4 text-xl font-semibold text-white drop-shadow-sm">{motorcycle.model}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/15 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-white/75">Güncel km</p>
              <p className="mt-1 text-xl font-semibold">{motorcycle.kilometer.toLocaleString("tr-TR")} km</p>
            </div>
            <div className="rounded-2xl bg-amber px-4 py-3 text-ink">
              <p className="text-xs uppercase tracking-[0.2em]">Ödenmemiş bakiye</p>
              <p className="mt-1 text-xl font-semibold">{formatCurrency(unpaidBalance)}</p>
            </div>
          </div>
        </div>
        <Link to={`/motosiklet/${motorcycle.id}/islem-yeni`}>
          <Button className="mt-5 w-full gap-2">
            <Plus size={18} />
            Yeni İşlem Ekle
          </Button>
        </Link>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="İş durumu"
          title={workOrderStatusLabel(trackingStatus)}
          description="Usta burada işin hangi aşamada olduğunu seçer. Müşteri takip ekranında da aynı durum görünür."
        />
        <div className="mt-4 flex flex-wrap gap-3">
          {quickStatusOptions.map((option) => {
            const active = trackingStatus === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTrackingStatus(option.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? workOrderStatusTone(option.value)
                    : "bg-sand text-steel ring-1 ring-slate/10 hover:ring-amber/40"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Label>Müşteriye görünecek kısa not</Label>
            <Input
              type="text"
              placeholder="Örnek: Parça hazırlanıyor, bugün içinde teslim etmeyi planlıyoruz."
              value={trackingNote}
              onChange={(event) => setTrackingNote(event.target.value)}
            />
          </div>
          <Button type="button" className="min-w-44" onClick={() => void saveTrackingStatus()} disabled={savingTracking}>
            {savingTracking ? "Kaydediliyor..." : "Durumu kaydet"}
          </Button>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <Panel>
            <SectionTitle eyebrow="Müşteri bilgileri" title={motorcycle.customerName} />
            <div className="mt-4 space-y-3 text-sm text-steel">
              <div className="flex items-center gap-3">
                <Phone size={16} />
                <span>{motorcycle.phone}</span>
              </div>
              <div className="flex items-start gap-3">
                <StickyNote size={16} className="mt-0.5" />
                <span>{motorcycle.notes}</span>
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle
              eyebrow="QR üret"
              title={trackingCard ? "Müşteri takip erişimi hazır" : "QR hazırlanamadı"}
              description={
                trackingCard
                  ? trackingCard.workOrder
                    ? "QR kodunu buradan üretip yazdırabilirsin. Aktif iş varsa müşteri devam eden süreci görür."
                    : "Bu motosiklet için QR hazır. Aktif iş yoksa müşteri bunu görür."
                  : "Bu motosiklet için takip kartı hazırlanamadı."
              }
            />
            {trackingCard ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                  <div className="flex justify-center">
                    <QrPreview
                      value={`${origin}/qr/${trackingCard.qrToken}`}
                      alt={`${motorcycle.licensePlate} QR kodu`}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-dashed border-amber/40 bg-sand px-5 py-5">
                      <div className="flex items-center gap-3 text-ink">
                        <QrCode size={22} className="text-warning" />
                        <div>
                          <p className="font-semibold">Takip bağlantısı hazır</p>
                          <p className="text-xs text-steel">QR okutulunca müşteri ekranı otomatik açılır.</p>
                        </div>
                      </div>
                      {trackingCard.workOrder ? (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs ${workOrderStatusTone(trackingCard.workOrder.status)}`}>
                            {workOrderStatusLabel(trackingCard.workOrder.status)}
                          </span>
                          <span className="text-sm text-steel">
                            Tahmini teslim: {formatShortDate(trackingCard.workOrder.estimatedDeliveryDate)}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-steel">
                          Şu an devam eden aktif iş yok. Müşteri QR okutursa bu bilgi gösterilir.
                        </p>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button className="w-full gap-2" variant="secondary" type="button" onClick={() => void printQrLabel()}>
                        <QrCode size={18} />
                        QR Yazdır
                      </Button>
                      <Link to={trackingCard.publicTrackingPath}>
                        <Button className="w-full" variant="ghost">
                          Müşteri Ekranını Aç
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel>
            <SectionTitle
              eyebrow="Borç durumu"
              title={formatCurrency(unpaidBalance)}
              description="Borç kaydına dokun, tahsil günü ve ödeme hareketlerini güncelle."
            />

            <div className="mt-4 space-y-3">
              {unpaidRepairs.length === 0 ? (
                <div className="rounded-2xl bg-success/10 p-4 text-sm text-success">
                  Bu motosiklet için açık borç kalmadı.
                </div>
              ) : (
                unpaidRepairs.map((repair) => {
                  const paid = getPaidAmount(repair);
                  const remaining = getRemainingAmount(repair);

                  return (
                    <button
                      key={repair.id}
                      type="button"
                      onClick={() => openDebtEditor(repair)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        editor?.repairId === repair.id
                          ? "border-amber bg-amber/10"
                          : "border-slate/10 bg-sand hover:border-amber/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{repair.description}</p>
                          <p className="mt-1 text-sm text-steel">Tahsil günü: {formatShortDate(repair.paymentDueDate)}</p>
                        </div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs ${paymentStatusTone(repair.paymentStatus)}`}>
                          {paymentStatusLabel(repair.paymentStatus)}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-steel sm:grid-cols-3">
                        <p>Toplam: {formatCurrency(repair.totalCost)}</p>
                        <p>Alınan: {formatCurrency(paid)}</p>
                        <p>Kalan: {formatCurrency(remaining)}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Panel>

          {selectedRepair && editor ? (
            <Panel>
              <SectionTitle
                eyebrow="Borç düzenle"
                title="Tahsilat ekle"
                description="Kaydet sonrası ödeme alanı temizlenir ve durum tüm sayfalara yansır."
              />

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-sand p-4 text-sm text-steel">
                  <p className="font-medium text-ink">{selectedRepair.description}</p>
                  <p className="mt-2">Toplam tutar: {formatCurrency(selectedRepair.totalCost)}</p>
                  <p>Alınan toplam: {formatCurrency(getPaidAmount(selectedRepair))}</p>
                  <p>Kalan tutar: {formatCurrency(getRemainingAmount(selectedRepair))}</p>
                </div>

                <div>
                  <Label>Ödeme durumu</Label>
                  <select
                    className="min-h-12 w-full rounded-2xl border border-slate/10 bg-sand px-4 py-3 text-sm outline-none focus:border-amber"
                    value={editor.paymentStatus}
                    onChange={(event) =>
                      setEditor((current) =>
                        current ? { ...current, paymentStatus: event.target.value as PaymentStatus } : current
                      )
                    }
                  >
                    <option value="unpaid">Ödenmedi</option>
                    <option value="partial">Kısmi ödendi</option>
                    <option value="paid">Ödendi</option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Yeni alınan ödeme</Label>
                    <Input
                      type="number"
                      value={editor.newPaymentAmount}
                      onChange={(event) =>
                        setEditor((current) =>
                          current ? { ...current, newPaymentAmount: Number(event.target.value || 0) } : current
                        )
                      }
                    />
                  </div>

                  <div>
                    <Label>Ödeme tarihi</Label>
                    <Input
                      type="date"
                      value={editor.newPaymentDate}
                      onChange={(event) =>
                        setEditor((current) =>
                          current ? { ...current, newPaymentDate: event.target.value } : current
                        )
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Ödeme notu</Label>
                  <Input
                    type="text"
                    placeholder="Örnek: Elden 500 TL alındı"
                    value={editor.newPaymentNote}
                    onChange={(event) =>
                      setEditor((current) =>
                        current ? { ...current, newPaymentNote: event.target.value } : current
                      )
                    }
                  />
                </div>

                <Button onClick={() => void saveDebtEditor()}>Tahsilatı kaydet</Button>
              </div>
            </Panel>
          ) : null}
        </div>

        <Panel>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle
              eyebrow="Geçmiş işlemler"
              title="Servis geçmişi"
              description="Varsayılan olarak sadece açık işlemler gösterilir."
            />
            <Button type="button" variant="ghost" onClick={() => setShowPaidHistory((current) => !current)}>
              {showPaidHistory ? "Ödenenleri gizle" : `Ödenenleri göster (${paidRepairs.length})`}
            </Button>
          </div>
          <div className="mt-5 space-y-4">
            {displayedHistory.map((repair) => {
              const paid = getPaidAmount(repair);
              const remaining = getRemainingAmount(repair);
              const sortedEntries = [...repair.paymentEntries].sort((a, b) =>
                a.paidAt === b.paidAt ? a.id.localeCompare(b.id) : a.paidAt.localeCompare(b.paidAt)
              );

              return (
                <article key={repair.id} className="rounded-3xl border border-slate/10 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-ink">
                        <Wrench size={16} />
                        <p className="font-semibold">{repair.description}</p>
                      </div>
                      <p className="mt-2 text-sm text-steel">{repair.notes}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs ${paymentStatusTone(repair.paymentStatus)}`}>
                      {paymentStatusLabel(repair.paymentStatus)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-steel sm:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-mist">Tarih</p>
                      <p className="mt-1">{formatDate(repair.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-mist">Kilometre</p>
                      <p className="mt-1">{repair.kilometer.toLocaleString("tr-TR")} km</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-mist">İşçilik</p>
                      <p className="mt-1">{formatCurrency(repair.laborCost)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-mist">Yedek parça</p>
                      <p className="mt-1">{formatCurrency(repair.partsCost)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-2xl bg-sand px-4 py-3 text-sm text-steel sm:grid-cols-3">
                    <div>
                      <p>Toplam tutar</p>
                      <p className="font-semibold text-ink">{formatCurrency(repair.totalCost)}</p>
                    </div>
                    <div>
                      <p>Alınan toplam</p>
                      <p className="font-semibold text-ink">{formatCurrency(paid)}</p>
                    </div>
                    <div>
                      <p>Kalan</p>
                      <p className="font-semibold text-ink">{formatCurrency(remaining)}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-steel">Tahsil günü: {formatShortDate(repair.paymentDueDate)}</p>

                  <div className="mt-4 rounded-2xl border border-slate/10 p-4">
                    <p className="text-sm font-semibold text-ink">Alınan ödemeler</p>
                    {repair.paymentEntries.length === 0 ? (
                      <p className="mt-2 text-sm text-steel">Henüz ödeme alınmadı.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {sortedEntries.map((entry, index) => {
                          const cumulativePaid = sortedEntries
                            .slice(0, index + 1)
                            .reduce((sum, item) => sum + item.amount, 0);

                          return (
                            <div key={entry.id} className="rounded-2xl bg-sand px-4 py-3 text-sm text-steel">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-semibold text-ink">{formatCurrency(entry.amount)}</span>
                                <span>{formatShortDate(entry.paidAt)}</span>
                              </div>
                              <p className="mt-1">{entry.note}</p>
                              <p className="mt-1 text-xs">
                                Bu ödeme sonrası kalan: {formatCurrency(repair.totalCost - cumulativePaid)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {displayedHistory.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-sand p-4 text-sm text-steel">
              Gösterilecek işlem bulunmuyor.
            </div>
          ) : null}
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-dashed border-slate/20 p-4 text-sm text-steel">
            <MessageSquareMore size={16} />
            Yeni işlem ekleyince ses kaydı özet ekranına düşecek, kayıttan sonra buraya eklenecek.
          </div>
        </Panel>
      </div>
    </div>
  );
}

