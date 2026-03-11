import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { Button, Input, Label } from "../components/Ui";
import { getRememberedSystemAdmin, signInSystemAdmin } from "../lib/mockApi";

export function SystemAdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getRememberedSystemAdmin().then((admin) => {
      if (admin) {
        navigate("/system-admin/panel");
      }
    });
  }, [navigate]);

  return (
    <AuthShell title="System Admin Giriş" subtitle="Bu alan yalnızca sistem yöneticisi içindir. Kayıt ol ekranı yoktur.">
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await signInSystemAdmin({ username, password, rememberMe });
          if (!result.success) {
            setError("System admin bilgileri hatalı.");
            return;
          }
          navigate("/system-admin/panel");
        }}
      >
        <div className="rounded-2xl bg-sand px-4 py-3 text-sm text-steel">
          <div className="flex items-center gap-2 font-medium text-ink">
            <ShieldCheck size={16} />
            <span>Demo admin girişi</span>
          </div>
          <p className="mt-2">Gerçek kullanıcı adı ve şifreyi daha sonra yerel dosyaya birlikte koyacağız.</p>
        </div>

        <div>
          <Label>Kullanıcı Adı</Label>
          <Input value={username} onChange={(event) => setUsername(event.target.value)} required />
        </div>

        <div>
          <Label>Şifre</Label>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>

        <label className="flex items-center gap-3 text-sm text-steel">
          <input checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} type="checkbox" />
          Beni hatırla
        </label>

        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}

        <Button className="w-full" type="submit">
          Giriş Yap
        </Button>

        <p className="text-center text-sm text-steel">
          Normal kullanıcı girişi için{" "}
          <Link className="font-semibold text-warning" to="/giris">
            buraya dön
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
}
