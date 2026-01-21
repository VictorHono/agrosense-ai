import { useState, useRef } from 'react';
import { 
  History, 
  Camera, 
  MessageSquare, 
  BarChart3, 
  Download, 
  Calendar,
  ChevronRight,
  Leaf,
  AlertTriangle,
  Check,
  RefreshCw,
  Filter,
  Loader2,
  FileText,
  ArrowRight
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActivityHistory, ActivityRecord } from '@/hooks/useActivityHistory';
import { useChatHistory, ChatSession } from '@/hooks/useChatHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { exportElementToPdf } from '@/lib/pdfExport';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

// Diagnosis Detail Card with PDF Export
function DiagnosisCard({ 
  activity, 
  language, 
  onExport 
}: { 
  activity: ActivityRecord; 
  language: string;
  onExport: (id: string) => void;
}) {
  const locale = language === 'fr' ? fr : enUS;
  const metadata = activity.metadata || {};
  const isHealthy = metadata.is_healthy as boolean;
  const crop = metadata.crop as string || 'Culture inconnue';
  const disease = metadata.disease_name as string;
  const severity = metadata.severity as string;
  const confidence = metadata.confidence as number;
  const region = metadata.region as string;

  const severityColors: Record<string, string> = {
    low: 'bg-success/10 text-success border-success/30',
    medium: 'bg-warning/10 text-warning border-warning/30',
    high: 'bg-destructive/10 text-destructive border-destructive/30',
    critical: 'bg-destructive/20 text-destructive border-destructive/50',
  };

  return (
    <div 
      id={`diagnosis-${activity.id}`}
      className="bg-card border border-border rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {isHealthy ? (
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="w-4 h-4 text-success" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
          )}
          <div>
            <h4 className="font-semibold text-foreground">{crop}</h4>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale })}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onExport(activity.id)}
          className="text-primary hover:text-primary/80"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {!isHealthy && disease && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(severityColors[severity] || '')}>
              {severity}
            </Badge>
            <span className="text-sm font-medium text-destructive">{disease}</span>
          </div>
          {confidence && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{language === 'fr' ? 'Confiance' : 'Confidence'}:</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-24">
                <div 
                  className="h-full bg-primary rounded-full" 
                  style={{ width: `${confidence}%` }} 
                />
              </div>
              <span>{confidence}%</span>
            </div>
          )}
        </div>
      )}

      {isHealthy && (
        <p className="text-sm text-success">
          {language === 'fr' ? 'Plante en bonne santé' : 'Healthy plant'}
        </p>
      )}

      {region && (
        <p className="text-xs text-muted-foreground">
          📍 {region}
        </p>
      )}
    </div>
  );
}

