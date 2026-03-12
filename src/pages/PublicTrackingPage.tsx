import { Bike, CalendarDays, CircleDollarSign, Phone, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Panel, SectionTitle } from "../components/Ui";
import {
  formatCurrency,
  formatPlateDisplay,
  formatShortDate,
  paymentStatusLabel,
  paymentStatusTone,
  workOrderStatusLabel,
  workOrderStatusTone
} from "../lib/format";
import { fetchPublicTrackingByToken } from "../lib/mockApi";

type TrackingData = Awaited<ReturnType<typeof fetchPublicTrackingByToken>>;

export function PublicTrackingPage() {
  const { token = "" } = useParams();
  const [data, setData] = useState<TrackingData>(null);

  useEffect(() => {
    fetchPublicTrackingByToken(token).then((result) => setData(result));
  }, [token]);

  if (!data) {
    return (
      <div className="min-h-screen bg-sand px-4 py-5">
        <div className="mx-auto max-w-3xl space-y-5">
          <Panel className="bg-ink text-white">
            <SectionTitle
              eyebrow="Müşteri takip"
              title="Takip kaydı bulunamadı"
              description="QR veya bağlantı geçersiz olabilir. Servis ile iletişime geçin."
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

  return (
    <div className="min-h-screen bg-sand px-4 py-5">
      <div className="mx-auto max-w-3xl space-y-5">
        <Panel className="bg-ink text-white">
          <SectionTitle
            eyebrow={data.shopName}
            title={formatPlateDisplay(data.motorcycle.licensePlate)}
            description="Motorunuzun güncel servis durumunu buradan takip edebilirsiniz."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-mist">Durum</p>
              {data.workOrder ? (
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs ${workOrderStatusTone(data.workOrder.status)}`}>
                  {workOrderStatusLabel(data.workOrder.status)}
                </span>
              ) : (
                <span className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-ink">
                  Şu an aktif iş yok
                </span>
              )}
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-mist">Tahmini teslim</p>
              <p className="mt-2 font-semibold text-white">
                {data.workOrder?.estimatedDeliveryDate ? formatShortDate(data.workOrder.estimatedDeliveryDate) : "Şu an planlanmadı"}
              </p>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="grid gap-4 text-sm text-steel sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Bike size={18} className="mt-0.5 text-warning" />
              <div>
                <p className="font-medium text-ink">{data.motorcycle.model}</p>
                <p>{data.workOrder?.complaint || "Bu motosiklet için şu an devam eden servis süreci yok."}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarDays size={18} className="mt-0.5 text-warning" />
              <div>
                <p className="font-medium text-ink">Son güncelleme</p>
                <p>{data.workOrder?.updatedAt ? formatShortDate(data.workOrder.updatedAt.slice(0, 10)) : "Henüz güncelleme yok"}</p>
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-sand px-4 py-4 text-sm text-steel">
            <p className="font-medium text-ink">Servis notu</p>
            <p className="mt-2">
              {data.workOrder?.customerVisibleNote || "Aktif iş olmadığı için gösterilecek servis notu bulunmuyor."}
            </p>
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Durum geçmişi" title="Servis zaman çizelgesi" description="Müşteriye açık güncellemeler burada tarih sırasıyla görünür." />
          <div className="mt-5 space-y-3">
            {data.customerUpdates.map((item: { id: string; createdAt: string; message: string }) => (
              <div key={item.id} className="rounded-2xl border border-slate/10 bg-sand px-4 py-4 text-sm text-steel">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink">{formatShortDate(item.createdAt.slice(0, 10))}</span>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs ${data.workOrder ? workOrderStatusTone(data.workOrder.status) : "bg-ink/10 text-ink"}`}>
                    Güncelleme
                  </span>
                </div>
                <p className="mt-2">{item.message}</p>
              </div>
            ))}
            {!data.customerUpdates.length ? (
              <div className="rounded-2xl bg-sand px-4 py-4 text-sm text-steel">
                {data.workOrder ? "Henüz paylaşılmış durum güncellemesi yok." : "Aktif iş olmadığı için gösterilecek süreç güncellemesi yok."}
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel>
          <SectionTitle eyebrow="Ödeme durumu" title={formatCurrency(data.unpaidTotal)} description="Kalan ödeme bilgisi aşağıda özetlenir." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-sand px-4 py-4 text-sm text-steel">
              <div className="flex items-start gap-3">
                <CircleDollarSign size={18} className="mt-0.5 text-warning" />
                <div>
                  <p className="font-medium text-ink">Kalan tutar</p>
                  <p className="mt-1">{formatCurrency(data.unpaidTotal)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-sand px-4 py-4 text-sm text-steel">
              <div className="flex items-start gap-3">
                <Wrench size={18} className="mt-0.5 text-warning" />
                <div>
                  <p className="font-medium text-ink">Son işlem</p>
                  <p className="mt-1">{data.latestRepair?.description ?? "Henüz işlem kaydı yok."}</p>
                  {data.latestRepair ? (
                    <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs ${paymentStatusTone(data.latestRepair.paymentStatus)}`}>
                      {paymentStatusLabel(data.latestRepair.paymentStatus)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3 text-steel">
            <Phone size={18} className="text-warning" />
            <div>
              <p className="font-medium text-ink">{data.shopName}</p>
              <p>{data.shopPhone || "Telefon bilgisi paylaşılmadı"}</p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
