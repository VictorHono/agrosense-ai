import { Link, useLocation } from 'react-router-dom';
import { Home, Camera, MessageCircle, BarChart3, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, labelKey: 'nav.home' },
  { path: '/diagnose', icon: Camera, labelKey: 'nav.diagnose' },
  { path: '/assistant', icon: MessageCircle, labelKey: 'nav.assistant' },
  { path: '/harvest', icon: BarChart3, labelKey: 'nav.harvest' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();

  // Hide nav on admin pages
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ path, icon: Icon, labelKey }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  isActive && "scale-110"
                )} 
              />
              <span className="text-[10px] font-medium leading-none">
                {t(labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
