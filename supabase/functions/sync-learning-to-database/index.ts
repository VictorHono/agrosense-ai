import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LearningEntry {
  id: string;
  crop_name: string;
  crop_local_name: string | null;
  disease_name: string | null;
  disease_local_name: string | null;
  is_healthy: boolean;
  severity: string | null;
  symptoms: string[];
  causes: string[];
  treatments: Array<{ type: string; name: string; description?: string }>;
  prevention: string[];
  region: string | null;
  verification_notes: string | null;
}

interface SyncResult {
  success: boolean;
  crop?: { id: string; name: string; isNew: boolean };
  disease?: { id: string; name: string; isNew: boolean };
  treatments?: Array<{ id: string; name: string; isNew: boolean }>;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { entryId, action } = await req.json();

    if (!entryId) {
      return new Response(
        JSON.stringify({ error: 'entryId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-learning] Processing entry ${entryId} with action: ${action}`);

    // Fetch the learning entry
    const { data: entry, error: fetchError } = await supabase
      .from('diagnosis_learning')
      .select('*')
      .eq('id', entryId)
      .single();

    if (fetchError || !entry) {
      console.error('[sync-learning] Entry not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Entry not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse arrays from JSON
    const learningEntry: LearningEntry = {
      ...entry,
      symptoms: Array.isArray(entry.symptoms) ? entry.symptoms.map(String) : [],
      causes: Array.isArray(entry.causes) ? entry.causes.map(String) : [],
      treatments: Array.isArray(entry.treatments) ? entry.treatments : [],
      prevention: Array.isArray(entry.prevention) ? entry.prevention.map(String) : [],
    };

    const result: SyncResult = {
      success: true,
      message: '',
    };

    // 1. SYNC CROP - Find or create the crop
    let cropId: string | null = null;
    
    const { data: existingCrop } = await supabase
      .from('crops')
      .select('id, name')
      .or(`name.ilike.%${learningEntry.crop_name}%,name_local.ilike.%${learningEntry.crop_name}%`)
      .limit(1)
      .single();

    if (existingCrop) {
      cropId = existingCrop.id;
      result.crop = { id: existingCrop.id, name: existingCrop.name, isNew: false };
      console.log(`[sync-learning] Found existing crop: ${existingCrop.name}`);
    } else {
      // Create new crop
      const { data: newCrop, error: cropError } = await supabase
        .from('crops')
        .insert({
          name: learningEntry.crop_name,
          name_local: learningEntry.crop_local_name,
          category: 'vegetable', // Default category
          regions: learningEntry.region ? [learningEntry.region] : null,
          description: `Culture ajoutée automatiquement depuis l'apprentissage IA`,
        })
        .select('id, name')
        .single();

      if (cropError) {
        console.error('[sync-learning] Error creating crop:', cropError);
      } else if (newCrop) {
        cropId = newCrop.id;
        result.crop = { id: newCrop.id, name: newCrop.name, isNew: true };
        console.log(`[sync-learning] Created new crop: ${newCrop.name}`);
      }
    }

    // 2. SYNC DISEASE (if not healthy)
    let diseaseId: string | null = null;
    
    if (!learningEntry.is_healthy && learningEntry.disease_name) {
      // Check if disease already exists
      const { data: existingDisease } = await supabase
        .from('diseases')
        .select('id, name, symptoms, causes')
        .or(`name.ilike.%${learningEntry.disease_name}%,name_local.ilike.%${learningEntry.disease_name}%`)
        .limit(1)
        .single();

      if (existingDisease) {
        diseaseId = existingDisease.id;
        
        // Merge symptoms and causes with existing ones
        const existingSymptoms = existingDisease.symptoms || [];
        const existingCauses = existingDisease.causes || [];
        
        const mergedSymptoms = [...new Set([...existingSymptoms, ...learningEntry.symptoms])];
        const mergedCauses = [...new Set([...existingCauses, ...learningEntry.causes])];
        
        // Update disease with merged data if there are new items
        if (mergedSymptoms.length > existingSymptoms.length || mergedCauses.length > existingCauses.length) {
          await supabase
            .from('diseases')
            .update({
              symptoms: mergedSymptoms,
              causes: mergedCauses,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingDisease.id);
          
          console.log(`[sync-learning] Updated disease with new symptoms/causes: ${existingDisease.name}`);
        }
        
        result.disease = { id: existingDisease.id, name: existingDisease.name, isNew: false };
        console.log(`[sync-learning] Found existing disease: ${existingDisease.name}`);
      } else {
        // Create new disease
        const { data: newDisease, error: diseaseError } = await supabase
          .from('diseases')
          .insert({
            name: learningEntry.disease_name,
            name_local: learningEntry.disease_local_name,
            crop_id: cropId,
            severity: learningEntry.severity || 'medium',
            symptoms: learningEntry.symptoms,
            causes: learningEntry.causes,
            description: learningEntry.verification_notes || 
              `Maladie identifiée automatiquement par le système d'apprentissage IA`,
          })
          .select('id, name')
          .single();

        if (diseaseError) {
          console.error('[sync-learning] Error creating disease:', diseaseError);
        } else if (newDisease) {
          diseaseId = newDisease.id;
          result.disease = { id: newDisease.id, name: newDisease.name, isNew: true };
          console.log(`[sync-learning] Created new disease: ${newDisease.name}`);
        }
      }
    }

    // 3. SYNC TREATMENTS
    if (learningEntry.treatments && learningEntry.treatments.length > 0 && diseaseId) {
      result.treatments = [];

      for (const treatment of learningEntry.treatments) {
        if (!treatment.name) continue;

        // Check if treatment already exists for this disease
        const { data: existingTreatment } = await supabase
          .from('treatments')
          .select('id, name')
          .eq('disease_id', diseaseId)
          .ilike('name', `%${treatment.name}%`)
          .limit(1)
          .single();

        if (existingTreatment) {
          result.treatments.push({ 
            id: existingTreatment.id, 
            name: existingTreatment.name, 
            isNew: false 
          });
          console.log(`[sync-learning] Found existing treatment: ${existingTreatment.name}`);
        } else {
          // Create new treatment
          const { data: newTreatment, error: treatmentError } = await supabase
            .from('treatments')
            .insert({
              name: treatment.name,
              type: treatment.type || 'biological',
              disease_id: diseaseId,
              description: treatment.description || null,
              availability: 'Disponible localement',
            })
            .select('id, name')
            .single();

          if (treatmentError) {
            console.error('[sync-learning] Error creating treatment:', treatmentError);
          } else if (newTreatment) {
            result.treatments.push({ 
              id: newTreatment.id, 
              name: newTreatment.name, 
              isNew: true 
            });
            console.log(`[sync-learning] Created new treatment: ${newTreatment.name}`);
          }
        }
      }
    }

    // Build result message
    const messages: string[] = [];
    
    if (result.crop) {
      messages.push(result.crop.isNew 
        ? `✅ Nouvelle culture "${result.crop.name}" ajoutée`
        : `🔗 Culture "${result.crop.name}" trouvée`
      );
    }
    
    if (result.disease) {
      messages.push(result.disease.isNew 
        ? `✅ Nouvelle maladie "${result.disease.name}" ajoutée`
        : `🔗 Maladie "${result.disease.name}" mise à jour`
      );
    }
    
    if (result.treatments && result.treatments.length > 0) {
      const newTreatments = result.treatments.filter(t => t.isNew);
      const existingTreatments = result.treatments.filter(t => !t.isNew);
      
      if (newTreatments.length > 0) {
        messages.push(`✅ ${newTreatments.length} nouveau(x) traitement(s) ajouté(s)`);
      }
      if (existingTreatments.length > 0) {
        messages.push(`🔗 ${existingTreatments.length} traitement(s) existant(s) lié(s)`);
      }
    }

    if (learningEntry.is_healthy) {
      messages.push(`🌿 Plante saine - Aucune maladie/traitement à synchroniser`);
    }

    result.message = messages.join('\n');

    console.log(`[sync-learning] Sync completed: ${result.message}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-learning] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
