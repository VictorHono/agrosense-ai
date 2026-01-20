import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, DollarSign, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MarketPrice {
  id: string;
  crop_id: string | null;
  region: string;
  market_name: string;
  price_min: number;
  price_max: number;
  unit: string;
  currency: string;
  quality_grade: string | null;
  recorded_at: string;
  created_at: string;
}

interface Crop {
  id: string;
  name: string;
}

const REGIONS = [
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

const QUALITY_GRADES = [
  { value: 'A', label: 'Grade A (Premium)' },
  { value: 'B', label: 'Grade B (Standard)' },
  { value: 'C', label: 'Grade C (Économique)' },
];

const UNITS = [
  { value: 'kg', label: 'Kilogramme (kg)' },
  { value: 'sac', label: 'Sac (50kg)' },
  { value: 'tas', label: 'Tas' },
  { value: 'piece', label: 'Pièce' },
  { value: 'regime', label: 'Régime' },
];

export default function AdminMarketPage() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<MarketPrice | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    crop_id: '',
    region: 'centre',
    market_name: '',
    price_min: 0,
    price_max: 0,
    unit: 'kg',
    quality_grade: 'B',
  });

  const fetchData = async () => {
    try {
      const [pricesRes, cropsRes] = await Promise.all([
        supabase.from('market_prices').select('*').order('recorded_at', { ascending: false }),
        supabase.from('crops').select('id, name').order('name'),
      ]);

      if (pricesRes.error) throw pricesRes.error;
      if (cropsRes.error) throw cropsRes.error;

      setPrices(pricesRes.data || []);
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
      crop_id: '',
      region: 'centre',
      market_name: '',
      price_min: 0,
      price_max: 0,
      unit: 'kg',
      quality_grade: 'B',
    });
    setEditingPrice(null);
  };

  const openEditDialog = (price: MarketPrice) => {
    setEditingPrice(price);
    setFormData({
      crop_id: price.crop_id || '',
      region: price.region,
      market_name: price.market_name,
      price_min: price.price_min,
      price_max: price.price_max,
      unit: price.unit,
      quality_grade: price.quality_grade || 'B',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.crop_id || !formData.market_name.trim()) {
      toast.error('La culture et le marché sont obligatoires');
      return;
    }

    if (formData.price_min <= 0 || formData.price_max <= 0) {
      toast.error('Les prix doivent être supérieurs à 0');
      return;
    }

    if (formData.price_min > formData.price_max) {
      toast.error('Le prix minimum doit être inférieur au prix maximum');
      return;
    }

    setSaving(true);
    try {
      const priceData = {
        crop_id: formData.crop_id,
        region: formData.region,
        market_name: formData.market_name.trim(),
        price_min: formData.price_min,
        price_max: formData.price_max,
        unit: formData.unit,
        currency: 'XAF',
        quality_grade: formData.quality_grade,
        recorded_at: new Date().toISOString(),
      };

      if (editingPrice) {
        const { error } = await supabase
          .from('market_prices')
          .update(priceData)
          .eq('id', editingPrice.id);
        
        if (error) throw error;
        toast.success('Prix mis à jour');
      } else {
        const { error } = await supabase
          .from('market_prices')
          .insert(priceData);
        
        if (error) throw error;
        toast.success('Prix ajouté');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving price:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce prix ?')) {
      return;
    }

    try {
      const { error } = await supabase.from('market_prices').delete().eq('id', id);
      if (error) throw error;
      toast.success('Prix supprimé');
      fetchData();
    } catch (error) {
      console.error('Error deleting price:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getCropName = (cropId: string | null) => {
    if (!cropId) return 'Inconnue';
    return crops.find(c => c.id === cropId)?.name || 'Inconnue';
  };

  const formatPrice = (min: number, max: number, unit: string) => {
    if (min === max) {
      return `${min.toLocaleString()} FCFA/${unit}`;
    }
    return `${min.toLocaleString()} - ${max.toLocaleString()} FCFA/${unit}`;
  };

  const filteredPrices = prices.filter(price => {
    const cropName = getCropName(price.crop_id);
    const matchesSearch = cropName.toLowerCase().includes(search.toLowerCase()) ||
      price.market_name.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = filterRegion === 'all' || price.region === filterRegion;
    return matchesSearch && matchesRegion;
  });

  // Group prices by crop for display
  const groupedPrices = filteredPrices.reduce((acc, price) => {
    const cropName = getCropName(price.crop_id);
    if (!acc[cropName]) {
      acc[cropName] = [];
    }
    acc[cropName].push(price);
    return acc;
  }, {} as Record<string, MarketPrice[]>);

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
          <h1 className="text-2xl font-bold text-foreground">Prix du marché</h1>
          <p className="text-muted-foreground">{prices.length} entrées de prix</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="default">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un prix
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPrice ? 'Modifier le prix' : 'Nouveau prix'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Culture *</Label>
                <Select
                  value={formData.crop_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, crop_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une culture" />
                  </SelectTrigger>
                  <SelectContent>
                    {crops.map(crop => (
                      <SelectItem key={crop.id} value={crop.id}>{crop.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Région</Label>
                  <Select
                    value={formData.region}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(region => (
                        <SelectItem key={region.value} value={region.value}>{region.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Marché *</Label>
                  <Input
                    value={formData.market_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, market_name: e.target.value }))}
                    placeholder="Ex: Marché Mokolo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Prix min (FCFA)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.price_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_min: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prix max (FCFA)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.price_max}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_max: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unité</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map(unit => (
                        <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Qualité</Label>
                <Select
                  value={formData.quality_grade}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, quality_grade: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_GRADES.map(grade => (
                      <SelectItem key={grade.value} value={grade.value}>{grade.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingPrice ? 'Mettre à jour' : 'Ajouter'}
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
            placeholder="Rechercher culture ou marché..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Région" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes régions</SelectItem>
            {REGIONS.map(region => (
              <SelectItem key={region.value} value={region.value}>{region.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Prices by Crop */}
      <div className="space-y-6">
        {Object.entries(groupedPrices).map(([cropName, cropPrices]) => (
          <div key={cropName}>
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs">🌱</span>
              {cropName}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {cropPrices.map(price => {
                const region = REGIONS.find(r => r.value === price.region);
                return (
                  <Card key={price.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                            <DollarSign className="w-5 h-5 text-success" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-foreground">
                                {formatPrice(price.price_min, price.price_max, price.unit)}
                              </span>
                              {price.quality_grade && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {price.quality_grade}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {price.market_name} • {region?.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Mis à jour: {new Date(price.recorded_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(price)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(price.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(groupedPrices).length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {search || filterRegion !== 'all' ? 'Aucun prix trouvé' : 'Aucun prix enregistré'}
          </p>
        </div>
      )}
    </div>
  );
}
