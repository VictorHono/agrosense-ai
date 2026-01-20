import { useState } from 'react';
import { Globe, Bell, Volume2, Smartphone, ChevronRight, LogOut, Shield, Navigation, Edit } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import { LocationSettings } from '@/components/settings/LocationSettings';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useGeolocationContext } from '@/contexts/GeolocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { signOut, isAdmin } = useAuth();
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  
  const { positionSource, locationInfo } = useGeolocationContext();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const SettingRow = ({ 
    icon: Icon, 
    label, 
    children 
  }: { 
    icon: React.ElementType; 
    label: string; 
    children: React.ReactNode 
  }) => (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="font-medium text-foreground">{label}</span>
      </div>
      {children}
    </div>
  );

  return (
    <PageContainer title={t('settings.title')}>
      <div className="space-y-6 fade-in">
        {/* User Profile Card */}
        <div className="relative">
          <ProfileCard 
            profile={profile} 
            onProfileUpdate={refreshProfile}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-4 -translate-y-1/2"
            onClick={() => setEditProfileOpen(true)}
            disabled={profileLoading}
          >
            <Edit className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        {/* Edit Profile Dialog */}
        <EditProfileDialog
          open={editProfileOpen}
          onOpenChange={setEditProfileOpen}
          profile={profile}
          onProfileUpdate={refreshProfile}
        />

        {/* Main Settings */}
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Préférences
          </h3>

          <SettingRow icon={Globe} label={t('settings.language')}>
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setLanguage('fr')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  language === 'fr' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                FR
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  language === 'en' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                EN
              </button>
            </div>
          </SettingRow>

          {/* Location Settings - Collapsible */}
          <Collapsible open={locationOpen} onOpenChange={setLocationOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between py-4 border-b border-border cursor-pointer hover:bg-muted/50 -mx-4 px-4 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <Navigation className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      {language === 'fr' ? 'Localisation' : 'Location'}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {locationInfo?.regionName || (positionSource === 'none' 
                        ? (language === 'fr' ? 'Non configuré' : 'Not configured')
                        : (language === 'fr' ? 'Configuré' : 'Configured')
                      )}
                    </p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${locationOpen ? 'rotate-90' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="py-4 border-b border-border">
              <LocationSettings />
            </CollapsibleContent>
          </Collapsible>

          <SettingRow icon={Bell} label={t('settings.notifications')}>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </SettingRow>

          <SettingRow icon={Volume2} label={t('settings.audio')}>
            <Switch
              checked={audioEnabled}
              onCheckedChange={setAudioEnabled}
            />
          </SettingRow>

          <SettingRow icon={Smartphone} label={t('settings.data_saver')}>
            <Switch
              checked={dataSaver}
              onCheckedChange={setDataSaver}
            />
          </SettingRow>
        </div>

        {/* Admin Link - Only show for admins */}
        {isAdmin && (
          <Link 
            to="/admin" 
            className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium text-foreground">Espace Administrateur</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
        )}

        {/* Help & Support */}
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Aide & Support
          </h3>
          <div className="space-y-2">
            <button className="w-full text-left p-3 rounded-xl hover:bg-muted transition-colors">
              <span className="text-sm font-medium text-foreground">FAQ</span>
            </button>
            <button className="w-full text-left p-3 rounded-xl hover:bg-muted transition-colors">
              <span className="text-sm font-medium text-foreground">Tutoriels</span>
            </button>
            <button className="w-full text-left p-3 rounded-xl hover:bg-muted transition-colors flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Contacter le support</span>
              <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Logout */}
        <Button 
          variant="outline" 
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>

        {/* App Info */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            AgroCamer v1.0.0
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            © 2024 AgroCamer - Cameroun
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
