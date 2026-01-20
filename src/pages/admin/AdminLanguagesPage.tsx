import { useEffect, useState } from 'react';
import { Globe, FileText, Loader2, Languages } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface LanguageStats {
  language: string;
  tipCount: number;
}

interface TipByLanguage {
  id: string;
  title: string;
  language: string;
  category: string;
  created_at: string;
}

export default function AdminLanguagesPage() {
  const [languageStats, setLanguageStats] = useState<LanguageStats[]>([]);
  const [tipsByLanguage, setTipsByLanguage] = useState<TipByLanguage[]>([]);
  const [totalTips, setTotalTips] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLanguageData = async () => {
      try {
        const { data: tips, error } = await supabase
          .from('farming_tips')
          .select('id, title, language, category, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (tips) {
          setTotalTips(tips.length);
          setTipsByLanguage(tips);

          // Group by language
          const langMap = new Map<string, number>();
          tips.forEach(tip => {
            langMap.set(tip.language, (langMap.get(tip.language) || 0) + 1);
          });

          const stats: LanguageStats[] = Array.from(langMap.entries())
            .map(([language, tipCount]) => ({ language, tipCount }))
            .sort((a, b) => b.tipCount - a.tipCount);

          setLanguageStats(stats);
        }
      } catch (error) {
        console.error('Error fetching language data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLanguageData();
  }, []);

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      'fr': 'Français',
      'en': 'English',
      'ewondo': 'Ewondo',
      'fulfulde': 'Fulfulde',
      'bamileke': 'Bamiléké',
      'duala': 'Duala',
      'basaa': 'Basaa'
    };
    return names[code] || code;
  };

  const getLanguageFlag = (code: string) => {
    const flags: Record<string, string> = {
      'fr': '🇫🇷',
      'en': '🇬🇧',
      'ewondo': '🇨🇲',
      'fulfulde': '🇨🇲',
      'bamileke': '🇨🇲',
      'duala': '🇨🇲',
      'basaa': '🇨🇲'
    };
    return flags[code] || '🌍';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Langues</h1>
        <p className="text-muted-foreground">Distribution des contenus par langue (données réelles de farming_tips)</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Langues actives</p>
                <p className="text-2xl font-bold text-foreground mt-1">{languageStats.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                <Globe className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total conseils</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalTips}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-info/10 text-info">
                <FileText className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Moy. conseils/langue</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {languageStats.length > 0 ? Math.round(totalTips / languageStats.length) : 0}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-success/10 text-success">
                <Languages className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Language Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Distribution par langue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {languageStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun conseil enregistré. Ajoutez des conseils avec différentes langues.
              </p>
            ) : (
              <div className="space-y-4">
                {languageStats.map((stat) => (
                  <div key={stat.language} className="flex items-center gap-3">
                    <span className="text-2xl">{getLanguageFlag(stat.language)}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-foreground">{getLanguageName(stat.language)}</span>
                        <span className="text-muted-foreground">{stat.tipCount} conseils</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min((stat.tipCount / totalTips) * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {((stat.tipCount / totalTips) * 100).toFixed(1)}% du contenu
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tips by Language */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-info" />
              Conseils récents par langue
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            {tipsByLanguage.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun conseil disponible
              </p>
            ) : (
              <div className="space-y-3">
                {tipsByLanguage.slice(0, 15).map((tip) => (
                  <div key={tip.id} className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
                    <span className="text-lg shrink-0">{getLanguageFlag(tip.language)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tip.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {tip.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(tip.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
