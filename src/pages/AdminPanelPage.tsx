import { LogOut, QrCode, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { Button, Panel, SectionTitle } from "../components/Ui";
import { formatCurrency, formatDate } from "../lib/format";
import { fetchSystemAdminOverview, hasSystemAdminSession, signOutSystemAdmin } from "../lib/mockApi";
import type { SystemAdminOverview } from "../types";

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

export function AdminPanelPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<SystemAdminOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSystemAdminOverview()
      .then(setOverview)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Yönetici paneli verileri alınamadı.");
      });
  }, []);

  if (!hasSystemAdminSession()) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-sand px-4 py-5">
      <div className="mx-auto max-w-6xl space-y-5">
        <Panel className="bg-ink text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionTitle
              eyebrow="Yönetici paneli"
              title={overview?.systemAdmin.displayName ?? "Yönetici paneli"}
              description="Kayıtlı hesapları, açık işleri ve bağlı resmi QR kayıtlarını buradan takip edebilirsin."
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Panel>
            <SectionTitle eyebrow="Hesaplar" title={String(overview?.totals.serviceCount ?? 0)} description="Toplam kayıtlı servis hesabı" />
          </Panel>
          <Panel>
            <SectionTitle eyebrow="Motosiklet" title={String(overview?.totals.motorcycleCount ?? 0)} description="Toplam kayıtlı motosiklet" />
          </Panel>
          <Panel>
            <SectionTitle eyebrow="Aktif iş" title={String(overview?.totals.activeWorkOrderCount ?? 0)} description="Teslim edilmemiş işler" />
          </Panel>
          <Panel>
            <SectionTitle eyebrow="Açık borç" title={formatCurrency(overview?.totals.unpaidTotal ?? 0)} description="Sistemdeki toplam açık borç" />
          </Panel>
        </div>

        <Panel>
          <SectionTitle eyebrow="Açık hesaplar" title="Kayıtlı servis hesapları" description="Her hesabın iş yoğunluğu ve bağlı resmi QR kayıtları burada görünür." />
          <div className="mt-5 space-y-3">
            {overview?.services.map((service) => (
              <div key={service.id} className="rounded-2xl border border-slate/10 bg-sand px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-ink">{service.shopName}</p>
                    <p className="text-sm text-steel">{service.ownerName}</p>
                    <p className="text-sm text-steel">@{service.username}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-ink/10 px-3 py-1 text-xs font-medium text-ink">
                    <ShieldCheck size={14} />
                    {service.subscriptionStatus}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-steel">Motosiklet</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{service.motorcycleCount}</p>
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
                    <p className="text-xs uppercase tracking-[0.18em] text-steel">Açık borç kaydı</p>
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

                <div className="mt-4 rounded-2xl bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-steel">Bağlı resmi QR görselleri</p>
                      <p className="mt-1 text-sm text-steel">Bu servise bağlı resmi plaka QR önizlemeleri ve eşleşen motosikletler.</p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink">
                      <QrCode size={14} />
                      {service.officialQrCount}
                    </span>
                  </div>

                  {(service.officialQrBindings?.length ?? 0) ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {(service.officialQrBindings ?? []).map((binding) => (
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
                      Bu servis hesabında henüz bağlı resmi QR görünmüyor.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
