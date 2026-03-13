import { Camera, QrCode, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Panel, SectionTitle } from "../components/Ui";
import { findMotorcycleByPlate, resolveQrRedirect } from "../lib/mockApi";
import { formatPlateDisplay } from "../lib/format";

function parseQrToken(value: string) {
  const trimmed = value.trim();

  if (trimmed.includes("/qr/")) {
    return trimmed.split("/qr/")[1]?.split("?")[0] ?? "";
  }

  if (trimmed.includes("/takip/")) {
    return trimmed.split("/takip/")[1]?.split("?")[0] ?? "";
  }

  return trimmed;
}

function extractPlateCandidate(rawText: string) {
  const upper = rawText
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/[^A-Z0-9\s]/g, " ");

  const ignoredTokens = new Set(["TR", "TURKIYE", "TÜRKİYE", "HONDA", "KONSUK", "CEVIZLI"]);
  const tokenLines = upper
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/).filter(Boolean).filter((token) => !ignoredTokens.has(token)));

  const candidates = new Set<string>();
  const compact = upper.replace(/[^A-Z0-9]/g, "");

  for (const match of compact.match(/\d{1,2}[A-Z]{1,3}\d{2,4}/g) ?? []) {
    candidates.add(match);
  }

  const tokens = tokenLines.flat();
  for (let index = 0; index < tokens.length; index += 1) {
    for (let size = 2; size <= 4; size += 1) {
      const joined = tokens.slice(index, index + size).join("");
      if (/^\d{1,2}[A-Z]{1,3}\d{2,4}$/.test(joined)) {
        candidates.add(joined);
      }
    }
  }

  for (let index = 0; index < tokenLines.length - 1; index += 1) {
    const top = tokenLines[index];
    const bottom = tokenLines[index + 1];
    if (!top.length || !bottom.length) continue;

    const topJoined = top.join("");
    const bottomJoined = bottom.join("");
    const joined = `${topJoined}${bottomJoined}`;
    if (/^\d{1,2}[A-Z]{1,3}\d{2,4}$/.test(joined)) {
      candidates.add(joined);
    }
  }

  const candidate = [...candidates]
    .sort((left, right) => right.length - left.length)
    .find((value) => /^\d{1,2}[A-Z]{1,3}\d{2,4}$/.test(value)) ?? "";

  return formatPlateDisplay(candidate);
}

