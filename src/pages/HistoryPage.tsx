import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Camera, BarChart3, Loader2, Calendar, ChevronRight, X, 
  MapPin, Leaf, AlertTriangle, ThermometerSun, TrendingUp,
  CircleDollarSign, Award, Activity
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ActivityRecord {
  id: string;
  activity_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

// Diagnosis Detail Modal Component
function DiagnosisDetailModal({ 
  activity, 
  onClose 
}: { 
  activity: ActivityRecord; 
  onClose: () => void;
}) {
  const meta = activity.metadata || {};
  
  const crop = String(meta.crop || 'Culture non identifiée');
  const disease = String(meta.disease_name || meta.disease || 'Non détecté');
  const confidence = Number(meta.confidence || 0);
  const severity = String(meta.severity || 'unknown');
  const isHealthy = Boolean(meta.is_healthy);
  const region = String(meta.region || '-');
  const treatments = Array.isArray(meta.treatments) ? meta.treatments : [];
  const symptoms = Array.isArray(meta.symptoms) ? meta.symptoms : [];

  const getSeverityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getSeverityLabel = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'low': return 'Faible';
      case 'medium': return 'Modéré';
      case 'high': return 'Élevé';
      case 'critical': return 'Critique';
      default: return 'Inconnu';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl m-0 sm:m-4 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Diagnostic</h2>
              <p className="text-xs text-muted-foreground">
                {format(new Date(activity.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Crop & Disease */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Leaf className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Culture identifiée</p>
                <p className="font-semibold text-foreground">{crop}</p>
              </div>
            </div>
            
            {!isHealthy && (
              <div className="flex items-start gap-3 mt-4 pt-4 border-t border-border">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Maladie détectée</p>
                  <p className="font-semibold text-foreground">{disease}</p>
                </div>
              </div>
            )}
          </div>

          {/* Health Status */}
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-2xl",
              isHealthy ? "bg-green-500/20" : "bg-red-500/20"
            )}>
              {isHealthy ? '✓' : '⚠️'}
            </div>
            <div className="flex-1">
              <p className="font-medium">{isHealthy ? 'Plante en bonne santé' : 'Problème détecté'}</p>
              <p className="text-sm text-muted-foreground">
                {isHealthy ? 'Aucune maladie identifiée' : `Sévérité: ${getSeverityLabel(severity)}`}
              </p>
            </div>
            {!isHealthy && (
              <div className={cn("w-3 h-3 rounded-full", getSeverityColor(severity))} />
            )}
          </div>

          {/* Confidence */}
          {confidence > 0 && (
            <div className="p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Niveau de confiance</span>
                <span className="text-sm font-bold text-primary">{confidence}%</span>
              </div>
              <Progress value={confidence} className="h-2" />
            </div>
          )}

          {/* Location */}
          {region !== '-' && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Région: <strong>{region}</strong></span>
            </div>
          )}

          {/* Symptoms */}
          {symptoms.length > 0 && (
            <div className="p-4 rounded-xl border border-border">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Symptômes observés
              </h3>
              <div className="flex flex-wrap gap-2">
                {symptoms.map((symptom, i) => (
                  <Badge key={i} variant="secondary">{String(symptom)}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Treatments */}
          {treatments.length > 0 && (
            <div className="p-4 rounded-xl border border-border">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <ThermometerSun className="w-4 h-4" />
                Traitements recommandés
              </h3>
              <ul className="space-y-2">
                {treatments.map((treatment, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs shrink-0">
                      {i + 1}
                    </span>
                    {String(treatment)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Harvest Detail Modal Component
function HarvestDetailModal({ 
  activity, 
  onClose 
}: { 
  activity: ActivityRecord; 
  onClose: () => void;
}) {
  const meta = activity.metadata || {};
  
  const crop = String(meta.crop || 'Culture non identifiée');
  const qualityScore = Number(meta.quality_score || 0);
  const grade = String(meta.grade || '-');
  const market = String(meta.market || '-');
  const region = String(meta.region || '-');
  const priceMin = Number(meta.price_min || 0);
  const priceMax = Number(meta.price_max || 0);
  const yieldPotential = String(meta.yield_potential || 'medium');

  const getGradeColor = (g: string) => {
    switch (g.toUpperCase()) {
      case 'A': return 'text-green-500 bg-green-500/10';
      case 'B': return 'text-yellow-500 bg-yellow-500/10';
      case 'C': return 'text-orange-500 bg-orange-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getYieldLabel = (y: string) => {
    switch (y.toLowerCase()) {
      case 'high': return { label: 'Élevé', color: 'text-green-500' };
      case 'medium': return { label: 'Moyen', color: 'text-yellow-500' };
      case 'low': return { label: 'Faible', color: 'text-red-500' };
      default: return { label: 'Inconnu', color: 'text-muted-foreground' };
    }
  };

  const yieldInfo = getYieldLabel(yieldPotential);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl m-0 sm:m-4 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Analyse de récolte</h2>
              <p className="text-xs text-muted-foreground">
                {format(new Date(activity.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Crop & Grade */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Leaf className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Culture</p>
                  <p className="font-semibold text-foreground">{crop}</p>
                </div>
              </div>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold",
                getGradeColor(grade)
              )}>
                {grade}
              </div>
            </div>
          </div>

          {/* Quality Score */}
          {qualityScore > 0 && (
            <div className="p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Score de qualité</span>
                </div>
                <span className="text-lg font-bold text-primary">{qualityScore}/100</span>
              </div>
              <Progress value={qualityScore} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {qualityScore >= 80 ? 'Excellente qualité' : 
                 qualityScore >= 60 ? 'Bonne qualité' : 
                 qualityScore >= 40 ? 'Qualité moyenne' : 'Qualité à améliorer'}
              </p>
            </div>
          )}

          {/* Yield Potential */}
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border">
            <TrendingUp className={cn("w-5 h-5", yieldInfo.color)} />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Potentiel de rendement</p>
              <p className={cn("font-semibold", yieldInfo.color)}>{yieldInfo.label}</p>
            </div>
          </div>

          {/* Market & Price */}
          {(priceMin > 0 || priceMax > 0) && (
            <div className="p-4 rounded-xl border border-border">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <CircleDollarSign className="w-4 h-4" />
                Estimation du marché
              </h3>
              <div className="space-y-3">
                {market !== '-' && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Marché</span>
                    <span className="font-medium">{market}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fourchette de prix</span>
                  <span className="font-bold text-primary">
                    {priceMin.toLocaleString()} - {priceMax.toLocaleString()} XAF/kg
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Location */}
          {region !== '-' && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Région: <strong>{region}</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const HistoryPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchActivities = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setActivities(data as ActivityRecord[]);
      }
      setLoading(false);
    };

    fetchActivities();
  }, [user]);

  const diagnostics = activities.filter(a => a.activity_type === 'diagnosis');
  const harvests = activities.filter(a => a.activity_type === 'harvest_analysis');

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd MMM yyyy à HH:mm', { locale: fr });
  };

  const getMetadataValue = (metadata: Record<string, unknown> | null, key: string): string => {
    if (!metadata) return '-';
    const value = metadata[key];
    return typeof value === 'string' ? value : '-';
  };

  const getSeverityBadge = (metadata: Record<string, unknown> | null) => {
    const severity = String(metadata?.severity || '').toLowerCase();
    const colorMap: Record<string, string> = {
      low: 'bg-green-500/10 text-green-600',
      medium: 'bg-yellow-500/10 text-yellow-600',
      high: 'bg-orange-500/10 text-orange-600',
      critical: 'bg-red-500/10 text-red-600',
    };
    return colorMap[severity] || '';
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t('history.title') || 'Historique'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('history.subtitle') || 'Consultez vos diagnostics et analyses passés'}
        </p>
      </div>

      <Tabs defaultValue="diagnostics" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Diagnostics ({diagnostics.length})
          </TabsTrigger>
          <TabsTrigger value="harvests" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Récoltes ({harvests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="space-y-3">
          {diagnostics.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun diagnostic enregistré</p>
              </CardContent>
            </Card>
          ) : (
            diagnostics.map((item) => (
              <Card 
                key={item.id} 
                className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.98]"
                onClick={() => setSelectedActivity(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.created_at)}
                        {item.metadata?.severity && (
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getSeverityBadge(item.metadata))}>
                            {String(item.metadata.severity)}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium text-foreground">
                        {getMetadataValue(item.metadata, 'crop') || 'Culture non spécifiée'}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {getMetadataValue(item.metadata, 'disease_name') || getMetadataValue(item.metadata, 'disease') || 'Diagnostic effectué'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="harvests" className="space-y-3">
          {harvests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune analyse de récolte enregistrée</p>
              </CardContent>
            </Card>
          ) : (
            harvests.map((item) => (
              <Card 
                key={item.id} 
                className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.98]"
                onClick={() => setSelectedActivity(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.created_at)}
                        {item.metadata?.grade && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Grade {String(item.metadata.grade)}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium text-foreground">
                        {getMetadataValue(item.metadata, 'crop') || 'Analyse de récolte'}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {item.metadata?.quality_score 
                          ? `Score: ${item.metadata.quality_score}/100` 
                          : 'Qualité analysée'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Modals */}
      {selectedActivity?.activity_type === 'diagnosis' && (
        <DiagnosisDetailModal 
          activity={selectedActivity} 
          onClose={() => setSelectedActivity(null)} 
        />
      )}
      {selectedActivity?.activity_type === 'harvest_analysis' && (
        <HarvestDetailModal 
          activity={selectedActivity} 
          onClose={() => setSelectedActivity(null)} 
        />
      )}
    </PageContainer>
  );
};

export default HistoryPage;
