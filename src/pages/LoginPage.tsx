import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { Button, Input, Label } from "../components/Ui";
import { signInUser } from "../lib/mockApi";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function installOnAndroid() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  return (
    <div className="relative">
      <AuthShell title="Giriş Yap" subtitle="Servis kayıtlarına ulaşmak için hesabına giriş yap.">
        <div className="space-y-4">
          {!isStandalone() ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate/10 bg-white/80 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Share size={16} />
                  <span>iPhone için ana ekrana ekle</span>
                </div>
                <p className="mt-2 text-sm text-steel">
                  Safari&apos;de paylaş butonuna bas, sonra <span className="font-semibold text-ink">Ana Ekrana Ekle</span> seçeneğini seç.
                </p>
              </div>

              <div className="rounded-2xl border border-slate/10 bg-white/80 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Download size={16} />
                  <span>Android için ana ekrana ekle</span>
                </div>
                <p className="mt-2 text-sm text-steel">Chrome üzerinden bu siteyi ana ekrana yükleyip uygulama gibi kullanabilirsin.</p>
                <Button className="mt-3" type="button" variant="secondary" onClick={() => void installOnAndroid()} disabled={!deferredPrompt}>
                  Ana ekrana ekle
                </Button>
              </div>
            </div>
          ) : null}

          <form
            className="space-y-5"
            onSubmit={async (event) => {
              event.preventDefault();
              const result = await signInUser({ username, password, rememberMe });
              if (!result.success) {
                setError("Kullanıcı adı veya şifre hatalı.");
                return;
              }
              navigate("/panel");
            }}
          >
            <div>
              <Label>Kullanıcı Adı</Label>
              <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="muratusta" required />
            </div>

            <div>
              <Label>Şifre</Label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Şifrenizi girin"
                required
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-steel">
              <input
                className="h-4 w-4 rounded border-slate/20"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              Beni hatırla
            </label>

            {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}

            <Button className="w-full" type="submit">
              Giriş Yap
            </Button>

            <p className="text-center text-sm text-steel">
              Hesabın yok mu?{" "}
              <Link className="font-semibold text-warning" to="/kayit">
                Kayıt Ol
              </Link>
            </p>
          </form>
        </div>
      </AuthShell>
    </div>
  );
}
