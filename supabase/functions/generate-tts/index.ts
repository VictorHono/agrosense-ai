import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TTSRequest {
  text: string;
  languageCode: string;
  translationId?: string;
  voiceType?: 'standard' | 'neural';
}

// Voice mappings for different languages
// For African languages, we use French voice as base with phonetic adjustments
const VOICE_MAPPINGS: Record<string, { voiceId: string; langCode: string; notes: string }> = {
  'fr': { voiceId: 'FGY2WhTYpPnrIDTdsKH5', langCode: 'fr-FR', notes: 'Laura - French female' },
  'en': { voiceId: 'JBFqnCBsd6RMkjVDRZzb', langCode: 'en-US', notes: 'George - English male' },
  // African languages - use French voice with phonetic pronunciation guide
  'ghm': { voiceId: 'FGY2WhTYpPnrIDTdsKH5', langCode: 'fr-FR', notes: 'Ghomala using French phonetics' },
  'ewo': { voiceId: 'FGY2WhTYpPnrIDTdsKH5', langCode: 'fr-FR', notes: 'Ewondo using French phonetics' },
  'ful': { voiceId: 'FGY2WhTYpPnrIDTdsKH5', langCode: 'fr-FR', notes: 'Fulfulde using French phonetics' },
  'dua': { voiceId: 'FGY2WhTYpPnrIDTdsKH5', langCode: 'fr-FR', notes: 'Duala using French phonetics' },
  'bas': { voiceId: 'FGY2WhTYpPnrIDTdsKH5', langCode: 'fr-FR', notes: 'Basaa using French phonetics' },
  'bax': { voiceId: 'FGY2WhTYpPnrIDTdsKH5', langCode: 'fr-FR', notes: 'Bamileke using French phonetics' },
};

// Phonetic conversion hints for Ghomala and similar languages
function getPhoneticHints(languageCode: string): string {
  const hints: Record<string, string> = {
    'ghm': `
      - ɛ prononcé comme "è" ouvert
      - ɔ prononcé comme "o" ouvert
      - ŋ prononcé comme "ng" nasal
      - Les tons: haut (´), bas (\`), montant (ˇ)
      - Lecture lente et claire pour les tons
    `,
    'ewo': `
      - Les tons sont importants
      - Voyelles longues et courtes
      - Consonnes nasales
    `,
  };
  return hints[languageCode] || '';
}

// Generate phonetic pronunciation guide using AI
async function generatePhoneticGuide(
  text: string, 
  languageCode: string,
  providers: { endpoint: string; apiKey: string; isLovable: boolean }[]
): Promise<string> {
  
  const hints = getPhoneticHints(languageCode);
  
  const prompt = `Tu es un expert en phonétique des langues africaines camerounaises.

Convertis le texte suivant en ${languageCode === 'ghm' ? 'Ghomala' : languageCode} en une version phonétique lisible pour un système TTS français.

TEXTE ORIGINAL: "${text}"

RÈGLES PHONÉTIQUES:
${hints}

INSTRUCTIONS:
1. Garde le sens du texte
2. Écris la prononciation en utilisant des sons français
3. Ajoute des pauses (virgules) pour les tons
4. Simplifie les caractères spéciaux en équivalents français

Réponds UNIQUEMENT avec le texte phonétique, sans explications.`;

  for (const provider of providers) {
    try {
      let resultText: string | null = null;

      if (provider.isLovable) {
        const response = await fetch(provider.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          resultText = data.choices?.[0]?.message?.content;
        }
      }

      if (resultText) {
        return resultText.trim();
      }
    } catch (error) {
      console.error("Phonetic conversion error:", error);
    }
  }

  // Fallback: return original text
  return text;
}

// Generate TTS using Web Speech API alternative or ElevenLabs-style approach
async function generateSpeech(
  text: string,
  voiceConfig: { voiceId: string; langCode: string }
): Promise<ArrayBuffer | null> {
  
  // For now, we'll use a simple approach with Google TTS (if available)
  // or return null to indicate the client should use browser TTS
  
  const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
  
  if (elevenLabsKey) {
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenLabsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.8,
              style: 0.3,
              use_speaker_boost: true,
              speed: 0.85, // Slower for clarity
            },
          }),
        }
      );

      if (response.ok) {
        return await response.arrayBuffer();
      }
    } catch (error) {
      console.error("ElevenLabs TTS error:", error);
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, languageCode, translationId, voiceType = 'standard' } = await req.json() as TTSRequest;

    if (!text || !languageCode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: text, languageCode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating TTS for language: ${languageCode}, text length: ${text.length}`);

    // Get voice configuration
    const voiceConfig = VOICE_MAPPINGS[languageCode] || VOICE_MAPPINGS['fr'];
    
    // For African languages, convert to phonetic pronunciation first
    let processedText = text;
    const isAfricanLanguage = ['ghm', 'ewo', 'ful', 'dua', 'bas', 'bax'].includes(languageCode);
    
    if (isAfricanLanguage) {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (lovableKey) {
        const providers = [{
          endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
          apiKey: lovableKey,
          isLovable: true
        }];
        processedText = await generatePhoneticGuide(text, languageCode, providers);
        console.log(`Phonetic conversion: "${text}" -> "${processedText}"`);
      }
    }

    // Generate audio
    const audioBuffer = await generateSpeech(processedText, voiceConfig);
    
    if (audioBuffer) {
      // If we have a translationId, save the audio to storage
      if (translationId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const fileName = `${languageCode}/${translationId}.mp3`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('translation-audio')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true
          });
        
        if (uploadError) {
          console.error("Storage upload error:", uploadError);
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('translation-audio')
            .getPublicUrl(fileName);
          
          // Update translation_audio table
          await supabase
            .from('translation_audio')
            .upsert({
              translation_id: translationId,
              language_code: languageCode,
              audio_url: urlData.publicUrl,
              audio_format: 'mp3',
              voice_type: voiceType,
              file_size_bytes: audioBuffer.byteLength,
              is_generated: true
            }, { onConflict: 'translation_id' });
          
          return new Response(
            JSON.stringify({
              success: true,
              audioUrl: urlData.publicUrl,
              phoneticText: isAfricanLanguage ? processedText : undefined
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      // Return audio directly
      return new Response(audioBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "X-Phonetic-Text": isAfricanLanguage ? encodeURIComponent(processedText) : ""
        }
      });
    }
    
    // No audio generated - return phonetic text for client-side TTS
    return new Response(
      JSON.stringify({
        success: true,
        useClientTTS: true,
        phoneticText: processedText,
        originalText: text,
        voiceLang: voiceConfig.langCode
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ error: "TTS generation failed", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
