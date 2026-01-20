import { useState, useEffect } from 'react';
import { History, Trash2, ChevronRight, AlertTriangle, Check, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AnalysisResult } from '@/hooks/useDiagnosis';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface HistoryEntry {
  id: string;
  timestamp: string;
  imageUrl: string;
  result: AnalysisResult;
}

interface DiagnosisHistoryProps {
  language: string;
  onSelect?: (entry: HistoryEntry) => void;
}

const STORAGE_KEY = 'diagnosis-history';
const MAX_ENTRIES = 10;

export function saveDiagnosisToHistory(imageUrl: string, result: AnalysisResult) {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const history: HistoryEntry[] = existing ? JSON.parse(existing) : [];
    
    const newEntry: HistoryEntry = {
      id: `diag-${Date.now()}`,
      timestamp: new Date().toISOString(),
      imageUrl,
      result,
    };
    
    // Add to start, limit to MAX_ENTRIES
    const updated = [newEntry, ...history].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.error('Failed to save diagnosis to history');
  }
}

export function DiagnosisHistory({ language, onSelect }: DiagnosisHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  const removeEntry = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  if (history.length === 0) return null;

  const locale = language === 'fr' ? fr : enUS;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">
            {language === 'fr' ? 'Historique récent' : 'Recent history'}
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {history.length}
          </span>
        </div>
        <ChevronRight className={cn(
          "w-4 h-4 text-muted-foreground transition-transform",
          expanded && "rotate-90"
        )} />
      </button>

      {/* History list */}
      {expanded && (
        <div className="border-t border-border">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                <img 
                  src={entry.imageUrl} 
                  alt="" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              </div>

              {/* Info */}
              <button
                onClick={() => onSelect?.(entry)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center gap-2">
                  {entry.result.is_healthy ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-destructive" />
                  )}
                  <span className="font-medium text-foreground text-sm truncate">
                    {entry.result.detected_crop}
                  </span>
                </div>
                {!entry.result.is_healthy && entry.result.disease_name && (
                  <p className="text-xs text-destructive truncate">
                    {entry.result.disease_name}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {formatDistanceToNow(new Date(entry.timestamp), { 
                    addSuffix: true,
                    locale 
                  })}
                </div>
              </button>

              {/* Delete button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEntry(entry.id)}
                className="shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {/* Clear all */}
          <div className="p-3 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="w-full text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3 h-3 mr-2" />
              {language === 'fr' ? 'Effacer l\'historique' : 'Clear history'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
