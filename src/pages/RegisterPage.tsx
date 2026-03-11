import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { Button, Input, Label } from "../components/Ui";
import { lettersAndSpacesOnly } from "../lib/format";
import { registerUser } from "../lib/mockApi";

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    shopName: "",
    username: "",
    password: ""
  });
  const [error, setError] = useState("");

  return (
    <AuthShell title="Kayıt Ol" subtitle="Atölye hesabını oluştur, servis defterini dijitale taşıyalım.">
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await registerUser(form);
            navigate("/panel");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Kayıt oluşturulamadı.");
          }
        }}
      >
        <div>
          <Label>Ad Soyad</Label>
          <Input
            type="text"
            placeholder="Murat Yılmaz"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: lettersAndSpacesOnly(event.target.value) }))}
            required
          />
        </div>
        <div>
          <Label>Servis / Dükkan Adı</Label>
          <Input
            type="text"
            placeholder="Murat Motor Servis"
            value={form.shopName}
            onChange={(event) => setForm((current) => ({ ...current, shopName: event.target.value }))}
            required
          />
        </div>
        <div>
          <Label>Kullanıcı Adı</Label>
          <Input
            type="text"
            placeholder="muratusta"
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value.replace(/\s+/g, "") }))}
            required
          />
        </div>
        <div>
          <Label>Şifre</Label>
          <Input
            type="password"
            placeholder="En az 6 karakter"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
          />
        </div>

        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}

        <Button className="w-full" type="submit">
          Kayıt Ol
        </Button>

        <p className="text-center text-sm text-steel">
          Zaten hesabın var mı?{" "}
          <Link className="font-semibold text-warning" to="/giris">
            Giriş Yap
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
