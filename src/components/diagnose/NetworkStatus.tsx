import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NetworkStatusProps {
  isOnline: boolean;
  retryCount: number;
  maxRetries: number;
  language: string;
}

export function NetworkStatus({ isOnline, retryCount, maxRetries, language }: NetworkStatusProps) {
  if (isOnline && retryCount === 0) return null;

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium",
      isOnline ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground"
    )}>
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>
              {language === 'fr' 
                ? `Tentative ${retryCount}/${maxRetries}...` 
                : `Attempt ${retryCount}/${maxRetries}...`}
            </span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>
              {language === 'fr' ? 'Hors ligne' : 'Offline'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function OnlineIndicator({ isOnline, language }: { isOnline: boolean; language: string }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs",
      isOnline ? "text-success" : "text-destructive"
    )}>
      {isOnline ? (
        <Wifi className="w-3 h-3" />
      ) : (
        <WifiOff className="w-3 h-3" />
      )}
      <span>{isOnline ? (language === 'fr' ? 'En ligne' : 'Online') : (language === 'fr' ? 'Hors ligne' : 'Offline')}</span>
    </div>
  );
}
