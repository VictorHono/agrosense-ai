import { useEffect, useState, useCallback } from 'react';
import { 
  Globe, FileText, Loader2, Languages, Plus, Edit2, Trash2, 
  Check, X, Search, Copy, Sparkles, Download, Upload, AlertCircle,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppLanguage {
  id: string;
  code: string;
  name: string;
  native_name: string;
  flag: string;
  is_active: boolean;
  is_default: boolean;
  translation_progress: number;
  created_at: string;
}

interface Translation {
  id: string;
  language_code: string;
  translation_key: string;
  translation_value: string;
  category: string;
  created_at: string;
}

interface TranslationCategory {
  name: string;
  keys: Translation[];
  isOpen: boolean;
}

export default function AdminLanguagesPage() {
  const [languages, setLanguages] = useState<AppLanguage[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [showEditLanguage, setShowEditLanguage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddTranslation, setShowAddTranslation] = useState(false);
  const [showAITranslate, setShowAITranslate] = useState(false);
  
  // Form states
  const [newLanguage, setNewLanguage] = useState({
    code: '',
    name: '',
    native_name: '',
    flag: '🌍',
    is_active: true
  });
  const [editingLanguage, setEditingLanguage] = useState<AppLanguage | null>(null);
  const [deletingLanguage, setDeletingLanguage] = useState<AppLanguage | null>(null);
  const [newTranslation, setNewTranslation] = useState({
    key: '',
    value: '',
    category: 'general'
  });
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<Record<string, boolean>>({});

  // Fetch languages
  const fetchLanguages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_languages')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setLanguages(data || []);
      
      if (data && data.length > 0 && !selectedLanguage) {
        setSelectedLanguage(data[0].code);
      }
    } catch (error) {
      console.error('Error fetching languages:', error);
      toast.error('Erreur lors du chargement des langues');
    }
  }, [selectedLanguage]);

  // Fetch translations for selected language
  const fetchTranslations = useCallback(async (langCode: string) => {
    try {
      const { data, error } = await supabase
        .from('app_translations')
        .select('*')
        .eq('language_code', langCode)
        .order('category')
        .order('translation_key');

      if (error) throw error;
      setTranslations(data || []);
      
      // Update progress
      await updateTranslationProgress(langCode, data?.length || 0);
    } catch (error) {
      console.error('Error fetching translations:', error);
    }
  }, []);

  // Update translation progress
  const updateTranslationProgress = async (langCode: string, count: number) => {
    try {
      // Get total keys from French (reference)
      const { data: frData } = await supabase
        .from('app_translations')
        .select('id')
        .eq('language_code', 'fr');
      
      const totalKeys = frData?.length || 1;
      const progress = Math.round((count / totalKeys) * 100);
      
      await supabase
        .from('app_languages')
        .update({ translation_progress: Math.min(progress, 100) })
        .eq('code', langCode);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchLanguages();
      setLoading(false);
    };
    init();
  }, [fetchLanguages]);

  useEffect(() => {
    if (selectedLanguage) {
      fetchTranslations(selectedLanguage);
    }
  }, [selectedLanguage, fetchTranslations]);

  // Add new language
  const handleAddLanguage = async () => {
    if (!newLanguage.code || !newLanguage.name || !newLanguage.native_name) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_languages')
        .insert([{
          code: newLanguage.code.toLowerCase(),
          name: newLanguage.name,
          native_name: newLanguage.native_name,
          flag: newLanguage.flag,
          is_active: newLanguage.is_active,
          translation_progress: 0
        }]);

      if (error) throw error;

      toast.success('Langue ajoutée avec succès!');
      setShowAddLanguage(false);
      setNewLanguage({ code: '', name: '', native_name: '', flag: '🌍', is_active: true });
      fetchLanguages();
    } catch (error: any) {
      console.error('Error adding language:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout de la langue');
    } finally {
      setSaving(false);
    }
  };

  // Update language
  const handleUpdateLanguage = async () => {
    if (!editingLanguage) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_languages')
        .update({
          name: editingLanguage.name,
          native_name: editingLanguage.native_name,
          flag: editingLanguage.flag,
          is_active: editingLanguage.is_active
        })
        .eq('id', editingLanguage.id);

      if (error) throw error;

      toast.success('Langue mise à jour!');
      setShowEditLanguage(false);
      setEditingLanguage(null);
      fetchLanguages();
    } catch (error: any) {
      console.error('Error updating language:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  // Delete language
  const handleDeleteLanguage = async () => {
    if (!deletingLanguage) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_languages')
        .delete()
        .eq('id', deletingLanguage.id);

      if (error) throw error;

      toast.success('Langue supprimée!');
      setShowDeleteConfirm(false);
      setDeletingLanguage(null);
      if (selectedLanguage === deletingLanguage.code) {
        setSelectedLanguage(languages.find(l => l.code !== deletingLanguage.code)?.code || null);
      }
      fetchLanguages();
    } catch (error: any) {
      console.error('Error deleting language:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  // Add translation
  const handleAddTranslation = async () => {
    if (!selectedLanguage || !newTranslation.key || !newTranslation.value) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_translations')
        .insert([{
          language_code: selectedLanguage,
          translation_key: newTranslation.key,
          translation_value: newTranslation.value,
          category: newTranslation.category
        }]);

      if (error) throw error;

      toast.success('Traduction ajoutée!');
      setShowAddTranslation(false);
      setNewTranslation({ key: '', value: '', category: 'general' });
      fetchTranslations(selectedLanguage);
    } catch (error: any) {
      console.error('Error adding translation:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  };

  // Update translation
  const handleUpdateTranslation = async (translation: Translation, newValue: string) => {
    try {
      const { error } = await supabase
        .from('app_translations')
        .update({ translation_value: newValue })
        .eq('id', translation.id);

      if (error) throw error;

      setTranslations(prev => 
        prev.map(t => t.id === translation.id ? { ...t, translation_value: newValue } : t)
      );
      toast.success('Traduction mise à jour!');
    } catch (error: any) {
      console.error('Error updating translation:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Delete translation
  const handleDeleteTranslation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('app_translations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTranslations(prev => prev.filter(t => t.id !== id));
      toast.success('Traduction supprimée!');
      if (selectedLanguage) {
        updateTranslationProgress(selectedLanguage, translations.length - 1);
      }
    } catch (error: any) {
      console.error('Error deleting translation:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Copy translations from reference language
  const handleCopyFromReference = async () => {
    if (!selectedLanguage) return;

    setSaving(true);
    try {
      // Get French translations as reference
      const { data: frTranslations, error: frError } = await supabase
        .from('app_translations')
        .select('translation_key, translation_value, category')
        .eq('language_code', 'fr');

      if (frError) throw frError;

      // Get existing keys for this language
      const existingKeys = new Set(translations.map(t => t.translation_key));

      // Filter out already existing keys
      const newTranslations = frTranslations
        ?.filter(t => !existingKeys.has(t.translation_key))
        .map(t => ({
          language_code: selectedLanguage,
          translation_key: t.translation_key,
          translation_value: `[${selectedLanguage.toUpperCase()}] ${t.translation_value}`,
          category: t.category
        })) || [];

      if (newTranslations.length === 0) {
        toast.info('Toutes les clés sont déjà présentes');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('app_translations')
        .insert(newTranslations);

      if (error) throw error;

      toast.success(`${newTranslations.length} clés de traduction copiées!`);
      fetchTranslations(selectedLanguage);
    } catch (error: any) {
      console.error('Error copying translations:', error);
      toast.error('Erreur lors de la copie');
    } finally {
      setSaving(false);
    }
  };

  // AI Translation
  const handleAITranslate = async () => {
    if (!selectedLanguage) return;
    
    const lang = languages.find(l => l.code === selectedLanguage);
    if (!lang) return;

    setSaving(true);
    setShowAITranslate(true);

    try {
      // Get untranslated keys (those starting with language code marker)
      const untranslated = translations.filter(t => 
        t.translation_value.startsWith(`[${selectedLanguage.toUpperCase()}]`)
      );

      if (untranslated.length === 0) {
        toast.info('Aucune traduction à effectuer');
        setSaving(false);
        setShowAITranslate(false);
        return;
      }

      // Call AI translation edge function
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: {
          translations: untranslated.map(t => ({
            id: t.id,
            key: t.translation_key,
            sourceText: t.translation_value.replace(`[${selectedLanguage.toUpperCase()}] `, ''),
            targetLanguage: lang.name,
            targetNativeName: lang.native_name
          }))
        }
      });

      if (error) throw error;

      if (data?.translations) {
        // Update all translated entries
        for (const item of data.translations) {
          await supabase
            .from('app_translations')
            .update({ translation_value: item.translatedText })
            .eq('id', item.id);
        }

        toast.success(`${data.translations.length} traductions IA effectuées!`);
        fetchTranslations(selectedLanguage);
      }
    } catch (error: any) {
      console.error('Error with AI translation:', error);
      toast.error('Erreur lors de la traduction IA');
    } finally {
      setSaving(false);
      setShowAITranslate(false);
    }
  };

  // Export translations
  const handleExport = () => {
    if (!selectedLanguage || translations.length === 0) return;

    const exportData = translations.reduce((acc, t) => {
      acc[t.translation_key] = t.translation_value;
      return acc;
    }, {} as Record<string, string>);

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations_${selectedLanguage}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export réussi!');
  };

  // Import translations
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedLanguage) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const entries = Object.entries(data).map(([key, value]) => ({
        language_code: selectedLanguage,
        translation_key: key,
        translation_value: value as string,
        category: key.split('.')[0] || 'general'
      }));

      // Upsert translations
      const { error } = await supabase
        .from('app_translations')
        .upsert(entries, { onConflict: 'language_code,translation_key' });

      if (error) throw error;

      toast.success(`${entries.length} traductions importées!`);
      fetchTranslations(selectedLanguage);
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Erreur lors de l\'import');
    }
  };

  // Group translations by category
  const getGroupedTranslations = () => {
    const filtered = translations.filter(t => 
      !searchQuery || 
      t.translation_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.translation_value.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped: Record<string, Translation[]> = {};
    filtered.forEach(t => {
      const cat = t.category || 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(t);
    });

    return grouped;
  };

  const groupedTranslations = getGroupedTranslations();
  const categories = Object.keys(groupedTranslations);

  const selectedLang = languages.find(l => l.code === selectedLanguage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="w-7 h-7 text-primary" />
            Gestion des Langues
          </h1>
          <p className="text-muted-foreground">
            Système multilingue complet - Ajoutez des langues locales pour toucher tous les agriculteurs
          </p>
        </div>
        <Button onClick={() => setShowAddLanguage(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Ajouter une langue
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Langues actives</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {languages.filter(l => l.is_active).length}
                </p>
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
                <p className="text-sm text-muted-foreground">Total langues</p>
                <p className="text-2xl font-bold text-foreground mt-1">{languages.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-info/10 text-info">
                <Languages className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Traductions</p>
                <p className="text-2xl font-bold text-foreground mt-1">{translations.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-success/10 text-success">
                <FileText className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Catégories</p>
                <p className="text-2xl font-bold text-foreground mt-1">{categories.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-warning/10 text-warning">
                <Copy className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="languages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="languages" className="gap-2">
            <Globe className="w-4 h-4" />
            Langues
          </TabsTrigger>
          <TabsTrigger value="translations" className="gap-2">
            <FileText className="w-4 h-4" />
            Traductions
          </TabsTrigger>
        </TabsList>

        {/* Languages Tab */}
        <TabsContent value="languages" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {languages.map((lang) => (
              <Card 
                key={lang.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedLanguage === lang.code ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedLanguage(lang.code)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{lang.flag}</span>
                      <div>
                        <h3 className="font-semibold text-foreground">{lang.native_name}</h3>
                        <p className="text-sm text-muted-foreground">{lang.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {lang.is_default && (
                        <Badge variant="default" className="text-xs">Par défaut</Badge>
                      )}
                      {!lang.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactif</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">{lang.translation_progress}%</span>
                    </div>
                    <Progress value={lang.translation_progress} className="h-2" />
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingLanguage(lang);
                        setShowEditLanguage(true);
                      }}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Modifier
                    </Button>
                    {!lang.is_default && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingLanguage(lang);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Translations Tab */}
        <TabsContent value="translations" className="space-y-4">
          {selectedLanguage && selectedLang ? (
            <>
              {/* Selected Language Header */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{selectedLang.flag}</span>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{selectedLang.native_name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedLang.name} • {translations.length} traductions</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopyFromReference} disabled={saving}>
                        <Copy className="w-4 h-4 mr-1" />
                        Copier clés FR
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleAITranslate} disabled={saving}>
                        <Sparkles className="w-4 h-4 mr-1" />
                        Traduire IA
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-1" />
                        Exporter
                      </Button>
                      <label>
                        <Button variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="w-4 h-4 mr-1" />
                            Importer
                          </span>
                        </Button>
                        <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                      </label>
                      <Button size="sm" onClick={() => setShowAddTranslation(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une traduction..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Translations by Category */}
              <div className="space-y-4">
                {categories.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold text-foreground mb-2">Aucune traduction</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Commencez par copier les clés depuis le français ou ajoutez manuellement.
                      </p>
                      <div className="flex justify-center gap-2">
                        <Button variant="outline" onClick={handleCopyFromReference}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copier depuis FR
                        </Button>
                        <Button onClick={() => setShowAddTranslation(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Ajouter manuellement
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  categories.map(category => (
                    <Collapsible key={category} defaultOpen={true}>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base capitalize flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                {category}
                                <Badge variant="secondary" className="ml-2">
                                  {groupedTranslations[category]?.length || 0}
                                </Badge>
                              </CardTitle>
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              {groupedTranslations[category]?.map(translation => (
                                <TranslationRow
                                  key={translation.id}
                                  translation={translation}
                                  onUpdate={handleUpdateTranslation}
                                  onDelete={handleDeleteTranslation}
                                />
                              ))}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))
                )}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Languages className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Sélectionnez une langue</h3>
                <p className="text-sm text-muted-foreground">
                  Choisissez une langue dans l'onglet "Langues" pour voir et modifier ses traductions.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Language Dialog */}
      <Dialog open={showAddLanguage} onOpenChange={setShowAddLanguage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une nouvelle langue</DialogTitle>
            <DialogDescription>
              Ajoutez une langue locale camerounaise pour rendre l'application accessible à tous.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code langue *</Label>
                <Input
                  id="code"
                  placeholder="ex: ghomala"
                  value={newLanguage.code}
                  onChange={(e) => setNewLanguage({ ...newLanguage, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag">Emoji drapeau</Label>
                <Input
                  id="flag"
                  placeholder="🌍"
                  value={newLanguage.flag}
                  onChange={(e) => setNewLanguage({ ...newLanguage, flag: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nom en anglais *</Label>
              <Input
                id="name"
                placeholder="ex: Ghomala"
                value={newLanguage.name}
                onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="native_name">Nom natif *</Label>
              <Input
                id="native_name"
                placeholder="ex: Ghɔmálá'"
                value={newLanguage.native_name}
                onChange={(e) => setNewLanguage({ ...newLanguage, native_name: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={newLanguage.is_active}
                onCheckedChange={(checked) => setNewLanguage({ ...newLanguage, is_active: checked })}
              />
              <Label htmlFor="is_active">Activer immédiatement</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLanguage(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddLanguage} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Language Dialog */}
      <Dialog open={showEditLanguage} onOpenChange={setShowEditLanguage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la langue</DialogTitle>
          </DialogHeader>
          {editingLanguage && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code langue</Label>
                  <Input value={editingLanguage.code} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_flag">Emoji drapeau</Label>
                  <Input
                    id="edit_flag"
                    value={editingLanguage.flag}
                    onChange={(e) => setEditingLanguage({ ...editingLanguage, flag: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_name">Nom en anglais</Label>
                <Input
                  id="edit_name"
                  value={editingLanguage.name}
                  onChange={(e) => setEditingLanguage({ ...editingLanguage, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_native_name">Nom natif</Label>
                <Input
                  id="edit_native_name"
                  value={editingLanguage.native_name}
                  onChange={(e) => setEditingLanguage({ ...editingLanguage, native_name: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="edit_is_active"
                  checked={editingLanguage.is_active}
                  onCheckedChange={(checked) => setEditingLanguage({ ...editingLanguage, is_active: checked })}
                />
                <Label htmlFor="edit_is_active">Langue active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditLanguage(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateLanguage} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la langue ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera la langue "{deletingLanguage?.native_name}" et toutes ses traductions associées.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLanguage} className="bg-destructive text-destructive-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Translation Dialog */}
      <Dialog open={showAddTranslation} onOpenChange={setShowAddTranslation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une traduction</DialogTitle>
            <DialogDescription>
              Langue: {selectedLang?.native_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="trans_key">Clé de traduction *</Label>
              <Input
                id="trans_key"
                placeholder="ex: home.welcome"
                value={newTranslation.key}
                onChange={(e) => setNewTranslation({ ...newTranslation, key: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trans_value">Valeur *</Label>
              <Textarea
                id="trans_value"
                placeholder="La traduction dans la langue sélectionnée"
                value={newTranslation.value}
                onChange={(e) => setNewTranslation({ ...newTranslation, value: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trans_category">Catégorie</Label>
              <Input
                id="trans_category"
                placeholder="ex: navigation, home, common"
                value={newTranslation.category}
                onChange={(e) => setNewTranslation({ ...newTranslation, category: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTranslation(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddTranslation} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Translation Progress Dialog */}
      <Dialog open={showAITranslate} onOpenChange={setShowAITranslate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              Traduction IA en cours...
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              L'IA traduit vos contenus vers {selectedLang?.native_name}...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Cela peut prendre quelques secondes.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Translation Row Component
function TranslationRow({ 
  translation, 
  onUpdate, 
  onDelete 
}: { 
  translation: Translation;
  onUpdate: (t: Translation, value: string) => void;
  onDelete: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(translation.translation_value);

  const handleSave = () => {
    if (value !== translation.translation_value) {
      onUpdate(translation, value);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(translation.translation_value);
    setIsEditing(false);
  };

  const needsTranslation = translation.translation_value.startsWith('[');

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${
      needsTranslation ? 'bg-warning/5 border-warning/20' : 'bg-muted/30 border-border'
    }`}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono text-muted-foreground mb-1">{translation.translation_key}</p>
        {isEditing ? (
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-[60px]"
            autoFocus
          />
        ) : (
          <p className={`text-sm ${needsTranslation ? 'text-warning' : 'text-foreground'}`}>
            {translation.translation_value}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isEditing ? (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSave}>
              <Check className="w-4 h-4 text-success" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancel}>
              <X className="w-4 h-4 text-destructive" />
            </Button>
          </>
        ) : (
          <>
            {needsTranslation && (
              <Badge variant="outline" className="text-xs text-warning border-warning/50 mr-1">
                À traduire
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(translation.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
