import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export type ActivityType = 'diagnosis' | 'harvest_analysis' | 'tip_read';

interface ActivityStats {
  diagnostics: number;
  analyses: number;
  tipsRead: number;
}

interface UseUserActivityReturn {
  stats: ActivityStats;
  loading: boolean;
  logActivity: (type: ActivityType, metadata?: Record<string, unknown>) => Promise<void>;
  refreshStats: () => Promise<void>;
}

export function useUserActivity(): UseUserActivityReturn {
  const { user } = useAuth();
  const [stats, setStats] = useState<ActivityStats>({
    diagnostics: 0,
    analyses: 0,
    tipsRead: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats({ diagnostics: 0, analyses: 0, tipsRead: 0 });
      setLoading(false);
      return;
    }

    try {
      // Fetch counts for each activity type in parallel
      const [diagnosisRes, analysisRes, tipsRes] = await Promise.all([
        supabase
          .from('user_activity')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('activity_type', 'diagnosis'),
        supabase
          .from('user_activity')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('activity_type', 'harvest_analysis'),
        supabase
          .from('user_activity')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('activity_type', 'tip_read'),
      ]);

      setStats({
        diagnostics: diagnosisRes.count ?? 0,
        analyses: analysisRes.count ?? 0,
        tipsRead: tipsRes.count ?? 0,
      });
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const logActivity = useCallback(
    async (type: ActivityType, metadata: Record<string, unknown> = {}) => {
      if (!user) return;

      try {
        const insertData = {
          user_id: user.id,
          activity_type: type,
          metadata: (metadata || {}) as Json,
        };
        
        const { error } = await supabase.from('user_activity').insert([insertData]);

        if (error) throw error;

        // Optimistically update the local count
        setStats((prev) => ({
          ...prev,
          diagnostics: type === 'diagnosis' ? prev.diagnostics + 1 : prev.diagnostics,
          analyses: type === 'harvest_analysis' ? prev.analyses + 1 : prev.analyses,
          tipsRead: type === 'tip_read' ? prev.tipsRead + 1 : prev.tipsRead,
        }));
      } catch (error) {
        console.error('Error logging activity:', error);
      }
    },
    [user]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Set up realtime subscription for activity updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user_activity_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_activity',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh stats when new activity is inserted
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchStats]);

  return {
    stats,
    loading,
    logActivity,
    refreshStats: fetchStats,
  };
}
