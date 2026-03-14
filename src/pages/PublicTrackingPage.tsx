import { Bike, CalendarDays, CircleDollarSign, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Panel, SectionTitle } from "../components/Ui";
import { fetchPublicTrackingByOfficialQr, fetchPublicTrackingByPlate, fetchPublicTrackingByToken } from "../lib/mockApi";
import { formatCurrency, formatPlateDisplay, formatShortDate, workOrderStatusLabel, workOrderStatusTone } from "../lib/format";

type TrackingData = Awaited<ReturnType<typeof fetchPublicTrackingByToken>>;

export function PublicTrackingPage() {
  const { token = "" } = useParams();
  const [data, setData] = useState<TrackingData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const request = token.startsWith("plaka:")
      ? fetchPublicTrackingByPlate(decodeURIComponent(token.slice("plaka:".length)))
      : token.startsWith("qr:")
        ? fetchPublicTrackingByOfficialQr(decodeURIComponent(token.slice("qr:".length)))
      : fetchPublicTrackingByToken(token);

    request
      .then((result) => {
        if (active) {
          setData(result);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-sand px-4 py-5">
        <div className="mx-auto max-w-3xl space-y-5">
          <Panel className="bg-ink text-white">
            <SectionTitle
              eyebrow="Müşteri takip"
              title="Takip bilgileri yükleniyor"
              description="Servis kaydı hazırlanıyor. Lütfen kısa bir an bekleyin."
            />
          </Panel>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-sand px-4 py-5">
        <div className="mx-auto max-w-3xl space-y-5">
          <Panel className="bg-ink text-white">
            <SectionTitle
              eyebrow="Müşteri takip"
              title="Takip kaydı bulunamadı"
              description="Plaka veya resmi QR bu servis hesabında tanımlı olmayabilir."
            />
          </Panel>
          <Panel>
            <Link to="/giris">
              <Button variant="ghost">Giriş ekranına dön</Button>
            </Link>
          </Panel>
        </div>
      </div>
    );
  }

  const statusLabel = data.workOrder ? workOrderStatusLabel(data.workOrder.status) : "Şu an aktif iş yok";
  const statusTone = data.workOrder ? workOrderStatusTone(data.workOrder.status) : "bg-slate-200 text-ink";
  const statusDescription = data.workOrder?.customerVisibleNote || "Şu an aktif iş bulunmuyor.";

  return (
    <div className="min-h-screen bg-sand px-4 py-5">
      <div className="mx-auto max-w-3xl space-y-5">
        <Panel className="!bg-ink text-white">
          <SectionTitle
            eyebrow={data.shopName}
            title={formatPlateDisplay(data.motorcycle.licensePlate)}
            titleClassName="text-white"
            description="Motorunuzun servis durumunu buradan takip edebilirsiniz."
          />
          <div className="mt-5 rounded-3xl bg-white/10 p-5">
            <div className="flex items-center gap-3">
              <Bike size={20} className="text-amber-200" />
              <div>
                <p className="text-lg font-semibold text-white">{statusLabel}</p>
                <p className="mt-1 text-sm text-white/80">{statusDescription}</p>
              </div>
            </div>
            <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs ${statusTone}`}>{statusLabel}</span>
          </div>
        </Panel>

        <Panel>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-sand px-4 py-4">
              <div className="flex items-start gap-3">
                <Bike size={18} className="mt-0.5 text-warning" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-mist">Motosiklet</p>
                  <p className="mt-1 font-semibold text-ink">{data.motorcycle.model}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-sand px-4 py-4">
              <div className="flex items-start gap-3">
                <CalendarDays size={18} className="mt-0.5 text-warning" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-mist">Tahmini teslim</p>
                  <p className="mt-1 text-base font-semibold text-ink">
                    {data.workOrder?.estimatedDeliveryDate ? formatShortDate(data.workOrder.estimatedDeliveryDate) : "Şu an planlanmadı"}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-sand px-4 py-4">
              <div className="flex items-start gap-3">
                <CircleDollarSign size={18} className="mt-0.5 text-warning" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-mist">Kalan ödeme</p>
                  <p className="mt-1 text-base font-semibold text-ink">{formatCurrency(data.unpaidTotal)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-sand px-4 py-4">
              <div className="flex items-start gap-3">
                <Phone size={18} className="mt-0.5 text-warning" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-mist">Servis telefonu</p>
                  <p className="mt-1 text-base font-semibold text-ink">{data.shopPhone || "Telefon bilgisi paylaşılmadı"}</p>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Servis notu" title="Müşteriye açık bilgi" description="Servisten müşteriye iletilen kısa bilgi burada görünür." />
          <div className="mt-4 rounded-2xl bg-sand px-4 py-4 text-sm text-steel">
            {statusDescription}
          </div>
        </Panel>
      </div>
    </div>
  );
}
