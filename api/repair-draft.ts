type RepairDraft = {
  description: string;
  labor_cost: number | null;
  parts_cost: number | null;
  kilometer: number | null;
  payment_status: "paid" | "unpaid" | "partial" | null;
  notes: string;
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
      notes: { type: "string" }
    },
    required: ["description", "labor_cost", "parts_cost", "kilometer", "payment_status", "notes"]
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
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
      messages: [
        {
          role: "system",
          content:
            "Sen motosiklet servis notlarını yapılandırılmış alana çeviren bir asistansın. Yalnızca geçerli JSON üret. Eksik bilgi varsa null döndür. Fiyat uydurma."
        },
        {
          role: "user",
          content: `Aşağıdaki servis notunu analiz et ve alanlara ayır:\n${transcript}`
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
