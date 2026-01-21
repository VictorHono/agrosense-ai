import { useState, useEffect, useCallback } from 'react';
import { 
  History, 
  Camera, 
  MessageSquare, 
  BarChart3, 
  Download, 
  Calendar,
  ChevronRight,
  AlertTriangle,
  Check,
  RefreshCw,
  Loader2,
  FileText,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ActivityRecord {
  id: string;
  activity_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface ChatSession {
  session_id: string;
  messages: ChatMessage[];
  first_message: string;
  last_activity: string;
  message_count: number;
}

// PDF Export function
async function exportToPdf(elementId: string, title: string, filename: string, lang: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) return false;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    pdf.setFontSize(18);
    pdf.setTextColor(34, 139, 34);
    pdf.text('AgroCamer', 15, 15);
    
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(title, 15, 25);
    
    pdf.setFontSize(9);
    const dateText = lang === 'fr' 
      ? `Généré le ${new Date().toLocaleDateString('fr-FR')}` 
      : `Generated on ${new Date().toLocaleDateString('en-US')}`;
    pdf.text(dateText, 15, 32);
    
    const imgWidth = pdfWidth - 30;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const maxHeight = pdfHeight - 50;
    
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 15, 40, imgWidth, Math.min(imgHeight, maxHeight));
    
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`AgroCamer © ${new Date().getFullYear()}`, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
    
    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('PDF export failed:', error);
    return false;
  }
}

// Diagnosis Card Component
function DiagnosisCard({ activity, language, onExport }: { 
  activity: ActivityRecord; 
  language: string;
  onExport: (id: string) => void;
}) {
  const locale = language === 'fr' ? fr : enUS;
  const metadata = activity.metadata || {};
  const isHealthy = metadata.is_healthy as boolean;
  const crop = (metadata.crop as string) || 'Culture';
  const disease = metadata.disease_name as string;
  const severity = metadata.severity as string;
  const confidence = metadata.confidence as number;

  const severityColors: Record<string, string> = {
    low: 'bg-green-100 text-green-800 border-green-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    high: 'bg-red-100 text-red-800 border-red-300',
    critical: 'bg-red-200 text-red-900 border-red-500',
  };

  return (
    <div id={`diagnosis-${activity.id}`} className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {isHealthy ? (
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
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
        <Button variant="ghost" size="sm" onClick={() => onExport(activity.id)} className="text-primary">
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {!isHealthy && disease && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(severityColors[severity] || '')}>
              {severity}
            </Badge>
            <span className="text-sm font-medium text-red-600">{disease}</span>
          </div>
          {confidence && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{language === 'fr' ? 'Confiance' : 'Confidence'}:</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-24">
                <div className="h-full bg-primary rounded-full" style={{ width: `${confidence}%` }} />
              </div>
              <span>{confidence}%</span>
            </div>
          )}
        </div>
      )}

      {isHealthy && (
        <p className="text-sm text-green-600">
          {language === 'fr' ? 'Plante en bonne santé' : 'Healthy plant'}
        </p>
      )}
    </div>
  );
}

