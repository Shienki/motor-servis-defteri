import { Camera, QrCode, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrPreview } from "../components/QrPreview";
import { Button, Panel, SectionTitle } from "../components/Ui";
import { formatPlateDisplay, workOrderStatusLabel, workOrderStatusTone } from "../lib/format";
import { fetchQrCenterData } from "../lib/mockApi";

type QrCenterData = Awaited<ReturnType<typeof fetchQrCenterData>>;

export function QrHubPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<QrCenterData | null>(null);

  useEffect(() => {
    fetchQrCenterData().then((result) => setData(result));
  }, []);

  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  return (
    <div className="space-y-5 px-4 py-5">
      <Panel className="bg-ink text-white">
        <SectionTitle
          eyebrow="QR merkezi"
          title="QR ile hızlı açılış"
          description="Aynı QR, oturum açıksa ustayı iç ekrana; oturum yoksa müşteriyi takip ekranına yönlendirir."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => data?.lastScannedSuggestion && navigate(`/motosiklet/${data.lastScannedSuggestion.motorcycleId}`)}
          >
            <Camera size={18} />
            Usta gibi okut
          </Button>
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => data?.lastScannedSuggestion && navigate(`/takip/${data.lastScannedSuggestion.publicTrackingToken}`)}
          >
            <UserRound size={18} />
            Müşteri gibi okut
          </Button>
        </div>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Aktif QR kayıtları"
          title={`${data?.workOrders.length ?? 0} iş emri`}
          description="QR çıktısı motora yapıştırılabilir. Aşağıdaki kartlar yazdırılabilir önizleme görevi görür."
        />
        <div className="mt-5 space-y-4">
          {data?.workOrders.map((item) => {
            const qrTarget = `${origin}/qr/${item.publicTrackingToken}`;

            return (
              <div key={item.id} className="rounded-3xl border border-slate/10 bg-sand p-4">
                <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
                  <div className="flex justify-center">
                    <QrPreview value={qrTarget} alt={`${item.motorcycle?.licensePlate ?? "Plaka"} QR kodu`} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
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
                    <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-steel ring-1 ring-slate/10">
                      <div className="flex items-center gap-2 text-ink">
                        <QrCode size={18} className="text-warning" />
                        <span className="font-medium">{item.qrValue}</span>
                      </div>
                      <p className="mt-2 break-all text-xs text-mist">{qrTarget}</p>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Button variant="secondary" onClick={() => navigate(`/motosiklet/${item.motorcycleId}`)}>
                        Usta ekranını aç
                      </Button>
                      <Button variant="ghost" onClick={() => navigate(`/takip/${item.publicTrackingToken}`)}>
                        Müşteri ekranını aç
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
