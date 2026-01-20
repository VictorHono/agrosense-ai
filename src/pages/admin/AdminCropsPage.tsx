import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, Leaf, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Crop {
  id: string;
  name: string;
  name_local: string | null;
  category: string;
  description: string | null;
  regions: string[] | null;
  growing_season: string[] | null;
  created_at: string;
}

const CATEGORIES = [
  { value: 'fruit', label: 'Fruit' },
  { value: 'vegetable', label: 'Légume' },
  { value: 'cereal', label: 'Céréale' },
  { value: 'tuber', label: 'Tubercule' },
  { value: 'legume', label: 'Légumineuse' },
  { value: 'cash_crop', label: 'Culture de rente' },
  { value: 'leafy', label: 'Légume-feuille' },
  { value: 'spice', label: 'Épice' },
];

const REGIONS = [
  'adamaoua', 'centre', 'est', 'extreme-nord', 'littoral',
  'nord', 'nord-ouest', 'ouest', 'sud', 'sud-ouest'
];

const SEASONS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 
                 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export default function AdminCropsPage() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    name_local: '',
    category: 'vegetable',
    description: '',
    regions: [] as string[],
    growing_season: [] as string[],
  });

  const fetchCrops = async () => {
    try {
      const { data, error } = await supabase
        .from('crops')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCrops(data || []);
    } catch (error) {
      console.error('Error fetching crops:', error);
      toast.error('Erreur lors du chargement des cultures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrops();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      name_local: '',
      category: 'vegetable',
      description: '',
      regions: [],
      growing_season: [],
    });
    setEditingCrop(null);
  };

  const openEditDialog = (crop: Crop) => {
    setEditingCrop(crop);
    setFormData({
      name: crop.name,
      name_local: crop.name_local || '',
      category: crop.category,
      description: crop.description || '',
      regions: crop.regions || [],
      growing_season: crop.growing_season || [],
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }

    setSaving(true);
    try {
      const cropData = {
        name: formData.name.trim(),
        name_local: formData.name_local.trim() || null,
        category: formData.category,
        description: formData.description.trim() || null,
        regions: formData.regions.length > 0 ? formData.regions : null,
        growing_season: formData.growing_season.length > 0 ? formData.growing_season : null,
      };

      if (editingCrop) {
        const { error } = await supabase
          .from('crops')
          .update(cropData)
          .eq('id', editingCrop.id);
        
        if (error) throw error;
        toast.success('Culture mise à jour');
      } else {
        const { error } = await supabase
          .from('crops')
          .insert(cropData);
        
        if (error) throw error;
        toast.success('Culture ajoutée');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCrops();
    } catch (error) {
      console.error('Error saving crop:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette culture ? Les maladies associées seront également affectées.')) {
      return;
    }

    try {
      const { error } = await supabase.from('crops').delete().eq('id', id);
      if (error) throw error;
      toast.success('Culture supprimée');
      fetchCrops();
    } catch (error) {
      console.error('Error deleting crop:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredCrops = crops.filter(crop => 
    crop.name.toLowerCase().includes(search.toLowerCase()) ||
    crop.name_local?.toLowerCase().includes(search.toLowerCase()) ||
    crop.category.toLowerCase().includes(search.toLowerCase())
  );

  const toggleRegion = (region: string) => {
    setFormData(prev => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region]
    }));
  };

  const toggleSeason = (season: string) => {
    setFormData(prev => ({
      ...prev,
      growing_season: prev.growing_season.includes(season)
        ? prev.growing_season.filter(s => s !== season)
        : [...prev.growing_season, season]
    }));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des cultures</h1>
          <p className="text-muted-foreground">{crops.length} cultures dans la base de données</p>
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
                {editingCrop ? 'Modifier la culture' : 'Nouvelle culture'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Avocat"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_local">Nom local</Label>
                  <Input
                    id="name_local"
                    value={formData.name_local}
                    onChange={(e) => setFormData(prev => ({ ...prev, name_local: e.target.value }))}
                    placeholder="Ex: Piya"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de la culture..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Régions de culture</Label>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map(region => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => toggleRegion(region)}
                      className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                        formData.regions.includes(region)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Saison de culture</Label>
                <div className="flex flex-wrap gap-2">
                  {SEASONS.map(season => (
                    <button
                      key={season}
                      type="button"
                      onClick={() => toggleSeason(season)}
                      className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                        formData.growing_season.includes(season)
                          ? 'bg-success text-success-foreground border-success'
                          : 'bg-background border-border hover:border-success'
                      }`}
                    >
                      {season.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingCrop ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une culture..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Crops Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCrops.map(crop => (
          <Card key={crop.id} className="relative group">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{crop.name}</CardTitle>
                    {crop.name_local && (
                      <p className="text-xs text-muted-foreground">{crop.name_local}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(crop)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(crop.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {CATEGORIES.find(c => c.value === crop.category)?.label || crop.category}
                  </span>
                </div>
                {crop.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{crop.description}</p>
                )}
                {crop.regions && crop.regions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {crop.regions.slice(0, 3).map(region => (
                      <span key={region} className="text-[10px] px-1.5 py-0.5 rounded bg-info/10 text-info">
                        {region}
                      </span>
                    ))}
                    {crop.regions.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{crop.regions.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCrops.length === 0 && (
        <div className="text-center py-12">
          <Leaf className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {search ? 'Aucune culture trouvée' : 'Aucune culture dans la base de données'}
          </p>
        </div>
      )}
    </div>
  );
}
