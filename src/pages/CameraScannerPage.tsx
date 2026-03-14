import { Camera, QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Panel, SectionTitle } from "../components/Ui";
import { bindOfficialQrToMotorcycle, findMotorcycleByOfficialQr } from "../lib/mockApi";

type ScannerMode = "service-search" | "new-record-bind" | "motorcycle-bind" | "customer-track";

function getScannerMode(rawMode: string | null): ScannerMode {
  if (rawMode === "yeni-kayit-qr") return "new-record-bind";
  if (rawMode === "bagla-resmi-qr") return "motorcycle-bind";
  if (rawMode === "musteri-takip") return "customer-track";
  return "service-search";
}

export function CameraScannerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = getScannerMode(searchParams.get("hedef"));
  const motorcycleId = searchParams.get("motorcycleId") ?? "";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const solvedRef = useRef(false);
  const [status, setStatus] = useState("Kamera açılıyor. Resmi plaka QR'ını kadraja getir.");
  const [supportNote, setSupportNote] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [pendingQr, setPendingQr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
        setStatus("Resmi plaka QR'ı bekleniyor.");
      } catch {
        setStatus("Kamera açılamadı. Tarayıcı iznini kontrol et.");
      }
    }

    void startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!cameraReady || pendingQr) {
      return;
    }

    const BarcodeDetectorCtor = (globalThis as typeof globalThis & { BarcodeDetector?: any }).BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      setSupportNote("Bu cihazda yerel QR tarama desteği yok. Başka tarayıcıyla yeniden dene.");
      return;
    }

    const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
    const interval = window.setInterval(async () => {
      if (solvedRef.current || !videoRef.current) {
        return;
      }

      try {
        const codes = await detector.detect(videoRef.current);
        const rawValue = codes?.[0]?.rawValue?.trim();
        if (!rawValue) return;

        solvedRef.current = true;
        setPendingQr(rawValue);
        setStatus("QR okundu. Devam etmeden önce kontrol et.");
      } catch {
        setSupportNote("QR algılama bu tarayıcıda sınırlı olabilir.");
      }
    }, 350);

    return () => window.clearInterval(interval);
  }, [cameraReady, pendingQr]);

  async function continueWithQr() {
    if (!pendingQr || busy) return;

    setBusy(true);
    try {
      if (mode === "motorcycle-bind" && motorcycleId) {
        await bindOfficialQrToMotorcycle(motorcycleId, pendingQr);
        navigate(`/motosiklet/${motorcycleId}`, { replace: true });
        return;
      }

      const motorcycle = await findMotorcycleByOfficialQr(pendingQr);
      if (motorcycle) {
        navigate(mode === "customer-track" ? `/takip/moto:${motorcycle.id}` : `/motosiklet/${motorcycle.id}`, {
          replace: true
        });
        return;
      }

      if (mode === "new-record-bind" || mode === "service-search") {
        navigate(`/motosiklet-yeni?resmiQr=${encodeURIComponent(pendingQr)}&yontem=qr`, { replace: true });
        return;
      }

      setStatus("Bu resmi plaka QR'ı için kayıt bulunamadı.");
      solvedRef.current = false;
      setPendingQr("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "QR işlenemedi.");
      solvedRef.current = false;
      setPendingQr("");
    } finally {
      setBusy(false);
    }
  }

  function resetScan() {
    setPendingQr("");
    solvedRef.current = false;
    setStatus("Resmi plaka QR'ı bekleniyor.");
  }

  const title =
    mode === "customer-track"
      ? "Müşteri QR takibi"
      : mode === "motorcycle-bind"
        ? "Resmi QR bağla"
        : "Resmi plaka QR tara";

  const description =
    mode === "customer-track"
      ? "Plaka üzerindeki resmi QR okutulunca müşteri takip ekranı açılır."
      : mode === "motorcycle-bind"
        ? "Bu motosiklete ait resmi plaka QR'ını bir kez okut, sonraki girişler hızlansın."
        : "Usta tarafında plaka üstündeki resmi QR okutulur. Kayıtlıysa motor açılır, değilse yeni kayda bağlanır.";

  return (
    <div className="space-y-5 px-4 py-5">
      {pendingQr ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-warning">Resmi plaka QR</p>
            <h3 className="mt-2 text-2xl font-bold text-ink">Okunan QR doğru mu?</h3>
            <p className="mt-2 text-sm leading-6 text-steel">
              Resmi QR ilk kez bağlanacaksa burada kontrol et. Gerekirse tekrar tarayabilirsin.
            </p>
            <Input
              className="mt-4 font-medium text-ink"
              value={pendingQr}
              onChange={(event) => setPendingQr(event.target.value)}
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="secondary" onClick={resetScan} disabled={busy}>
                Tekrar tara
              </Button>
              <Button type="button" onClick={() => void continueWithQr()} disabled={busy}>
                {busy ? "İşleniyor..." : "Onayla ve devam et"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Panel className="bg-ink text-white">
        <SectionTitle eyebrow="Canlı kamera" title={title} description={description} />
        <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-black">
          <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted autoPlay />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/10 px-4 py-4 text-sm">
            <div className="flex items-center gap-2 text-white">
              <QrCode size={16} />
              <span className="font-medium">Sadece resmi QR</span>
            </div>
            <p className="mt-2 text-white/75">Bu akışta plaka OCR yok. Sadece plaka üstündeki QR okutulur.</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-4 text-sm">
            <div className="flex items-center gap-2 text-white">
              <Camera size={16} />
              <span className="font-medium">Canlı tarama</span>
            </div>
            <p className="mt-2 text-white/75">Fotoğraf çekmeden doğrudan QR bulununca akış başlar.</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-white/85">{status}</p>
        {supportNote ? <p className="mt-2 text-sm text-white/70">{supportNote}</p> : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button
            variant="secondary"
            onClick={() => navigate(mode === "customer-track" ? "/giris" : "/panel")}
          >
            Geri dön
          </Button>
          <Button variant="ghost" onClick={() => navigate("/motosiklet-yeni?yontem=manuel")}>
            Elle plaka gir
          </Button>
        </div>
      </Panel>
    </div>
  );
}
