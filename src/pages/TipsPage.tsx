import { BookOpen, Calendar, Leaf, MapPin, ChevronRight } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';

interface TipCategory {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  count: number;
  color: string;
}

interface Tip {
  id: string;
  title: string;
  category: string;
  readTime: string;
  image?: string;
}

export default function TipsPage() {
  const { language } = useLanguage();

  const categories: TipCategory[] = [
    { 
      id: 'seasonal', 
      icon: Calendar, 
      title: language === 'fr' ? 'Conseils saisonniers' : 'Seasonal tips', 
      description: language === 'fr' ? 'Selon la période' : 'Based on time of year',
      count: 12,
      color: 'bg-primary/10 text-primary'
    },
    { 
      id: 'crops', 
      icon: Leaf, 
      title: language === 'fr' ? 'Par culture' : 'By crop', 
      description: language === 'fr' ? 'Maïs, cacao, manioc...' : 'Corn, cocoa, cassava...',
      count: 45,
      color: 'bg-success/10 text-success'
    },
    { 
      id: 'regional', 
      icon: MapPin, 
      title: language === 'fr' ? 'Par région' : 'By region', 
      description: language === 'fr' ? 'Conseils locaux' : 'Local advice',
      count: 10,
      color: 'bg-info/10 text-info'
    },
    { 
      id: 'guides', 
      icon: BookOpen, 
      title: language === 'fr' ? 'Guides pratiques' : 'Practical guides', 
      description: language === 'fr' ? 'Étape par étape' : 'Step by step',
      count: 8,
      color: 'bg-accent/20 text-accent-foreground'
    },
  ];

  const recentTips: Tip[] = [
    { 
      id: '1', 
      title: language === 'fr' ? 'Préparation du sol pour la saison des pluies' : 'Soil preparation for rainy season',
      category: language === 'fr' ? 'Saisonnier' : 'Seasonal',
      readTime: '5 min'
    },
    { 
      id: '2', 
      title: language === 'fr' ? 'Comment lutter contre les chenilles légionnaires' : 'How to fight fall armyworms',
      category: language === 'fr' ? 'Maïs' : 'Corn',
      readTime: '8 min'
    },
    { 
      id: '3', 
      title: language === 'fr' ? 'Calendrier de plantation du cacao' : 'Cocoa planting calendar',
      category: language === 'fr' ? 'Cacao' : 'Cocoa',
      readTime: '4 min'
    },
    { 
      id: '4', 
      title: language === 'fr' ? 'Techniques de séchage du manioc' : 'Cassava drying techniques',
      category: language === 'fr' ? 'Manioc' : 'Cassava',
      readTime: '6 min'
    },
  ];

  return (
    <PageContainer title={language === 'fr' ? 'Conseils agricoles' : 'Farming tips'}>
      <div className="space-y-6 fade-in">
        {/* Categories */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-3">
            {language === 'fr' ? 'Catégories' : 'Categories'}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => (
              <Card 
                key={category.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl ${category.color} flex items-center justify-center mb-3`}>
                  <category.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{category.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
                <p className="text-xs text-primary font-medium mt-2">{category.count} articles</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Recent Tips */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-3">
            {language === 'fr' ? 'Articles récents' : 'Recent articles'}
          </h2>
          <div className="space-y-3">
            {recentTips.map((tip) => (
              <Card 
                key={tip.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Leaf className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-sm line-clamp-2">
                      {tip.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {tip.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tip.readTime} {language === 'fr' ? 'de lecture' : 'read'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Featured Guide */}
        <section>
          <Card className="p-5 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                {language === 'fr' ? 'Guide vedette' : 'Featured guide'}
              </span>
            </div>
            <h3 className="font-bold text-foreground">
              {language === 'fr' 
                ? 'Guide complet : Cultiver le cacao au Cameroun' 
                : 'Complete guide: Growing cocoa in Cameroon'}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {language === 'fr'
                ? 'De la plantation à la récolte, tout ce que vous devez savoir pour réussir votre culture de cacao.'
                : 'From planting to harvest, everything you need to know to succeed in cocoa farming.'}
            </p>
            <button className="mt-4 text-sm font-semibold text-primary flex items-center gap-1">
              {language === 'fr' ? 'Lire le guide' : 'Read the guide'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </Card>
        </section>
      </div>
    </PageContainer>
  );
}
