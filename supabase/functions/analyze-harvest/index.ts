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
    moisture?: number;
    cleanliness?: number;
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
  yield_estimation?: {
    estimated_yield_per_hectare: string;
    yield_potential: "low" | "medium" | "high" | "excellent";
    yield_factors: string[];
    optimization_tips: string[];
  };
  feedback: string;
  improvement_tips: string[];
  storage_tips: string[];
  selling_strategy?: {
    best_time_to_sell: string;
    target_buyers: string[];
    negotiation_tips: string[];
  };
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

// Language configuration for multilingual AI responses
const languageConfig: { [key: string]: { name: string; instruction: string } } = {
  fr: { name: "French", instruction: "Réponds entièrement en français." },
  en: { name: "English", instruction: "Respond entirely in English." },
  ghomala: { name: "Ghomala", instruction: "Respond in Ghomala (Ghɔmálá') language. Use Ghomala vocabulary and expressions. If you don't know exact Ghomala words, use French words that are commonly understood." },
  ewondo: { name: "Ewondo", instruction: "Respond in Ewondo language. Use Ewondo vocabulary and expressions." },
  fulfulde: { name: "Fulfulde", instruction: "Respond in Fulfulde language. Use Fulfulde vocabulary and expressions." },
  duala: { name: "Duala", instruction: "Respond in Duala (Douala) language. Use Duala vocabulary and expressions." },
  basaa: { name: "Basaa", instruction: "Respond in Basaa language. Use Basaa vocabulary and expressions." },
  bamileke: { name: "Bamileke", instruction: "Respond in Bamileke language. Use Bamileke vocabulary and expressions." },
};

function getLanguageInstruction(language: string): string {
  const config = languageConfig[language];
  if (config) return config.instruction;
  return languageConfig.fr.instruction; // Default to French
}

function getLanguageName(language: string): string {
  const config = languageConfig[language];
  if (config) return config.name;
  return "French";
}

// Provider types for extended fallback system
type ProviderType = "lovable" | "gemini" | "huggingface";

interface ExtendedAIProvider extends AIProvider {
  type: ProviderType;
}

// Use a smaller, commonly-supported model on HuggingFace Router.
const HF_FALLBACK_MODEL = "mistralai/Mistral-7B-Instruct-v0.3";

function getAIProviders(): ExtendedAIProvider[] {
  const providers: ExtendedAIProvider[] = [];

  // 1. Lovable AI Gateway (primary)
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    providers.push({
      name: "Lovable AI Gateway",
      endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
      apiKey: lovableKey,
      model: "google/gemini-2.5-flash",
      isLovable: true,
      type: "lovable",
    });
  }

  // 2. Gemini API keys (15 keys for maximum availability)
  const geminiKeys = [
    { key: Deno.env.get("GEMINI_API_KEY_1"), name: "Gemini API 1" },
    { key: Deno.env.get("GEMINI_API_KEY_2"), name: "Gemini API 2" },
    { key: Deno.env.get("GEMINI_API_KEY_3"), name: "Gemini API 3" },
    { key: Deno.env.get("GEMINI_API_KEY_4"), name: "Gemini API 4" },
    { key: Deno.env.get("GEMINI_API_KEY_5"), name: "Gemini API 5" },
    { key: Deno.env.get("GEMINI_API_KEY_6"), name: "Gemini API 6" },
    { key: Deno.env.get("GEMINI_API_KEY_7"), name: "Gemini API 7" },
    { key: Deno.env.get("GEMINI_API_KEY_8"), name: "Gemini API 8" },
    { key: Deno.env.get("GEMINI_API_KEY_9"), name: "Gemini API 9" },
    { key: Deno.env.get("GEMINI_API_KEY_10"), name: "Gemini API 10" },
    { key: Deno.env.get("GEMINI_API_KEY_11"), name: "Gemini API 11" },
    { key: Deno.env.get("GEMINI_API_KEY_12"), name: "Gemini API 12" },
    { key: Deno.env.get("GEMINI_API_KEY_13"), name: "Gemini API 13" },
    { key: Deno.env.get("GEMINI_API_KEY_14"), name: "Gemini API 14" },
    { key: Deno.env.get("GEMINI_API_KEY_15"), name: "Gemini API 15" },
  ];

  for (const { key, name } of geminiKeys) {
    if (key) {
      providers.push({
        name,
        endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        apiKey: key,
        model: "gemini-2.0-flash",
        isLovable: false,
        type: "gemini",
      });
    }
  }

  // 3. Hugging Face Inference API (5 keys for additional fallback)
  const huggingfaceKeys = [
    { key: Deno.env.get("HUGGINGFACE_API_KEY_1"), name: "HuggingFace API 1" },
    { key: Deno.env.get("HUGGINGFACE_API_KEY_2"), name: "HuggingFace API 2" },
    { key: Deno.env.get("HUGGINGFACE_API_KEY_3"), name: "HuggingFace API 3" },
    { key: Deno.env.get("HUGGINGFACE_API_KEY_4"), name: "HuggingFace API 4" },
    { key: Deno.env.get("HUGGINGFACE_API_KEY_5"), name: "HuggingFace API 5" },
  ];

  for (const { key, name } of huggingfaceKeys) {
    if (key) {
      providers.push({
        name,
        // OpenAI-compatible Inference Providers endpoint
        endpoint: "https://router.huggingface.co/v1/chat/completions",
        apiKey: key,
        model: HF_FALLBACK_MODEL,
        isLovable: false,
        type: "huggingface",
      });
    }
  }

  console.log(`🔌 Loaded ${providers.length} AI providers (1 Lovable + ${geminiKeys.filter(k => k.key).length} Gemini + ${huggingfaceKeys.filter(k => k.key).length} HuggingFace)`);
  return providers;
}

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

