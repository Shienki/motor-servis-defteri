import { LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Panel, SectionTitle } from "../components/Ui";
import { formatCurrency } from "../lib/format";
import { fetchSystemAdminOverview, hasSystemAdminSession, signOutSystemAdmin } from "../lib/mockApi";
import type { SystemAdminOverview } from "../types";

export function AdminPanelPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<SystemAdminOverview | null>(null);

  useEffect(() => {
    fetchSystemAdminOverview().then(setOverview);
  }, []);

  if (!hasSystemAdminSession()) {
    return <Navigate to="/yonetici/giris" replace />;
  }

  return (
    <div className="min-h-screen bg-sand px-4 py-5">
      <div className="mx-auto max-w-6xl space-y-5">
        <Panel className="bg-ink text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionTitle
              eyebrow="Yönetici paneli"
              title={overview?.systemAdmin.displayName ?? "Yönetici paneli"}
              description="Kayıtlı hesapları, açık işleri ve genel durumu buradan takip edebilirsin."
            />
            <Button
              variant="danger"
              className="gap-2"
              onClick={async () => {
                await signOutSystemAdmin();
                navigate("/yonetici/giris");
              }}
            >
              <LogOut size={18} />
              Çıkış yap
            </Button>
          </div>
        </Panel>

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
          <SectionTitle eyebrow="Açık hesaplar" title="Kayıtlı servis hesapları" description="Her hesabın kayıt ve iş yoğunluğunu buradan görebilirsin." />
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

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
