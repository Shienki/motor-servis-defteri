import { Camera, ChevronRight, Search, Settings2, Wallet, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Input, Panel, SectionTitle } from "../components/Ui";
import { fetchDashboardData, fetchServiceManagementSummary, findMotorcycleByPlate, simulatePlateScan } from "../lib/mockApi";
import {
  canonicalPlate,
  formatCurrency,
  formatDate,
  formatPlateDisplay,
  paymentStatusLabel,
  paymentStatusTone
} from "../lib/format";
import type { Motorcycle, Repair } from "../types";

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [recentRepairs, setRecentRepairs] = useState<Repair[]>([]);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [activeWorkOrders, setActiveWorkOrders] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [message, setMessage] = useState("Plakayı gir veya kamerayla okut.");
  const [scanBusy, setScanBusy] = useState(false);

  async function loadDashboard() {
    const [dashboard, serviceSummary] = await Promise.all([
      fetchDashboardData(),
      fetchServiceManagementSummary()
    ]);
    setMotorcycles(dashboard.motorcycles);
    setRecentRepairs(dashboard.recentRepairs);
    setUnpaidTotal(dashboard.unpaidTotal);
    setActiveWorkOrders(serviceSummary.totalActive);
    setReadyCount(serviceSummary.readyCount);
  }

  useEffect(() => {
    void loadDashboard();
  }, [location.key]);

  useEffect(() => {
    function handleRefresh() {
      void loadDashboard();
    }

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("storage", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
    };
  }, []);

  async function handleSearch(rawPlate?: string) {
    const canonical = canonicalPlate(rawPlate ?? query);
    const plate = formatPlateDisplay(rawPlate ?? query);

    if (!canonical) {
      setMessage("Lütfen geçerli bir plaka girin.");
      return;
    }

    const found = await findMotorcycleByPlate(canonical);

    if (found) {
      setMessage(`Kayıt bulundu: ${found.licensePlate}. Motosiklet sayfası açılıyor.`);
      navigate(`/motosiklet/${found.id}`);
      return;
    }

    setMessage(`"${plate}" için kayıt bulunamadı. Yeni kayıt açman gerekecek.`);
  }

  async function handleScan() {
    setScanBusy(true);
    const result = await simulatePlateScan();
    setScanBusy(false);
    const plate = formatPlateDisplay(result.rawText);
    setQuery(plate);
    setMessage(`Plaka okundu: ${plate}. Gerekirse düzeltip tekrar ara.`);
    await handleSearch(plate);
  }

  return (
    <div className="space-y-5 px-4 py-5">
      <Panel className="bg-gradient-to-br from-ink via-slate to-steel text-white">
        <SectionTitle
          eyebrow="Hızlı erişim"
          title="Motoru bul, işlemi aç"
          eyebrowClassName="text-amber-200"
          titleClassName="text-3xl text-white sm:text-4xl"
          description="Ana akış tek ekranda: ara, kaydı aç, işlemi ekle, tahsilatı takip et."
        />
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-mist" size={18} />
            <Input
              className="border-white/10 bg-white/10 pl-11 text-white placeholder:text-sand/50"
              placeholder="Plaka ara örnek: 34 ABC 123"
              value={query}
              onChange={(event) => setQuery(formatPlateDisplay(event.target.value))}
            />
          </div>
          <Button className="sm:min-w-36" onClick={() => void handleSearch()}>
            Ara
          </Button>
          <Button className="gap-2 sm:min-w-44" variant="ghost" onClick={() => void handleScan()}>
            <Camera size={18} />
            {scanBusy ? "Okunuyor..." : "Kamerayla Tara"}
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Button className="w-full" variant="secondary" onClick={() => navigate("/motosiklet-yeni?yontem=manuel")}>
            Yeni Kayıt Ekle
          </Button>
          <Button className="w-full gap-2" variant="ghost" onClick={() => navigate("/motosiklet-yeni?yontem=kamera")}>
            <Camera size={18} />
            Kamerayla Yeni Kayıt
          </Button>
          <Button className="w-full gap-2" variant="ghost" onClick={() => navigate("/servis-yonetimi")}>
            <Wrench size={18} />
            Aktif İşler
          </Button>
        </div>
        <p className="mt-4 text-sm text-white/85">{message}</p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <Panel>
          <SectionTitle
            eyebrow="Son işlemler"
            title="Atölyede son açık kayıtlar"
            description="Bugün kimde ne yapıldığını ve kimde tahsilat kaldığını tek bakışta gör."
          />
          <div className="mt-5 space-y-3">
            {recentRepairs.map((repair) => {
              const motorcycle = motorcycles.find((item) => item.id === repair.motorcycleId);
              const paidTotal = repair.paymentEntries.reduce((sum, entry) => sum + entry.amount, 0);
              const remainingTotal = Math.max(repair.totalCost - paidTotal, 0);
              return (
                <button
                  key={repair.id}
                  type="button"
                  onClick={() => navigate(`/motosiklet/${repair.motorcycleId}`)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate/10 p-4 text-left transition hover:border-amber/40 hover:bg-sand"
                >
                  <div>
                    <p className="font-semibold text-ink">{motorcycle?.licensePlate ?? "Bilinmeyen plaka"}</p>
                    <p className="mt-1 text-sm text-steel">{repair.description}</p>
                    <p className="mt-2 text-xs text-mist">{formatDate(repair.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{formatCurrency(remainingTotal)}</p>
                    <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs ${paymentStatusTone(repair.paymentStatus)}`}>
                      {paymentStatusLabel(repair.paymentStatus)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel className="bg-amber text-ink">
            <div className="flex items-center justify-between">
              <SectionTitle
                eyebrow="Borç özeti"
                title={formatCurrency(unpaidTotal)}
                description="Toplam ödenmemiş ve kısmi ödemeli kayıtlar"
              />
              <Wallet size={32} />
            </div>
            <div className="mt-5 grid gap-3">
              <Button className="w-full" variant="secondary" onClick={() => navigate("/borclar")}>
                Borç Takibini Aç
              </Button>
              <Button className="w-full" variant="ghost" onClick={() => navigate("/borclar?gorunum=odenen")}>
                Ödenmiş Borçlar
              </Button>
            </div>
          </Panel>

          <Panel>
            <SectionTitle
              eyebrow="Aktif işler"
              title={`${activeWorkOrders} aktif, ${readyCount} hazır`}
              description="Parça bekleyenleri, hazır teslimleri ve devam eden işleri tek yerden yönet."
            />
            <div className="mt-4 grid gap-3">
              <Button className="w-full gap-2" variant="secondary" onClick={() => navigate("/servis-yonetimi")}>
                <Settings2 size={18} />
                Aktif İşleri Aç
              </Button>
            </div>
          </Panel>

          <Panel>
            <SectionTitle
              eyebrow="Hızlı kayıtlar"
              title="Son eklenen motosikletler"
              description="Yeni işlem açmak için doğrudan kayda gir."
            />
            <div className="mt-4 space-y-3">
              {motorcycles.map((motorcycle) => (
                <button
                  key={motorcycle.id}
                  type="button"
                  onClick={() => navigate(`/motosiklet/${motorcycle.id}`)}
                  className="flex w-full items-center justify-between rounded-2xl bg-sand px-4 py-4 text-left"
                >
                  <div>
                    <p className="font-semibold text-ink">{motorcycle.licensePlate}</p>
                    <p className="text-sm text-steel">{motorcycle.model}</p>
                  </div>
                  <ChevronRight size={18} className="text-steel" />
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
