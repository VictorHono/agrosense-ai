import { 
  Users, Camera, BarChart3, TrendingUp, AlertTriangle, 
  Activity, MapPin, Leaf 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
  // Mock data
  const stats = {
    totalUsers: 1247,
    activeDaily: 89,
    activeWeekly: 342,
    activeMonthly: 876,
    diseaseAnalyses: 3456,
    harvestAnalyses: 1234,
  };

  const topCrops = [
    { name: 'Cacao', count: 456, percentage: 35 },
    { name: 'Maïs', count: 389, percentage: 30 },
    { name: 'Manioc', count: 234, percentage: 18 },
    { name: 'Banane Plantain', count: 156, percentage: 12 },
    { name: 'Tomate', count: 65, percentage: 5 },
  ];

  const topDiseases = [
    { name: 'Cercosporiose', count: 234, severity: 'medium' },
    { name: 'Pourriture brune', count: 189, severity: 'high' },
    { name: 'Anthracnose', count: 156, severity: 'medium' },
    { name: 'Chenilles légionnaires', count: 123, severity: 'high' },
    { name: 'Mosaïque du manioc', count: 98, severity: 'critical' },
  ];

  const regionActivity = [
    { name: 'Centre', users: 345 },
    { name: 'Ouest', users: 267 },
    { name: 'Littoral', users: 234 },
    { name: 'Sud-Ouest', users: 178 },
    { name: 'Nord', users: 123 },
  ];

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    trend, 
    color 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | number; 
    trend?: string; 
    color: string;
  }) => (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {trend && (
              <p className="text-xs text-success flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" />
                {trend}
              </p>
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

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de l'activité AgroCamer</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Users} 
          label="Utilisateurs totaux" 
          value={stats.totalUsers.toLocaleString()} 
          trend="+12% ce mois"
          color="bg-primary/10 text-primary"
        />
        <StatCard 
          icon={Activity} 
          label="Actifs aujourd'hui" 
          value={stats.activeDaily} 
          color="bg-success/10 text-success"
        />
        <StatCard 
          icon={Camera} 
          label="Diagnostics IA" 
          value={stats.diseaseAnalyses.toLocaleString()} 
          trend="+24% ce mois"
          color="bg-accent/20 text-accent-foreground"
        />
        <StatCard 
          icon={BarChart3} 
          label="Analyses récoltes" 
          value={stats.harvestAnalyses.toLocaleString()} 
          color="bg-info/10 text-info"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Crops */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Leaf className="w-4 h-4 text-primary" />
              Cultures les plus analysées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCrops.map((crop, i) => (
                <div key={crop.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-foreground">{crop.name}</span>
                      <span className="text-muted-foreground">{crop.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${crop.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Diseases */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Maladies les plus détectées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topDiseases.map((disease, i) => (
                <div key={disease.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{disease.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{disease.count}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[disease.severity]}`}>
                      {disease.severity === 'critical' ? 'Critique' : 
                       disease.severity === 'high' ? 'Élevé' : 'Modéré'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Region Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-info" />
            Activité par région
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {regionActivity.map((region) => (
              <div key={region.name} className="text-center p-4 rounded-xl bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{region.users}</p>
                <p className="text-xs text-muted-foreground mt-1">{region.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { action: 'Nouveau diagnostic', user: 'Utilisateur #1234', crop: 'Cacao', time: 'Il y a 2 min' },
              { action: 'Analyse de récolte', user: 'Utilisateur #5678', crop: 'Maïs', time: 'Il y a 5 min' },
              { action: 'Question à l\'assistant', user: 'Utilisateur #9012', crop: 'Manioc', time: 'Il y a 8 min' },
              { action: 'Nouveau diagnostic', user: 'Utilisateur #3456', crop: 'Tomate', time: 'Il y a 12 min' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">
                    👤
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.user} • {activity.crop}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
