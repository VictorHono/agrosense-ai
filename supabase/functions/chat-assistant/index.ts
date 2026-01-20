import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AIProvider {
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
  isLovable: boolean;
}

function getAIProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    providers.push({
      name: "Lovable AI Gateway",
      endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
      apiKey: lovableKey,
      model: "google/gemini-2.5-flash",
      isLovable: true,
    });
  }

  const geminiKeys = [
    { key: Deno.env.get("GEMINI_API_KEY_1"), name: "Gemini API 1" },
    { key: Deno.env.get("GEMINI_API_KEY_2"), name: "Gemini API 2" },
    { key: Deno.env.get("GEMINI_API_KEY_3"), name: "Gemini API 3" },
    { key: Deno.env.get("GEMINI_API_KEY_4"), name: "Gemini API 4" },
    { key: Deno.env.get("GEMINI_API_KEY_5"), name: "Gemini API 5" },
  ];

  for (const { key, name } of geminiKeys) {
    if (key) {
      providers.push({
        name,
        endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        apiKey: key,
        model: "gemini-2.0-flash",
        isLovable: false,
      });
    }
  }

  return providers;
}

function buildLovableRequest(messages: ChatMessage[], systemPrompt: string) {
  return {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    max_tokens: 1024,
    temperature: 0.7,
  };
}

function buildGeminiRequest(messages: ChatMessage[], systemPrompt: string) {
  const conversationText = messages
    .map(m => `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  return {
    contents: [
      {
        parts: [
          { text: `${systemPrompt}\n\nConversation:\n${conversationText}\n\nAssistant:` },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };
}

function parseLovableResponse(data: any): string | null {
  return data.choices?.[0]?.message?.content || null;
}

function parseGeminiResponse(data: any): string | null {
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

function isRecoverableError(status: number): boolean {
  return status === 429 || status === 402 || status === 503 || status === 500 || status === 529;
}

async function callProvider(
  provider: AIProvider,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<{ success: boolean; response?: string; error?: string; shouldRetry: boolean }> {
  console.log(`Trying provider: ${provider.name}`);

  try {
    let response: Response;
    let result: string | null;

    if (provider.isLovable) {
      response = await fetch(provider.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildLovableRequest(messages, systemPrompt)),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${provider.name} error:`, response.status, errorText);
        return {
          success: false,
          error: `${provider.name}: ${response.status}`,
          shouldRetry: isRecoverableError(response.status),
        };
      }

      const data = await response.json();
      result = parseLovableResponse(data);
    } else {
      response = await fetch(provider.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildGeminiRequest(messages, systemPrompt)),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${provider.name} error:`, response.status, errorText);
        return {
          success: false,
          error: `${provider.name}: ${response.status}`,
          shouldRetry: isRecoverableError(response.status),
        };
      }

      const data = await response.json();
      result = parseGeminiResponse(data);
    }

    if (!result) {
      console.error(`${provider.name}: Failed to parse response`);
      return {
        success: false,
        error: `${provider.name}: Parse error`,
        shouldRetry: true,
      };
    }

    console.log(`${provider.name} succeeded`);
    return { success: true, response: result, shouldRetry: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${provider.name} exception:`, error);
    return {
      success: false,
      error: `${provider.name}: ${errorMessage}`,
      shouldRetry: true,
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language = "fr", region = "centre" } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const providers = getAIProviders();
    if (providers.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun fournisseur IA configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Tu es AgroCamer Assistant, un conseiller agricole expert pour les agriculteurs camerounais.

CONTEXTE:
- Région de l'utilisateur: ${region}
- Langue: ${language === "fr" ? "Français" : "English"}

TES COMPÉTENCES:
1. Conseils sur les cultures camerounaises: cacao, café, maïs, manioc, banane plantain, tomate, gombo, arachide, haricot, igname, macabo, patate douce
2. Identification et traitement des maladies des plantes
3. Calendrier agricole adapté aux saisons camerounaises
4. Prix du marché et conseils de vente
5. Techniques agricoles durables
6. Gestion des sols et irrigation

RÈGLES:
- Réponds UNIQUEMENT en ${language === "fr" ? "français" : "anglais"}
- Utilise un vocabulaire simple accessible à tous les niveaux d'éducation
- Privilégie les solutions locales et biologiques
- Mentionne les noms locaux des maladies et traitements quand possible
- Sois concis mais informatif (max 150 mots)
- Si tu ne sais pas, admets-le et suggère de consulter un technicien agricole local

PERSONNALITÉ:
- Amical et encourageant
- Patient et pédagogue
- Respectueux des pratiques traditionnelles`;

    let lastError = "";

    for (const provider of providers) {
      const { success, response, error, shouldRetry } = await callProvider(
        provider,
        messages,
        systemPrompt
      );

      if (success && response) {
        return new Response(
          JSON.stringify({
            success: true,
            message: response,
            timestamp: new Date().toISOString(),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      lastError = error || "Unknown error";
      
      if (!shouldRetry) {
        break;
      }
    }

    return new Response(
      JSON.stringify({ 
        error: "Service temporairement indisponible. Veuillez réessayer.",
        details: lastError
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in chat-assistant function:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur est survenue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