// Harvest Analysis Card with PDF Export
function HarvestCard({ 
  activity, 
  language,
  onExport 
}: { 
  activity: ActivityRecord; 
  language: string;
  onExport: (id: string) => void;
}) {
  const locale = language === 'fr' ? fr : enUS;
  const metadata = activity.metadata || {};
  const crop = metadata.crop as string || 'Récolte';
  const grade = metadata.grade as string;
  const priceMin = metadata.price_min as number;
  const priceMax = metadata.price_max as number;
  const yieldPotential = metadata.yield_potential as string;

  const gradeColors: Record<string, string> = {
    'A': 'bg-success text-success-foreground',
    'B': 'bg-warning text-warning-foreground',
    'C': 'bg-destructive text-destructive-foreground',
  };

  return (
    <div 
      id={`harvest-${activity.id}`}
      className="bg-card border border-border rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-accent-foreground" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{crop}</h4>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale })}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onExport(activity.id)}
          className="text-primary hover:text-primary/80"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        {grade && (
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold",
            gradeColors[grade] || 'bg-muted'
          )}>
            {grade}
          </div>
        )}
        <div className="flex-1">
          {priceMin && priceMax && (
            <p className="text-sm font-medium text-foreground">
              {priceMin.toLocaleString()} - {priceMax.toLocaleString()} XAF
            </p>
          )}
          {yieldPotential && (
            <p className="text-xs text-muted-foreground">
              {language === 'fr' ? 'Potentiel' : 'Potential'}: {yieldPotential}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Chat Session Card
function ChatSessionCard({ 
  session, 
  language,
  onViewDetails
}: { 
  session: ChatSession; 
  language: string;
  onViewDetails: (session: ChatSession) => void;
}) {
  const locale = language === 'fr' ? fr : enUS;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground line-clamp-2">
              {session.first_message}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3" />
              {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true, locale })}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          {session.message_count} {language === 'fr' ? 'messages' : 'messages'}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(session)}
          className="text-primary hover:text-primary/80"
        >
          {language === 'fr' ? 'Voir' : 'View'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// Chat Detail Modal
function ChatDetailModal({
  session,
  language,
  onClose
}: {
  session: ChatSession;
  language: string;
  onClose: () => void;
}) {
  const locale = language === 'fr' ? fr : enUS;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            {language === 'fr' ? 'Conversation' : 'Conversation'}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {session.messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "max-w-[85%] rounded-xl p-3",
                msg.role === 'user' 
                  ? "ml-auto bg-primary text-primary-foreground" 
                  : "bg-muted text-foreground"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className="text-[10px] opacity-70 mt-1">
                {format(new Date(msg.created_at), 'HH:mm', { locale })}
              </p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border">
          <Link to="/assistant">
            <Button className="w-full">
              {language === 'fr' ? 'Continuer la conversation' : 'Continue conversation'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { language } = useLanguage();
  const { activities, loading, hasMore, loadMore, refresh, filterByType, currentFilter } = useActivityHistory();
  const { sessions, loading: chatLoading, refresh: refreshChats } = useChatHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const locale = language === 'fr' ? fr : enUS;

  const texts = {
    title: language === 'fr' ? 'Historique' : 'History',
    subtitle: language === 'fr' ? 'Retrouvez toutes vos activités' : 'Find all your activities',
    all: language === 'fr' ? 'Tout' : 'All',
    diagnostics: language === 'fr' ? 'Diagnostics' : 'Diagnostics',
    harvests: language === 'fr' ? 'Récoltes' : 'Harvests',
    chats: language === 'fr' ? 'Discussions' : 'Chats',
    noActivity: language === 'fr' ? 'Aucune activité' : 'No activity',
    loadMore: language === 'fr' ? 'Charger plus' : 'Load more',
    exportSuccess: language === 'fr' ? 'PDF exporté avec succès' : 'PDF exported successfully',
    exportError: language === 'fr' ? 'Erreur lors de l\'export' : 'Export failed',
  };

  const handleExportDiagnosis = async (id: string) => {
    setExporting(id);
    try {
      const success = await exportElementToPdf(`diagnosis-${id}`, {
        title: language === 'fr' ? 'Rapport de Diagnostic' : 'Diagnosis Report',
        filename: `diagnostic-${id}`,
        language,
      });
      if (success) {
        toast.success(texts.exportSuccess);
      } else {
        toast.error(texts.exportError);
      }
    } catch {
      toast.error(texts.exportError);
    } finally {
      setExporting(null);
    }
  };

  const handleExportHarvest = async (id: string) => {
    setExporting(id);
    try {
      const success = await exportElementToPdf(`harvest-${id}`, {
        title: language === 'fr' ? 'Rapport d\'Analyse de Récolte' : 'Harvest Analysis Report',
        filename: `recolte-${id}`,
        language,
      });
      if (success) {
        toast.success(texts.exportSuccess);
      } else {
        toast.error(texts.exportError);
      }
    } catch {
      toast.error(texts.exportError);
    } finally {
      setExporting(null);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'all') {
      filterByType('all');
    } else if (value === 'diagnostics') {
      filterByType('diagnosis');
    } else if (value === 'harvests') {
      filterByType('harvest_analysis');
    }
  };

  const handleRefresh = () => {
    refresh();
    refreshChats();
  };

  const diagnosisActivities = activities.filter(a => a.activity_type === 'diagnosis');
  const harvestActivities = activities.filter(a => a.activity_type === 'harvest_analysis');

  return (
    <PageContainer 
      title={texts.title}
      showBack
    >
      <div className="space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <History className="w-6 h-6 text-primary" />
              {texts.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{texts.subtitle}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || chatLoading}
          >
            <RefreshCw className={cn("w-4 h-4", (loading || chatLoading) && "animate-spin")} />
          </Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-primary/5 rounded-xl p-3 text-center">
            <Camera className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-primary">{diagnosisActivities.length}</p>
            <p className="text-[10px] text-muted-foreground">{texts.diagnostics}</p>
          </div>
          <div className="bg-accent/10 rounded-xl p-3 text-center">
            <BarChart3 className="w-5 h-5 text-accent-foreground mx-auto mb-1" />
            <p className="text-xl font-bold text-accent-foreground">{harvestActivities.length}</p>
            <p className="text-[10px] text-muted-foreground">{texts.harvests}</p>
          </div>
          <div className="bg-success/10 rounded-xl p-3 text-center">
            <MessageSquare className="w-5 h-5 text-success mx-auto mb-1" />
            <p className="text-xl font-bold text-success">{sessions.length}</p>
            <p className="text-[10px] text-muted-foreground">{texts.chats}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50">
            <TabsTrigger value="all" className="text-xs">{texts.all}</TabsTrigger>
            <TabsTrigger value="diagnostics" className="text-xs">{texts.diagnostics}</TabsTrigger>
            <TabsTrigger value="harvests" className="text-xs">{texts.harvests}</TabsTrigger>
            <TabsTrigger value="chats" className="text-xs">{texts.chats}</TabsTrigger>
          </TabsList>

          {/* All Activities */}
          <TabsContent value="all" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{texts.noActivity}</p>
              </div>
            ) : (
              <>
                {activities.map((activity) => {
                  if (activity.activity_type === 'diagnosis') {
                    return (
                      <DiagnosisCard 
                        key={activity.id} 
                        activity={activity} 
                        language={language}
                        onExport={handleExportDiagnosis}
                      />
                    );
                  }
                  if (activity.activity_type === 'harvest_analysis') {
                    return (
                      <HarvestCard 
                        key={activity.id} 
                        activity={activity} 
                        language={language}
                        onExport={handleExportHarvest}
                      />
                    );
                  }
                  return null;
                })}
                {hasMore && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : texts.loadMore}
                  </Button>
                )}
              </>
            )}
          </TabsContent>

          {/* Diagnostics */}
          <TabsContent value="diagnostics" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : diagnosisActivities.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{texts.noActivity}</p>
                <Link to="/diagnose">
                  <Button className="mt-4">
                    {language === 'fr' ? 'Faire un diagnostic' : 'Make a diagnosis'}
                  </Button>
                </Link>
              </div>
            ) : (
              diagnosisActivities.map((activity) => (
                <DiagnosisCard 
                  key={activity.id} 
                  activity={activity} 
                  language={language}
                  onExport={handleExportDiagnosis}
                />
              ))
            )}
          </TabsContent>

          {/* Harvests */}
          <TabsContent value="harvests" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : harvestActivities.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{texts.noActivity}</p>
                <Link to="/harvest">
                  <Button className="mt-4">
                    {language === 'fr' ? 'Analyser une récolte' : 'Analyze a harvest'}
                  </Button>
                </Link>
              </div>
            ) : (
              harvestActivities.map((activity) => (
                <HarvestCard 
                  key={activity.id} 
                  activity={activity} 
                  language={language}
                  onExport={handleExportHarvest}
                />
              ))
            )}
          </TabsContent>

          {/* Chats */}
          <TabsContent value="chats" className="mt-4 space-y-3">
            {chatLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{texts.noActivity}</p>
                <Link to="/assistant">
                  <Button className="mt-4">
                    {language === 'fr' ? 'Discuter avec l\'assistant' : 'Chat with assistant'}
                  </Button>
                </Link>
              </div>
            ) : (
              sessions.map((session) => (
                <ChatSessionCard 
                  key={session.session_id} 
                  session={session} 
                  language={language}
                  onViewDetails={setSelectedChat}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Detail Modal */}
      {selectedChat && (
        <ChatDetailModal
          session={selectedChat}
          language={language}
          onClose={() => setSelectedChat(null)}
        />
      )}
    </PageContainer>
  );
}
