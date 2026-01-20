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
      model: "google/gemini-2.5-pro",
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

// Fetch all crops and diseases from database for context
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

// Build comprehensive database context for AI
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

// Find matching disease from database
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
  return { ...result, from_database: false };
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

// Enrich AI result with database information if available
function enrichResultWithDatabase(
  result: AnalysisResult,
  diseases: DBDisease[],
  crops: DBCrop[]
): AnalysisResult {
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

  // For healthy plants, try to add local name
  const matchingCrop = crops.find(c => 
    c.name.toLowerCase().includes(result.detected_crop.toLowerCase()) ||
    result.detected_crop.toLowerCase().includes(c.name.toLowerCase())
  );

  if (matchingCrop) {
    return {
      ...result,
      detected_crop_local: matchingCrop.name_local || result.detected_crop_local,
    };
  }

  return result;
}

// Get location context for advice
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

  // Determine region from coordinates
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
    } = await req.json();

    console.log("Analyze request - Location:", latitude, longitude, "Alt:", altitude, "Region:", regionName);

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
    
    // Add location context if available
    const locationContext = getLocationContext(latitude, longitude, altitude, language);
    if (locationContext) {
      dbContext += locationContext;
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
    console.log("Language:", language);
    console.log("User specified crop:", userSpecifiedCrop || "None (auto-detect)");

    // Enhanced system prompt for better plant detection
    const systemPrompt = `Tu es un expert agronome botaniste de NIVEAU MONDIAL spécialisé dans l'identification précise des plantes et cultures africaines, particulièrement au Cameroun.

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
- PRIORISE les données de la base de données locale si elles sont fournies
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

    for (const provider of providers) {
      const { success, result, error, shouldRetry } = await callProvider(
        provider,
        systemPrompt,
        userPrompt,
        image,
        dbContext
      );

      if (success && result) {
        usedProvider = provider.name;
        
        // Enrich with database info
        const enrichedResult = enrichResultWithDatabase(result, diseases, crops);
        
        return new Response(
          JSON.stringify({
            success: true,
            analysis: enrichedResult,
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
    console.error("All providers failed. Last error:", lastError);
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
