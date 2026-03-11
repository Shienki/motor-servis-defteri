import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { Button, Input, Label } from "../components/Ui";
import { signInUser } from "../lib/mockApi";

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");

  return (
    <div className="relative">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <Button variant="ghost" onClick={() => navigate("/system-admin/giris")}>
          System Admin
        </Button>
      </div>

      <AuthShell title="Giriş Yap" subtitle="Servis kayıtlarına ulaşmak için hesabına giriş yap.">
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
      </AuthShell>
    </div>
  );
}
