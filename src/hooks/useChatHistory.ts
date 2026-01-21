import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatSession {
  session_id: string;
  messages: ChatMessage[];
  first_message: string;
  last_activity: string;
  message_count: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface UseChatHistoryReturn {
  sessions: ChatSession[];
  loading: boolean;
  refresh: () => Promise<void>;
  getSessionMessages: (sessionId: string) => Promise<ChatMessage[]>;
}

export function useChatHistory(): UseChatHistoryReturn {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Get all chat messages for the user's sessions
      // Sessions are identified by session_id which includes user.id
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .like('session_id', `%${user.id}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by session
      const sessionMap = new Map<string, ChatMessage[]>();
      
      (data || []).forEach(msg => {
        const existing = sessionMap.get(msg.session_id) || [];
        existing.push({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          created_at: msg.created_at,
        });
        sessionMap.set(msg.session_id, existing);
      });

      // Convert to session objects
      const sessionList: ChatSession[] = [];
      
      sessionMap.forEach((messages, session_id) => {
        // Sort messages by time (oldest first for display)
        const sortedMessages = messages.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
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

      // Sort sessions by last activity (most recent first)
      sessionList.sort((a, b) => 
        new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
      );

      setSessions(sessionList);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getSessionMessages = useCallback(async (sessionId: string): Promise<ChatMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        created_at: msg.created_at,
      }));
    } catch (error) {
      console.error('Error fetching session messages:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    refresh: fetchSessions,
    getSessionMessages,
  };
}
