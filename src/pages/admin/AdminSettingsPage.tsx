import { useEffect, useState } from 'react';
import { Settings, Bell, Loader2, MapPin, Info, Brain, ExternalLink, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface AlertStats {
  totalActive: number;
  byRegion: { region: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
}

interface AIKeyStats {
  total: number;
  active: number;
  healthy: number;
  visionCapable: number;
}

export default function AdminSettingsPage() {
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null);
  const [aiStats, setAiStats] = useState<AIKeyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Fetch alert statistics
        const { data: alerts, error } = await supabase
          .from('agricultural_alerts')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;

        if (alerts) {
          // Group by region
          const regionMap = new Map<string, number>();
          const severityMap = new Map<string, number>();

          alerts.forEach(alert => {
            const region = alert.region || 'Toutes régions';
            regionMap.set(region, (regionMap.get(region) || 0) + 1);

            const severity = alert.severity || 'medium';
            severityMap.set(severity, (severityMap.get(severity) || 0) + 1);
          });

          setAlertStats({
            totalActive: alerts.length,
            byRegion: Array.from(regionMap.entries())
              .map(([region, count]) => ({ region, count }))
              .sort((a, b) => b.count - a.count),
            bySeverity: Array.from(severityMap.entries())
              .map(([severity, count]) => ({ severity, count }))
              .sort((a, b) => b.count - a.count)
          });
        }

        // Fetch AI API keys statistics
        const { data: aiKeys } = await supabase
          .from('ai_api_keys')
          .select('id, is_active, is_vision_capable, last_status_code');

        if (aiKeys) {
          setAiStats({
            total: aiKeys.length,
            active: aiKeys.filter(k => k.is_active).length,
            healthy: aiKeys.filter(k => k.last_status_code === 200).length,
            visionCapable: aiKeys.filter(k => k.is_active && k.is_vision_capable).length,
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleDeactivateAllAlerts = async () => {
    try {
      const { error } = await supabase
        .from('agricultural_alerts')
        .update({ is_active: false })
        .eq('is_active', true);

      if (error) throw error;

      toast.success('Toutes les alertes ont été désactivées');
      setAlertStats(prev => prev ? { ...prev, totalActive: 0, byRegion: [], bySeverity: [] } : null);
    } catch (error) {
      console.error('Error deactivating alerts:', error);
      toast.error('Erreur lors de la désactivation');
    }
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      'low': 'Faible',
      'medium': 'Modéré',
      'high': 'Élevé',
      'critical': 'Critique'
    };
    return labels[severity] || severity;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      'low': 'bg-success/10 text-success',
      'medium': 'bg-warning/10 text-warning',
      'high': 'bg-destructive/10 text-destructive',
      'critical': 'bg-destructive text-destructive-foreground'
    };
    return colors[severity] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground">Configuration et gestion du système</p>
      </div>

      {/* Alert Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-warning" />
            Gestion des alertes
          </CardTitle>
          <CardDescription>
            {alertStats?.totalActive || 0} alertes actives actuellement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium text-foreground">Désactiver toutes les alertes</p>
              <p className="text-sm text-muted-foreground">
                Cette action désactivera toutes les alertes actives
              </p>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDeactivateAllAlerts}
              disabled={!alertStats?.totalActive}
            >
              Désactiver tout
            </Button>
          </div>

          {alertStats && alertStats.byRegion.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Alertes par région
              </p>
              <div className="grid grid-cols-2 gap-2">
                {alertStats.byRegion.map(({ region, count }) => (
                  <div key={region} className="flex items-center justify-between p-2 rounded bg-muted/30">
                    <span className="text-sm text-foreground">{region}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alertStats && alertStats.bySeverity.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Alertes par sévérité</p>
              <div className="flex flex-wrap gap-2">
                {alertStats.bySeverity.map(({ severity, count }) => (
                  <span key={severity} className={`text-xs px-3 py-1 rounded-full ${getSeverityColor(severity)}`}>
                    {getSeverityLabel(severity)}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI System Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Système IA - Gestion des clés API
          </CardTitle>
          <CardDescription>
            Gestion complète du système de basculement automatique des providers IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-foreground">{aiStats?.total || 0}</p>
              <p className="text-xs text-muted-foreground">Clés totales</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-success">{aiStats?.active || 0}</p>
              <p className="text-xs text-muted-foreground">Actives</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-primary">{aiStats?.visionCapable || 0}</p>
              <p className="text-xs text-muted-foreground">Vision</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="flex items-center justify-center gap-1">
                {aiStats?.healthy && aiStats.healthy > 0 ? (
                  <CheckCircle className="w-4 h-4 text-success" />
                ) : aiStats?.active && aiStats.active > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-warning" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive" />
                )}
                <p className="text-2xl font-bold">{aiStats?.healthy || 0}</p>
              </div>
              <p className="text-xs text-muted-foreground">Fonctionnelles</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
            {aiStats?.healthy && aiStats.healthy > 0 ? (
              <Badge className="bg-success/10 text-success border-success/20">
                Système opérationnel
              </Badge>
            ) : aiStats?.active && aiStats.active > 0 ? (
              <Badge className="bg-warning/10 text-warning border-warning/20">
                Quotas épuisés - Veuillez vérifier les clés
              </Badge>
            ) : (
              <Badge variant="destructive">
                Système hors service - Aucune clé active
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              Basculement automatique entre {aiStats?.total || 0} providers
            </span>
          </div>

          {/* Link to full management page */}
          <Link to="/admin/ai">
            <Button variant="outline" className="w-full gap-2">
              <Settings className="w-4 h-4" />
              Ouvrir la gestion complète des clés API
              <ExternalLink className="w-4 h-4 ml-auto" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-info" />
            Informations système
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Application</span>
              <span className="text-sm font-medium text-foreground">AgroCamer v1.0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Backend</span>
              <span className="text-sm font-medium text-foreground">Lovable Cloud</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">IA</span>
              <span className="text-sm font-medium text-foreground">Gemini Vision + ChatGPT</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Géolocalisation</span>
              <span className="text-sm font-medium text-foreground">Temps réel (GPS)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Configuration rapide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-alerts">Alertes automatiques</Label>
              <p className="text-xs text-muted-foreground">Génération automatique basée sur la météo</p>
            </div>
            <Switch id="auto-alerts" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ai-learning">Apprentissage IA</Label>
              <p className="text-xs text-muted-foreground">Améliorer les réponses avec les conversations</p>
            </div>
            <Switch id="ai-learning" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="cache-data">Cache des données</Label>
              <p className="text-xs text-muted-foreground">Mise en cache pour mode hors-ligne</p>
            </div>
            <Switch id="cache-data" defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
