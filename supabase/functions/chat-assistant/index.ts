import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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

// Fetch relevant data from database based on user query
async function fetchDatabaseContext(supabase: any, userMessage: string, language: string): Promise<string> {
  const lowerMessage = userMessage.toLowerCase();
  let context = "";

  // Check for crop mentions
  const { data: crops } = await supabase
    .from("crops")
    .select("name, name_local, description, growing_season, regions")
    .limit(10);

  // Check for disease mentions
  const { data: diseases } = await supabase
    .from("diseases")
    .select(`
      name,
      name_local,
      description,
      symptoms,
      causes,
      severity,
      crops (name)
    `)
    .limit(10);

  // Check for market prices
  const { data: prices } = await supabase
    .from("market_prices")
    .select(`
      price_min,
      price_max,
      unit,
      market_name,
      region,
      quality_grade,
      crops (name)
    `)
    .order("recorded_at", { ascending: false })
    .limit(20);

  // Check for farming tips
  const { data: tips } = await supabase
    .from("farming_tips")
    .select("title, content, category, crops (name)")
    .eq("language", language)
    .order("priority", { ascending: false })
    .limit(10);

  // Check for active alerts
  const { data: alerts } = await supabase
    .from("agricultural_alerts")
    .select("title, message, type, severity, region")
    .eq("is_active", true)
    .limit(5);

  // Build context based on what data we found
  if (crops && crops.length > 0) {
    const relevantCrops = crops.filter((c: any) => 
      lowerMessage.includes(c.name.toLowerCase()) || 
      (c.name_local && lowerMessage.includes(c.name_local.toLowerCase()))
    );

    if (relevantCrops.length > 0) {
      context += "\n--- CULTURES MENTIONNÉES (Base de données locale) ---\n";
      relevantCrops.forEach((c: any) => {
        context += `${c.name} (${c.name_local || ""}): ${c.description}\n`;
        context += `  Régions: ${c.regions?.join(", ") || "Toutes"}\n`;
        context += `  Saison: ${c.growing_season?.join(", ") || "Variable"}\n`;
      });
    }
  }

  // Check for disease-related questions
  if (lowerMessage.includes("maladie") || lowerMessage.includes("disease") || 
      lowerMessage.includes("traitement") || lowerMessage.includes("treatment") ||
      lowerMessage.includes("symptom") || lowerMessage.includes("problème")) {
    if (diseases && diseases.length > 0) {
      context += "\n--- MALADIES CONNUES (Base de données locale) ---\n";
      diseases.slice(0, 5).forEach((d: any) => {
        context += `${d.name} (${d.crops?.name || "Général"}): ${d.description}\n`;
        if (d.symptoms) context += `  Symptômes: ${d.symptoms.slice(0, 3).join(", ")}\n`;
      });
    }
  }

  // Check for price-related questions
  if (lowerMessage.includes("prix") || lowerMessage.includes("price") || 
      lowerMessage.includes("marché") || lowerMessage.includes("market") ||
      lowerMessage.includes("vendre") || lowerMessage.includes("sell")) {
    if (prices && prices.length > 0) {
      context += "\n--- PRIX DU MARCHÉ (Base de données locale) ---\n";
      const uniqueCrops = new Set();
      prices.forEach((p: any) => {
        if (!uniqueCrops.has(p.crops?.name) && p.crops?.name) {
          uniqueCrops.add(p.crops.name);
          context += `${p.crops.name} (Grade ${p.quality_grade || "A"}): ${p.price_min}-${p.price_max} XAF/${p.unit} au ${p.market_name} (${p.region})\n`;
        }
      });
    }
  }

  // Include relevant tips
  if (tips && tips.length > 0) {
    const relevantTips = tips.filter((t: any) => {
      const cropName = t.crops?.name?.toLowerCase() || "";
      return lowerMessage.includes(cropName) || 
             lowerMessage.includes(t.category.toLowerCase());
    }).slice(0, 3);

    if (relevantTips.length > 0) {
      context += "\n--- CONSEILS PERTINENTS (Base de données locale) ---\n";
      relevantTips.forEach((t: any) => {
        context += `• ${t.title}: ${t.content}\n`;
      });
    }
  }

  // Include active alerts
  if (alerts && alerts.length > 0) {
    context += "\n--- ALERTES ACTIVES ---\n";
    alerts.forEach((a: any) => {
      context += `⚠️ ${a.title}: ${a.message}\n`;
    });
  }

  return context;
}

// Save chat message to history
async function saveChatMessage(supabase: any, sessionId: string, role: string, content: string) {
  try {
    await supabase.from("chat_history").insert({
      session_id: sessionId,
      role,
      content,
    });
  } catch (error) {
    console.error("Error saving chat message:", error);
  }
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
    const { messages, language = "fr", region = "centre", session_id } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the last user message for context search
    const lastUserMessage = messages.filter((m: ChatMessage) => m.role === "user").pop()?.content || "";
    
    // Fetch relevant database context
    const dbContext = await fetchDatabaseContext(supabase, lastUserMessage, language);
    console.log("Database context length:", dbContext.length);

    // Save user message to history
    if (session_id && lastUserMessage) {
      await saveChatMessage(supabase, session_id, "user", lastUserMessage);
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

${dbContext ? `DONNÉES LOCALES DISPONIBLES (PRIORITAIRES):
${dbContext}

INSTRUCTION IMPORTANTE: Utilise EN PRIORITÉ les données ci-dessus de la base de données locale. 
Ces informations sont vérifiées et adaptées au contexte camerounais.
Ne fais des recherches externes que si les données locales ne couvrent pas la question.` : ""}

TES COMPÉTENCES:
1. Conseils sur les cultures camerounaises: cacao, café, maïs, manioc, banane plantain, tomate, gombo, arachide, haricot, igname, macabo, patate douce
2. Identification et traitement des maladies des plantes
3. Calendrier agricole adapté aux saisons camerounaises
4. Prix du marché et conseils de vente
5. Techniques agricoles durables
6. Gestion des sols et irrigation

RÈGLES:
- Réponds UNIQUEMENT en ${language === "fr" ? "français" : "anglais"}
- PRIORISE les données de la base de données locale si elles sont disponibles
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
    let aiResponse = "";

    for (const provider of providers) {
      const { success, response, error, shouldRetry } = await callProvider(
        provider,
        messages,
        systemPrompt
      );

      if (success && response) {
        aiResponse = response;

        // Save assistant response to history
        if (session_id) {
          await saveChatMessage(supabase, session_id, "assistant", aiResponse);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: aiResponse,
            timestamp: new Date().toISOString(),
            database_context_used: !!dbContext,
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
