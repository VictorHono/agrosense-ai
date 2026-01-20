import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface HarvestResult {
  is_good_quality: boolean;
  detected_crop: string;
  detected_crop_local?: string;
  grade: "A" | "B" | "C";
  quality: {
    color: number;
    size: number;
    defects: number;
    uniformity: number;
    maturity: number;
  };
  issues_detected?: string[];
  recommendedUse: string[];
  estimatedPrice: {
    min: number;
    max: number;
    currency: string;
    unit: string;
    market: string;
  };
  feedback: string;
  improvement_tips: string[];
  storage_tips: string[];
  from_database: boolean;
}

interface DBCrop {
  id: string;
  name: string;
  name_local: string;
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

// Fetch all crops and market prices from database
async function fetchDatabaseContext(supabase: any): Promise<{ crops: DBCrop[]; prices: any[] }> {
  console.log("Fetching database context for crops and prices...");

  const { data: crops } = await supabase
    .from("crops")
    .select("id, name, name_local");

  const { data: prices } = await supabase
    .from("market_prices")
    .select("*, crops(name, name_local)")
    .order("recorded_at", { ascending: false })
    .limit(50);

  console.log(`Found ${crops?.length || 0} crops and ${prices?.length || 0} price records`);
  
  return {
    crops: crops || [],
    prices: prices || [],
  };
}

// Build comprehensive context for AI
function buildDatabaseContext(crops: DBCrop[], prices: any[]): string {
  let context = `--- BASE DE DONNÉES AGRICOLE CAMEROUNAISE ---\n\n`;
  
  context += `CULTURES ENREGISTRÉES:\n`;
  crops.forEach(crop => {
    context += `- ${crop.name} (${crop.name_local || ""})\n`;
  });
  
  context += `\nPRIX DU MARCHÉ RÉCENTS:\n`;
  const pricesByGrade: { [key: string]: any[] } = {};
  
  prices.forEach(p => {
    const cropName = p.crops?.name || "Inconnu";
    const key = `${cropName}-${p.quality_grade}`;
    if (!pricesByGrade[key]) {
      pricesByGrade[key] = [];
    }
    pricesByGrade[key].push(p);
  });

  Object.entries(pricesByGrade).forEach(([key, priceList]) => {
    const p = priceList[0]; // Most recent
    context += `- ${p.crops?.name || "Produit"} Grade ${p.quality_grade || "A"}: ${p.price_min}-${p.price_max} ${p.currency}/${p.unit} (${p.market_name}, ${p.region})\n`;
  });

  context += `\nINSTRUCTION: Utilise ces prix comme référence principale pour tes estimations. Détecte automatiquement le type de produit agricole dans l'image.`;
  
  return context;
}

function buildLovableRequest(systemPrompt: string, userPrompt: string, imageData: string, dbContext: string) {
  return {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: `${dbContext}\n\n${userPrompt}` },
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
          description: "Analyse automatiquement le type de récolte et sa qualité",
          parameters: {
            type: "object",
            properties: {
              is_good_quality: { type: "boolean", description: "True si la récolte est de bonne qualité générale" },
              detected_crop: { type: "string", description: "Type de produit agricole détecté automatiquement" },
              detected_crop_local: { type: "string", description: "Nom local camerounais du produit" },
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
              issues_detected: { type: "array", items: { type: "string" }, description: "Problèmes détectés sur la récolte" },
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
              improvement_tips: { type: "array", items: { type: "string" }, description: "Conseils pour améliorer la qualité des prochaines récoltes" },
              storage_tips: { type: "array", items: { type: "string" }, description: "Conseils de stockage et conservation" },
            },
            required: ["is_good_quality", "detected_crop", "grade", "quality", "recommendedUse", "estimatedPrice", "feedback", "improvement_tips", "storage_tips"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "analyze_harvest_quality" } },
  };
}

