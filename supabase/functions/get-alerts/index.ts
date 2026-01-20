import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
        response = await fetch(provider.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
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
        }
      } else {
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
