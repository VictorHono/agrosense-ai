import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Alert {
  id: string;
  type: 'warning' | 'info';
  title: string;
  message: string;
}

export function AlertBanner() {
  const [dismissed, setDismissed] = useState(false);

  // Mock alert - would come from API
  const alert: Alert = {
    id: '1',
    type: 'warning',
    title: 'Alerte sanitaire',
    message: 'Présence de chenilles légionnaires signalée dans la région du Centre. Inspectez vos champs de maïs.',
  };

  if (dismissed) return null;

  return (
    <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 flex gap-3">
      <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-foreground">{alert.title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {alert.message}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-6 w-6"
        onClick={() => setDismissed(true)}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
