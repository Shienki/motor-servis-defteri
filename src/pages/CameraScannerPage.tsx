import { Camera, QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Panel, SectionTitle } from "../components/Ui";
import {
  bindOfficialQrToMotorcycle,
  fetchPublicTrackingByOfficialQr,
  fetchPublicTrackingByPlate,
  findMotorcycleByOfficialQr,
  findMotorcycleByPlate
} from "../lib/mockApi";
import { formatPlateDisplay } from "../lib/format";

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

  const [status, setStatus] = useState("");
  const [supportNote, setSupportNote] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [pendingQr, setPendingQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [showUnregisteredQrFallback, setShowUnregisteredQrFallback] = useState(false);
  const [manualPlate, setManualPlate] = useState("");
  const [manualError, setManualError] = useState("");
  const [cameraSession, setCameraSession] = useState(0);

  function getWaitingStatus() {
    if (mode === "customer-track") return "Müşteri takibi için resmi QR bekleniyor.";
    if (mode === "motorcycle-bind") return "Bu motosiklete bağlanacak resmi QR bekleniyor.";
    if (mode === "new-record-bind") return "Resmi QR okununca kayıtlıysa mevcut kayıt açılır, değilse yeni kayıt başlar.";
    return "Kayıtlı motosikleti bulmak için resmi QR bekleniyor.";
  }

  useEffect(() => {
    setStatus(`Kamera açılıyor. ${getWaitingStatus()}`);
  }, [mode]);

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
          await new Promise<void>((resolve) => {
            if (!videoRef.current) {
              resolve();
              return;
            }

            const video = videoRef.current;
            const handleReady = () => {
              video.play().catch(() => undefined).finally(() => resolve());
            };

            if (video.readyState >= 1) {
              handleReady();
              return;
            }

            video.onloadedmetadata = () => {
              video.onloadedmetadata = null;
              handleReady();
            };
          });
        }

        setCameraReady(true);
        setStatus(getWaitingStatus());
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
  }, [cameraSession, mode]);

  async function handleDetectedQr(rawValue: string) {
    if (mode === "customer-track") {
      setStatus("QR okundu. Kayıt kontrol ediliyor.");
      setBusy(true);
      try {
        const result = await fetchPublicTrackingByOfficialQr(rawValue);
        if (result) {
          navigate(`/takip/qr:${encodeURIComponent(rawValue)}`, { replace: true });
          return;
        }

        setShowManualFallback(true);
        setStatus("Kayıtlı QR bulunamadı. Lütfen plakanızı elle giriniz.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "motorcycle-bind") {
      setPendingQr(rawValue);
      setStatus("QR okundu. Devam etmeden önce kontrol et.");
      return;
    }

    setBusy(true);
    setPendingQr(rawValue);
    try {
      const motorcycle = await findMotorcycleByOfficialQr(rawValue);

      if (motorcycle) {
        setStatus(mode === "new-record-bind" ? "Bu QR zaten kayıtlı. Mevcut motosiklet açılıyor." : "QR kayıtlı. Motosiklet kaydı açılıyor.");
        navigate(`/motosiklet/${motorcycle.id}`, { replace: true });
        return;
      }

      if (mode === "service-search") {
        setShowUnregisteredQrFallback(true);
        setStatus("QR kayıtlı değil. Lütfen QR ile yeni kayıt oluşturun veya plakayı elle girin.");
        return;
      }

      if (mode === "new-record-bind") {
        setStatus("QR kayıtlı değil. Yeni kayıt ekranı açılıyor.");
        navigate(`/motosiklet-yeni?resmiQr=${encodeURIComponent(rawValue)}&yontem=qr`, { replace: true });
        return;
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "QR işlenemedi.");
      solvedRef.current = false;
      setPendingQr("");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!cameraReady || (mode === "motorcycle-bind" && pendingQr) || showManualFallback || showUnregisteredQrFallback) {
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

        void handleDetectedQr(rawValue);
      } catch {
        setSupportNote("QR algılama bu tarayıcıda sınırlı olabilir.");
      }
    }, 350);

    return () => window.clearInterval(interval);
  }, [cameraReady, mode, navigate, pendingQr, showManualFallback, showUnregisteredQrFallback]);

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
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setPendingQr("");
    setShowManualFallback(false);
    setShowUnregisteredQrFallback(false);
    setManualPlate("");
    setManualError("");
    setCameraReady(false);
    solvedRef.current = false;
    setStatus(`Kamera yeniden açılıyor. ${getWaitingStatus()}`);
    setCameraSession((current) => current + 1);
  }

  async function continueWithManualPlate() {
    const formattedPlate = formatPlateDisplay(manualPlate);
    if (!formattedPlate) {
      setManualError("Lütfen geçerli bir plaka giriniz.");
      return;
    }

    if (mode === "service-search") {
      setBusy(true);
      setManualError("");
      try {
        const motorcycle = await findMotorcycleByPlate(formattedPlate);
        if (!motorcycle) {
          setManualError("Bu plakaya ait kayıt bulunamadı. İstersen yeni kayıt oluşturabilirsin.");
          return;
        }
        navigate(`/motosiklet/${motorcycle.id}`, { replace: true });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "new-record-bind" || mode === "motorcycle-bind") {
      navigate(`/motosiklet-yeni?plaka=${encodeURIComponent(formattedPlate)}&yontem=manuel`, { replace: true });
      return;
    }

    setBusy(true);
    setManualError("");
    try {
      const result = await fetchPublicTrackingByPlate(formattedPlate);
      if (!result) {
        setManualError("Bu plakaya ait müşteri kaydı bulunamadı.");
        return;
      }
      navigate(`/takip/plaka:${encodeURIComponent(formattedPlate)}`, { replace: true });
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "customer-track"
      ? "Müşteri QR takibi"
      : mode === "motorcycle-bind"
        ? "Resmi QR bağla"
        : mode === "new-record-bind"
          ? "Resmi QR ile yeni kayıt"
          : "Resmi QR tara";

  const description =
    mode === "customer-track"
      ? "Plaka üzerindeki resmi QR okutulunca müşteri takip ekranı açılır."
      : mode === "motorcycle-bind"
        ? "Bu motosiklete ait resmi plaka QR'ını bir kez okut, sonraki girişler hızlansın."
        : mode === "new-record-bind"
          ? "Kayıtlı olmayan resmi QR'ı yeni motosiklet kaydına bağlamak için kullan."
          : "Kayıtlı resmi QR okutulur. Eşleşirse mevcut motosiklet kaydı açılır.";

  return (
    <div className="space-y-5 px-4 py-5">
      {pendingQr && mode === "motorcycle-bind" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-warning">Resmi plaka QR</p>
            <h3 className="mt-2 text-2xl font-bold text-ink">Okunan QR doğru mu?</h3>
            <p className="mt-2 text-sm leading-6 text-steel">
              Bu QR bu motosiklete bağlanacak. Gerekirse tekrar tarayabilirsin.
            </p>
            <Input className="mt-4 font-medium text-ink" value={pendingQr} onChange={(event) => setPendingQr(event.target.value)} />
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

      {showManualFallback && mode === "customer-track" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-warning">Müşteri takibi</p>
            <h3 className="mt-2 text-2xl font-bold text-ink">Kayıtlı QR bulunamadı</h3>
            <p className="mt-2 text-sm leading-6 text-steel">Lütfen plakanızı elle giriniz.</p>
            <div className="mt-5 space-y-3">
              <Input
                placeholder="Örnek: 34 ABC 123"
                value={manualPlate}
                onChange={(event) => setManualPlate(formatPlateDisplay(event.target.value))}
              />
              {manualError ? <p className="text-sm text-danger">{manualError}</p> : null}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="secondary" onClick={() => void continueWithManualPlate()} disabled={busy}>
                {busy ? "Kontrol ediliyor..." : "Plaka ile devam et"}
              </Button>
              <Button type="button" variant="ghost" onClick={resetScan}>
                QR'ı tekrar dene
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showUnregisteredQrFallback && mode === "service-search" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-warning">Resmi QR tara</p>
            <h3 className="mt-2 text-2xl font-bold text-ink">QR kayıtlı değil</h3>
            <p className="mt-2 text-sm leading-6 text-steel">
              Lütfen QR ile yeni kayıt oluşturun veya plakayı elle girin.
            </p>
            <div className="mt-5 space-y-3">
              <Input
                placeholder="Örnek: 34 ABC 123"
                value={manualPlate}
                onChange={(event) => setManualPlate(formatPlateDisplay(event.target.value))}
              />
              {manualError ? <p className="text-sm text-danger">{manualError}</p> : null}
            </div>
            <div className="mt-5 grid gap-3">
              <Button
                type="button"
                onClick={() => navigate(`/motosiklet-yeni?resmiQr=${encodeURIComponent(pendingQr)}&yontem=qr`, { replace: true })}
              >
                QR ile yeni kayıt oluştur
              </Button>
              <Button type="button" variant="secondary" onClick={() => void continueWithManualPlate()} disabled={busy}>
                {busy ? "Kontrol ediliyor..." : "Plakayı elle ara"}
              </Button>
              <Button type="button" variant="ghost" onClick={resetScan}>
                QR'ı tekrar dene
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Panel className="bg-ink text-white">
        <SectionTitle eyebrow="Canlı kamera" title={title} description={description} />

        {showManualFallback || showUnregisteredQrFallback ? (
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-5">
          <div className="space-y-1">
              <p className="text-lg font-semibold text-white">
                {showManualFallback ? "Kayıtlı QR bulunamadı" : "QR kayıtlı değil"}
              </p>
              <p className="text-sm text-white/80">
                {showManualFallback
                  ? "Lütfen plakanızı el ile giriniz."
                  : "Lütfen QR ile yeni kayıt oluşturun veya plakayı elle girin."}
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                className="border-white/10 bg-white/10 text-white placeholder:text-white/50"
                placeholder="Örnek: 34 ABC 123"
                value={manualPlate}
                onChange={(event) => setManualPlate(formatPlateDisplay(event.target.value))}
              />
              <Button type="button" variant="secondary" onClick={() => void continueWithManualPlate()} disabled={busy}>
                {busy ? "Kontrol ediliyor..." : showManualFallback ? "Plaka ile devam et" : "Plakayı elle ara"}
              </Button>
            </div>
            {manualError ? <p className="mt-3 text-sm text-amber-200">{manualError}</p> : null}
            {showUnregisteredQrFallback ? (
              <Button
                className="mt-4 w-full"
                type="button"
                onClick={() => navigate(`/motosiklet-yeni?resmiQr=${encodeURIComponent(pendingQr)}&yontem=qr`, { replace: true })}
              >
                QR ile yeni kayıt oluştur
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-black">
            <video key={cameraSession} ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted autoPlay />
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/10 px-4 py-4 text-sm">
            <div className="flex items-center gap-2 text-white">
              <QrCode size={16} />
              <span className="font-medium">{mode === "new-record-bind" ? "Yeni kayıt akışı" : "Kayıt bulma akışı"}</span>
            </div>
            <p className="mt-2 text-white/75">
              {mode === "new-record-bind"
                ? "Bu akışta kayıtlı QR mevcut motosikleti açar, kayıtlı olmayan QR ise yeni kayıt ekranını başlatır."
                : mode === "service-search"
                  ? "Bu akış sadece mevcut motosiklet kaydını bulmak için kullanılır. Kayıtsız QR burada yeni kayıt açmaz."
                  : "Bu akışta plaka OCR yok. Sadece plaka üstündeki QR okutulur."}
            </p>
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
          <Button variant="secondary" onClick={() => navigate(mode === "customer-track" ? "/giris" : "/panel")}>
            Geri dön
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              showManualFallback || showUnregisteredQrFallback
                ? resetScan()
                : navigate(mode === "customer-track" ? "/giris" : mode === "service-search" ? "/panel" : "/motosiklet-yeni?yontem=manuel")
            }
          >
            {showManualFallback || showUnregisteredQrFallback
              ? "QR'ı tekrar dene"
              : mode === "customer-track"
                ? "Plakayı elle gir"
                : mode === "service-search"
                  ? "Panele dön"
                  : "Elle plaka gir"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