// Harvest Card Component
function HarvestCard({ activity, language, onExport }: { 
  activity: ActivityRecord; 
  language: string;
  onExport: (id: string) => void;
}) {
  const locale = language === 'fr' ? fr : enUS;
  const metadata = activity.metadata || {};
  const crop = (metadata.crop as string) || 'Récolte';
  const grade = metadata.grade as string;
  const priceMin = metadata.price_min as number;
  const priceMax = metadata.price_max as number;

  const gradeColors: Record<string, string> = {
    'A': 'bg-green-500 text-white',
    'B': 'bg-yellow-500 text-white',
    'C': 'bg-red-500 text-white',
  };

  return (
    <div id={`harvest-${activity.id}`} className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{crop}</h4>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale })}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onExport(activity.id)} className="text-primary">
          <Download className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        {grade && (
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold", gradeColors[grade] || 'bg-gray-200')}>
            {grade}
          </div>
        )}
        <div className="flex-1">
          {priceMin && priceMax && (
            <p className="text-sm font-medium text-foreground">
              {priceMin.toLocaleString()} - {priceMax.toLocaleString()} XAF
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Chat Session Card
function ChatSessionCard({ session, language, onViewDetails }: { 
  session: ChatSession; 
  language: string;
  onViewDetails: (session: ChatSession) => void;
}) {
  const locale = language === 'fr' ? fr : enUS;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground line-clamp-2">{session.first_message}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3" />
            {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true, locale })}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          {session.message_count} messages
        </Badge>
        <Button variant="ghost" size="sm" onClick={() => onViewDetails(session)} className="text-primary">
          {language === 'fr' ? 'Voir' : 'View'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// Chat Detail Modal
function ChatDetailModal({ session, language, onClose }: { session: ChatSession; language: string; onClose: () => void }) {
  const locale = language === 'fr' ? fr : enUS;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{language === 'fr' ? 'Conversation' : 'Conversation'}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {session.messages.map((msg) => (
            <div key={msg.id} className={cn("max-w-[85%] rounded-xl p-3", msg.role === 'user' ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className="text-[10px] opacity-70 mt-1">{format(new Date(msg.created_at), 'HH:mm', { locale })}</p>
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
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);

  const locale = language === 'fr' ? fr : enUS;

  const texts = {
    title: language === 'fr' ? 'Historique' : 'History',
    subtitle: language === 'fr' ? 'Retrouvez toutes vos activités' : 'Find all your activities',
    all: language === 'fr' ? 'Tout' : 'All',
    diagnostics: language === 'fr' ? 'Diagnostics' : 'Diagnostics',
    harvests: language === 'fr' ? 'Récoltes' : 'Harvests',
    chats: language === 'fr' ? 'Discussions' : 'Chats',
    noActivity: language === 'fr' ? 'Aucune activité' : 'No activity',
    exportSuccess: language === 'fr' ? 'PDF exporté avec succès' : 'PDF exported successfully',
    exportError: language === 'fr' ? "Erreur lors de l'export" : 'Export failed',
  };

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setActivities((data || []).map(item => ({
        ...item,
        metadata: (item.metadata || {}) as Record<string, unknown>,
      })));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch chat sessions
  const fetchChats = useCallback(async () => {
    if (!user) return;
    setChatLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .like('session_id', `%${user.id}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const sessionMap = new Map<string, ChatMessage[]>();
      
      (data || []).forEach(msg => {
        const existing = sessionMap.get(msg.session_id) || [];
        existing.push({ id: msg.id, role: msg.role, content: msg.content, created_at: msg.created_at });
        sessionMap.set(msg.session_id, existing);
      });

      const sessionList: ChatSession[] = [];
      sessionMap.forEach((messages, session_id) => {
        const sortedMessages = messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const userMessages = sortedMessages.filter(m => m.role === 'user');
        const firstUserMessage = userMessages[0]?.content || 'Conversation';
        
        sessionList.push({
          session_id,
          messages: sortedMessages,
          first_message: firstUserMessage.slice(0, 100) + (firstUserMessage.length > 100 ? '...' : ''),
          last_activity: sortedMessages[sortedMessages.length - 1]?.created_at || '',
          message_count: messages.length,
        });
      });

      sessionList.sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());
      setSessions(sessionList);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setChatLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchActivities();
    fetchChats();
  }, [fetchActivities, fetchChats]);

  const handleExportDiagnosis = async (id: string) => {
    const success = await exportToPdf(`diagnosis-${id}`, language === 'fr' ? 'Rapport de Diagnostic' : 'Diagnosis Report', `diagnostic-${id}`, language);
    toast[success ? 'success' : 'error'](success ? texts.exportSuccess : texts.exportError);
  };

  const handleExportHarvest = async (id: string) => {
    const success = await exportToPdf(`harvest-${id}`, language === 'fr' ? "Rapport d'Analyse de Récolte" : 'Harvest Analysis Report', `recolte-${id}`, language);
    toast[success ? 'success' : 'error'](success ? texts.exportSuccess : texts.exportError);
  };

  const handleRefresh = () => {
    fetchActivities();
    fetchChats();
  };

  const diagnosisActivities = activities.filter(a => a.activity_type === 'diagnosis');
  const harvestActivities = activities.filter(a => a.activity_type === 'harvest_analysis');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                {texts.title}
              </h1>
              <p className="text-xs text-muted-foreground">{texts.subtitle}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading || chatLoading}>
            <RefreshCw className={cn("w-4 h-4", (loading || chatLoading) && "animate-spin")} />
          </Button>
        </div>
      </header>

      <main className="p-4 pb-24 space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-primary/5 rounded-xl p-3 text-center">
            <Camera className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-primary">{diagnosisActivities.length}</p>
            <p className="text-[10px] text-muted-foreground">{texts.diagnostics}</p>
          </div>
          <div className="bg-amber-500/10 rounded-xl p-3 text-center">
            <BarChart3 className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-amber-600">{harvestActivities.length}</p>
            <p className="text-[10px] text-muted-foreground">{texts.harvests}</p>
          </div>
          <div className="bg-green-500/10 rounded-xl p-3 text-center">
            <MessageSquare className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-green-600">{sessions.length}</p>
            <p className="text-[10px] text-muted-foreground">{texts.chats}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50">
            <TabsTrigger value="all" className="text-xs">{texts.all}</TabsTrigger>
            <TabsTrigger value="diagnostics" className="text-xs">{texts.diagnostics}</TabsTrigger>
            <TabsTrigger value="harvests" className="text-xs">{texts.harvests}</TabsTrigger>
            <TabsTrigger value="chats" className="text-xs">{texts.chats}</TabsTrigger>
          </TabsList>

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
              activities.map((activity) => {
                if (activity.activity_type === 'diagnosis') {
                  return <DiagnosisCard key={activity.id} activity={activity} language={language} onExport={handleExportDiagnosis} />;
                }
                if (activity.activity_type === 'harvest_analysis') {
                  return <HarvestCard key={activity.id} activity={activity} language={language} onExport={handleExportHarvest} />;
                }
                return null;
              })
            )}
          </TabsContent>

          <TabsContent value="diagnostics" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : diagnosisActivities.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{texts.noActivity}</p>
                <Link to="/diagnose"><Button className="mt-4">{language === 'fr' ? 'Faire un diagnostic' : 'Make a diagnosis'}</Button></Link>
              </div>
            ) : (
              diagnosisActivities.map((activity) => <DiagnosisCard key={activity.id} activity={activity} language={language} onExport={handleExportDiagnosis} />)
            )}
          </TabsContent>

          <TabsContent value="harvests" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : harvestActivities.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{texts.noActivity}</p>
                <Link to="/harvest"><Button className="mt-4">{language === 'fr' ? 'Analyser une récolte' : 'Analyze a harvest'}</Button></Link>
              </div>
            ) : (
              harvestActivities.map((activity) => <HarvestCard key={activity.id} activity={activity} language={language} onExport={handleExportHarvest} />)
            )}
          </TabsContent>

          <TabsContent value="chats" className="mt-4 space-y-3">
            {chatLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{texts.noActivity}</p>
                <Link to="/assistant"><Button className="mt-4">{language === 'fr' ? "Discuter avec l'assistant" : 'Chat with assistant'}</Button></Link>
              </div>
            ) : (
              sessions.map((session) => <ChatSessionCard key={session.session_id} session={session} language={language} onViewDetails={setSelectedChat} />)
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />

      {selectedChat && <ChatDetailModal session={selectedChat} language={language} onClose={() => setSelectedChat(null)} />}
    </div>
  );
}
