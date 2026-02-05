import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface AnalysisResult {
  is_healthy: boolean;
  detected_crop: string;
  detected_crop_local?: string;
  disease_name?: string;
  local_name?: string;
  confidence: number;
  severity?: "healthy" | "low" | "medium" | "high" | "critical";
  description: string;
  causes?: string[];
  symptoms?: string[];
  biological_treatments?: string[];
  chemical_treatments?: string[];
  prevention: string[];
  maintenance_tips?: string[];
  yield_improvement_tips?: string[];
  from_database: boolean;
  from_learning: boolean;
}

interface DBCrop {
  id: string;
  name: string;
  name_local: string;
  description: string;
  category: string;
  growing_season: string[];
}

interface DBDisease {
  id: string;
  name: string;
  name_local: string;
  description: string;
  symptoms: string[];
  causes: string[];
  severity: string;
  crop_id: string;
  treatments: Array<{
    name: string;
    type: string;
    description: string;
    dosage: string;
    application_method: string;
  }>;
}

interface LearningEntry {
  id: string;
  crop_name: string;
  crop_local_name: string | null;
  disease_name: string | null;
  disease_local_name: string | null;
  is_healthy: boolean;
  confidence: number;
  severity: string | null;
  symptoms: string[];
  causes: string[];
  treatments: Array<{ type: string; name: string; description?: string }>;
  prevention: string[];
  region: string | null;
  climate_zone: string | null;
  altitude: number | null;
  verified: boolean;
  use_count: number;
}

interface AIProvider {
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
  isLovable: boolean;
}

// Provider types for extended fallback system
type ProviderType = "lovable" | "gemini" | "huggingface";

interface ExtendedAIProvider extends AIProvider {
  type: ProviderType;
}

function sanitizeApiKey(key: string | null | undefined): string | null {
  if (!key) return null;
  // Users sometimes paste secrets with prefixes ("Bearer ...", "Authorization: Bearer ...", URLs containing key=...)
  // or with hidden unicode/line breaks. Clean aggressively to avoid 400/401 and invalid header ByteString errors.
  let k = key.trim();
  if (!k) return null;

  // Remove a single pair of wrapping quotes
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }

  // If a full URL or querystring was pasted, extract key=...
  const keyParam = k.match(/(?:\?|&)key=([^&\s]+)/i);
  if (keyParam?.[1]) k = keyParam[1];

  // Strip common auth prefixes
  k = k.replace(/^authorization:\s*/i, "");
  k = k.replace(/^bearer\s+/i, "");
  k = k.replace(/^token\s+/i, "");

  // Remove whitespace/newlines anywhere
  k = k.replace(/\s+/g, "");

  // Normalize and remove non-ASCII/control chars (tokens should be ASCII)
  try {
    k = k.normalize("NFKC");
  } catch {
    // ignore
  }
  k = k.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  k = Array.from(k).filter((ch) => ch.charCodeAt(0) <= 0x7e).join("");

  return k || null;
}

// HuggingFace Router - use a chat-compatible model (Mistral-7B-Instruct is NOT a chat model on HF Router)
const HF_FALLBACK_MODEL = "meta-llama/Llama-3.1-8B-Instruct";

// Rate limiting state - tracks when each provider was last rate limited
const rateLimitState: Record<string, { until: number; backoffMs: number }> = {};

// Minimum delay between requests to same provider (ms)
const MIN_REQUEST_DELAY = 200;
let lastRequestTime = 0;

// Add delay between requests to avoid rate limiting
async function rateLimitDelay(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_DELAY) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_DELAY - elapsed));
  }
  lastRequestTime = Date.now();
}

// Check if provider is currently rate limited
function isRateLimited(providerName: string): boolean {
  const state = rateLimitState[providerName];
  if (!state) return false;
  return Date.now() < state.until;
}

// Mark provider as rate limited with exponential backoff
function markRateLimited(providerName: string, retryAfterMs: number = 15000): void {
  const current = rateLimitState[providerName];
  const backoff = current ? Math.min(current.backoffMs * 2, 120000) : retryAfterMs;
  rateLimitState[providerName] = {
    until: Date.now() + backoff,
    backoffMs: backoff,
  };
  console.log(`⏳ ${providerName} rate limited for ${backoff / 1000}s`);
}

// Reset rate limit on successful request
function clearRateLimit(providerName: string): void {
  delete rateLimitState[providerName];
}