function buildDatabaseContext(crops: DBCrop[], prices: any[], language: string): string {
  const isFr = language === "fr";
  
  let context = isFr 
    ? `--- BASE DE DONNÉES AGRICOLE CAMEROUNAISE ---\n\n`
    : `--- CAMEROONIAN AGRICULTURAL DATABASE ---\n\n`;
  
  context += isFr ? `CULTURES ENREGISTRÉES:\n` : `REGISTERED CROPS:\n`;
  crops.forEach(crop => {
    context += `- ${crop.name} (${crop.name_local || ""})\n`;
  });
  
  context += isFr ? `\nPRIX DU MARCHÉ RÉCENTS:\n` : `\nRECENT MARKET PRICES:\n`;
  const pricesByGrade: { [key: string]: any[] } = {};
  
  prices.forEach(p => {
    const cropName = p.crops?.name || (isFr ? "Inconnu" : "Unknown");
    const key = `${cropName}-${p.quality_grade}`;
    if (!pricesByGrade[key]) {
      pricesByGrade[key] = [];
    }
    pricesByGrade[key].push(p);
  });

  Object.entries(pricesByGrade).forEach(([key, priceList]) => {
    const p = priceList[0];
    context += `- ${p.crops?.name || (isFr ? "Produit" : "Product")} Grade ${p.quality_grade || "A"}: ${p.price_min}-${p.price_max} ${p.currency}/${p.unit} (${p.market_name}, ${p.region})\n`;
  });

  context += isFr
    ? `\nINSTRUCTION: Utilise ces prix comme référence principale pour tes estimations. Détecte automatiquement le type de produit agricole dans l'image.`
    : `\nINSTRUCTION: Use these prices as main reference for your estimates. Automatically detect the agricultural product type in the image.`;
  
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
          description: "Automatically analyzes crop type, quality, estimates yield and provides selling strategy",
          parameters: {
            type: "object",
            properties: {
              is_good_quality: { type: "boolean", description: "True if overall good quality" },
              detected_crop: { type: "string", description: "Automatically detected agricultural product type" },
              detected_crop_local: { type: "string", description: "Local Cameroonian name of the product" },
              grade: { type: "string", enum: ["A", "B", "C"], description: "Overall quality grade" },
              quality: {
                type: "object",
                properties: {
                  color: { type: "number", description: "Color score 0-100" },
                  size: { type: "number", description: "Size score 0-100" },
                  defects: { type: "number", description: "Defects percentage 0-100" },
                  uniformity: { type: "number", description: "Uniformity score 0-100" },
                  maturity: { type: "number", description: "Maturity score 0-100" },
                  moisture: { type: "number", description: "Moisture estimation 0-100 (important for seeds)" },
                  cleanliness: { type: "number", description: "Cleanliness/debris-free score 0-100" },
                },
                required: ["color", "size", "defects", "uniformity", "maturity"],
              },
              issues_detected: { type: "array", items: { type: "string" }, description: "Issues detected on the harvest" },
              recommendedUse: { type: "array", items: { type: "string" }, description: "Recommended uses" },
              estimatedPrice: {
                type: "object",
                properties: {
                  min: { type: "number", description: "Minimum estimated price" },
                  max: { type: "number", description: "Maximum estimated price" },
                  currency: { type: "string", description: "Currency (XAF)" },
                  unit: { type: "string", description: "Unit (kg, bag, etc.)" },
                  market: { type: "string", description: "Reference market in Cameroon" },
                },
                required: ["min", "max", "currency", "unit", "market"],
              },
              yield_estimation: {
                type: "object",
                description: "Yield estimation for seeds/grains",
                properties: {
                  estimated_yield_per_hectare: { type: "string", description: "Estimated yield per hectare (e.g., 2-3 tons/ha)" },
                  yield_potential: { type: "string", enum: ["low", "medium", "high", "excellent"], description: "Yield potential" },
                  yield_factors: { type: "array", items: { type: "string" }, description: "Factors affecting yield" },
                  optimization_tips: { type: "array", items: { type: "string" }, description: "Tips to optimize yield" },
                },
                required: ["estimated_yield_per_hectare", "yield_potential", "yield_factors", "optimization_tips"],
              },
              feedback: { type: "string", description: "Detailed quality feedback" },
              improvement_tips: { type: "array", items: { type: "string" }, description: "Tips to improve future harvests" },
              storage_tips: { type: "array", items: { type: "string" }, description: "Storage and preservation tips" },
              selling_strategy: {
                type: "object",
                description: "Optimal selling strategy",
                properties: {
                  best_time_to_sell: { type: "string", description: "Best time to sell" },
                  target_buyers: { type: "array", items: { type: "string" }, description: "Recommended target buyers" },
                  negotiation_tips: { type: "array", items: { type: "string" }, description: "Negotiation tips" },
                },
                required: ["best_time_to_sell", "target_buyers", "negotiation_tips"],
              },
            },
            required: ["is_good_quality", "detected_crop", "grade", "quality", "recommendedUse", "estimatedPrice", "yield_estimation", "feedback", "improvement_tips", "storage_tips", "selling_strategy"],
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
  "is_good_quality": "boolean - true if overall good quality",
  "detected_crop": "string - Automatically detected product type",
  "detected_crop_local": "string - Local Cameroonian name",
  "grade": "string - A, B or C",
  "quality": {
    "color": "number 0-100",
    "size": "number 0-100",
    "defects": "number 0-100",
    "uniformity": "number 0-100",
    "maturity": "number 0-100",
    "moisture": "number 0-100 - moisture estimation (important for seeds)",
    "cleanliness": "number 0-100 - cleanliness/debris-free"
  },
  "issues_detected": ["array - Detected issues"],
  "recommendedUse": ["array of strings"],
  "estimatedPrice": {
    "min": "number",
    "max": "number",
    "currency": "XAF",
    "unit": "kg or bag",
    "market": "string - Cameroonian market"
  },
  "yield_estimation": {
    "estimated_yield_per_hectare": "string - e.g., 2-3 tons/ha",
    "yield_potential": "low|medium|high|excellent",
    "yield_factors": ["array - factors affecting yield"],
    "optimization_tips": ["array - tips to optimize yield"]
  },
  "feedback": "string - detailed feedback",
  "improvement_tips": ["array - Tips for improving future harvests"],
  "storage_tips": ["array - Storage and preservation tips"],
  "selling_strategy": {
    "best_time_to_sell": "string - best time to sell",
    "target_buyers": ["array - recommended target buyers"],
    "negotiation_tips": ["array - negotiation tips"]
  }
}`;

  return {
    contents: [
      {
        parts: [
          { text: `${systemPrompt}\n\n${dbContext}\n\n${userPrompt}\n\nRespond ONLY with a valid JSON object following this schema:\n${jsonSchema}` },
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
  // 400 = invalid API key (skip to next provider)
  // 402 = payment required
  // 429 = rate limit exceeded  
  // 500/503/529 = server errors
  return status === 400 || status === 429 || status === 402 || status === 503 || status === 500 || status === 529;
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
    let result: HarvestResult | null = null;

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
    } else if ((provider as ExtendedAIProvider).type === "huggingface") {
      const textPrompt = `${systemPrompt}\n\n${dbContext}\n\n${userPrompt}\n\nNote: Analyse basée sur la description textuelle. Réponds en JSON valide.`;
      
      response = await fetch(provider.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: (provider as ExtendedAIProvider).model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: textPrompt },
          ],
          max_tokens: 1024,
          temperature: 0.4,
        }),
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
      const text = data.choices?.[0]?.message?.content as string | undefined;
      if (text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = { ...JSON.parse(jsonMatch[0]), from_database: false };
        }
      }
    } else {
      // Gemini API
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

function enrichResultWithDatabase(result: HarvestResult, crops: DBCrop[], prices: any[]): HarvestResult {
  const matchingCrop = crops.find(c => 
    c.name.toLowerCase().includes(result.detected_crop.toLowerCase()) ||
    result.detected_crop.toLowerCase().includes(c.name.toLowerCase())
  );

  if (matchingCrop) {
    result.detected_crop_local = matchingCrop.name_local || result.detected_crop_local;
    
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

function getLocationContext(
  latitude: number | null,
  longitude: number | null,
  altitude: number | null,
  regionName: string | null,
  language: string
): { context: string; nearestMarket: string } {
  const isFr = language === "fr";
  let nearestMarket = isFr ? "Marché Central" : "Central Market";
  
  if (!latitude || !longitude) {
    return { context: "", nearestMarket };
  }

  let context = isFr
    ? `\n\n--- CONTEXTE GÉOGRAPHIQUE DE L'AGRICULTEUR ---\n`
    : `\n\n--- FARMER'S GEOGRAPHIC CONTEXT ---\n`;
  
  context += `Position GPS: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E\n`;
  
  if (altitude !== null) {
    context += `Altitude: ${Math.round(altitude)}m\n`;
  }

  const markets = [
    { name: "Marché Mokolo", nameEn: "Mokolo Market", lat: 3.8667, lon: 11.5167, region: "Centre" },
    { name: "Marché Sandaga", nameEn: "Sandaga Market", lat: 4.0503, lon: 9.7000, region: "Littoral" },
    { name: "Marché Mboppi", nameEn: "Mboppi Market", lat: 4.0450, lon: 9.7050, region: "Littoral" },
    { name: "Marché de Bamenda", nameEn: "Bamenda Market", lat: 5.9500, lon: 10.1500, region: "Nord-Ouest" },
    { name: "Marché de Bafoussam", nameEn: "Bafoussam Market", lat: 5.4833, lon: 10.4167, region: "Ouest" },
    { name: "Marché de Garoua", nameEn: "Garoua Market", lat: 9.3000, lon: 13.3833, region: "Nord" },
  ];

  let minDistance = Infinity;
  let closestMarket = markets[0];

  for (const market of markets) {
    const distance = Math.sqrt(
      Math.pow(latitude - market.lat, 2) + Math.pow(longitude - market.lon, 2)
    ) * 111;
    
    if (distance < minDistance) {
      minDistance = distance;
      closestMarket = market;
    }
  }

  nearestMarket = isFr ? closestMarket.name : closestMarket.nameEn;

  context += isFr
    ? `Marché le plus proche: ${nearestMarket} (${Math.round(minDistance)} km)\n`
    : `Nearest market: ${nearestMarket} (${Math.round(minDistance)} km)\n`;
  
  if (regionName) {
    context += isFr ? `Région: ${regionName}\n` : `Region: ${regionName}\n`;
  }
  
  context += isFr
    ? `\nUTILISE les prix du marché ${nearestMarket} comme référence principale.\n`
    : `\nUSE ${nearestMarket} market prices as main reference.\n`;
  context += isFr
    ? `ADAPTE tes conseils de stockage et transport selon la distance au marché.\n`
    : `ADAPT your storage and transport advice based on distance to market.\n`;
  
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

    console.log("Harvest analysis - Language:", language, "Location:", latitude, longitude, "Alt:", altitude, "Region:", regionName);

    if (!image) {
      const errorMsg = language === "fr" ? "Image requise pour l'analyse" : "Image required for analysis";
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { crops, prices } = await fetchDatabaseContext(supabase);
    let dbContext = buildDatabaseContext(crops, prices, language);
    
    const { context: locationContext, nearestMarket } = getLocationContext(
      latitude, longitude, altitude, regionName, language
    );
    if (locationContext) {
      dbContext += locationContext;
    }

    const providers = getAIProviders();
    if (providers.length === 0) {
      const errorMsg = language === "fr" ? "Aucun fournisseur IA configuré" : "No AI provider configured";
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const languageInstruction = getLanguageInstruction(language);
    const languageName = getLanguageName(language);

    // Fully multilingual system prompt
    const systemPrompt = `You are an expert in evaluating agricultural harvest quality in Cameroon, specialized in quality sorting for sales and yield estimation.

CRITICAL LANGUAGE INSTRUCTION:
${languageInstruction}
ALL your responses (feedback, tips, recommendations, detected issues, etc.) MUST be in ${languageName}.
Do NOT respond in any other language.

MAIN TASK:
1. AUTOMATICALLY DETECT the type of agricultural product in the image
2. EVALUATE visual quality (color, size, uniformity, maturity, defects, moisture, cleanliness)
3. ASSIGN a quality grade (A=Export/Premium, B=Local market standard quality, C=Processing/Lower quality)
4. ESTIMATE the price on Cameroonian markets
5. ESTIMATE YIELD potential if these seeds/grains are planted
6. PROVIDE an OPTIMAL SELLING STRATEGY
7. GIVE tips to improve future harvest quality

YIELD EVALUATION (for seeds/grains):
- Analyze seed quality: size, uniformity, absence of damage
- Estimate potential yield per hectare if these seeds are used
- Identify factors that could affect yield (seed quality, moisture, presence of diseases)
- Give tips to optimize yield during planting

SELLING STRATEGY:
- Identify the best time to sell based on season and market
- Recommend target buyers (wholesalers, retailers, exporters, processors)
- Give negotiation tips based on product quality

IMPORTANT:
- Automatically detect the product without user specification
- PRIORITIZE reference prices from local database if provided
- Base your price estimates on current Cameroonian markets${nearestMarket ? ` (reference: ${nearestMarket})` : ""}
- Currency: XAF (CFA Franc)
- Be realistic and precise in your evaluations
- Consider current season for prices and selling strategy
- Adjust prices according to detected quality grade
- If you detect problems (rot, pests, mold, excessive moisture), report them
- Always give practical tips to improve future harvests
- Include storage and preservation tips
${altitude !== null ? `- Farmer is at ${Math.round(altitude)}m altitude: adapt conservation tips and estimated yield` : ""}
${regionName ? `- Farmer is in ${regionName} region: use local prices from this zone and adapt tips` : ""}`;

    const userPrompt = `Analyze this harvest image in detail.

1. Automatically identify the type of agricultural product
2. Evaluate complete visual quality (color, size, uniformity, maturity, defects, moisture, cleanliness)
3. Assign a grade (A, B or C) for sorting and sales
4. Estimate price for Cameroonian market
5. IF SEEDS/GRAINS: Estimate potential yield per hectare if planted
6. Provide an optimal selling strategy (best time, target buyers, negotiation tips)
7. Give improvement and storage tips

IMPORTANT: ${languageInstruction}
Respond entirely in ${languageName}.`;

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

    // Detect error type for better client-side handling
    const isCreditsError = lastError?.includes('402') || lastError?.includes('credits') || lastError?.includes('payment');
    const isQuotaError = lastError?.includes('429') || lastError?.includes('quota') || lastError?.includes('RESOURCE_EXHAUSTED');
    
    if (isCreditsError) {
      return new Response(
        JSON.stringify({ 
          error: language === "fr" 
            ? "Crédits IA épuisés. Veuillez recharger votre compte."
            : "AI credits exhausted. Please add credits.",
          error_type: "credits_exhausted",
          details: lastError
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (isQuotaError) {
      return new Response(
        JSON.stringify({ 
          error: language === "fr" 
            ? "Quota API dépassé. Veuillez réessayer dans quelques minutes."
            : "API quota exceeded. Please try again in a few minutes.",
          error_type: "quota_exceeded",
          details: lastError
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errorMsg = language === "fr" 
      ? "Tous les services IA sont temporairement indisponibles. Veuillez réessayer plus tard."
      : "All AI services are temporarily unavailable. Please try again later.";

    return new Response(
      JSON.stringify({ 
        error: errorMsg,
        error_type: "service_unavailable",
        details: lastError
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-harvest function:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred during analysis" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
