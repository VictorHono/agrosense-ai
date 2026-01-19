import { Globe, MapPin, Bell, Volume2, Smartphone, ChevronRight, LogOut, User, Shield } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Region } from '@/types';

const REGIONS: { value: Region; label: string }[] = [
  { value: 'adamaoua', label: 'Adamaoua' },
  { value: 'centre', label: 'Centre' },
  { value: 'est', label: 'Est' },
  { value: 'extreme-nord', label: 'Extrême-Nord' },
  { value: 'littoral', label: 'Littoral' },
  { value: 'nord', label: 'Nord' },
  { value: 'nord-ouest', label: 'Nord-Ouest' },
  { value: 'ouest', label: 'Ouest' },
  { value: 'sud', label: 'Sud' },
  { value: 'sud-ouest', label: 'Sud-Ouest' },
];

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const [notifications, setNotifications] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region>('centre');

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
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
              👨🏾‍🌾
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">Agriculteur</h3>
              <p className="text-sm text-muted-foreground">+237 6XX XXX XXX</p>
            </div>
            <Button variant="ghost" size="icon">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

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

          <SettingRow icon={MapPin} label={t('settings.region')}>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value as Region)}
              className="bg-muted border-0 rounded-lg px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {REGIONS.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </SettingRow>

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

        {/* Admin Link */}
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
        <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10">
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
