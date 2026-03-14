import { Camera, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Label, Panel, SectionTitle, Textarea } from "../components/Ui";
import { bindOfficialQrToMotorcycle, createMotorcycle, findMotorcycleByPlate } from "../lib/mockApi";
import { canonicalPlate, formatPlateDisplay, lettersAndSpacesOnly, numbersOnly } from "../lib/format";
import type { Motorcycle } from "../types";

export function NewMotorcyclePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoScanStarted = useRef(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Yeni kayıt için plakayı elle yaz veya resmi QR'ı bu kayda bağla.");
  const [duplicateMotorcycle, setDuplicateMotorcycle] = useState<Motorcycle | null>(null);
  const officialQr = searchParams.get("resmiQr")?.trim() ?? "";
  const [form, setForm] = useState({
    licensePlate: "",
    model: "",
    customerName: "",
    phone: "",
    kilometer: "",
    notes: ""
  });

  useEffect(() => {
    const plate = searchParams.get("plaka");
    if (plate) {
      setForm((current) => ({
        ...current,
        licensePlate: formatPlateDisplay(plate)
      }));
      setMessage(`Plaka hazır: ${formatPlateDisplay(plate)}. Aşağıdan yeni kayıt açabilirsin.`);
    }

    if (searchParams.get("yontem") === "kamera" && !plate && !autoScanStarted.current) {
      autoScanStarted.current = true;
      navigate("/kamera?hedef=yeni-kayit-qr", { replace: true });
    }
  }, [navigate, searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const existing = await findMotorcycleByPlate(form.licensePlate);
      if (existing) {
        setSaving(false);
        setMessage(`Bu plaka zaten kayıtlı: ${formatPlateDisplay(form.licensePlate)}.`);
        setDuplicateMotorcycle(existing);
        return;
      }

      const motorcycle = await createMotorcycle({
        userId: "user-1",
        licensePlate: formatPlateDisplay(form.licensePlate),
        model: form.model,
        customerName: form.customerName,
        phone: form.phone,
        kilometer: Number(form.kilometer || 0),
        notes: form.notes
      });

      if (officialQr) {
        await bindOfficialQrToMotorcycle(motorcycle.id, officialQr);
      }

      setForm({
        licensePlate: "",
        model: "",
        customerName: "",
        phone: "",
        kilometer: "",
        notes: ""
      });
      setMessage("Yeni motosiklet kaydı oluşturuldu.");
      navigate(`/motosiklet/${motorcycle.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kayıt oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 px-4 py-5">
      {duplicateMotorcycle ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4">
          <Panel className="w-full max-w-md">
            <SectionTitle
              eyebrow="Aynı plaka bulundu"
              title={formatPlateDisplay(duplicateMotorcycle.licensePlate)}
              description="Daha önce bu plakaya ait bir kayıt oluşturulmuş. Mevcut kayda yönlendireyim mi?"
            />
            <div className="mt-5 rounded-2xl bg-sand px-4 py-4 text-sm text-steel">
              <p className="font-medium text-ink">{duplicateMotorcycle.customerName}</p>
              <p className="mt-1">{duplicateMotorcycle.model}</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button type="button" onClick={() => navigate(`/motosiklet/${duplicateMotorcycle.id}`)}>
                Evet
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDuplicateMotorcycle(null);
                  setMessage("İstersen plakayı veya diğer bilgileri değiştirip devam edebilirsin.");
                }}
              >
                Hayır
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}

      <Panel className="bg-ink text-white">
        <SectionTitle
          eyebrow="Yeni kayıt"
          title="Yeni motosiklet kaydı aç"
          description="Plakayı elle yaz. İstersen resmi plaka QR'ını doğrudan bu yeni kayda bağlayabilirsin."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            className="border-white/10 bg-white/10 text-white placeholder:text-sand/50"
            placeholder="Örnek: 25 AA 25"
            value={form.licensePlate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                licensePlate: formatPlateDisplay(event.target.value)
              }))
            }
          />
          <Button className="gap-2" variant="ghost" onClick={() => navigate("/kamera?hedef=yeni-kayit-qr")}>
            <Camera size={18} />
            Resmi QR ile Yeni Kayıt
          </Button>
        </div>
        {officialQr ? (
          <div className="mt-4 rounded-2xl bg-white/10 px-4 py-4 text-sm text-white/85">
            Bu kayıt oluşturulunca okuttuğun resmi plaka QR'ı bu motosiklete bağlanacak.
          </div>
        ) : null}
        <p className="mt-4 text-sm text-sand/80">{message}</p>
      </Panel>

      <Panel>
        <SectionTitle
          eyebrow="Manuel bilgiler"
          title="Kayıt detayları"
          description="Plaka standart formatta tutulur. Diğer bilgileri ustaya göre hızlıca doldur."
        />
        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Plaka</Label>
              <Input
                value={form.licensePlate}
                maxLength={12}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    licensePlate: formatPlateDisplay(event.target.value)
                  }))
                }
                required
              />
            </div>
            <div>
              <Label>Motosiklet modeli</Label>
              <Input
                value={form.model}
                maxLength={80}
                onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Müşteri adı</Label>
              <Input
                value={form.customerName}
                maxLength={80}
                onChange={(event) =>
                  setForm((current) => ({ ...current, customerName: lettersAndSpacesOnly(event.target.value) }))
                }
                required
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                value={form.phone}
                maxLength={11}
                inputMode="numeric"
                onChange={(event) => setForm((current) => ({ ...current, phone: numbersOnly(event.target.value) }))}
                required
              />
            </div>
          </div>

          <div>
            <Label>Kilometre</Label>
            <Input
              inputMode="numeric"
              value={form.kilometer}
              onChange={(event) => setForm((current) => ({ ...current, kilometer: numbersOnly(event.target.value) }))}
            />
          </div>

          <div>
            <Label>Notlar</Label>
            <Textarea
              maxLength={500}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="submit" className="gap-2" disabled={saving || !canonicalPlate(form.licensePlate)}>
              <Save size={18} />
              {saving ? "Kaydediliyor..." : "Kaydı Oluştur"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/kayitlar")}>
              Kayıt Menüsüne Dön
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