export function CameraScannerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const solvedRef = useRef(false);
  const ocrBusyRef = useRef(false);
  const target = searchParams.get("hedef") ?? "arama";
  const isNewRecordFlow = target === "yeni-kayit";
  const [status, setStatus] = useState(
    isNewRecordFlow
      ? "Kamera açılıyor. Telefonu plakaya 1-2 saniye sabit tut."
      : "Kamera açılıyor. QR için etiketi göster, plaka için telefonu sabit tut."
  );
  const [cameraReady, setCameraReady] = useState(false);
  const [lastDetected, setLastDetected] = useState("");
  const [supportNote, setSupportNote] = useState("");
  const [pendingPlate, setPendingPlate] = useState("");

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
          setCameraReady(true);
          setStatus(isNewRecordFlow ? "Plaka bekleniyor." : "QR veya plaka bekleniyor.");
        }
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
  }, [isNewRecordFlow]);

  useEffect(() => {
    if (isNewRecordFlow || !cameraReady || !videoRef.current) {
      return;
    }

    const BarcodeDetectorCtor = (globalThis as typeof globalThis & { BarcodeDetector?: any }).BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      setSupportNote("Bu cihazda yerel QR tarayıcı desteği yok. Plaka okuma yine çalışır.");
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
        setLastDetected(rawValue);
        setStatus("QR bulundu, yönlendiriyorum.");
        const token = parseQrToken(rawValue);
        const result = await resolveQrRedirect(token);
        navigate(result?.path ?? "/panel", { replace: true });
      } catch {
        setSupportNote("QR algılama bu tarayıcıda sınırlı çalışıyor olabilir.");
      }
    }, 350);

    return () => window.clearInterval(interval);
  }, [cameraReady, isNewRecordFlow, navigate]);

  useEffect(() => {
    if (!cameraReady || !videoRef.current || !canvasRef.current) {
      return;
    }

    const interval = window.setInterval(async () => {
      if (solvedRef.current || ocrBusyRef.current || !videoRef.current || !canvasRef.current) {
        return;
      }

      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) {
        return;
      }

      ocrBusyRef.current = true;

      try {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) {
          return;
        }

        const cropWidth = Math.floor(video.videoWidth * 0.9);
        const cropHeight = Math.floor(video.videoHeight * 0.42);
        const offsetX = Math.floor((video.videoWidth - cropWidth) / 2);
        const offsetY = Math.floor(video.videoHeight * 0.46);

        canvas.width = cropWidth;
        canvas.height = cropHeight;
        context.filter = "grayscale(1) contrast(1.55) brightness(1.08)";
        context.drawImage(video, offsetX, offsetY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        context.filter = "none";

        const Tesseract = await import("tesseract.js");
        const result = await Tesseract.recognize(canvas, "eng", { logger: () => undefined });
        const plate = extractPlateCandidate(result.data.text);

        if (!plate) {
          return;
        }

        solvedRef.current = true;
        setLastDetected(plate);
        setPendingPlate(plate);
        setStatus(`Plaka okundu: ${plate}. Devam etmeden önce kontrol et.`);
      } catch {
        setSupportNote("Plaka okunamadıysa kamerayı biraz daha yaklaştırıp sabit tut.");
      } finally {
        ocrBusyRef.current = false;
      }
    }, 1600);

    return () => window.clearInterval(interval);
  }, [cameraReady, navigate]);

  async function confirmDetectedPlate() {
    if (!pendingPlate.trim()) return;

    const plate = formatPlateDisplay(pendingPlate);
    const existing = await findMotorcycleByPlate(plate);
    if (existing) {
      navigate(`/motosiklet/${existing.id}`, { replace: true });
      return;
    }

    navigate(`/motosiklet-yeni?plaka=${encodeURIComponent(plate)}&yontem=kamera`, { replace: true });
  }

  function resetPlateScan() {
    setPendingPlate("");
    setLastDetected("");
    solvedRef.current = false;
    setStatus(isNewRecordFlow ? "Plaka bekleniyor." : "QR veya plaka bekleniyor.");
  }

  return (
    <div className="space-y-5 px-4 py-5">
      {pendingPlate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.24em] text-warning">Plaka kontrolü</p>
            <h3 className="mt-2 text-2xl font-bold text-ink">Okunan plaka doğru mu?</h3>
            <p className="mt-2 text-sm leading-6 text-steel">
              Kamera harf veya rakamı yanlış okuyabilir. Devam etmeden önce plakayı kontrol et.
            </p>
            <input
              value={pendingPlate}
              onChange={(event) => setPendingPlate(formatPlateDisplay(event.target.value))}
              className="mt-4 w-full rounded-2xl border border-slate/10 bg-sand px-4 py-3 text-lg font-semibold tracking-[0.12em] text-ink outline-none ring-0"
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="secondary" onClick={resetPlateScan}>
                Tekrar tara
              </Button>
              <Button type="button" onClick={() => void confirmDetectedPlate()}>
                Onayla ve devam et
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <Panel className="bg-ink text-white">
        <SectionTitle
          eyebrow="Canlı kamera"
          title={isNewRecordFlow ? "Plakayı okut" : "QR veya plakayı okut"}
          description={
            isNewRecordFlow
              ? "Foto çekmeden canlı görüntüden sadece plaka okunur."
              : "Foto çekmeden canlı görüntüden önce QR, bulunamazsa plaka okunur."
          }
        />

        <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-black">
          <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted autoPlay />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className={`mt-4 grid gap-3 ${isNewRecordFlow ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          {!isNewRecordFlow ? (
            <div className="rounded-2xl bg-white/10 px-4 py-4 text-sm">
              <div className="flex items-center gap-2 text-white">
                <QrCode size={16} />
                <span className="font-medium">QR öncelikli</span>
              </div>
              <p className="mt-2 text-white/75">QR görünürse anında doğru ekrana gider.</p>
            </div>
          ) : null}
          <div className="rounded-2xl bg-white/10 px-4 py-4 text-sm">
            <div className="flex items-center gap-2 text-white">
              <ScanLine size={16} />
              <span className="font-medium">Plaka okuma</span>
            </div>
            <p className="mt-2 text-white/75">
              {isNewRecordFlow ? "Canlı görüntüden plaka aranır." : "QR yoksa plakadan devam edilir."}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-4 text-sm">
            <div className="flex items-center gap-2 text-white">
              <Camera size={16} />
              <span className="font-medium">Canlı tarama</span>
            </div>
            <p className="mt-2 text-white/75">Fotoğraf çekmeden otomatik çalışır.</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-white/85">{status}</p>
        {lastDetected ? <p className="mt-2 text-sm text-amber-200">Son algılanan: {lastDetected}</p> : null}
        {supportNote ? <p className="mt-2 text-sm text-white/70">{supportNote}</p> : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => navigate("/panel")}>
            Panele dön
          </Button>
          <Button variant="ghost" onClick={() => navigate("/motosiklet-yeni?yontem=manuel")}>
            Elle devam et
          </Button>
        </div>
      </Panel>
    </div>
  );
}
