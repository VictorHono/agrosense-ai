import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, BookOpen, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
  language: string;
  priority: number | null;
  region: string | null;
  season: string | null;
  crop_id: string | null;
  created_at: string;
}

interface Crop {
  id: string;
  name: string;
}

const CATEGORIES = [
  { value: 'preparation', label: 'Préparation du sol' },
  { value: 'planting', label: 'Plantation' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'fertilization', label: 'Fertilisation' },
  { value: 'pest_control', label: 'Lutte antiparasitaire' },
  { value: 'harvest', label: 'Récolte' },
  { value: 'storage', label: 'Stockage' },
  { value: 'marketing', label: 'Commercialisation' },
  { value: 'general', label: 'Général' },
];

const SEASONS = [
  { value: '', label: 'Toutes saisons' },
  { value: 'dry', label: 'Saison sèche' },
  { value: 'rainy', label: 'Saison des pluies' },
  { value: 'harmattan', label: 'Harmattan' },
];

const REGIONS = [
  { value: '', label: 'Toutes régions' },
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

export default function AdminTipsPage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTip, setEditingTip] = useState<Tip | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    language: 'fr',
    priority: 0,
    region: '',
    season: '',
    crop_id: '',
  });

  const fetchData = async () => {
    try {
      const [tipsRes, cropsRes] = await Promise.all([
        supabase.from('farming_tips').select('*').order('priority', { ascending: false }),
        supabase.from('crops').select('id, name').order('name'),
      ]);

      if (tipsRes.error) throw tipsRes.error;
      if (cropsRes.error) throw cropsRes.error;

      setTips(tipsRes.data || []);
      setCrops(cropsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general',
      language: 'fr',
      priority: 0,
      region: '',
      season: '',
      crop_id: '',
    });
    setEditingTip(null);
  };

  const openEditDialog = (tip: Tip) => {
    setEditingTip(tip);
    setFormData({
      title: tip.title,
      content: tip.content,
      category: tip.category,
      language: tip.language,
      priority: tip.priority || 0,
      region: tip.region || '',
      season: tip.season || '',
      crop_id: tip.crop_id || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Le titre et le contenu sont obligatoires');
      return;
    }

    setSaving(true);
    try {
      const tipData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        language: formData.language,
        priority: formData.priority,
        region: formData.region || null,
        season: formData.season || null,
        crop_id: formData.crop_id || null,
      };

      if (editingTip) {
        const { error } = await supabase
          .from('farming_tips')
          .update(tipData)
          .eq('id', editingTip.id);
        
        if (error) throw error;
        toast.success('Conseil mis à jour');
      } else {
        const { error } = await supabase
          .from('farming_tips')
          .insert(tipData);
        
        if (error) throw error;
        toast.success('Conseil ajouté');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving tip:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce conseil ?')) {
      return;
    }

    try {
      const { error } = await supabase.from('farming_tips').delete().eq('id', id);
      if (error) throw error;
      toast.success('Conseil supprimé');
      fetchData();
    } catch (error) {
      console.error('Error deleting tip:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getCropName = (cropId: string | null) => {
    if (!cropId) return null;
    return crops.find(c => c.id === cropId)?.name;
  };

  const filteredTips = tips.filter(tip => {
    const matchesSearch = tip.title.toLowerCase().includes(search.toLowerCase()) ||
      tip.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || tip.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conseils agricoles</h1>
          <p className="text-muted-foreground">{tips.length} conseils dans la base</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="default">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTip ? 'Modifier le conseil' : 'Nouveau conseil'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Préparation du sol pour le maïs"
                />
              </div>

              <div className="space-y-2">
                <Label>Contenu *</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Détails du conseil agricole..."
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Langue</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Région</Label>
                  <Select
                    value={formData.region}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(region => (
                        <SelectItem key={region.value} value={region.value}>{region.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Saison</Label>
                  <Select
                    value={formData.season}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, season: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SEASONS.map(season => (
                        <SelectItem key={season.value} value={season.value}>{season.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Culture associée</Label>
                  <Select
                    value={formData.crop_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, crop_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes les cultures</SelectItem>
                      {crops.map(crop => (
                        <SelectItem key={crop.id} value={crop.id}>{crop.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priorité (0-100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingTip ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tips List */}
      <div className="space-y-3">
        {filteredTips.map(tip => {
          const category = CATEGORIES.find(c => c.value === tip.category);
          const cropName = getCropName(tip.crop_id);
          return (
            <Card key={tip.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground">{tip.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {category?.label}
                        </span>
                        {tip.priority && tip.priority > 50 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                            ⭐ Priorité {tip.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{tip.content}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {cropName && <span>🌱 {cropName}</span>}
                        {tip.region && <span>📍 {REGIONS.find(r => r.value === tip.region)?.label}</span>}
                        {tip.season && <span>🗓️ {SEASONS.find(s => s.value === tip.season)?.label}</span>}
                        <span>🌐 {tip.language.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(tip)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(tip.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTips.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {search || filterCategory !== 'all' ? 'Aucun conseil trouvé' : 'Aucun conseil dans la base'}
          </p>
        </div>
      )}
    </div>
  );
}
