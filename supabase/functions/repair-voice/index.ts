const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const repairDraftSchema = {
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

const repairDraftSystemPrompt = `
Sen Türkiye'de çalışan deneyimli bir motosiklet servis danışmanı gibi düşün.
Sana bir ustanın dağınık servis notu verilecek. Bu not konuşmadan yazıya çevrilmiş olabilir ve küçük yazım hataları içerebilir.
Metindeki mekanik terimleri bağlama göre düzelt. Örneğin yanlış duyulmuş veya eksik yazılmış bir parça veya işlem adı varsa motosiklet servis bağlamına göre en olası doğru ifadeyi kullan.

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

async function categorizeRepairTranscript(transcript: string, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: repairDraftSystemPrompt
        },
        {
          role: "user",
          content: `Ustanın servis notu:\n${transcript}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: repairDraftSchema
      }
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI boş yanıt döndürdü.");
  }

  return JSON.parse(content);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  try {
    const openAiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!openAiKey) {
      return new Response(JSON.stringify({ error: "Function ortam değişkenleri eksik." }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    if (!token) {
      return new Response(JSON.stringify({ error: "Oturum gerekli." }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Ses dosyası bulunamadı." }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const transcriptionForm = new FormData();
    transcriptionForm.append("file", file, file.name || "repair-note.webm");
    transcriptionForm.append("model", "whisper-1");
    transcriptionForm.append("language", "tr");

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`
      },
      body: transcriptionForm
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      return new Response(JSON.stringify({ error: errorText || "Whisper işlenemedi." }), {
        status: transcriptionResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const transcriptionData = (await transcriptionResponse.json()) as { text?: string };
    const transcript = transcriptionData.text?.trim() ?? "";

    if (!transcript) {
      return new Response(JSON.stringify({ error: "Ses kaydı çözülemedi." }), {
        status: 422,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const parsed = await categorizeRepairTranscript(transcript, openAiKey);

    return new Response(
      JSON.stringify({
        transcript,
        ...parsed
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ses kaydı işlenemedi.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
