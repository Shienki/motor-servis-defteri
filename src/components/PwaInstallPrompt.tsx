import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (dismissed || isStandalone()) {
    return null;
  }

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
      return;
    }

    setDismissed(true);
  }

  const ios = isIos();

  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs text-white">
      <div className="flex items-center gap-2">
        <Download size={14} />
        <span>{ios ? "Ana ekrana ekle" : "Uygulama gibi yükle"}</span>
      </div>
      <p className="mt-1 text-white/75">
        {ios ? "Safari paylaş menüsünden Ana Ekrana Ekle seçeneğini kullan." : "Bu siteyi ana ekrana ekleyip tam ekran kullanabilirsin."}
      </p>
      {!ios ? (
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="mt-2 inline-flex rounded-full bg-amber px-3 py-1 font-medium text-ink"
        >
          Yükle
        </button>
      ) : null}
    </div>
  );
}
