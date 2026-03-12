import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { Button, Input, Label } from "../components/Ui";
import { signInSystemAdmin } from "../lib/mockApi";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");

  return (
    <AuthShell title="Yönetici Girişi" subtitle="Hesapları ve genel durumu görmek için yönetici girişi yap.">
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await signInSystemAdmin({ username, password, rememberMe });
          if (!result.success) {
            setError("Yönetici kullanıcı adı veya şifre hatalı.");
            return;
          }
          navigate("/yonetici/panel");
        }}
      >
        <div>
          <Label>Yönetici Kullanıcı Adı</Label>
          <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="yonetici" required />
        </div>

        <div>
          <Label>Şifre</Label>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Şifrenizi girin" required />
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
          Yönetici girişi yap
        </Button>

        <p className="text-center text-sm text-steel">
          Usta girişine dönmek için{" "}
          <Link className="font-semibold text-warning" to="/giris">
            buraya geç
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
