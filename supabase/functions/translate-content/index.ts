import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TranslationRequest {
  id: string;
  key: string;
  sourceText: string;
  targetLanguage: string;
  targetNativeName: string;
}

interface AIProvider {
  name: string;
  endpoint: string;
  apiKey: string;
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
      isLovable: true,
    });
  }

  const geminiKeys = [
    Deno.env.get("GEMINI_API_KEY_1"),
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
  ];

  for (const key of geminiKeys) {
    if (key) {
      providers.push({
        name: "Gemini API",
        endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        apiKey: key,
        isLovable: false,
      });
    }
  }

  return providers;
}

async function translateWithAI(
  translations: TranslationRequest[],
  providers: AIProvider[]
): Promise<{ id: string; translatedText: string }[]> {
  
  // Build the prompt for batch translation
  const translationItems = translations.map((t, i) => 
    `${i + 1}. [${t.key}]: "${t.sourceText}"`
  ).join("\n");

  const targetLang = translations[0]?.targetLanguage || "Unknown";
  const targetNative = translations[0]?.targetNativeName || targetLang;

  const prompt = `Tu es un traducteur expert spécialisé dans les langues africaines, particulièrement les langues camerounaises comme le Ghomala (Ghɔmálá'), l'Ewondo, le Fulfulde, le Duala, le Basaa, et le Bamiléké.

Traduis les textes suivants du français vers le ${targetLang} (${targetNative}).

RÈGLES IMPORTANTES:
1. Utilise la bonne orthographe et les caractères spéciaux appropriés pour cette langue
2. Si tu ne connais pas certains mots techniques, garde-les en français entre parenthèses
3. Adapte les expressions culturellement quand nécessaire
4. Garde le sens et le ton original
5. Pour les termes agricoles spécifiques, utilise les termes locaux s'ils existent

TEXTES À TRADUIRE:
${translationItems}

RÉPONDS UNIQUEMENT avec un tableau JSON valide dans ce format exact:
[
  { "index": 1, "translation": "texte traduit 1" },
  { "index": 2, "translation": "texte traduit 2" }
]`;

  for (const provider of providers) {
    try {
      let response: Response;
      let resultText: string | null = null;

      if (provider.isLovable) {
        response = await fetch(provider.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4096,
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          resultText = data.choices?.[0]?.message?.content;
        }
      } else {
        response = await fetch(provider.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        }
      }

      if (resultText) {
        // Extract JSON array from response
        const jsonMatch = resultText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Map back to original IDs
          return parsed.map((item: { index: number; translation: string }) => ({
            id: translations[item.index - 1]?.id,
            translatedText: item.translation,
          })).filter((item: { id: string | undefined }) => item.id);
        }
      }
    } catch (error) {
      console.error(`${provider.name} error:`, error);
    }
  }

  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { translations } = await req.json() as { translations: TranslationRequest[] };

    if (!translations || translations.length === 0) {
      return new Response(
        JSON.stringify({ error: "No translations provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const providers = getAIProviders();
    if (providers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No AI providers configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Translating ${translations.length} items to ${translations[0].targetLanguage}`);

    // Process in batches of 10 to avoid token limits
    const batchSize = 10;
    const allResults: { id: string; translatedText: string }[] = [];

    for (let i = 0; i < translations.length; i += batchSize) {
      const batch = translations.slice(i, i + batchSize);
      const batchResults = await translateWithAI(batch, providers);
      allResults.push(...batchResults);
    }

    console.log(`Successfully translated ${allResults.length} items`);

    return new Response(
      JSON.stringify({
        success: true,
        translations: allResults,
        count: allResults.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: "Translation failed", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
