import { useEffect, useState } from 'react';
import { Users, MessageCircle, Calendar, Loader2, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface SessionStats {
  session_id: string;
  message_count: number;
  first_message: string;
  last_message: string;
}

export default function AdminUsersPage() {
  const [sessions, setSessions] = useState<SessionStats[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [todayMessages, setTodayMessages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        // Get all chat messages to analyze sessions
        const { data: chats, error } = await supabase
          .from('chat_history')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (chats) {
          setTotalMessages(chats.length);

          // Count today's messages
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayCount = chats.filter(c => new Date(c.created_at) >= today).length;
          setTodayMessages(todayCount);

          // Group by session
          const sessionMap = new Map<string, { 
            messages: typeof chats, 
            first: string, 
            last: string 
          }>();

          chats.forEach(chat => {
            const existing = sessionMap.get(chat.session_id);
            if (existing) {
              existing.messages.push(chat);
              if (new Date(chat.created_at) < new Date(existing.first)) {
                existing.first = chat.created_at;
              }
              if (new Date(chat.created_at) > new Date(existing.last)) {
                existing.last = chat.created_at;
              }
            } else {
              sessionMap.set(chat.session_id, {
                messages: [chat],
                first: chat.created_at,
                last: chat.created_at
              });
            }
          });

          const sessionStats: SessionStats[] = Array.from(sessionMap.entries())
            .map(([session_id, data]) => ({
              session_id,
              message_count: data.messages.length,
              first_message: data.first,
              last_message: data.last
            }))
            .sort((a, b) => new Date(b.last_message).getTime() - new Date(a.last_message).getTime());

          setSessions(sessionStats);
        }
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
        <p className="text-muted-foreground">Sessions et activité des utilisateurs (basé sur chat_history)</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sessions uniques</p>
                <p className="text-2xl font-bold text-foreground mt-1">{sessions.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Messages total</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalMessages}</p>
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
                <p className="text-sm text-muted-foreground">Messages aujourd'hui</p>
                <p className="text-2xl font-bold text-foreground mt-1">{todayMessages}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-success/10 text-success">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Moy. msg/session</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {sessions.length > 0 ? Math.round(totalMessages / sessions.length) : 0}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-warning/10 text-warning">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessions récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune session enregistrée. Les sessions apparaîtront ici quand les utilisateurs utiliseront l'assistant.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Session ID</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Messages</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Première activité</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Dernière activité</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 20).map((session) => (
                    <tr key={session.session_id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {session.session_id.slice(0, 12)}...
                        </code>
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {session.message_count}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {formatDate(session.first_message)}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {formatDate(session.last_message)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
