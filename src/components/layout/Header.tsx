import { Bell, Wifi, WifiOff, User, Shield, Globe, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface HeaderProps {
  title?: string;
  showNotifications?: boolean;
}

export function Header({ title, showNotifications = true }: HeaderProps) {
  const { language, setLanguage, availableLanguages, currentLanguageInfo } = useLanguage();
  const { user, isAdmin, signOut, loading } = useAuth();
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

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode);
    const lang = availableLanguages.find(l => l.code === langCode);
    if (lang) {
      toast.success(`Langue changée: ${lang.native_name}`);
    }
  };

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

          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 px-2">
                <span className="text-base">{currentLanguageInfo?.flag || '🌍'}</span>
                <span className="text-xs font-semibold hidden sm:inline">
                  {currentLanguageInfo?.native_name || language.toUpperCase()}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Choisir la langue
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableLanguages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{lang.flag}</span>
                    <div>
                      <p className="font-medium">{lang.native_name}</p>
                      <p className="text-xs text-muted-foreground">{lang.name}</p>
                    </div>
                  </div>
                  {language === lang.code && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          {showNotifications && (
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </Button>
          )}

          {/* User Menu */}
          {!loading && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <User className="w-5 h-5" />
                    {isAdmin && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                        <Shield className="w-2 h-2 text-primary-foreground" />
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {isAdmin ? 'Administrateur' : 'Utilisateur'}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <Shield className="w-4 h-4 mr-2" />
                        Administration
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      Paramètres
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">
                  <User className="w-4 h-4 mr-1" />
                  Connexion
                </Link>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