// Load providers from database with their configured models
async function loadDatabaseProviders(supabase: any): Promise<ExtendedAIProvider[]> {
  try {
    const { data: dbKeys, error } = await supabase
      .from("ai_api_keys")
      .select("*")
      .eq("is_active", true)
      .eq("is_vision_capable", true)
      .order("priority_order", { ascending: true });

    if (error || !dbKeys?.length) {
      console.log("📊 No database API keys found, using environment variables");
      return [];
    }

    const providers: ExtendedAIProvider[] = [];
    
    for (const key of dbKeys) {
      const apiKey = atob(key.api_key_encrypted); // Decode base64
      const sanitized = sanitizeApiKey(apiKey);
      if (!sanitized) continue;

      // Skip rate-limited providers
      if (isRateLimited(key.display_name)) {
        console.log(`⏭️ Skipping ${key.display_name} - rate limited`);
        continue;
      }

      const model = key.model_name || "gemini-2.0-flash-lite";

      if (key.provider_type === "lovable") {
        providers.push({
          name: key.display_name,
          endpoint: key.endpoint_url || "https://ai.gateway.lovable.dev/v1/chat/completions",
          apiKey: sanitized,
          model: model,
          isLovable: true,
          type: "lovable",
        });
      } else if (key.provider_type === "gemini") {
        providers.push({
          name: key.display_name,
          endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${sanitized}`,
          apiKey: sanitized,
          model: model,
          isLovable: false,
          type: "gemini",
        });
      }
      // Note: HuggingFace excluded - not vision capable
    }

    console.log(`📊 Loaded ${providers.length} vision-capable providers from database`);
    return providers;
  } catch (err) {
    console.error("Error loading database providers:", err);
    return [];
  }
}

async function getVisionCapableProviders(supabase?: any): Promise<ExtendedAIProvider[]> {
  // IMPORTANT: For image analysis, we only use vision-capable providers
  // HuggingFace models cannot process images, so they are excluded from plant analysis
  const providers: ExtendedAIProvider[] = [];

  // 1. Try loading from database first (uses configured models)
  if (supabase) {
    const dbProviders = await loadDatabaseProviders(supabase);
    providers.push(...dbProviders);
  }

  // 2. Lovable AI Gateway (primary - vision capable with Gemini Pro)
  const lovableKey = sanitizeApiKey(Deno.env.get("LOVABLE_API_KEY"));
  if (lovableKey && !providers.some(p => p.name === "Lovable AI Gateway")) {
    providers.push({
      name: "Lovable AI Gateway",
      endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
      apiKey: lovableKey,
      model: "google/gemini-2.5-pro",
      isLovable: true,
      type: "lovable",
    });
  }

  // 3. Gemini API keys from environment (fallback - uses gemini-1.5-flash for free tier)
  const geminiKeys = [
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_1")), name: "Gemini API 1" },
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_2")), name: "Gemini API 2" },
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_3")), name: "Gemini API 3" },
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_4")), name: "Gemini API 4" },
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_5")), name: "Gemini API 5" },
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_6")), name: "Gemini API 6" },
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_7")), name: "Gemini API 7" },
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_8")), name: "Gemini API 8" },
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_9")), name: "Gemini API 9" },
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_10")), name: "Gemini API 10" },
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_11")), name: "Gemini API 11" },
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_12")), name: "Gemini API 12" },
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_13")), name: "Gemini API 13" },
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_14")), name: "Gemini API 14" },
    { key: sanitizeApiKey(Deno.env.get("GEMINI_API_KEY_15")), name: "Gemini API 15" },
  ];

  for (const { key, name } of geminiKeys) {
    // Skip if already loaded from database or rate limited
    if (key && !providers.some(p => p.name === name) && !isRateLimited(name)) {
      providers.push({
        name,
        endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        apiKey: key,
        model: "gemini-1.5-flash",
        isLovable: false,
        type: "gemini",
      });
    }
  }

  // NOTE: HuggingFace providers are NOT included here because they cannot process images
  // They are text-only models and will return incorrect/generic results for plant analysis

  const activeCount = providers.length;
  console.log(`🔌 Loaded ${activeCount} VISION-CAPABLE AI providers`);
  console.log(`⚠️ HuggingFace providers excluded - they cannot analyze images`);
  
  if (activeCount === 0) {
    console.error("❌ CRITICAL: No vision-capable providers available!");
  }
  
  return providers;
}

// ==================== LEARNING SYSTEM ====================

// Search for similar cases in the learning database
async function searchLearningDatabase(
  supabase: any,
  cropName: string | null,
  diseaseName: string | null,
  region: string | null,
  climateZone: string | null,
  altitude: number | null
): Promise<LearningEntry[]> {
  console.log(`🔍 Searching learning database for: crop="${cropName}", disease="${diseaseName}", region="${region}", climate="${climateZone}"`);
  
  let query = supabase
    .from("diagnosis_learning")
    .select("*")
    .order("verified", { ascending: false })  // Prioritize verified entries
    .order("use_count", { ascending: false })
    .limit(15);

  // Build flexible OR conditions
  const orConditions: string[] = [];
  
  if (cropName) {
    orConditions.push(`crop_name.ilike.%${cropName}%`);
    orConditions.push(`crop_local_name.ilike.%${cropName}%`);
  }
  
  if (diseaseName) {
    orConditions.push(`disease_name.ilike.%${diseaseName}%`);
    orConditions.push(`disease_local_name.ilike.%${diseaseName}%`);
  }
  
  if (orConditions.length > 0) {
    query = query.or(orConditions.join(","));
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error searching learning database:", error);
    return [];
  }

  console.log(`📚 Found ${data?.length || 0} entries in learning database`);

  // Score and filter results based on context similarity
  const scoredResults = (data || []).map((entry: LearningEntry) => {
    let score = 0;
    
    // VERIFIED entries get highest priority
    if (entry.verified) {
      score += 50;
    }
    
    // Exact disease match (very important for finding validated treatments)
    if (diseaseName && entry.disease_name) {
      const diseaseNameLower = diseaseName.toLowerCase();
      const entryDiseaseLower = entry.disease_name.toLowerCase();
      if (entryDiseaseLower === diseaseNameLower) {
        score += 60;
      } else if (entryDiseaseLower.includes(diseaseNameLower) || diseaseNameLower.includes(entryDiseaseLower)) {
        score += 40;
      }
    }
    
    // Exact crop match
    if (cropName && entry.crop_name) {
      const cropNameLower = cropName.toLowerCase();
      const entryCropLower = entry.crop_name.toLowerCase();
      if (entryCropLower === cropNameLower) {
        score += 35;
      } else if (entryCropLower.includes(cropNameLower) || cropNameLower.includes(entryCropLower)) {
        score += 20;
      }
    }

    // Region match
    if (region && entry.region?.toLowerCase() === region.toLowerCase()) {
      score += 15;
    }

    // Climate zone match
    if (climateZone && entry.climate_zone?.toLowerCase() === climateZone.toLowerCase()) {
      score += 10;
    }

    // Altitude proximity (within 300m)
    if (altitude !== null && entry.altitude !== null) {
      const altDiff = Math.abs(altitude - entry.altitude);
      if (altDiff < 100) score += 10;
      else if (altDiff < 300) score += 5;
    }

    // Popular entries (high use count) get a small boost
    score += Math.min(entry.use_count, 10);

    return { entry, score };
  });

  // Filter entries with meaningful scores and sort by score
  const relevantResults = scoredResults
    .filter((r: { score: number }) => r.score >= 20)
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, 5)
    .map((r: { entry: LearningEntry }) => r.entry);

  console.log(`✅ ${relevantResults.length} relevant learning entries after scoring`);
  if (relevantResults.length > 0) {
    console.log(`🏆 Top result: verified=${relevantResults[0].verified}, disease="${relevantResults[0].disease_name}", treatments=${relevantResults[0].treatments?.length || 0}`);
  }
  
  return relevantResults;
}

// Build context from learning entries for AI
function buildLearningContext(learningEntries: LearningEntry[]): string {
  if (learningEntries.length === 0) return "";

  let context = `\n\n--- DONNÉES D'APPRENTISSAGE ADAPTATIVES (DIAGNOSTICS PRÉCÉDENTS) ---\n`;
  context += `Ces diagnostics ont été effectués dans des conditions similaires:\n\n`;

  learningEntries.forEach((entry, i) => {
    context += `📋 CAS ${i + 1}${entry.verified ? " ✓ VÉRIFIÉ" : ""}:\n`;
    context += `  Culture: ${entry.crop_name}${entry.crop_local_name ? ` (${entry.crop_local_name})` : ""}\n`;
    
    if (entry.is_healthy) {
      context += `  État: SAIN\n`;
    } else {
      context += `  Maladie: ${entry.disease_name}${entry.disease_local_name ? ` (${entry.disease_local_name})` : ""}\n`;
      context += `  Gravité: ${entry.severity}\n`;
      
      if (Array.isArray(entry.symptoms) && entry.symptoms.length > 0) {
        context += `  Symptômes: ${entry.symptoms.slice(0, 3).join(", ")}\n`;
      }
      
      if (Array.isArray(entry.treatments) && entry.treatments.length > 0) {
        const bioTreatments = entry.treatments.filter((t: any) => t.type === "biological" || t.type?.includes("bio"));
        const chemTreatments = entry.treatments.filter((t: any) => t.type === "chemical" || t.type?.includes("chim"));
        
        if (bioTreatments.length > 0) {
          context += `  Traitements bio: ${bioTreatments.slice(0, 2).map((t: any) => t.name).join(", ")}\n`;
        }
        if (chemTreatments.length > 0) {
          context += `  Traitements chimiques: ${chemTreatments.slice(0, 2).map((t: any) => t.name).join(", ")}\n`;
        }
      }
    }
    
    if (entry.region) context += `  Région: ${entry.region}\n`;
    if (entry.altitude) context += `  Altitude: ${entry.altitude}m\n`;
    context += `  Utilisé ${entry.use_count} fois\n\n`;
  });

  context += `INSTRUCTION: Si tu identifies un cas similaire à ceux-ci, PRIORISE ces informations validées localement.\n`;

  return context;
}

// Save new diagnosis to learning database
async function saveDiagnosisToLearning(
  supabase: any,
  result: AnalysisResult,
  locationContext: {
    latitude: number | null;
    longitude: number | null;
    altitude: number | null;
    region: string | null;
    climateZone: string | null;
    nearestCity: string | null;
  },
  language: string
): Promise<void> {
  try {
    // Don't save if already from database or very low confidence
    if (result.from_database || result.confidence < 50) {
      console.log("⏭️ Skipping learning save - from database or low confidence");
      return;
    }

    // Build treatments array
    const treatments: Array<{ type: string; name: string; description?: string }> = [];
    
    if (Array.isArray(result.biological_treatments)) {
      result.biological_treatments.forEach(t => {
        treatments.push({ type: "biological", name: t });
      });
    }
    
    if (Array.isArray(result.chemical_treatments)) {
      result.chemical_treatments.forEach(t => {
        treatments.push({ type: "chemical", name: t });
      });
    }

    // Check if similar entry already exists
    const existingQuery = supabase
      .from("diagnosis_learning")
      .select("id, use_count")
      .eq("crop_name", result.detected_crop);
    
    if (result.disease_name) {
      existingQuery.eq("disease_name", result.disease_name);
    } else {
      existingQuery.eq("is_healthy", true);
    }

    if (locationContext.region) {
      existingQuery.eq("region", locationContext.region);
    }

    const { data: existingData } = await existingQuery.limit(1);

    if (existingData && existingData.length > 0) {
      // Update existing entry - increment use count
      const existing = existingData[0];
      console.log(`📊 Updating existing learning entry ${existing.id}, use_count: ${existing.use_count + 1}`);
      
      await supabase
        .from("diagnosis_learning")
        .update({ 
          use_count: existing.use_count + 1,
          last_matched_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      // Insert new learning entry
      const learningEntry = {
        crop_name: result.detected_crop,
        crop_local_name: result.detected_crop_local || null,
        disease_name: result.disease_name || null,
        disease_local_name: result.local_name || null,
        is_healthy: result.is_healthy,
        confidence: result.confidence,
        severity: result.severity || null,
        symptoms: result.symptoms || [],
        causes: result.causes || [],
        treatments: treatments,
        prevention: result.prevention || [],
        latitude: locationContext.latitude,
        longitude: locationContext.longitude,
        altitude: locationContext.altitude,
        region: locationContext.region,
        climate_zone: locationContext.climateZone,
        nearest_city: locationContext.nearestCity,
        language: language,
        source: "user_diagnosis",
        verified: false,
        use_count: 1,
      };

      console.log("💾 Saving new diagnosis to learning database:", {
        crop: learningEntry.crop_name,
        disease: learningEntry.disease_name,
        region: learningEntry.region,
        altitude: learningEntry.altitude
      });

      const { error } = await supabase
        .from("diagnosis_learning")
        .insert(learningEntry);

      if (error) {
        console.error("Error saving to learning database:", error);
      } else {
        console.log("✅ Successfully saved to learning database");
      }
    }
  } catch (err) {
    console.error("Exception saving to learning database:", err);
  }
}

// Increment use count when learning entry is matched
async function incrementLearningUseCount(supabase: any, entryId: string): Promise<void> {
  try {
    await supabase
      .from("diagnosis_learning")
      .update({ 
        use_count: supabase.sql`use_count + 1`,
        last_matched_at: new Date().toISOString()
      })
      .eq("id", entryId);
  } catch (err) {
    console.error("Error incrementing use count:", err);
  }
}

// ==================== DATABASE FUNCTIONS ====================

async function fetchDatabaseContext(supabase: any): Promise<{ crops: DBCrop[]; diseases: DBDisease[] }> {
  console.log("Fetching database context for crops and diseases...");

  const { data: crops } = await supabase
    .from("crops")
    .select("id, name, name_local, description, category, growing_season");

  const { data: diseases } = await supabase
    .from("diseases")
    .select(`
      id,
      name,
      name_local,
      description,
      symptoms,
      causes,
      severity,
      crop_id,
      treatments (
        name,
        type,
        description,
        dosage,
        application_method
      )
    `);

  console.log(`Found ${crops?.length || 0} crops and ${diseases?.length || 0} diseases in database`);
  
  return {
    crops: crops || [],
    diseases: diseases || [],
  };
}

function buildDatabaseContext(crops: DBCrop[], diseases: DBDisease[]): string {
  let context = `--- BASE DE DONNÉES AGRICOLE CAMEROUNAISE ---\n\n`;
  
  context += `CULTURES ENREGISTRÉES:\n`;
  crops.forEach(crop => {
    context += `- ${crop.name} (${crop.name_local || ""}): ${crop.description || ""}\n`;
    if (crop.growing_season?.length) {
      context += `  Saison: ${crop.growing_season.join(", ")}\n`;
    }
  });
  
  context += `\nMALADIES CONNUES:\n`;
  diseases.forEach(disease => {
    const crop = crops.find(c => c.id === disease.crop_id);
    context += `- ${disease.name} (${disease.name_local || ""})\n`;
    context += `  Culture: ${crop?.name || "Non spécifiée"}\n`;
    context += `  Gravité: ${disease.severity || "Non spécifiée"}\n`;
    if (disease.symptoms?.length) {
      context += `  Symptômes: ${disease.symptoms.join(", ")}\n`;
    }
    if (disease.treatments?.length) {
      context += `  Traitements: ${disease.treatments.map(t => `${t.name} (${t.type})`).join(", ")}\n`;
    }
  });

  context += `\nINSTRUCTION IMPORTANTE: Utilise ces données comme référence principale. Si tu identifies une maladie de cette liste, utilise les informations correspondantes. Si la plante est saine, donne des conseils d'entretien et d'amélioration du rendement adaptés au contexte camerounais.`;
  
  return context;
}

function findMatchingDisease(
  diseases: DBDisease[],
  crops: DBCrop[],
  identifiedDisease: string,
  identifiedCrop: string
): { disease: DBDisease | null; crop: DBCrop | null } {
  const cropMatch = crops.find(c => 
    c.name.toLowerCase().includes(identifiedCrop.toLowerCase()) ||
    (c.name_local && c.name_local.toLowerCase().includes(identifiedCrop.toLowerCase())) ||
    identifiedCrop.toLowerCase().includes(c.name.toLowerCase())
  );

  if (!cropMatch) {
    return { disease: null, crop: null };
  }

  const diseaseMatch = diseases.find(d => 
    d.crop_id === cropMatch.id && (
      d.name.toLowerCase().includes(identifiedDisease.toLowerCase()) ||
      (d.name_local && d.name_local.toLowerCase().includes(identifiedDisease.toLowerCase())) ||
      identifiedDisease.toLowerCase().includes(d.name.toLowerCase())
    )
  );

  return { disease: diseaseMatch || null, crop: cropMatch };
}

// ==================== AI PROVIDER FUNCTIONS ====================

function buildLovableRequest(systemPrompt: string, userPrompt: string, imageData: string, dbContext: string) {
  return {
    model: "google/gemini-2.5-pro",
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
          name: "analyze_plant_health",
          description: "Analyse une image de plante, détecte automatiquement le type de culture et son état de santé",
          parameters: {
            type: "object",
            properties: {
              is_healthy: { type: "boolean", description: "True si la plante est en bonne santé, false si elle a une maladie ou problème" },
              detected_crop: { type: "string", description: "Nom de la culture détectée automatiquement" },
              detected_crop_local: { type: "string", description: "Nom local camerounais de la culture si disponible" },
              disease_name: { type: "string", description: "Nom de la maladie/ravageur si détecté (null si plante saine)" },
              local_name: { type: "string", description: "Nom local camerounais de la maladie si disponible" },
              confidence: { type: "number", description: "Niveau de confiance de la détection (0-100)" },
              severity: { type: "string", enum: ["healthy", "low", "medium", "high", "critical"], description: "Niveau de gravité (healthy si plante saine)" },
              description: { type: "string", description: "Description de l'état de la plante" },
              causes: { type: "array", items: { type: "string" }, description: "Causes du problème (si malade)" },
              symptoms: { type: "array", items: { type: "string" }, description: "Symptômes observés (si malade)" },
              biological_treatments: { type: "array", items: { type: "string" }, description: "Traitements biologiques (si malade)" },
              chemical_treatments: { type: "array", items: { type: "string" }, description: "Traitements chimiques avec noms commerciaux locaux (si malade)" },
              prevention: { type: "array", items: { type: "string" }, description: "Mesures préventives" },
              maintenance_tips: { type: "array", items: { type: "string" }, description: "Conseils d'entretien adaptés au contexte camerounais (si plante saine)" },
              yield_improvement_tips: { type: "array", items: { type: "string" }, description: "Conseils pour améliorer le rendement (si plante saine)" },
            },
            required: ["is_healthy", "detected_crop", "confidence", "severity", "description", "prevention"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "analyze_plant_health" } },
  };
}

function buildGeminiRequest(systemPrompt: string, userPrompt: string, imageData: string, dbContext: string) {
  const base64Data = imageData.startsWith("data:") 
    ? imageData.split(",")[1] 
    : imageData;

  const jsonSchema = `{
  "is_healthy": "boolean - true si plante saine, false si malade",
  "detected_crop": "string - Nom de la culture détectée automatiquement",
  "detected_crop_local": "string - Nom local camerounais de la culture",
  "disease_name": "string ou null - Nom de la maladie si détectée",
  "local_name": "string ou null - Nom local de la maladie",
  "confidence": "number - Niveau de confiance 0-100",
  "severity": "string - healthy | low | medium | high | critical",
  "description": "string - Description de l'état de la plante",
  "causes": ["array - Causes du problème si malade"],
  "symptoms": ["array - Symptômes observés si malade"],
  "biological_treatments": ["array - Traitements biologiques si malade"],
  "chemical_treatments": ["array - Traitements chimiques si malade"],
  "prevention": ["array - Mesures préventives"],
  "maintenance_tips": ["array - Conseils d'entretien si plante saine"],
  "yield_improvement_tips": ["array - Conseils amélioration rendement si plante saine"]
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

function parseLovableResponse(data: any): AnalysisResult | null {
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    return null;
  }
  const result = JSON.parse(toolCall.function.arguments);
  return { ...result, from_database: false, from_learning: false };
}

function parseGeminiResponse(data: any): AnalysisResult | null {
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    return null;
  }

  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }

  const result = JSON.parse(jsonMatch[0]);
  return { ...result, from_database: false, from_learning: false };
}

function isRecoverableError(status: number): boolean {
  // 400 = invalid API key (skip to next provider)
  // 401/403 = invalid/unauthorized credentials (skip to next provider)
  // 404 = wrong endpoint/model (skip to next provider)
  // 402 = payment required
  // 429 = rate limit exceeded  
  // 410 = deprecated endpoint (skip to next provider)
  // 500/503/529 = server errors
  return (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 410 ||
    status === 402 ||
    status === 429 ||
    status === 500 ||
    status === 503 ||
    status === 529
  );
}

async function callProvider(
  provider: AIProvider,
  systemPrompt: string,
  userPrompt: string,
  imageData: string,
  dbContext: string
): Promise<{ success: boolean; result?: AnalysisResult; error?: string; shouldRetry: boolean }> {
  console.log(`Trying provider: ${provider.name}`);

  try {
    let response: Response;
    let result: AnalysisResult | null = null;

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
      // HuggingFace Router: text-only fallback with explicit JSON structure
      const jsonExample = `{
  "is_healthy": true,
  "detected_crop": "Maïs",
  "detected_crop_local": "Mbanga",
  "disease_name": null,
  "confidence": 75,
  "severity": "healthy",
  "description": "Analyse basée sur description textuelle",
  "prevention": ["Rotation des cultures"],
  "maintenance_tips": ["Arrosage régulier"],
  "yield_improvement_tips": ["Fertilisation adaptée"]
}`;
      
      const textPrompt = `Tu es un expert agronome camerounais. L'utilisateur décrit une plante pour analyse.
Comme tu n'as pas d'image, fournis une analyse générique basée sur les cultures camerounaises communes.

INSTRUCTION CRITIQUE: Tu DOIS répondre UNIQUEMENT avec un objet JSON valide suivant EXACTEMENT cette structure:
${jsonExample}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après. Assure-toi que "detected_crop" et "confidence" sont présents.`;
      
      const token = sanitizeApiKey(provider.apiKey) ?? provider.apiKey;

      response = await fetch(provider.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: "user", content: textPrompt },
          ],
          max_tokens: 1024,
          temperature: 0.3,
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
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            // Validate required fields exist
            if (parsed.detected_crop && typeof parsed.confidence === 'number') {
              result = { ...parsed, from_database: false, from_learning: false };
            } else {
              console.error(`${provider.name}: Invalid response - missing required fields`);
            }
          } catch (parseErr) {
            console.error(`${provider.name}: JSON parse error:`, parseErr);
          }
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

    // Additional validation: ensure critical fields exist
    if (!result.detected_crop || typeof result.confidence !== 'number') {
      console.error(`${provider.name}: Response missing critical fields (detected_crop or confidence)`);
      return {
        success: false,
        error: `${provider.name}: Invalid response structure`,
        shouldRetry: true,
      };
    }

    console.log(`${provider.name} succeeded - Healthy: ${result.is_healthy}, Crop: ${result.detected_crop}`);
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

function enrichResultWithDatabase(
  result: AnalysisResult,
  diseases: DBDisease[],
  crops: DBCrop[]
): AnalysisResult {
  // Safety guard: if detected_crop is missing, return as-is
  if (!result.detected_crop) {
    console.warn("enrichResultWithDatabase: detected_crop is undefined, skipping enrichment");
    return result;
  }

  if (!result.is_healthy && result.disease_name) {
    const { disease, crop } = findMatchingDisease(
      diseases,
      crops,
      result.disease_name,
      result.detected_crop
    );

    if (disease) {
      console.log("Enriching result with database disease:", disease.name);
      
      const biologicalTreatments = disease.treatments
        ?.filter(t => t.type === "biological")
        .map(t => `${t.name}: ${t.description}${t.dosage ? ` (${t.dosage})` : ""}`);
      
      const chemicalTreatments = disease.treatments
        ?.filter(t => t.type === "chemical")
        .map(t => `${t.name}: ${t.description}${t.dosage ? ` (${t.dosage})` : ""}`);

      return {
        ...result,
        local_name: disease.name_local || result.local_name,
        causes: disease.causes?.length ? disease.causes : result.causes,
        symptoms: disease.symptoms?.length ? disease.symptoms : result.symptoms,
        biological_treatments: biologicalTreatments?.length ? biologicalTreatments : result.biological_treatments,
        chemical_treatments: chemicalTreatments?.length ? chemicalTreatments : result.chemical_treatments,
        from_database: true,
      };
    }

    if (crop) {
      return {
        ...result,
        detected_crop_local: crop.name_local || result.detected_crop_local,
      };
    }
  }

  const detectedCropLower = result.detected_crop?.toLowerCase() || "";
  const matchingCrop = crops.find(c => 
    c.name?.toLowerCase()?.includes(detectedCropLower) ||
    detectedCropLower.includes(c.name?.toLowerCase() || "")
  );

  if (matchingCrop) {
    return {
      ...result,
      detected_crop_local: matchingCrop.name_local || result.detected_crop_local,
    };
  }

  return result;
}

function getLocationContext(
  latitude: number | null,
  longitude: number | null,
  altitude: number | null,
  language: string
): string {
  if (!latitude || !longitude) {
    return "";
  }

  let context = `\n\n--- CONTEXTE GÉOGRAPHIQUE DE L'AGRICULTEUR ---\n`;
  context += `Position GPS: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E\n`;
  
  if (altitude !== null) {
    context += `Altitude: ${Math.round(altitude)}m\n`;
    
    if (altitude > 1200) {
      context += `Zone: Hautes terres (climat frais, risque de gelées matinales)\n`;
    } else if (altitude > 800) {
      context += `Zone: Moyenne altitude (climat tempéré tropical)\n`;
    } else if (altitude > 400) {
      context += `Zone: Basse altitude (climat tropical humide)\n`;
    } else {
      context += `Zone: Plaine côtière ou forestière\n`;
    }
  }

  if (latitude > 8) {
    context += `Région climatique: Soudano-sahélienne (saison sèche longue, températures élevées)\n`;
    context += `Sols typiques: Sablonneux à argileux, parfois ferrugineux\n`;
  } else if (latitude > 6) {
    context += `Région climatique: Haute Guinée / Adamaoua (savane, altitude variable)\n`;
    context += `Sols typiques: Ferralitiques, propices à l'élevage et aux cultures tempérées\n`;
  } else if (latitude < 5 && longitude < 11) {
    context += `Région climatique: Forestière équatoriale (forte humidité, deux saisons de pluies)\n`;
    context += `Sols typiques: Ferralitiques humides, riches en matière organique\n`;
  } else {
    context += `Région climatique: Forestière guinéenne (humide, cultures vivrières variées)\n`;
    context += `Sols typiques: Ferralitiques à hydromorphes\n`;
  }

  context += `\nADAPTE tes conseils à cette zone géographique spécifique et à l'altitude de l'agriculteur.\n`;
  
  return context;
}

// ==================== MAIN HANDLER ====================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      image, 
      language = "fr", 
      userSpecifiedCrop,
      latitude = null,
      longitude = null,
      altitude = null,
      accuracy = null,
      regionName = null,
      climateZone = null,
      nearestCity = null,
    } = await req.json();

    console.log("🌱 Analyze request - Location:", latitude, longitude, "Alt:", altitude, "Region:", regionName);

    if (!image) {
      console.error("No image provided");
      return new Response(
        JSON.stringify({ error: "Image requise pour l'analyse" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all database context
    const { crops, diseases } = await fetchDatabaseContext(supabase);
    let dbContext = buildDatabaseContext(crops, diseases);
    
    // ==================== LEARNING SYSTEM: INITIAL SEARCH ====================
    const searchCropName = userSpecifiedCrop || null;
    let learningEntries = await searchLearningDatabase(
      supabase,
      searchCropName,
      null, // disease name not known yet
      regionName,
      climateZone,
      altitude
    );
    
    // Add learning context to AI prompt
    const learningContext = buildLearningContext(learningEntries);
    if (learningContext) {
      dbContext += learningContext;
    }
    
    // Add location context if available
    const locationContext = getLocationContext(latitude, longitude, altitude, language);
    if (locationContext) {
      dbContext += locationContext;
    }

    const providers = await getVisionCapableProviders(supabase);
    if (providers.length === 0) {
      console.error("No vision-capable AI providers configured");
      return new Response(
        JSON.stringify({ error: "Aucun fournisseur IA avec capacité vision configuré. Veuillez configurer au moins une clé Lovable AI ou Gemini." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Available vision providers: ${providers.map((p: ExtendedAIProvider) => p.name).join(", ")}`);
    console.log("Language:", language);
    console.log("User specified crop:", userSpecifiedCrop || "None (auto-detect)");
    console.log(`📚 Learning entries found: ${learningEntries.length}`);

    const systemPrompt = `Tu es un expert agronome botaniste de NIVEAU MONDIAL spécialisé dans l'identification précise des plantes et cultures africaines, particulièrement au Cameroun.

SYSTÈME D'APPRENTISSAGE ADAPTATIF:
Tu as accès à une base de données d'apprentissage contenant des diagnostics précédents effectués dans des conditions similaires.
Ces diagnostics ont été validés par la communauté d'agriculteurs et certains par des experts.
PRIORISE ces données d'apprentissage si elles correspondent au cas actuel.

COMPÉTENCES ESSENTIELLES D'IDENTIFICATION:
Tu dois EXAMINER ATTENTIVEMENT chaque détail visuel de la plante:
- La FORME des feuilles (lancéolées, palmées, lobées, composées, simples)
- La DISPOSITION des feuilles (alternes, opposées, verticillées)
- La NERVATION des feuilles (parallèle = monocotylédone, ramifiée = dicotylédone)
- La TEXTURE et l'aspect du feuillage (brillant, mat, pubescent, lisse)
- La COULEUR exacte (vert clair, vert foncé, reflets)
- Le PORT de la plante (arbustif, herbacé, grimpant, arborescent)
- Les TIGES (ligneuses, herbacées, creuses, pleines)
- La TAILLE apparente et les proportions

DISTINCTIONS CRITIQUES À MAÎTRISER:
1. AVOCAT vs MANIOC:
   - Avocat: Feuilles alternes, simples, elliptiques à lancéolées, brillantes dessus, vert foncé, nervures pennées, arbre
   - Manioc: Feuilles palmées à 5-7 lobes profonds, tige ligneuse avec cicatrices foliaires, arbuste

2. CACAO vs CAFÉ:
   - Cacao: Grandes feuilles brillantes, pendantes, nervures marquées, cabosses sur le tronc
   - Café: Feuilles opposées, plus petites, brillantes, ondulées, cerises rouges/vertes

3. MAÏS vs autres graminées:
   - Maïs: Tige épaisse, feuilles longues engainantes, épis caractéristiques

4. BANANE PLANTAIN vs BANANIER dessert:
   - Plantain: Fruits plus grands, plus anguleux, peau épaisse

TÂCHE PRINCIPALE:
${userSpecifiedCrop 
  ? `L'UTILISATEUR a IDENTIFIÉ cette plante comme étant: "${userSpecifiedCrop}". 
ACCEPTE cette identification et concentre-toi sur l'analyse de santé de cette culture.
NE CONTREDIS PAS l'utilisateur sauf si l'image montre clairement une plante TOTALEMENT différente.`
  : `DÉTECTE PRÉCISÉMENT le type de culture/plante dans l'image en utilisant TOUTES tes compétences botaniques.
PRENDS LE TEMPS d'analyser chaque caractéristique visuelle avant de conclure.
En cas de doute entre deux espèces, examine les détails distinctifs.`
}

ENSUITE:
1. ÉVALUE l'état de santé de la plante
2. Si MALADE: identifie la maladie et propose des traitements locaux camerounais
3. Si SAINE: confirme la bonne santé et donne des conseils d'entretien et d'amélioration du rendement

INSTRUCTIONS IMPORTANTES:
- PRIORISE les données de la base de données locale et les diagnostics d'apprentissage si disponibles
- Propose UNIQUEMENT des solutions disponibles au Cameroun
- Inclus des noms locaux quand disponibles
- Adapte le vocabulaire pour des agriculteurs avec un niveau d'éducation variable
- TIENS COMPTE de la position géographique et de l'altitude de l'agriculteur pour adapter tes conseils
- Les conditions climatiques et les sols varient selon les régions: adapte les recommandations

${regionName ? `L'agriculteur se trouve dans la région: ${regionName}` : ""}
${climateZone ? `Zone climatique: ${climateZone}` : ""}
${altitude !== null ? `Altitude: ${Math.round(altitude)}m - Adapte tes conseils à cette altitude` : ""}

Cultures camerounaises courantes: cacao, café, maïs, manioc, banane plantain, tomate, gombo, arachide, haricot, igname, macabo, patate douce, poivron, piment, ananas, palmier à huile, avocat, papaye, mangue, orange, citron, goyave.`;

    const userPrompt = userSpecifiedCrop
      ? `L'utilisateur a identifié cette plante comme: "${userSpecifiedCrop}".

Analyse cette image de ${userSpecifiedCrop}:
1. Confirme s'il s'agit bien de ${userSpecifiedCrop} ou indique si c'est une autre plante
2. Évalue si la plante est en bonne santé ou malade
3. Si malade: donne le diagnostic complet avec traitements disponibles au Cameroun
4. Si saine: donne des conseils d'entretien et d'amélioration du rendement adaptés au contexte camerounais

Réponds en ${language === "fr" ? "français" : "anglais"}.`
      : `Analyse cette image de plante avec une GRANDE PRÉCISION.

1. IDENTIFIE le type exact de culture en examinant attentivement:
   - La forme et disposition des feuilles
   - La texture et couleur du feuillage
   - Le port général de la plante
   - Tout autre élément distinctif visible
   
2. Évalue si la plante est en bonne santé ou malade
3. Si malade: donne le diagnostic complet avec traitements disponibles au Cameroun
4. Si saine: donne des conseils d'entretien et d'amélioration du rendement adaptés au contexte camerounais

IMPORTANT: Prends le temps d'analyser les détails visuels avant de conclure sur l'identification.

Réponds en ${language === "fr" ? "français" : "anglais"}.`;

    let lastError = "";
    let usedProvider = "";
    let attemptCount = 0;

    for (const provider of providers) {
      attemptCount++;
      
      // Add delay between requests to avoid rate limiting
      if (attemptCount > 1) {
        await rateLimitDelay();
      }
      
      // Skip if provider got rate limited during this request
      if (isRateLimited(provider.name)) {
        console.log(`⏭️ Skipping ${provider.name} - currently rate limited`);
        continue;
      }
      
      console.log(`🔄 Trying provider ${attemptCount}/${providers.length}: ${provider.name}`);
      
      const { success, result, error, shouldRetry } = await callProvider(
        provider,
        systemPrompt,
        userPrompt,
        image,
        dbContext
      );
      
      // Track rate limiting
      if (error?.includes("429")) {
        markRateLimited(provider.name);
      } else if (success) {
        clearRateLimit(provider.name);
      }

      if (success && result) {
        usedProvider = provider.name;
        
        // ==================== POST-ANALYSIS LEARNING SEARCH ====================
        // Now that we have a disease name, search again in learning database
        if (result.disease_name && !result.is_healthy) {
          const postAnalysisLearning = await searchLearningDatabase(
            supabase,
            result.detected_crop,
            result.disease_name,
            regionName,
            climateZone,
            altitude
          );
          
          // Merge with initial learning entries, prioritizing post-analysis results
          if (postAnalysisLearning.length > 0) {
            console.log(`🔄 Post-analysis search found ${postAnalysisLearning.length} matching entries`);
            
            // Keep unique entries, prioritizing verified ones from post-analysis
            const existingIds = new Set(learningEntries.map(e => e.id));
            for (const entry of postAnalysisLearning) {
              if (!existingIds.has(entry.id)) {
                learningEntries.push(entry);
              }
            }
          }
        }
        
        // Enrich with database info
        let enrichedResult = enrichResultWithDatabase(result, diseases, crops);
        
        // ==================== LEARNING ENRICHMENT ====================
        // Find best matching verified learning entry for treatment enrichment
        const matchedLearning = learningEntries
          .filter(entry => entry.verified) // Prioritize verified entries
          .find(entry => {
            const diseaseMatch = entry.disease_name && result.disease_name &&
              (entry.disease_name.toLowerCase().includes(result.disease_name.toLowerCase()) ||
               result.disease_name.toLowerCase().includes(entry.disease_name.toLowerCase()));
            const cropMatch = entry.crop_name &&
              (entry.crop_name.toLowerCase().includes(result.detected_crop.toLowerCase()) ||
               result.detected_crop.toLowerCase().includes(entry.crop_name.toLowerCase()));
            return diseaseMatch && cropMatch;
          }) || learningEntries.find(entry => {
            // Fallback to any matching entry
            const diseaseMatch = entry.disease_name && result.disease_name &&
              (entry.disease_name.toLowerCase().includes(result.disease_name.toLowerCase()) ||
               result.disease_name.toLowerCase().includes(entry.disease_name.toLowerCase()));
            return diseaseMatch;
          });
        
        if (matchedLearning) {
          console.log(`🎯 Matched learning entry: id=${matchedLearning.id}, verified=${matchedLearning.verified}`);
          enrichedResult.from_learning = true;
          
          // Enrich with treatments from learning entry if not already from database
          if (matchedLearning.treatments && matchedLearning.treatments.length > 0) {
            const bioFromLearning = matchedLearning.treatments
              .filter((t: any) => t.type === "biological" || t.type?.includes("bio"))
              .map((t: any) => t.description ? `${t.name}: ${t.description}` : t.name);
            
            const chemFromLearning = matchedLearning.treatments
              .filter((t: any) => t.type === "chemical" || t.type?.includes("chim"))
              .map((t: any) => t.description ? `${t.name}: ${t.description}` : t.name);
            
            // Merge with existing treatments (learning data adds to, doesn't replace)
            if (bioFromLearning.length > 0) {
              const existingBio = enrichedResult.biological_treatments || [];
              const allBio = [...new Set([...bioFromLearning, ...existingBio])];
              enrichedResult.biological_treatments = allBio;
              console.log(`📋 Added ${bioFromLearning.length} biological treatments from learning`);
            }
            
            if (chemFromLearning.length > 0) {
              const existingChem = enrichedResult.chemical_treatments || [];
              const allChem = [...new Set([...chemFromLearning, ...existingChem])];
              enrichedResult.chemical_treatments = allChem;
              console.log(`📋 Added ${chemFromLearning.length} chemical treatments from learning`);
            }
          }
          
          // Enrich symptoms and causes from verified learning
          if (matchedLearning.verified) {
            if (matchedLearning.symptoms && matchedLearning.symptoms.length > 0) {
              const existingSymptoms = enrichedResult.symptoms || [];
              enrichedResult.symptoms = [...new Set([...matchedLearning.symptoms, ...existingSymptoms])];
            }
            if (matchedLearning.causes && matchedLearning.causes.length > 0) {
              const existingCauses = enrichedResult.causes || [];
              enrichedResult.causes = [...new Set([...matchedLearning.causes, ...existingCauses])];
            }
          }
          
          // Increment use count asynchronously
          incrementLearningUseCount(supabase, matchedLearning.id);
        }
        
        // ==================== LEARNING SYSTEM: SAVE NEW DIAGNOSIS ====================
        // Save to learning database (async, non-blocking)
        saveDiagnosisToLearning(
          supabase,
          enrichedResult,
          {
            latitude,
            longitude,
            altitude,
            region: regionName,
            climateZone,
            nearestCity,
          },
          language
        );
        
        return new Response(
          JSON.stringify({
            success: true,
            analysis: enrichedResult,
            analyzed_at: new Date().toISOString(),
            provider: usedProvider,
            learning_entries_used: learningEntries.length,
            matched_verified: matchedLearning?.verified || false,
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

    // All providers failed - provide specific error codes
    console.error("All providers failed. Last error:", lastError);
    
    // Detect error type for better client-side handling
    const isCreditsError = lastError?.includes('402') || lastError?.includes('credits') || lastError?.includes('payment');
    const isQuotaError = lastError?.includes('429') || lastError?.includes('quota') || lastError?.includes('RESOURCE_EXHAUSTED');
    
    if (isCreditsError) {
      return new Response(
        JSON.stringify({ 
          error: "Crédits IA épuisés. Veuillez recharger votre compte.",
          error_type: "credits_exhausted",
          details: lastError
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (isQuotaError) {
      return new Response(
        JSON.stringify({ 
          error: "Quota API dépassé. Veuillez réessayer dans quelques minutes.",
          error_type: "quota_exceeded",
          details: lastError
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: "Tous les services IA sont temporairement indisponibles. Veuillez réessayer plus tard.",
        error_type: "service_unavailable",
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
