import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ActivityType = 'diagnosis' | 'harvest_analysis' | 'tip_read' | 'chat';

export interface ActivityRecord {
  id: string;
  activity_type: ActivityType;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface UseActivityHistoryReturn {
  activities: ActivityRecord[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  filterByType: (type: ActivityType | 'all') => void;
  currentFilter: ActivityType | 'all';
}

const PAGE_SIZE = 20;

export function useActivityHistory(): UseActivityHistoryReturn {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [currentFilter, setCurrentFilter] = useState<ActivityType | 'all'>('all');

  const fetchActivities = useCallback(async (reset = false) => {
    if (!user) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const currentOffset = reset ? 0 : offset;

    try {
      let query = supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE - 1);

      if (currentFilter !== 'all') {
        query = query.eq('activity_type', currentFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const typedData = (data || []).map(item => ({
        ...item,
        activity_type: item.activity_type as ActivityType,
        metadata: (item.metadata || {}) as Record<string, unknown>,
      }));

      if (reset) {
        setActivities(typedData);
        setOffset(PAGE_SIZE);
      } else {
        setActivities(prev => [...prev, ...typedData]);
        setOffset(prev => prev + PAGE_SIZE);
      }

      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching activity history:', error);
    } finally {
      setLoading(false);
    }
  }, [user, offset, currentFilter]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchActivities(false);
    }
  }, [loading, hasMore, fetchActivities]);

  const refresh = useCallback(async () => {
    setOffset(0);
    await fetchActivities(true);
  }, [fetchActivities]);

  const filterByType = useCallback((type: ActivityType | 'all') => {
    setCurrentFilter(type);
    setOffset(0);
  }, []);

  useEffect(() => {
    fetchActivities(true);
  }, [user, currentFilter]);

  return {
    activities,
    loading,
    hasMore,
    loadMore,
    refresh,
    filterByType,
    currentFilter,
  };
}
