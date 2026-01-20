import { useEffect, useState } from 'react';
import { Database, Table, Rows3, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface TableStats {
  name: string;
  displayName: string;
  count: number;
  lastUpdated: string | null;
  icon: string;
}

export default function AdminDatabasePage() {
  const [tables, setTables] = useState<TableStats[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTableStats = async () => {
    try {
      // Fetch counts and latest records from each table
      const [
        cropsRes,
        diseasesRes,
        treatmentsRes,
        alertsRes,
        tipsRes,
        chatRes,
        pricesRes,
        // Latest records
        cropsLatest,
        diseasesLatest,
        treatmentsLatest,
        alertsLatest,
        tipsLatest,
        chatLatest,
        pricesLatest
      ] = await Promise.all([
        supabase.from('crops').select('id', { count: 'exact', head: true }),
        supabase.from('diseases').select('id', { count: 'exact', head: true }),
        supabase.from('treatments').select('id', { count: 'exact', head: true }),
        supabase.from('agricultural_alerts').select('id', { count: 'exact', head: true }),
        supabase.from('farming_tips').select('id', { count: 'exact', head: true }),
        supabase.from('chat_history').select('id', { count: 'exact', head: true }),
        supabase.from('market_prices').select('id', { count: 'exact', head: true }),
        // Get latest updated record from each table
        supabase.from('crops').select('updated_at').order('updated_at', { ascending: false }).limit(1),
        supabase.from('diseases').select('updated_at').order('updated_at', { ascending: false }).limit(1),
        supabase.from('treatments').select('updated_at').order('updated_at', { ascending: false }).limit(1),
        supabase.from('agricultural_alerts').select('created_at').order('created_at', { ascending: false }).limit(1),
        supabase.from('farming_tips').select('updated_at').order('updated_at', { ascending: false }).limit(1),
        supabase.from('chat_history').select('created_at').order('created_at', { ascending: false }).limit(1),
        supabase.from('market_prices').select('recorded_at').order('recorded_at', { ascending: false }).limit(1),
      ]);

      const tableData: TableStats[] = [
        {
          name: 'crops',
          displayName: 'Cultures',
          count: cropsRes.count || 0,
          lastUpdated: cropsLatest.data?.[0]?.updated_at || null,
          icon: '🌱'
        },
        {
          name: 'diseases',
          displayName: 'Maladies',
          count: diseasesRes.count || 0,
          lastUpdated: diseasesLatest.data?.[0]?.updated_at || null,
          icon: '🦠'
        },
        {
          name: 'treatments',
          displayName: 'Traitements',
          count: treatmentsRes.count || 0,
          lastUpdated: treatmentsLatest.data?.[0]?.updated_at || null,
          icon: '💊'
        },
        {
          name: 'agricultural_alerts',
          displayName: 'Alertes',
          count: alertsRes.count || 0,
          lastUpdated: alertsLatest.data?.[0]?.created_at || null,
          icon: '🔔'
        },
        {
          name: 'farming_tips',
          displayName: 'Conseils',
          count: tipsRes.count || 0,
          lastUpdated: tipsLatest.data?.[0]?.updated_at || null,
          icon: '💡'
        },
        {
          name: 'chat_history',
          displayName: 'Historique chat',
          count: chatRes.count || 0,
          lastUpdated: chatLatest.data?.[0]?.created_at || null,
          icon: '💬'
        },
        {
          name: 'market_prices',
          displayName: 'Prix marché',
          count: pricesRes.count || 0,
          lastUpdated: pricesLatest.data?.[0]?.recorded_at || null,
          icon: '💰'
        }
      ];

      setTables(tableData);
      setTotalRecords(tableData.reduce((sum, t) => sum + t.count, 0));
    } catch (error) {
      console.error('Error fetching table stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTableStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTableStats();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Jamais';
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Base de données</h1>
          <p className="text-muted-foreground">État en temps réel des tables de données</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tables actives</p>
                <p className="text-2xl font-bold text-foreground mt-1">{tables.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                <Table className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total enregistrements</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalRecords.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-info/10 text-info">
                <Rows3 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dernière mise à jour</p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {formatDate(tables.reduce((latest, t) => {
                    if (!t.lastUpdated) return latest;
                    if (!latest) return t.lastUpdated;
                    return new Date(t.lastUpdated) > new Date(latest) ? t.lastUpdated : latest;
                  }, null as string | null))}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-success/10 text-success">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Tables de la base de données
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Table</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Nom technique</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Enregistrements</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Dernière activité</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => (
                  <tr key={table.name} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{table.icon}</span>
                        <span className="font-medium text-foreground">{table.displayName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{table.name}</code>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        table.count > 0 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      }`}>
                        {table.count.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      {formatDate(table.lastUpdated)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30">
                  <td colSpan={2} className="py-3 px-2 font-medium text-foreground">Total</td>
                  <td className="py-3 px-2 text-right font-bold text-foreground">{totalRecords.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
