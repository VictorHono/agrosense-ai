import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface Alert {
  id: string;
  type: "warning" | "info" | "danger";
  title: string;
  message: string;
  region: string;
  created_at: string;
  expires_at: string;
}

interface AIProvider {
  name: string;
  endpoint: string;
  apiKey: string;
  isLovable: boolean;
}

// Provider types for extended fallback system
type ProviderType = "lovable" | "gemini" | "huggingface";

interface ExtendedAIProvider extends AIProvider {
  type: ProviderType;
}

// Sanitize API keys to remove invisible characters and common errors
function sanitizeApiKey(key: string | null | undefined): string | null {
  if (!key) return null;
  let k = key.trim();
  if (!k) return null;
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  const keyParam = k.match(/(?:\?|&)key=([^&\s]+)/i);
  if (keyParam?.[1]) k = keyParam[1];
  k = k.replace(/^authorization:\s*/i, "");
  k = k.replace(/^bearer\s+/i, "");
  k = k.replace(/^token\s+/i, "");
  k = k.replace(/\s+/g, "");
  try { k = k.normalize("NFKC"); } catch { /* ignore */ }
  k = k.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  k = Array.from(k).filter((ch) => ch.charCodeAt(0) <= 0x7e).join("");
  return k || null;
}

// Check if an error is recoverable (should try next provider)
function isRecoverableError(status: number): boolean {
  return [400, 401, 402, 403, 404, 410, 429, 500, 502, 503, 504].includes(status);
}

// HuggingFace Router model
const HF_FALLBACK_MODEL = "meta-llama/Llama-3.1-8B-Instruct";

function getAIProviders(): ExtendedAIProvider[] {
  const providers: ExtendedAIProvider[] = [];

  // 1. Lovable AI Gateway (primary)
  const lovableKey = sanitizeApiKey(Deno.env.get("LOVABLE_API_KEY"));
  if (lovableKey) {
    providers.push({
      name: "Lovable AI Gateway",
      endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
      apiKey: lovableKey,
      isLovable: true,
      type: "lovable",
    });
  }

  // 2. Gemini API keys (15 keys for maximum availability)
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
    if (key) {
      providers.push({
        name,
        endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        apiKey: key,
        isLovable: false,
        type: "gemini",
      });
    }
  }

  // 3. Hugging Face Inference API (5 keys for additional fallback)
  const huggingfaceKeys = [
    { key: sanitizeApiKey(Deno.env.get("HUGGINGFACE_API_KEY_1")), name: "HuggingFace API 1" },
    { key: sanitizeApiKey(Deno.env.get("HUGGINGFACE_API_KEY_2")), name: "HuggingFace API 2" },
    { key: sanitizeApiKey(Deno.env.get("HUGGINGFACE_API_KEY_3")), name: "HuggingFace API 3" },
    { key: sanitizeApiKey(Deno.env.get("HUGGINGFACE_API_KEY_4")), name: "HuggingFace API 4" },
    { key: sanitizeApiKey(Deno.env.get("HUGGINGFACE_API_KEY_5")), name: "HuggingFace API 5" },
  ];

  for (const { key, name } of huggingfaceKeys) {
    if (key) {
      providers.push({
        name,
        endpoint: "https://router.huggingface.co/v1/chat/completions",
        apiKey: key,
        isLovable: false,
        type: "huggingface",
      });
    }
  }

  console.log(`🔌 Loaded ${providers.length} AI providers`);
  return providers;
}

async function generateAlertsWithAI(region: string, language: string): Promise<Alert[]> {
  const providers = getAIProviders();
  if (providers.length === 0) {
    return [];
  }

  const currentMonth = new Date().toLocaleString("fr-FR", { month: "long" });
  const currentDate = new Date().toISOString().split("T")[0];

  const prompt = `Tu es un système d'alerte agricole pour le Cameroun.
Génère 1 à 2 alertes agricoles pertinentes pour la région "${region}" au mois de ${currentMonth}.

Les alertes doivent être:
- Réalistes et basées sur les problèmes agricoles courants au Cameroun
- Spécifiques à la saison actuelle
- Utiles pour les agriculteurs locaux

Types d'alertes possibles:
- Ravageurs saisonniers (chenilles légionnaires, charançons, etc.)
- Maladies des cultures (pourriture brune du cacao, mosaïque du manioc, etc.)
- Conditions météorologiques (sécheresse, inondations, etc.)
- Conseils de plantation selon le calendrier agricole
- Alertes prix du marché

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ou après:
[
  {
    "id": "unique_id",
    "type": "warning|info|danger",
    "title": "Titre court",
    "message": "Message détaillé (max 100 mots)"
  }
]

Langue: ${language === "fr" ? "français" : "anglais"}`;

  for (const provider of providers) {
    try {
      let response: Response;
      let resultText: string | null = null;

      if (provider.isLovable) {
        const token = sanitizeApiKey(provider.apiKey) ?? provider.apiKey;
        response = await fetch(provider.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 512,
            temperature: 0.8,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          resultText = data.choices?.[0]?.message?.content;
        } else {
          console.log(`${provider.name} failed with status ${response.status}`);
          continue; // Try next provider
        }
      } else if ((provider as ExtendedAIProvider).type === "huggingface") {
        // HuggingFace Router (OpenAI-compatible chat endpoint)
        const token = sanitizeApiKey(provider.apiKey) ?? provider.apiKey;
        response = await fetch(provider.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: HF_FALLBACK_MODEL,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 512,
            temperature: 0.8,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          resultText = data.choices?.[0]?.message?.content || null;
        } else {
          console.log(`${provider.name} failed with status ${response.status}`);
          continue; // Try next provider
        }
      } else {
        // Gemini API
        response = await fetch(provider.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 512 },
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
          const alerts = JSON.parse(jsonMatch[0]) as Array<{
            id: string;
            type: "warning" | "info" | "danger";
            title: string;
            message: string;
          }>;

          const now = new Date();
          const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

          return alerts.map((alert, index) => ({
            ...alert,
            id: `${currentDate}-${region}-${index}`,
            region,
            created_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          }));
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
    const { region = "centre", language = "fr" } = await req.json();

    const alerts = await generateAlertsWithAI(region, language);

    return new Response(
      JSON.stringify({
        success: true,
        alerts,
        region,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating alerts:", error);
    return new Response(
      JSON.stringify({ error: "Impossible de générer les alertes" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
