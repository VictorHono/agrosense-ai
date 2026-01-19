import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisResult {
  disease_name: string;
  local_name: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  causes: string[];
  symptoms: string[];
  biological_treatments: string[];
  chemical_treatments: string[];
  prevention: string[];
  affected_crop: string;
}

interface AIProvider {
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
  isLovable: boolean;
}

// Get all available AI providers in fallback order
function getAIProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  // Primary: Lovable AI Gateway
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    providers.push({
      name: "Lovable AI Gateway",
      endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
      apiKey: lovableKey,
      model: "google/gemini-2.5-pro",
      isLovable: true,
    });
  }

  // Fallback 1-5: Gemini API Keys
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

// Build request body for Lovable AI Gateway
function buildLovableRequest(systemPrompt: string, userPrompt: string, imageData: string) {
  return {
    model: "google/gemini-2.5-pro",
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
          name: "analyze_plant_disease",
          description: "Analyse une image de plante et retourne les informations sur la maladie détectée",
          parameters: {
            type: "object",
            properties: {
              disease_name: { type: "string", description: "Nom scientifique ou commun de la maladie/ravageur" },
              local_name: { type: "string", description: "Nom local camerounais si disponible" },
              confidence: { type: "number", description: "Niveau de confiance de la détection (0-100)" },
              severity: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Niveau de gravité" },
              description: { type: "string", description: "Explication simple de la maladie" },
              causes: { type: "array", items: { type: "string" }, description: "Causes probables" },
              symptoms: { type: "array", items: { type: "string" }, description: "Symptômes visibles" },
              biological_treatments: { type: "array", items: { type: "string" }, description: "Traitements biologiques disponibles au Cameroun" },
              chemical_treatments: { type: "array", items: { type: "string" }, description: "Traitements chimiques avec noms commerciaux locaux et dosages" },
              prevention: { type: "array", items: { type: "string" }, description: "Mesures préventives" },
              affected_crop: { type: "string", description: "Culture concernée" },
            },
            required: ["disease_name", "confidence", "severity", "description", "causes", "symptoms", "biological_treatments", "chemical_treatments", "prevention", "affected_crop"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "analyze_plant_disease" } },
  };
}

// Build request body for direct Gemini API
function buildGeminiRequest(systemPrompt: string, userPrompt: string, imageData: string) {
  const base64Data = imageData.startsWith("data:") 
    ? imageData.split(",")[1] 
    : imageData;

  const jsonSchema = `{
  "disease_name": "string - Nom scientifique ou commun de la maladie/ravageur",
  "local_name": "string - Nom local camerounais si disponible",
  "confidence": "number - Niveau de confiance de la détection (0-100)",
  "severity": "string - low | medium | high | critical",
  "description": "string - Explication simple de la maladie",
  "causes": ["array of strings - Causes probables"],
  "symptoms": ["array of strings - Symptômes visibles"],
  "biological_treatments": ["array of strings - Traitements biologiques disponibles au Cameroun"],
  "chemical_treatments": ["array of strings - Traitements chimiques avec noms commerciaux locaux et dosages"],
  "prevention": ["array of strings - Mesures préventives"],
  "affected_crop": "string - Culture concernée"
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

// Parse response from Lovable AI Gateway
function parseLovableResponse(data: any): AnalysisResult | null {
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    return null;
  }
  return JSON.parse(toolCall.function.arguments);
}

// Parse response from direct Gemini API
function parseGeminiResponse(data: any): AnalysisResult | null {
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    return null;
  }

  // Extract JSON from the response
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }

  return JSON.parse(jsonMatch[0]);
}

// Check if error is recoverable (should try next provider)
function isRecoverableError(status: number): boolean {
  return status === 429 || status === 402 || status === 503 || status === 500 || status === 529;
}

// Make API call with a specific provider
async function callProvider(
  provider: AIProvider,
  systemPrompt: string,
  userPrompt: string,
  imageData: string
): Promise<{ success: boolean; result?: AnalysisResult; error?: string; shouldRetry: boolean }> {
  console.log(`Trying provider: ${provider.name}`);

  try {
    let response: Response;
    let result: AnalysisResult | null;

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

    console.log(`${provider.name} succeeded:`, result.disease_name);
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, crop_hint, language = "fr" } = await req.json();

    if (!image) {
      console.error("No image provided");
      return new Response(
        JSON.stringify({ error: "Image requise pour l'analyse" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const providers = getAIProviders();
    if (providers.length === 0) {
      console.error("No AI providers configured");
      return new Response(
        JSON.stringify({ error: "Aucun fournisseur IA configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Available providers: ${providers.map(p => p.name).join(", ")}`);
    console.log("Crop hint:", crop_hint);
    console.log("Language:", language);

    const systemPrompt = `Tu es un expert agronome spécialisé dans les cultures camerounaises et les maladies des plantes en Afrique centrale.
Tu dois analyser l'image fournie et identifier:
1. La culture concernée
2. La maladie, le ravageur ou la carence détectée
3. Le niveau de gravité
4. Les solutions adaptées au contexte camerounais

IMPORTANT:
- Propose UNIQUEMENT des traitements disponibles au Cameroun
- Inclus des noms locaux quand disponibles
- Priorise les solutions biologiques
- Pour les traitements chimiques, utilise des produits commerciaux disponibles localement
- Adapte le vocabulaire pour des agriculteurs avec un niveau d'éducation variable

Cultures camerounaises courantes: cacao, café, maïs, manioc, banane plantain, tomate, gombo, arachide, haricot, igname, macabo, patate douce.`;

    const userPrompt = `Analyse cette image de plante${crop_hint ? ` (indice: ${crop_hint})` : ""}.

Réponds en ${language === "fr" ? "français" : "anglais"} avec les informations structurées sur la maladie détectée.`;

    // Try each provider in order until one succeeds
    let lastError = "";
    let usedProvider = "";

    for (const provider of providers) {
      const { success, result, error, shouldRetry } = await callProvider(
        provider,
        systemPrompt,
        userPrompt,
        image
      );

      if (success && result) {
        usedProvider = provider.name;
        return new Response(
          JSON.stringify({
            success: true,
            analysis: result,
            analyzed_at: new Date().toISOString(),
            provider: usedProvider,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      lastError = error || "Unknown error";
      
      if (!shouldRetry) {
        console.log(`${provider.name}: Non-recoverable error, stopping fallback chain`);
        break;
      }

      console.log(`${provider.name} failed, trying next provider...`);
    }

    // All providers failed
    console.error("All AI providers failed. Last error:", lastError);
    return new Response(
      JSON.stringify({ 
        error: "Tous les services IA sont temporairement indisponibles. Veuillez réessayer plus tard.",
        details: lastError
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-plant function:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur est survenue lors de l'analyse" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
