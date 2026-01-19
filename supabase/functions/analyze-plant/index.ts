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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Configuration API manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing plant image...");
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

    // Call Lovable AI Gateway with vision capabilities
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
                  url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`,
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
                  disease_name: {
                    type: "string",
                    description: "Nom scientifique ou commun de la maladie/ravageur",
                  },
                  local_name: {
                    type: "string",
                    description: "Nom local camerounais si disponible",
                  },
                  confidence: {
                    type: "number",
                    description: "Niveau de confiance de la détection (0-100)",
                  },
                  severity: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"],
                    description: "Niveau de gravité",
                  },
                  description: {
                    type: "string",
                    description: "Explication simple de la maladie",
                  },
                  causes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Causes probables",
                  },
                  symptoms: {
                    type: "array",
                    items: { type: "string" },
                    description: "Symptômes visibles",
                  },
                  biological_treatments: {
                    type: "array",
                    items: { type: "string" },
                    description: "Traitements biologiques disponibles au Cameroun",
                  },
                  chemical_treatments: {
                    type: "array",
                    items: { type: "string" },
                    description: "Traitements chimiques avec noms commerciaux locaux et dosages",
                  },
                  prevention: {
                    type: "array",
                    items: { type: "string" },
                    description: "Mesures préventives",
                  },
                  affected_crop: {
                    type: "string",
                    description: "Culture concernée",
                  },
                },
                required: [
                  "disease_name",
                  "confidence",
                  "severity",
                  "description",
                  "causes",
                  "symptoms",
                  "biological_treatments",
                  "chemical_treatments",
                  "prevention",
                  "affected_crop",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_plant_disease" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes. Veuillez réessayer dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants. Veuillez contacter l'administrateur." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erreur lors de l'analyse. Veuillez réessayer." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Impossible d'analyser l'image. Veuillez prendre une photo plus claire." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysisResult: AnalysisResult = JSON.parse(toolCall.function.arguments);
    console.log("Analysis result:", analysisResult.disease_name, "Severity:", analysisResult.severity);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        analyzed_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-plant function:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur est survenue lors de l'analyse" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