function buildGeminiRequest(systemPrompt: string, userPrompt: string, imageData: string, dbContext: string) {
  const base64Data = imageData.startsWith("data:") 
    ? imageData.split(",")[1] 
    : imageData;

  const jsonSchema = `{
  "is_good_quality": "boolean - true si bonne qualité générale",
  "detected_crop": "string - Type de produit détecté automatiquement",
  "detected_crop_local": "string - Nom local camerounais",
  "grade": "string - A, B ou C",
  "quality": {
    "color": "number 0-100",
    "size": "number 0-100",
    "defects": "number 0-100",
    "uniformity": "number 0-100",
    "maturity": "number 0-100"
  },
  "issues_detected": ["array - Problèmes détectés"],
  "recommendedUse": ["array of strings"],
  "estimatedPrice": {
    "min": "number",
    "max": "number",
    "currency": "XAF",
    "unit": "kg ou sac",
    "market": "string - marché camerounais"
  },
  "feedback": "string - commentaire détaillé",
  "improvement_tips": ["array - Conseils amélioration prochaines récoltes"],
  "storage_tips": ["array - Conseils stockage et conservation"]
}`;

  return {
    contents: [
      {
        parts: [
          { text: `${systemPrompt}\n\n${dbContext}\n\n${userPrompt}\n\nRéponds UNIQUEMENT avec un objet JSON valide suivant ce schéma:\n${jsonSchema}` },
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
  const result = JSON.parse(toolCall.function.arguments);
  return { ...result, from_database: false };
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
  const result = JSON.parse(jsonMatch[0]);
  return { ...result, from_database: false };
}

function isRecoverableError(status: number): boolean {
  return status === 429 || status === 402 || status === 503 || status === 500 || status === 529;
}

async function callProvider(
  provider: AIProvider,
  systemPrompt: string,
  userPrompt: string,
  imageData: string,
  dbContext: string
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
        body: JSON.stringify(buildLovableRequest(systemPrompt, userPrompt, imageData, dbContext)),
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
        body: JSON.stringify(buildGeminiRequest(systemPrompt, userPrompt, imageData, dbContext)),
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

    console.log(`${provider.name} succeeded - Crop: ${result.detected_crop}, Grade: ${result.grade}`);
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

// Enrich result with database info
function enrichResultWithDatabase(result: HarvestResult, crops: DBCrop[], prices: any[]): HarvestResult {
  // Try to find matching crop for local name
  const matchingCrop = crops.find(c => 
    c.name.toLowerCase().includes(result.detected_crop.toLowerCase()) ||
    result.detected_crop.toLowerCase().includes(c.name.toLowerCase())
  );

  if (matchingCrop) {
    result.detected_crop_local = matchingCrop.name_local || result.detected_crop_local;
    
    // Find price from database for this crop and grade
    const matchingPrice = prices.find(p => 
      p.crop_id === matchingCrop.id && 
      p.quality_grade === result.grade
    );

    if (matchingPrice) {
      console.log("Using database price for", matchingCrop.name, "grade", result.grade);
      result.estimatedPrice = {
        min: matchingPrice.price_min,
        max: matchingPrice.price_max,
        currency: matchingPrice.currency,
        unit: matchingPrice.unit,
        market: matchingPrice.market_name,
      };
      result.from_database = true;
    }
  }

  return result;
}

// Get location context for pricing and advice
function getLocationContext(
  latitude: number | null,
  longitude: number | null,
  altitude: number | null,
  regionName: string | null,
  language: string
): { context: string; nearestMarket: string } {
  let nearestMarket = "Marché Central";
  
  if (!latitude || !longitude) {
    return { context: "", nearestMarket };
  }

  let context = `\n\n--- CONTEXTE GÉOGRAPHIQUE DE L'AGRICULTEUR ---\n`;
  context += `Position GPS: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E\n`;
  
  if (altitude !== null) {
    context += `Altitude: ${Math.round(altitude)}m\n`;
  }

  // Determine nearest market based on coordinates
  const markets = [
    { name: "Marché Mokolo", lat: 3.8667, lon: 11.5167, region: "Centre" },
    { name: "Marché Sandaga", lat: 4.0503, lon: 9.7000, region: "Littoral" },
    { name: "Marché Mboppi", lat: 4.0450, lon: 9.7050, region: "Littoral" },
    { name: "Marché de Bamenda", lat: 5.9500, lon: 10.1500, region: "Nord-Ouest" },
    { name: "Marché de Bafoussam", lat: 5.4833, lon: 10.4167, region: "Ouest" },
    { name: "Marché de Garoua", lat: 9.3000, lon: 13.3833, region: "Nord" },
    { name: "Marché de Maroua", lat: 10.5917, lon: 14.3167, region: "Extrême-Nord" },
    { name: "Marché d'Ebolowa", lat: 2.9333, lon: 11.1500, region: "Sud" },
    { name: "Marché de Bertoua", lat: 4.0333, lon: 14.0333, region: "Est" },
    { name: "Marché de Buéa", lat: 4.1500, lon: 9.2333, region: "Sud-Ouest" },
  ];

  let minDistance = Infinity;
  for (const market of markets) {
    const dLat = (latitude - market.lat) * Math.PI / 180;
    const dLon = (longitude - market.lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(latitude * Math.PI / 180) * Math.cos(market.lat * Math.PI / 180) * 
              Math.sin(dLon / 2) ** 2;
    const distance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 6371;
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestMarket = market.name;
    }
  }

  context += `Marché le plus proche: ${nearestMarket} (${Math.round(minDistance)} km)\n`;
  context += regionName ? `Région: ${regionName}\n` : "";
  context += `\nUTILISE les prix du marché ${nearestMarket} comme référence principale.\n`;
  context += `ADAPTE tes conseils de stockage et transport selon la distance au marché.\n`;
  
  return { context, nearestMarket };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      image, 
      language = "fr",
      latitude = null,
      longitude = null,
      altitude = null,
      regionName = null,
      climateZone = null,
    } = await req.json();

    console.log("Harvest analysis - Location:", latitude, longitude, "Alt:", altitude, "Region:", regionName);

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Image requise pour l'analyse" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch database context
    const { crops, prices } = await fetchDatabaseContext(supabase);
    let dbContext = buildDatabaseContext(crops, prices);
    
    // Add location context
    const { context: locationContext, nearestMarket } = getLocationContext(
      latitude, longitude, altitude, regionName, language
    );
    if (locationContext) {
      dbContext += locationContext;
    }

    const providers = getAIProviders();
    if (providers.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun fournisseur IA configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Tu es un expert en évaluation de la qualité des récoltes agricoles au Cameroun.

TÂCHE PRINCIPALE:
1. DÉTECTE AUTOMATIQUEMENT le type de produit agricole dans l'image
2. ÉVALUE la qualité visuelle (couleur, taille, uniformité, maturité, défauts)
3. ATTRIBUE un grade de qualité (A=Export/Premium, B=Marché local qualité standard, C=Transformation/Qualité inférieure)
4. ESTIME le prix sur les marchés camerounais
5. DONNE des conseils pour améliorer la qualité des prochaines récoltes

IMPORTANT:
- Détecte automatiquement le produit sans que l'utilisateur ait besoin de le spécifier
- UTILISE EN PRIORITÉ les prix de référence de la base de données locale s'ils sont fournis
- Base tes estimations de prix sur les marchés camerounais actuels${nearestMarket ? ` (référence: ${nearestMarket})` : ""}
- Devise: XAF (Franc CFA)
- Sois réaliste et précis dans tes évaluations
- Prends en compte la saison actuelle pour les prix
- Ajuste les prix selon le grade de qualité détecté
- Si tu détectes des problèmes (pourriture, parasites, moisissures), signale-les
- Donne toujours des conseils pratiques pour améliorer les prochaines récoltes
- Inclus des conseils de stockage et conservation
${altitude !== null ? `- L'agriculteur est à ${Math.round(altitude)}m d'altitude: adapte les conseils de conservation` : ""}
${regionName ? `- L'agriculteur est dans la région ${regionName}: utilise les prix locaux de cette zone` : ""}`;

    const userPrompt = `Analyse cette image de récolte.

1. Identifie automatiquement le type de produit agricole
2. Évalue la qualité visuelle complète
3. Attribue un grade (A, B ou C)
4. Estime le prix pour le marché camerounais
5. Donne des conseils d'amélioration et de stockage

Réponds en ${language === "fr" ? "français" : "anglais"}.`;

    let lastError = "";

    for (const provider of providers) {
      const { success, result, error, shouldRetry } = await callProvider(
        provider,
        systemPrompt,
        userPrompt,
        image,
        dbContext
      );

      if (success && result) {
        // Enrich with database info
        const enrichedResult = enrichResultWithDatabase(result, crops, prices);
        
        return new Response(
          JSON.stringify({
            success: true,
            analysis: enrichedResult,
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
