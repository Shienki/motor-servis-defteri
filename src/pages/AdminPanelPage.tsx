import {
  AlertTriangle,
  Clock3,
  LogOut,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  UserRound,
  Wallet
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { Button, Input, Panel, SectionTitle } from "../components/Ui";
import { formatCurrency, formatDate } from "../lib/format";
import { fetchSystemAdminOverview, hasSystemAdminSession, signOutSystemAdmin } from "../lib/mockApi";
import type { SystemAdminOverview, WorkOrderStatus } from "../types";

function QrPreview({ value }: { value: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(value, {
      margin: 1,
      width: 112,
      color: {
        dark: "#111827",
        light: "#ffffff"
      }
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setSrc(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSrc("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  return src ? <img className="h-24 w-24 rounded-2xl border border-slate/10 bg-white p-2" src={src} alt="Resmi QR önizlemesi" /> : null;
}

function getWorkOrderStatusLabel(status: WorkOrderStatus | null) {
  if (status === "ready") return "Hazır";
  if (status === "in_progress") return "Hazırlanıyor";
  if (status === "received") return "Sırada";
  if (status === "delivered") return "Teslim edildi";
  return "İş kaydı yok";
}

function getHealthLabel(service: SystemAdminOverview["services"][number]) {
  if (!service.phone.trim()) return "İletişim eksik";
  if (service.unpaidTotal > 0) return "Takip gerekli";
  if (service.activeWorkOrderCount > 0) return "Aktif yoğunluk";
  return "Sağlıklı";
}

function getHealthTone(service: SystemAdminOverview["services"][number]) {
  if (!service.phone.trim()) return "bg-warning/15 text-amber-900";
  if (service.unpaidTotal > 0) return "bg-danger/10 text-danger";
  if (service.activeWorkOrderCount > 0) return "bg-ink/10 text-ink";
  return "bg-green-100 text-green-800";
}

export function AdminPanelPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<SystemAdminOverview | null>(null);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("debt");

  useEffect(() => {
    fetchSystemAdminOverview()
      .then((result) => {
        setOverview(result);
        setError("");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Yönetici paneli verileri alınamadı.");
      });
  }, []);

  if (!hasSystemAdminSession()) {
    return <Navigate to="/admin" replace />;
  }

  const services = overview?.services ?? [];
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("tr-TR");

  const filteredServices = services
    .filter((service) => {
      if (!normalizedSearch) return true;

      const haystack = [
        service.shopName,
        service.ownerName,
        service.username,
        service.phone,
        service.latestComplaint ?? "",
        ...service.latestMotorcycles.map((item) => `${item.licensePlate} ${item.model} ${item.customerName}`),
        ...service.officialQrBindings.map((item) => `${item.licensePlate} ${item.model}`)
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return haystack.includes(normalizedSearch);
    })
    .filter((service) => {
      if (filter === "debt") return service.unpaidTotal > 0;
      if (filter === "active") return service.activeWorkOrderCount > 0;
      if (filter === "missing-phone") return !service.phone.trim();
      if (filter === "with-qr") return service.officialQrCount > 0;
      return true;
    })
    .sort((left, right) => {
      if (sortBy === "motorcycles") return right.motorcycleCount - left.motorcycleCount;
      if (sortBy === "activity") return String(right.lastActivityAt ?? "").localeCompare(String(left.lastActivityAt ?? ""));
      if (sortBy === "qr") return right.officialQrCount - left.officialQrCount;
      return right.unpaidTotal - left.unpaidTotal;
    });

  const servicesWithQr = services.filter((service) => service.officialQrCount > 0).length;
  const recentActivity = services.filter((service) => Boolean(service.lastActivityAt)).slice(0, 3);

  return (
    <div className="min-h-screen bg-sand px-4 py-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <Panel className="bg-ink text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionTitle
              eyebrow="Yönetici paneli"
              title={overview?.systemAdmin.displayName ?? "Yönetici paneli"}
              description="Servis hesaplarını, operasyon yoğunluğunu, borç riskini ve bağlı resmi QR kayıtlarını tek ekranda takip et."
            />
            <Button
              variant="danger"
              className="gap-2"
              onClick={async () => {
                await signOutSystemAdmin();
                navigate("/admin");
              }}
            >
              <LogOut size={18} />
              Çıkış yap
            </Button>
          </div>
        </Panel>

        {error ? (
          <Panel>
            <SectionTitle eyebrow="Bağlantı" title="Yönetici paneli yüklenemedi" description={error} />
          </Panel>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Panel>
            <SectionTitle eyebrow="Hesaplar" title={String(overview?.totals.serviceCount ?? 0)} description="Toplam servis hesabı" />
          </Panel>
          <Panel>
            <SectionTitle eyebrow="Motosiklet" title={String(overview?.totals.motorcycleCount ?? 0)} description="Toplam kayıtlı araç" />
          </Panel>
          <Panel>
            <SectionTitle eyebrow="Aktif iş" title={String(overview?.totals.activeWorkOrderCount ?? 0)} description="Teslim edilmemiş işler" />
          </Panel>
          <Panel>
            <SectionTitle eyebrow="Hazır" title={String(overview?.totals.readyCount ?? 0)} description="Teslime yakın işler" />
          </Panel>
          <Panel>
            <SectionTitle eyebrow="Resmi QR" title={String(overview?.totals.officialQrCount ?? 0)} description="Bağlı QR sayısı" />
          </Panel>
          <Panel>
            <SectionTitle eyebrow="Açık borç" title={formatCurrency(overview?.totals.unpaidTotal ?? 0)} description="Sistemdeki toplam risk" />
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Panel>
            <SectionTitle
              eyebrow="İzleme"
              title="Hızlı yönetim görünümü"
              description="Öncelikli takip gerektiren alanları buradan ayır."
            />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-sand px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-ink">
                  <Wallet size={16} />
                  Borç takibi gereken servisler
                </div>
                <p className="mt-2 text-2xl font-semibold text-ink">{overview?.totals.servicesWithDebtCount ?? 0}</p>
                <p className="mt-1 text-sm text-steel">Açık borcu sıfırdan büyük olan hesaplar.</p>
              </div>
              <div className="rounded-2xl bg-sand px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-ink">
                  <Phone size={16} />
                  Telefonu eksik servisler
                </div>
                <p className="mt-2 text-2xl font-semibold text-ink">{overview?.totals.servicesWithoutPhoneCount ?? 0}</p>
                <p className="mt-1 text-sm text-steel">Müşteriye dönüşte kopukluk yaratabilecek hesaplar.</p>
              </div>
              <div className="rounded-2xl bg-sand px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-ink">
                  <QrCode size={16} />
                  QR kullanan servisler
                </div>
                <p className="mt-2 text-2xl font-semibold text-ink">{servicesWithQr}</p>
                <p className="mt-1 text-sm text-steel">Resmi QR eşleştirmesi yapılmış servis hesapları.</p>
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle eyebrow="Son aktivite" title="En son hareket eden servisler" description="Yakın tarihli operasyon sinyali." />
            <div className="mt-4 space-y-3">
              {recentActivity.length ? (
                recentActivity.map((service) => (
                  <div key={service.id} className="rounded-2xl bg-sand px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{service.shopName}</p>
                        <p className="text-sm text-steel">{service.ownerName}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getHealthTone(service)}`}>
                        {getHealthLabel(service)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-steel">Son hareket: {service.lastActivityAt ? formatDate(service.lastActivityAt) : "Kayıt bulunmuyor"}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-sand px-4 py-4 text-sm text-steel">Henüz aktivite bilgisi bulunmuyor.</div>
              )}
            </div>
          </Panel>
        </div>

        <Panel>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-warning">Servis ara</p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-steel" size={18} />
                <Input
                  className="pl-11"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Servis adı, kullanıcı adı, plaka veya müşteri ara"
                />
              </div>
            </div>

            <div className="min-w-[180px]">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-warning">Filtre</p>
              <select
                className="min-h-12 w-full rounded-2xl border border-slate/10 bg-sand px-4 py-3 text-sm text-ink outline-none"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">Tümü</option>
                <option value="debt">Borçlı servisler</option>
                <option value="active">Aktif işi olanlar</option>
                <option value="missing-phone">Telefonu eksik olanlar</option>
                <option value="with-qr">QR kullananlar</option>
              </select>
            </div>

            <div className="min-w-[180px]">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-warning">Sırala</p>
              <select
                className="min-h-12 w-full rounded-2xl border border-slate/10 bg-sand px-4 py-3 text-sm text-ink outline-none"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="debt">Borç tutarına göre</option>
                <option value="activity">Son aktiviteye göre</option>
                <option value="motorcycles">Motor sayısına göre</option>
                <option value="qr">QR sayısına göre</option>
              </select>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            eyebrow="Servis hesapları"
            title={`Görünen servis sayısı: ${filteredServices.length}`}
            description="Her servis hesabının yükünü, riskini ve iletişim durumunu buradan görebilirsin."
          />

          <div className="mt-5 space-y-4">
            {filteredServices.length ? (
              filteredServices.map((service) => (
                <div key={service.id} className="rounded-2xl border border-slate/10 bg-sand px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-ink">{service.shopName}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getHealthTone(service)}`}>
                          {getHealthLabel(service)}
                        </span>
                      </div>
                      <p className="text-sm text-steel">{service.ownerName}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-steel">
                        <span>@{service.username}</span>
                        <span className="inline-flex items-center gap-1">
                          <Phone size={14} />
                          {service.phone.trim() || "Telefon girilmemiş"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <UserRound size={14} />
                          {service.customerCount} müşteri
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-right">
                      <span className="inline-flex items-center gap-2 rounded-full bg-ink/10 px-3 py-1 text-xs font-medium text-ink">
                        <ShieldCheck size={14} />
                        {service.subscriptionStatus}
                      </span>
                      <p className="text-sm text-steel">
                        Son aktivite: {service.lastActivityAt ? formatDate(service.lastActivityAt) : "Kayıt yok"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-steel">Motosiklet</p>
                      <p className="mt-1 text-lg font-semibold text-ink">{service.motorcycleCount}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-steel">Müşteri</p>
                      <p className="mt-1 text-lg font-semibold text-ink">{service.customerCount}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-steel">Aktif iş</p>
                      <p className="mt-1 text-lg font-semibold text-ink">{service.activeWorkOrderCount}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-steel">Hazır</p>
                      <p className="mt-1 text-lg font-semibold text-ink">{service.readyCount}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-steel">Borç kaydı</p>
                      <p className="mt-1 text-lg font-semibold text-ink">{service.unpaidRepairCount}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-steel">Açık borç</p>
                      <p className="mt-1 text-lg font-semibold text-ink">{formatCurrency(service.unpaidTotal)}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-steel">Resmi QR</p>
                      <p className="mt-1 text-lg font-semibold text-ink">{service.officialQrCount}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_1fr]">
                    <div className="rounded-2xl bg-white px-4 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-ink">
                        <Clock3 size={16} />
                        Son operasyon bilgisi
                      </div>
                      <p className="mt-3 text-sm text-steel">
                        Son iş durumu: <span className="font-medium text-ink">{getWorkOrderStatusLabel(service.latestWorkOrderStatus)}</span>
                      </p>
                      <p className="mt-2 text-sm text-steel">
                        Son şikayet:{" "}
                        <span className="font-medium text-ink">{service.latestComplaint?.trim() || "Henüz iş emri yok"}</span>
                      </p>

                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-steel">Son eklenen motosikletler</p>
                        {service.latestMotorcycles.length ? (
                          <div className="mt-3 space-y-2">
                            {service.latestMotorcycles.map((motorcycle) => (
                              <div key={motorcycle.id} className="rounded-2xl bg-sand px-3 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-ink">{motorcycle.licensePlate}</p>
                                    <p className="text-sm text-steel">{motorcycle.model}</p>
                                    <p className="text-sm text-steel">{motorcycle.customerName || "Müşteri adı girilmedi"}</p>
                                  </div>
                                  <span className="text-xs text-steel">{formatDate(motorcycle.createdAt)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 rounded-2xl bg-sand px-4 py-4 text-sm text-steel">Bu serviste henüz motosiklet kaydı görünmüyor.</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-ink">Bağlı resmi QR kayıtları</p>
                          <p className="mt-1 text-sm text-steel">Plaka üstü QR eşleşmeleri ve bağlanma zamanı.</p>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink">
                          <QrCode size={14} />
                          {service.officialQrCount}
                        </span>
                      </div>

                      {service.officialQrBindings.length ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {service.officialQrBindings.map((binding) => (
                            <div key={binding.workOrderId} className="rounded-2xl border border-slate/10 bg-sand px-3 py-3">
                              <div className="flex items-start gap-3">
                                <QrPreview value={binding.qrValue} />
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-ink">{binding.licensePlate}</p>
                                  <p className="text-sm text-steel">{binding.model}</p>
                                  <p className="mt-2 break-all text-xs text-mist">{binding.qrValue}</p>
                                  <p className="mt-2 text-xs text-steel">Son bağlama: {formatDate(binding.updatedAt)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl bg-sand px-4 py-4 text-sm text-steel">
                          Bu serviste henüz resmi QR eşleşmesi görünmüyor.
                        </div>
                      )}
                    </div>
                  </div>

                  {!service.phone.trim() ? (
                    <div className="mt-4 flex items-start gap-2 rounded-2xl bg-warning/10 px-4 py-3 text-sm text-amber-900">
                      <AlertTriangle className="mt-0.5 shrink-0" size={16} />
                      Bu servisin telefon bilgisi eksik. Müşteri tarafında iletişim zayıf kalabilir.
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-sand px-4 py-5 text-sm text-steel">
                Filtreye uyan servis bulunamadı. Arama kelimesini veya filtreleri değiştir.
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
