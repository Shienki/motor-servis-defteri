import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Panel, SectionTitle } from "../components/Ui";
import { resolveQrRedirect } from "../lib/mockApi";

function fallbackPath(token: string) {
  if (token.startsWith("moto:")) {
    return `/takip/${token}`;
  }
  return "/giris";
}

export function QrRedirectPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    resolveQrRedirect(token).then((result) => {
      if (!result) {
        navigate(fallbackPath(token), { replace: true });
        return;
      }

      navigate(result.path, { replace: true });
    });
  }, [navigate, token]);

  return (
    <div className="min-h-screen bg-sand px-4 py-5">
      <div className="mx-auto max-w-xl">
        <Panel className="bg-ink text-white">
          <SectionTitle
            eyebrow="QR yönlendirme"
            title="Kayıt açılıyor"
            description="Oturum durumuna göre iç ekran veya müşteri takip ekranı açılıyor."
          />
        </Panel>
      </div>
    </div>
  );
}
