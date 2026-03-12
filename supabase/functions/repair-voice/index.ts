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
Sen Turkiye'de calisan deneyimli bir motosiklet servis danismani gibi dusun.
Sana bir ustanÄ±n daginik servis notu verilecek. Bu not konusmadan yaziya cevrilmis olabilir ve kucuk yazim hatalari icerebilir.
Metindeki mekanik terimleri baglama gore duzelt. Yanlis duyulmus veya eksik yazilmis parca ya da islem adlarini motosiklet servis baglamina gore en olasi dogru ifadeyle duzelt.

Gorevin:
1. Metindeki acik yazim veya duyma hatalarini baglama gore duzelt.
2. Yapilan islemleri description alanina duzenli ve kisa bir paragraf halinde yaz.
3. Iscilik tutarini labor_cost alanina yaz.
4. Yedek parca tutarini parts_cost alanina yaz.
5. Kilometre bilgisini kilometer alanina yaz.
6. Odeme durumunu payment_status alanina yaz.
7. Gelecekte yapilacak isler, sonraya kalan islemler, musteri notlari ve tekrar kontrol edilecek parcalari notes alanina yaz.
8. assistant_summary alaninda ustaya kisa ve net cevap ver. "Su sekilde kaydedilecek" mantiginda konus.

Kurallar:
- Sadece gecerli JSON uret.
- Tutar uydurma. Metinde yoksa null birak.
- Kilometre yoksa null birak.
- Odeme durumu acik degilse null birak.
- "500 pesin alindi", "kalan haftaya", "bir kismi odendi" gibi ifadeler partial olmali.
- "odendi", "hesap kapandi" gibi ifadeler paid olmali.
- "odenmedi", "sonra alinacak", "veresiye" gibi ifadeler unpaid olmali.
- Description alanina yalnizca bu islemde yapilan isler yazilsin.
- Notes alanina ozellikle ileriye donuk veya ek not niteligindeki bilgiler yazilsin.
- Eger metinde hem yapilan is hem yapilacak is geciyorsa:
  - yapilan is description
  - yapilacak is notes
  olarak ayrilmali.
- Iscilik, parca, kilometre, odeme durumu gibi alan bilgilerini description icine tekrar yazma.
- Eger kullanici sadece "yedek parca ucreti 1500 TL" gibi bir alan soylediyse description bos olabilir.
- Odeme ile ilgili "odendi", "odenmedi", "kismi odendi", "500 pesin", "kalan sonra" gibi ifadeleri payment_status alanina mutlaka yansit.
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
        { role: "system", content: repairDraftSystemPrompt },
        { role: "user", content: `Ustanin servis notu:\n${transcript}` }
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
    throw new Error("OpenAI bos yanit dondurdu.");
  }

  return JSON.parse(content);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openAiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

    if (!openAiKey) {
      return new Response(JSON.stringify({ error: "Function ortam degiskenleri eksik." }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Ses dosyasi bulunamadi." }), {
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
      return new Response(JSON.stringify({
        error: `Whisper istegi basarisiz oldu (${transcriptionResponse.status}). ${errorText || "OpenAI yaniti alinamadi."}`
      }), {
        status: 502,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const transcriptionData = (await transcriptionResponse.json()) as { text?: string };
    const transcript = transcriptionData.text?.trim() ?? "";

    if (!transcript) {
      return new Response(JSON.stringify({ error: "Ses kaydi cozumlenemedi." }), {
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
    const message = error instanceof Error ? error.message : "Ses kaydi islenemedi.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
