import { useEffect, useState } from 'react';
import { 
  Leaf, Bug, FlaskConical, Bell, TrendingUp, 
  MessageCircle, DollarSign, Loader2, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalCrops: number;
  totalDiseases: number;
  totalTreatments: number;
  activeAlerts: number;
  totalTips: number;
  chatMessages: number;
  marketPrices: number;
}

interface RecentChat {
  id: string;
  role: string;
  content: string;
  created_at: string;
  session_id: string;
}

interface CropWithDiseases {
  id: string;
  name: string;
  name_local: string | null;
  diseaseCount: number;
}

interface ActiveAlert {
  id: string;
  title: string;
  severity: string | null;
  region: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [topCrops, setTopCrops] = useState<CropWithDiseases[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch all counts in parallel
        const [
          cropsRes,
          diseasesRes,
          treatmentsRes,
          alertsRes,
          tipsRes,
          chatsRes,
          pricesRes,
          recentChatsRes,
          cropsWithDiseasesRes,
          activeAlertsRes
        ] = await Promise.all([
          supabase.from('crops').select('id', { count: 'exact', head: true }),
          supabase.from('diseases').select('id', { count: 'exact', head: true }),
          supabase.from('treatments').select('id', { count: 'exact', head: true }),
          supabase.from('agricultural_alerts').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('farming_tips').select('id', { count: 'exact', head: true }),
          supabase.from('chat_history').select('id', { count: 'exact', head: true }),
          supabase.from('market_prices').select('id', { count: 'exact', head: true }),
          supabase.from('chat_history').select('*').order('created_at', { ascending: false }).limit(10),
          supabase.from('crops').select('id, name, name_local'),
          supabase.from('agricultural_alerts').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5)
        ]);

        setStats({
          totalCrops: cropsRes.count || 0,
          totalDiseases: diseasesRes.count || 0,
          totalTreatments: treatmentsRes.count || 0,
          activeAlerts: alertsRes.count || 0,
          totalTips: tipsRes.count || 0,
          chatMessages: chatsRes.count || 0,
          marketPrices: pricesRes.count || 0,
        });

        setRecentChats(recentChatsRes.data || []);
        setActiveAlerts(activeAlertsRes.data || []);

        // Count diseases per crop
        if (cropsWithDiseasesRes.data) {
          const cropsWithCount = await Promise.all(
            cropsWithDiseasesRes.data.map(async (crop) => {
              const { count } = await supabase
                .from('diseases')
                .select('id', { count: 'exact', head: true })
                .eq('crop_id', crop.id);
              return { ...crop, diseaseCount: count || 0 };
            })
          );
          setTopCrops(cropsWithCount.sort((a, b) => b.diseaseCount - a.diseaseCount).slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    color,
    subtext
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: number; 
    color: string;
    subtext?: string;
  }) => (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value.toLocaleString()}</p>
            {subtext && (
              <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const severityColors: Record<string, string> = {
    low: 'bg-success/10 text-success',
    medium: 'bg-warning/10 text-warning',
    high: 'bg-destructive/10 text-destructive',
    critical: 'bg-destructive text-destructive-foreground',
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground">Statistiques en temps réel de la base de données</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Leaf} 
          label="Cultures" 
          value={stats?.totalCrops || 0} 
          color="bg-primary/10 text-primary"
          subtext="dans la base de données"
        />
        <StatCard 
          icon={Bug} 
          label="Maladies" 
          value={stats?.totalDiseases || 0} 
          color="bg-destructive/10 text-destructive"
          subtext="répertoriées"
        />
        <StatCard 
          icon={FlaskConical} 
          label="Traitements" 
          value={stats?.totalTreatments || 0} 
          color="bg-info/10 text-info"
          subtext="disponibles"
        />
        <StatCard 
          icon={Bell} 
          label="Alertes actives" 
          value={stats?.activeAlerts || 0} 
          color="bg-warning/10 text-warning"
          subtext="en cours"
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          icon={MessageCircle} 
          label="Messages chat" 
          value={stats?.chatMessages || 0} 
          color="bg-accent/20 text-accent-foreground"
          subtext="conversations"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Conseils" 
          value={stats?.totalTips || 0} 
          color="bg-success/10 text-success"
          subtext="conseils agricoles"
        />
        <StatCard 
          icon={DollarSign} 
          label="Prix marché" 
          value={stats?.marketPrices || 0} 
          color="bg-primary/10 text-primary"
          subtext="entrées de prix"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Crops by Diseases */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Leaf className="w-4 h-4 text-primary" />
              Cultures avec le plus de maladies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCrops.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée disponible</p>
            ) : (
              <div className="space-y-3">
                {topCrops.map((crop, i) => (
                  <div key={crop.id} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-foreground">
                          {crop.name} {crop.name_local && `(${crop.name_local})`}
                        </span>
                        <span className="text-muted-foreground">{crop.diseaseCount} maladies</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min((crop.diseaseCount / (topCrops[0]?.diseaseCount || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Alertes actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune alerte active</p>
            ) : (
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.region || 'Toutes régions'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[alert.severity || 'medium']}`}>
                      {alert.severity === 'critical' ? 'Critique' : 
                       alert.severity === 'high' ? 'Élevé' : 
                       alert.severity === 'low' ? 'Faible' : 'Modéré'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Chat Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-accent-foreground" />
            Conversations récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentChats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune conversation récente</p>
          ) : (
            <div className="space-y-3">
              {recentChats.slice(0, 5).map((chat) => (
                <div key={chat.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                    chat.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-accent/20 text-accent-foreground'
                  }`}>
                    {chat.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">
                      {chat.role === 'user' ? 'Utilisateur' : 'Assistant'} • Session: {chat.session_id.slice(0, 8)}...
                    </p>
                    <p className="text-sm text-foreground truncate">{chat.content.slice(0, 100)}...</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(chat.created_at).toLocaleDateString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
