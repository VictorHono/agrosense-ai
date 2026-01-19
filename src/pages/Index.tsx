import { Camera, MessageCircle, BarChart3, BookOpen } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { FeatureCard } from '@/components/home/FeatureCard';
import { WeatherWidget } from '@/components/home/WeatherWidget';
import { AlertBanner } from '@/components/home/AlertBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import heroBg from '@/assets/hero-bg.jpg';

const Index = () => {
  const { t } = useLanguage();

  return (
    <PageContainer>
      {/* Hero Section */}
      <div className="relative -mx-4 -mt-4 mb-6 rounded-b-3xl overflow-hidden">
        <div 
          className="h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        >
          <div className="absolute inset-0 hero-gradient" />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
          <h1 className="text-2xl font-bold mb-1 drop-shadow-lg">
            {t('home.welcome')} 🌱
          </h1>
          <p className="text-sm opacity-90 drop-shadow">
            {t('home.subtitle')}
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="mb-4 fade-in">
        <AlertBanner />
      </div>

      {/* Weather Widget */}
      <div className="mb-6 fade-in" style={{ animationDelay: '100ms' }}>
        <WeatherWidget />
      </div>

      {/* Feature Cards */}
      <div className="space-y-3">
        <FeatureCard
          to="/diagnose"
          icon={<Camera className="w-7 h-7" />}
          title={t('home.diagnose.title')}
          description={t('home.diagnose.desc')}
          color="primary"
          delay={200}
        />
        <FeatureCard
          to="/assistant"
          icon={<MessageCircle className="w-7 h-7" />}
          title={t('home.assistant.title')}
          description={t('home.assistant.desc')}
          color="accent"
          delay={300}
        />
        <FeatureCard
          to="/harvest"
          icon={<BarChart3 className="w-7 h-7" />}
          title={t('home.harvest.title')}
          description={t('home.harvest.desc')}
          color="success"
          delay={400}
        />
        <FeatureCard
          to="/tips"
          icon={<BookOpen className="w-7 h-7" />}
          title={t('home.tips.title')}
          description={t('home.tips.desc')}
          color="warning"
          delay={500}
        />
      </div>

      {/* Quick Stats */}
      <div className="mt-6 p-4 rounded-2xl bg-card border border-border fade-in" style={{ animationDelay: '600ms' }}>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Votre activité récente
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-xl bg-primary/5">
            <span className="text-2xl font-bold text-primary">0</span>
            <p className="text-[10px] text-muted-foreground mt-1">Diagnostics</p>
          </div>
          <div className="p-3 rounded-xl bg-accent/10">
            <span className="text-2xl font-bold text-accent-foreground">0</span>
            <p className="text-[10px] text-muted-foreground mt-1">Analyses</p>
          </div>
          <div className="p-3 rounded-xl bg-success/10">
            <span className="text-2xl font-bold text-success">0</span>
            <p className="text-[10px] text-muted-foreground mt-1">Conseils lus</p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Index;
