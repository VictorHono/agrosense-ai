import { Bell, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface HeaderProps {
  title?: string;
  showNotifications?: boolean;
}

export function Header({ title, showNotifications = true }: HeaderProps) {
  const { language, setLanguage } = useLanguage();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border safe-top">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        {/* Logo & Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">🌱</span>
          </div>
          <span className="font-bold text-foreground">
            {title || 'AgroCamer'}
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Online Status */}
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            isOnline 
              ? 'bg-success/10 text-success' 
              : 'bg-destructive/10 text-destructive'
          }`}>
            {isOnline ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
          </div>

          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
            className="text-xs font-semibold px-2"
          >
            {language.toUpperCase()}
          </Button>

          {/* Notifications */}
          {showNotifications && (
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
