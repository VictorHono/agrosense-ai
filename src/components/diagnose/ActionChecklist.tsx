import { useState, useEffect } from 'react';
import { Check, Circle, Clock, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ActionItem {
  id: string;
  text: string;
  priority: 'urgent' | 'important' | 'normal';
  completed: boolean;
}

interface ActionChecklistProps {
  actions: string[];
  diseaseId?: string;
  language: string;
  onProgressChange?: (progress: number) => void;
}

export function ActionChecklist({ 
  actions, 
  diseaseId,
  language,
  onProgressChange 
}: ActionChecklistProps) {
  const [items, setItems] = useState<ActionItem[]>([]);

  // Initialize items from actions
  useEffect(() => {
    const storageKey = diseaseId ? `diagnosis-actions-${diseaseId}` : null;
    const savedItems = storageKey ? localStorage.getItem(storageKey) : null;
    
    if (savedItems) {
      try {
        setItems(JSON.parse(savedItems));
        return;
      } catch {
        // Ignore parse errors
      }
    }

    // Create new items
    setItems(actions.map((text, i) => ({
      id: `action-${i}`,
      text,
      priority: i === 0 ? 'urgent' : i < 3 ? 'important' : 'normal',
      completed: false,
    })));
  }, [actions, diseaseId]);

  // Save to localStorage when items change
  useEffect(() => {
    if (diseaseId && items.length > 0) {
      localStorage.setItem(`diagnosis-actions-${diseaseId}`, JSON.stringify(items));
    }
    
    // Calculate progress
    const completed = items.filter(i => i.completed).length;
    const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
    onProgressChange?.(progress);
  }, [items, diseaseId, onProgressChange]);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const resetAll = () => {
    setItems(prev => prev.map(item => ({ ...item, completed: false })));
  };

  const priorityConfig = {
    urgent: {
      label: { fr: 'Urgent', en: 'Urgent' },
      color: 'bg-destructive/10 text-destructive border-destructive/20',
      icon: Bell,
    },
    important: {
      label: { fr: 'Important', en: 'Important' },
      color: 'bg-warning/10 text-warning border-warning/20',
      icon: Clock,
    },
    normal: {
      label: { fr: 'Normal', en: 'Normal' },
      color: 'bg-muted text-muted-foreground border-border',
      icon: Circle,
    },
  };

  const completedCount = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {language === 'fr' ? 'Plan d\'action' : 'Action Plan'}
          </span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            progress === 100 
              ? "bg-success/10 text-success" 
              : "bg-muted text-muted-foreground"
          )}>
            {completedCount}/{items.length}
          </span>
        </div>
        {completedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetAll} className="text-xs h-7">
            {language === 'fr' ? 'Réinitialiser' : 'Reset'}
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            progress === 100 ? "bg-success" : "bg-primary"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Action items */}
      <div className="space-y-2">
        {items.map((item) => {
          const config = priorityConfig[item.priority];
          return (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left",
                item.completed 
                  ? "bg-success/5 border-success/20 opacity-70" 
                  : config.color
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                item.completed 
                  ? "bg-success border-success" 
                  : "border-current"
              )}>
                {item.completed && <Check className="w-3 h-3 text-success-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm",
                  item.completed && "line-through text-muted-foreground"
                )}>
                  {item.text}
                </p>
                {!item.completed && item.priority !== 'normal' && (
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-medium uppercase mt-1 px-1.5 py-0.5 rounded",
                    item.priority === 'urgent' ? "bg-destructive/20" : "bg-warning/20"
                  )}>
                    {config.label[language as 'fr' | 'en']}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {progress === 100 && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
          <p className="text-sm text-success font-medium">
            {language === 'fr' 
              ? '🎉 Toutes les actions sont complétées !' 
              : '🎉 All actions completed!'}
          </p>
        </div>
      )}
    </div>
  );
}
