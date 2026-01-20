import { useState, useEffect } from 'react';
import { BookOpen, Calendar, Leaf, MapPin, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TipCategory {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
  readTime: string;
  crop?: string;
}

export default function TipsPage() {
  const { language } = useLanguage();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('seasonal');
  const [expandedTip, setExpandedTip] = useState<string | null>(null);

  const categories: TipCategory[] = [
    { 
      id: 'seasonal', 
      icon: Calendar, 
      title: language === 'fr' ? 'Saisonniers' : 'Seasonal', 
      description: language === 'fr' ? 'Selon la période' : 'Based on time',
      color: 'bg-primary/10 text-primary'
    },
    { 
      id: 'crops', 
      icon: Leaf, 
      title: language === 'fr' ? 'Cultures' : 'Crops', 
      description: language === 'fr' ? 'Par plante' : 'By plant',
      color: 'bg-success/10 text-success'
    },
    { 
      id: 'regional', 
      icon: MapPin, 
      title: language === 'fr' ? 'Régional' : 'Regional', 
      description: language === 'fr' ? 'Conseils locaux' : 'Local advice',
      color: 'bg-info/10 text-info'
    },
    { 
      id: 'guides', 
      icon: BookOpen, 
      title: language === 'fr' ? 'Guides' : 'Guides', 
      description: language === 'fr' ? 'Étape par étape' : 'Step by step',
      color: 'bg-accent/20 text-accent-foreground'
    },
  ];

  const fetchTips = async (category: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-tips', {
        body: { category, region: 'centre', language },
      });

      if (error) throw error;

      if (data?.success && data?.tips) {
        setTips(data.tips);
      } else {
        setTips([]);
      }
    } catch (err) {
      console.error('Tips fetch error:', err);
      toast.error(
        language === 'fr' 
          ? 'Erreur lors du chargement des conseils' 
          : 'Error loading tips'
      );
      setTips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTips(selectedCategory);
  }, [selectedCategory, language]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setExpandedTip(null);
  };

  const handleRefresh = () => {
    fetchTips(selectedCategory);
  };

  return (
    <PageContainer title={language === 'fr' ? 'Conseils agricoles' : 'Farming tips'}>
      <div className="space-y-6 fade-in">
        {/* Categories */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-3">
            {language === 'fr' ? 'Catégories' : 'Categories'}
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((category) => (
              <button 
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className={`p-3 rounded-xl transition-all ${
                  selectedCategory === category.id 
                    ? 'ring-2 ring-primary shadow-md' 
                    : 'hover:shadow-md'
                } bg-card border border-border`}
              >
                <div className={`w-8 h-8 rounded-lg ${category.color} flex items-center justify-center mx-auto mb-1`}>
                  <category.icon className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-medium text-foreground text-center truncate">
                  {category.title}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Refresh Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-foreground">
            {language === 'fr' ? 'Conseils du jour' : 'Today\'s tips'}
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {language === 'fr' ? 'Actualiser' : 'Refresh'}
          </Button>
        </div>

        {/* Tips List */}
        <section>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">
                {language === 'fr' ? 'Génération des conseils...' : 'Generating tips...'}
              </p>
            </div>
          ) : tips.length === 0 ? (
            <div className="text-center py-12">
              <Leaf className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'fr' ? 'Aucun conseil disponible' : 'No tips available'}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={handleRefresh}
              >
                {language === 'fr' ? 'Réessayer' : 'Try again'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tips.map((tip) => (
                <Card 
                  key={tip.id}
                  className="overflow-hidden transition-all cursor-pointer hover:shadow-md"
                  onClick={() => setExpandedTip(expandedTip === tip.id ? null : tip.id)}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Leaf className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground text-sm line-clamp-2">
                          {tip.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {tip.crop && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                              {tip.crop}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {tip.readTime} {language === 'fr' ? 'de lecture' : 'read'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${
                        expandedTip === tip.id ? 'rotate-90' : ''
                      }`} />
                    </div>
                    
                    {/* Expanded Content */}
                    {expandedTip === tip.id && (
                      <div className="mt-4 pt-4 border-t border-border fade-in">
                        <p className="text-sm text-foreground leading-relaxed">
                          {tip.content}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* AI Generated Note */}
        <p className="text-[10px] text-muted-foreground text-center">
          🤖 {language === 'fr' 
            ? 'Conseils générés par intelligence artificielle et adaptés à votre région' 
            : 'Tips generated by AI and adapted to your region'}
        </p>
      </div>
    </PageContainer>
  );
}
