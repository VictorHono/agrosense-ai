import { useEffect, useState } from 'react';
import { Brain, MessageCircle, Zap, Clock, Loader2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  session_id: string;
}

interface AIStats {
  totalResponses: number;
  totalUserMessages: number;
  avgResponseLength: number;
  topTopics: { topic: string; count: number }[];
  recentInteractions: ChatMessage[];
}

export default function AdminAIPage() {
  const [stats, setStats] = useState<AIStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAIStats = async () => {
      try {
        const { data: chats, error } = await supabase
          .from('chat_history')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (chats) {
          const userMessages = chats.filter(c => c.role === 'user');
          const assistantMessages = chats.filter(c => c.role === 'assistant');

          // Analyze topics from user messages
          const topicKeywords: Record<string, string[]> = {
            'Maladies': ['maladie', 'infection', 'parasite', 'champignon', 'virus', 'symptôme'],
            'Traitements': ['traitement', 'soigner', 'guérir', 'pesticide', 'fongicide', 'remède'],
            'Cultures': ['planter', 'semer', 'culture', 'récolte', 'rendement', 'plantation'],
            'Météo': ['météo', 'pluie', 'soleil', 'température', 'saison', 'climat'],
            'Prix': ['prix', 'marché', 'vendre', 'coût', 'acheter', 'FCFA'],
            'Sol': ['sol', 'terre', 'engrais', 'fertilisant', 'compost', 'irrigation']
          };

          const topicCounts: Record<string, number> = {};
          
          userMessages.forEach(msg => {
            const content = msg.content.toLowerCase();
            Object.entries(topicKeywords).forEach(([topic, keywords]) => {
              if (keywords.some(kw => content.includes(kw))) {
                topicCounts[topic] = (topicCounts[topic] || 0) + 1;
              }
            });
          });

          const topTopics = Object.entries(topicCounts)
            .map(([topic, count]) => ({ topic, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          const avgLength = assistantMessages.length > 0
            ? Math.round(assistantMessages.reduce((sum, m) => sum + m.content.length, 0) / assistantMessages.length)
            : 0;

          setStats({
            totalResponses: assistantMessages.length,
            totalUserMessages: userMessages.length,
            avgResponseLength: avgLength,
            topTopics,
            recentInteractions: chats.slice(0, 20)
          });
        }
      } catch (error) {
        console.error('Error fetching AI stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAIStats();
  }, []);

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
        <h1 className="text-2xl font-bold text-foreground">Supervision IA</h1>
        <p className="text-muted-foreground">Analyse des interactions avec l'assistant IA (données réelles)</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Réponses IA</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.totalResponses || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                <Brain className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Questions reçues</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.totalUserMessages || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-info/10 text-info">
                <MessageCircle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux de réponse</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats?.totalUserMessages ? Math.round((stats.totalResponses / stats.totalUserMessages) * 100) : 0}%
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-success/10 text-success">
                <Zap className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Long. moy. réponse</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.avgResponseLength || 0}</p>
                <p className="text-xs text-muted-foreground">caractères</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-warning/10 text-warning">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Topics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Sujets les plus demandés
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.topTopics?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Pas assez de données. Les sujets apparaîtront avec plus de conversations.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.topTopics.map((topic, i) => (
                  <div key={topic.topic} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-foreground">{topic.topic}</span>
                        <span className="text-muted-foreground">{topic.count} mentions</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min((topic.count / (stats.topTopics[0]?.count || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Interactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-info" />
              Interactions récentes
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            {!stats?.recentInteractions?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune interaction enregistrée
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentInteractions.map((chat) => (
                  <div key={chat.id} className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                      chat.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                    }`}>
                      {chat.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {chat.role === 'user' ? 'Utilisateur' : 'IA'} • {new Date(chat.created_at).toLocaleString('fr-FR')}
                      </p>
                      <p className="text-sm text-foreground truncate">{chat.content.slice(0, 80)}...</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
