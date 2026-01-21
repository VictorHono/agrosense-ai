import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Camera, BarChart3, Loader2, Calendar, ChevronRight } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface ActivityRecord {
  id: string;
  activity_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const HistoryPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.created_at)}
                      </div>
                      <h3 className="font-medium text-foreground">
                        {getMetadataValue(item.metadata, 'crop') || 'Culture non spécifiée'}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {getMetadataValue(item.metadata, 'disease') || 'Diagnostic effectué'}
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
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.created_at)}
                      </div>
                      <h3 className="font-medium text-foreground">
                        {getMetadataValue(item.metadata, 'crop') || 'Analyse de récolte'}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {getMetadataValue(item.metadata, 'quality') || 'Qualité analysée'}
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
    </PageContainer>
  );
};

export default HistoryPage;
