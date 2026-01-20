import { useEffect, useState } from 'react';
import { Users, MapPin, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SimilarCase {
  disease_name: string;
  region: string;
  count: number;
  last_seen: string;
}

interface SimilarCasesProps {
  diseaseName: string;
  cropName: string;
  language: string;
}

export function SimilarCases({ diseaseName, cropName, language }: SimilarCasesProps) {
  const [cases, setCases] = useState<SimilarCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilarCases = async () => {
      try {
        // Query user_activity for similar diagnoses
        const { data, error } = await supabase
          .from('user_activity')
          .select('metadata, created_at')
          .eq('activity_type', 'diagnosis')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        // Process and aggregate cases
        const caseMap = new Map<string, SimilarCase>();
        
        data?.forEach((activity) => {
          const metadata = activity.metadata as Record<string, unknown> | null;
          if (!metadata) return;
          
          const activityDisease = metadata.disease_name as string | undefined;
          const region = (metadata.region as string) || 'Cameroun';
          
          // Only count matching disease or crop
          if (activityDisease && 
              (activityDisease.toLowerCase().includes(diseaseName.toLowerCase()) ||
               diseaseName.toLowerCase().includes(activityDisease.toLowerCase()))) {
            const key = `${activityDisease}-${region}`;
            const existing = caseMap.get(key);
            
            if (existing) {
              existing.count += 1;
              if (new Date(activity.created_at) > new Date(existing.last_seen)) {
                existing.last_seen = activity.created_at;
              }
            } else {
              caseMap.set(key, {
                disease_name: activityDisease,
                region,
                count: 1,
                last_seen: activity.created_at,
              });
            }
          }
        });

        setCases(Array.from(caseMap.values()).slice(0, 3));
      } catch (err) {
        console.error('Error fetching similar cases:', err);
      } finally {
        setLoading(false);
      }
    };

    if (diseaseName) {
      fetchSimilarCases();
    } else {
      setLoading(false);
    }
  }, [diseaseName, cropName]);

  if (loading || cases.length === 0) return null;

  const totalCount = cases.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="p-4 rounded-xl bg-info/5 border border-info/20">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-info" />
        <h3 className="font-semibold text-foreground text-sm">
          {language === 'fr' 
            ? `${totalCount} cas similaires détectés` 
            : `${totalCount} similar cases detected`}
        </h3>
      </div>
      
      <div className="space-y-2">
        {cases.map((c, i) => (
          <div 
            key={i}
            className="flex items-center justify-between p-2 rounded-lg bg-background/50"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm text-foreground">{c.region}</span>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {c.count} {language === 'fr' ? 'cas' : 'cases'}
            </span>
          </div>
        ))}
      </div>
      
      <p className="mt-3 text-xs text-muted-foreground">
        {language === 'fr' 
          ? 'Cette maladie a été signalée par d\'autres agriculteurs de la région.' 
          : 'This disease has been reported by other farmers in the region.'}
      </p>
    </div>
  );
}
