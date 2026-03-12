import { requireAuthenticatedUser } from "./_supabase";

type RepairDraft = {
  description: string;
  labor_cost: number | null;
  parts_cost: number | null;
  kilometer: number | null;
  payment_status: "paid" | "unpaid" | "partial" | null;
  notes: string;
  assistant_summary: string;
};

const schema = {
  name: "repair_draft",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      description: { type: "string" },
      labor_cost: { type: ["number", "null"] },
      parts_cost: { type: ["number", "null"] },
      kilometer: { type: ["number", "null"] },
      payment_status: {
        type: ["string", "null"],
        enum: ["paid", "unpaid", "partial", null]
      },
      notes: { type: "string" },
      assistant_summary: { type: "string" }
    },
    required: ["description", "labor_cost", "parts_cost", "kilometer", "payment_status", "notes", "assistant_summary"]
  }
};

const systemPrompt = `
Sen Türkiye'de çalışan deneyimli bir motosiklet servis danışmanı gibi düşün.
Sana bir ustanın dağınık servis notu verilecek. Bu not konuşmadan yazıya çevrilmiş olabilir ve küçük yazım hataları içerebilir.
Metindeki mekanik terimleri bağlama göre düzelt. Örneğin yanlış duyulmuş veya eksik yazılmış bir parça / işlem adı varsa motosiklet servis bağlamına göre en olası doğru ifadeyi kullan.

Görevin:
1. Metindeki açık yazım veya duyma hatalarını bağlama göre düzelt.
2. Yapılan işlemleri description alanına düzenli ve tek paragraf halinde yaz.
3. İşçilik tutarını labor_cost alanına yaz.
4. Yedek parça tutarını parts_cost alanına yaz.
5. Kilometre bilgisini kilometer alanına yaz.
6. Ödeme durumunu payment_status alanına yaz.
7. Gelecekte yapılacak işler, sonraya kalan işlemler, müşteri notları, tekrar kontrol edilecek parçalar gibi şeyleri notes alanına yaz.
8. assistant_summary alanında ustaya kısa ve net cevap ver. "Şu şekilde kaydedilecek" mantığında konuş.

Kurallar:
- Sadece geçerli JSON üret.
- Tutar uydurma. Metinde yoksa null bırak.
- Kilometre yoksa null bırak.
- Ödeme durumu açık değilse null bırak.
- "500 peşin alındı", "kalan haftaya", "bir kısmı ödendi" gibi ifadeler partial olmalı.
- "ödendi", "hesap kapandı" gibi ifadeler paid olmalı.
- "ödenmedi", "sonra alınacak", "veresiye" gibi ifadeler unpaid olmalı.
- Description alanına yalnızca bu işlemde yapılan işler yazılsın.
- Notes alanına özellikle ileriye dönük veya ek not niteliğindeki bilgiler yazılsın.
- Eğer metinde hem yapılan iş hem yapılacak iş geçiyorsa:
  - yapılan iş description
  - yapılacak iş notes
  olarak ayrılmalı.
- İşçilik, parça, kilometre, ödeme durumu gibi alan bilgilerini description içine tekrar yazma.
- Eğer kullanıcı sadece "yedek parça ücreti 1500 TL" gibi bir alan söylediyse description boş olabilir.
- Ödeme ile ilgili "ödendi", "ödenmedi", "kısmi ödendi", "500 peşin", "kalan sonra" gibi ifadeleri payment_status alanına mutlaka yansıt.
`;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authenticatedUser = await requireAuthenticatedUser(req);
  if (!authenticatedUser.user) {
    res.status(401).json({ error: "Oturum gerekli." });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({ error: "OPENAI_API_KEY tanımlı değil." });
    return;
  }

  const transcript = typeof req.body?.transcript === "string" ? req.body.transcript.trim() : "";

  if (!transcript) {
    res.status(400).json({ error: "Transcript zorunlu." });
    return;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Ustanın servis notu:\n${transcript}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: schema
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    res.status(response.status).json({ error: errorText });
    return;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    res.status(502).json({ error: "OpenAI boş yanıt döndü." });
    return;
  }

  const parsed = JSON.parse(content) as RepairDraft;
  res.status(200).json(parsed);
}
