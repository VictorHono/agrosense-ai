import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
  readTime: string;
  crop?: string;
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
    { key: Deno.env.get("GEMINI_API_KEY_1"), name: "Gemini API 1" },
    { key: Deno.env.get("GEMINI_API_KEY_2"), name: "Gemini API 2" },
  ];

  for (const { key, name } of geminiKeys) {
    if (key) {
      providers.push({
        name,
        endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        apiKey: key,
        isLovable: false,
      });
    }
  }

  return providers;
}

async function generateTipsWithAI(
  category: string,
  region: string,
  language: string
): Promise<Tip[]> {
  const providers = getAIProviders();
  if (providers.length === 0) {
    return [];
  }

  const currentMonth = new Date().toLocaleString("fr-FR", { month: "long" });

  const categoryPrompts: Record<string, string> = {
    seasonal: `Génère 4 conseils agricoles saisonniers pour le mois de ${currentMonth} au Cameroun, région ${region}.`,
    crops: `Génère 4 conseils pratiques pour les cultures principales du Cameroun (cacao, café, maïs, manioc, banane plantain).`,
    regional: `Génère 4 conseils agricoles spécifiques à la région ${region} du Cameroun.`,
    guides: `Génère 4 guides pratiques courts pour les agriculteurs camerounais (préparation du sol, récolte, stockage, vente).`,
  };

  const prompt = `${categoryPrompts[category] || categoryPrompts.seasonal}

Chaque conseil doit être:
- Pratique et actionnable
- Adapté au contexte camerounais
- Court mais informatif (50-100 mots de contenu)

Réponds UNIQUEMENT avec un tableau JSON valide:
[
  {
    "id": "unique_id",
    "title": "Titre du conseil",
    "content": "Contenu détaillé du conseil...",
    "category": "${category}",
    "readTime": "X min",
    "crop": "culture concernée si applicable"
  }
]

Langue: ${language === "fr" ? "français" : "anglais"}`;

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
            max_tokens: 2048,
            temperature: 0.7,
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
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        }
      }

      if (resultText) {
        const jsonMatch = resultText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as Tip[];
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
    const { category = "seasonal", region = "centre", language = "fr" } = await req.json();

    const tips = await generateTipsWithAI(category, region, language);

    return new Response(
      JSON.stringify({
        success: true,
        tips,
        category,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating tips:", error);
    return new Response(
      JSON.stringify({ error: "Impossible de générer les conseils" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
