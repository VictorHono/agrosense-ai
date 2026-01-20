import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HarvestResult {
  grade: "A" | "B" | "C";
  quality: {
    color: number;
    size: number;
    defects: number;
    uniformity: number;
    maturity: number;
  };
  recommendedUse: string[];
  estimatedPrice: {
    min: number;
    max: number;
    currency: string;
    unit: string;
    market: string;
  };
  feedback: string;
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

function buildLovableRequest(systemPrompt: string, userPrompt: string, imageData: string) {
  return {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: {
              url: imageData.startsWith("data:") ? imageData : `data:image/jpeg;base64,${imageData}`,
            },
          },
        ],
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "analyze_harvest_quality",
          description: "Analyse la qualité d'une récolte et retourne les informations détaillées",
          parameters: {
            type: "object",
            properties: {
              grade: { type: "string", enum: ["A", "B", "C"], description: "Grade de qualité global" },
              quality: {
                type: "object",
                properties: {
                  color: { type: "number", description: "Score couleur 0-100" },
                  size: { type: "number", description: "Score taille 0-100" },
                  defects: { type: "number", description: "Pourcentage de défauts 0-100" },
                  uniformity: { type: "number", description: "Score uniformité 0-100" },
                  maturity: { type: "number", description: "Score maturité 0-100" },
                },
                required: ["color", "size", "defects", "uniformity", "maturity"],
              },
              recommendedUse: { type: "array", items: { type: "string" }, description: "Utilisations recommandées" },
              estimatedPrice: {
                type: "object",
                properties: {
                  min: { type: "number", description: "Prix minimum estimé" },
                  max: { type: "number", description: "Prix maximum estimé" },
                  currency: { type: "string", description: "Devise (XAF)" },
                  unit: { type: "string", description: "Unité (kg, sac, etc.)" },
                  market: { type: "string", description: "Marché de référence au Cameroun" },
                },
                required: ["min", "max", "currency", "unit", "market"],
              },
              feedback: { type: "string", description: "Commentaire détaillé sur la qualité" },
            },
            required: ["grade", "quality", "recommendedUse", "estimatedPrice", "feedback"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "analyze_harvest_quality" } },
  };
}

function buildGeminiRequest(systemPrompt: string, userPrompt: string, imageData: string) {
  const base64Data = imageData.startsWith("data:") 
    ? imageData.split(",")[1] 
    : imageData;

  const jsonSchema = `{
  "grade": "string - A, B ou C",
  "quality": {
    "color": "number 0-100",
    "size": "number 0-100",
    "defects": "number 0-100",
    "uniformity": "number 0-100",
    "maturity": "number 0-100"
  },
  "recommendedUse": ["array of strings"],
  "estimatedPrice": {
    "min": "number",
    "max": "number",
    "currency": "XAF",
    "unit": "kg ou sac",
    "market": "string - marché camerounais"
  },
  "feedback": "string - commentaire détaillé"
}`;

  return {
    contents: [
      {
        parts: [
          { text: `${systemPrompt}\n\n${userPrompt}\n\nRéponds UNIQUEMENT avec un objet JSON valide suivant ce schéma:\n${jsonSchema}` },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
    },
  };
}

function parseLovableResponse(data: any): HarvestResult | null {
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    return null;
  }
  return JSON.parse(toolCall.function.arguments);
}

function parseGeminiResponse(data: any): HarvestResult | null {
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    return null;
  }
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }
  return JSON.parse(jsonMatch[0]);
}

function isRecoverableError(status: number): boolean {
  return status === 429 || status === 402 || status === 503 || status === 500 || status === 529;
}

async function callProvider(
  provider: AIProvider,
  systemPrompt: string,
  userPrompt: string,
  imageData: string
): Promise<{ success: boolean; result?: HarvestResult; error?: string; shouldRetry: boolean }> {
  console.log(`Trying provider: ${provider.name}`);

  try {
    let response: Response;
    let result: HarvestResult | null;

    if (provider.isLovable) {
      response = await fetch(provider.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildLovableRequest(systemPrompt, userPrompt, imageData)),
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
        body: JSON.stringify(buildGeminiRequest(systemPrompt, userPrompt, imageData)),
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

    console.log(`${provider.name} succeeded:`, result.grade);
    return { success: true, result, shouldRetry: false };
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
    const { image, crop_type, language = "fr" } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Image requise pour l'analyse" }),
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

    const systemPrompt = `Tu es un expert en évaluation de la qualité des récoltes agricoles au Cameroun.
Tu dois analyser l'image de produits agricoles et évaluer:
1. La qualité visuelle (couleur, taille, uniformité, maturité)
2. Le pourcentage de défauts
3. Le grade de qualité (A=Export, B=Marché local, C=Transformation)
4. Les utilisations recommandées
5. Le prix estimé sur les marchés camerounais

IMPORTANT:
- Base tes estimations de prix sur les marchés camerounais actuels (Mokolo, Mboppi, Sandaga, etc.)
- Devise: XAF (Franc CFA)
- Sois réaliste et précis dans tes évaluations
- Prends en compte la saison actuelle pour les prix`;

    const userPrompt = `Analyse cette image de récolte${crop_type ? ` (produit: ${crop_type})` : ""}.
Évalue la qualité et donne une estimation de prix pour le marché camerounais.
Réponds en ${language === "fr" ? "français" : "anglais"}.`;

    let lastError = "";

    for (const provider of providers) {
      const { success, result, error, shouldRetry } = await callProvider(
        provider,
        systemPrompt,
        userPrompt,
        image
      );

      if (success && result) {
        return new Response(
          JSON.stringify({
            success: true,
            analysis: result,
            analyzed_at: new Date().toISOString(),
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
        error: "Tous les services IA sont temporairement indisponibles. Veuillez réessayer plus tard.",
        details: lastError
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-harvest function:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur est survenue lors de l'analyse" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
