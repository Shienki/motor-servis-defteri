import { Building2, CreditCard, ShieldCheck, Users2, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Panel, SectionTitle } from "../components/Ui";
import { formatCurrency } from "../lib/format";
import { fetchSystemAdminOverview, getRememberedSystemAdmin, signOutSystemAdmin } from "../lib/mockApi";

type Overview = Awaited<ReturnType<typeof fetchSystemAdminOverview>>;

export function SystemAdminPanelPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    getRememberedSystemAdmin().then((admin) => {
      if (!admin) {
        navigate("/system-admin/giris");
        return;
      }

      fetchSystemAdminOverview().then((data) => setOverview(data));
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-sand px-4 py-5 text-ink">
      <div className="mx-auto max-w-6xl space-y-5">
        <Panel className="bg-ink text-white">
          <SectionTitle
            eyebrow="System admin"
            title={overview?.systemAdmin.displayName ?? "Genel yönetim paneli"}
            description="Servisler, açık borç yükü ve aylık ödeme sistemi için yönetim omurgası burada toplanacak."
          />
        </Panel>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Panel>
            <div className="flex items-center justify-between">
              <SectionTitle
                eyebrow="Servisler"
                title={`${overview?.totals.serviceCount ?? 0}`}
                description="Sistemde kayıtlı aktif servis sayısı."
              />
              <Building2 size={22} className="text-warning" />
            </div>
          </Panel>
          <Panel>
            <div className="flex items-center justify-between">
              <SectionTitle
                eyebrow="Motor kayıtları"
                title={`${overview?.totals.motorcycleCount ?? 0}`}
                description="Tüm servislerdeki toplam motosiklet sayısı."
              />
              <Users2 size={22} className="text-warning" />
            </div>
          </Panel>
          <Panel>
            <div className="flex items-center justify-between">
              <SectionTitle
                eyebrow="Aktif işler"
                title={`${overview?.totals.activeWorkOrderCount ?? 0}`}
                description={`${overview?.totals.readyCount ?? 0} iş teslime hazır.`}
              />
              <Wrench size={22} className="text-warning" />
            </div>
          </Panel>
          <Panel>
            <div className="flex items-center justify-between">
              <SectionTitle
                eyebrow="Açık borç yükü"
                title={formatCurrency(overview?.totals.unpaidTotal ?? 0)}
                description="Tüm servislerde bekleyen tahsilat toplamı."
              />
              <CreditCard size={22} className="text-warning" />
            </div>
          </Panel>
        </div>

        <Panel>
          <SectionTitle
            eyebrow="Servis listesi"
            title={`${overview?.services.length ?? 0} servis`}
            description="Abonelik sistemi geldiğinde aylık ödeme ve servis durumu buradan yönetilecek."
          />
          <div className="mt-5 space-y-3">
            {overview?.services.map((service) => (
              <div key={service.id} className="rounded-2xl border border-slate/10 bg-sand px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">{service.shopName}</p>
                    <p className="mt-1 text-sm text-steel">
                      {service.ownerName} · @{service.username}
                    </p>
                  </div>
                  <span className="inline-flex rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning ring-1 ring-warning/20">
                    {service.subscriptionStatus}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-steel sm:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <p className="text-mist">Motor kaydı</p>
                    <p className="mt-1 font-semibold text-ink">{service.motorcycleCount}</p>
                  </div>
                  <div>
                    <p className="text-mist">Aktif iş</p>
                    <p className="mt-1 font-semibold text-ink">{service.activeWorkOrderCount}</p>
                  </div>
                  <div>
                    <p className="text-mist">Hazır teslim</p>
                    <p className="mt-1 font-semibold text-ink">{service.readyCount}</p>
                  </div>
                  <div>
                    <p className="text-mist">Açık borç kaydı</p>
                    <p className="mt-1 font-semibold text-ink">{service.unpaidRepairCount}</p>
                  </div>
                  <div>
                    <p className="text-mist">Toplam alacak</p>
                    <p className="mt-1 font-semibold text-ink">{formatCurrency(service.unpaidTotal)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3 text-steel">
            <ShieldCheck size={18} className="text-success" />
            <p className="text-sm">Bir sonraki aşamada buraya abonelik durumu, ödeme geçmişi ve servis kapatma/açma kontrolleri eklenecek.</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button variant="ghost" onClick={() => navigate("/giris")}>
              Normal girişe dön
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await signOutSystemAdmin();
                navigate("/system-admin/giris");
              }}
            >
              System Admin Çıkış
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
