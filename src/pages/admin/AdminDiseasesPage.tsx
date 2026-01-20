import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, Bug, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Disease {
  id: string;
  name: string;
  name_local: string | null;
  crop_id: string | null;
  severity: string | null;
  description: string | null;
  symptoms: string[] | null;
  causes: string[] | null;
  created_at: string;
}

interface Crop {
  id: string;
  name: string;
}

const SEVERITIES = [
  { value: 'low', label: 'Faible', color: 'bg-success/10 text-success' },
  { value: 'medium', label: 'Modéré', color: 'bg-warning/10 text-warning' },
  { value: 'high', label: 'Élevé', color: 'bg-destructive/10 text-destructive' },
  { value: 'critical', label: 'Critique', color: 'bg-destructive text-destructive-foreground' },
];

export default function AdminDiseasesPage() {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCrop, setFilterCrop] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDisease, setEditingDisease] = useState<Disease | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    name_local: '',
    crop_id: '',
    severity: 'medium',
    description: '',
    symptoms: '',
    causes: '',
  });

  const fetchData = async () => {
    try {
      const [diseasesRes, cropsRes] = await Promise.all([
        supabase.from('diseases').select('*').order('name'),
        supabase.from('crops').select('id, name').order('name'),
      ]);

      if (diseasesRes.error) throw diseasesRes.error;
      if (cropsRes.error) throw cropsRes.error;

      setDiseases(diseasesRes.data || []);
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
      name: '',
      name_local: '',
      crop_id: '',
      severity: 'medium',
      description: '',
      symptoms: '',
      causes: '',
    });
    setEditingDisease(null);
  };

  const openEditDialog = (disease: Disease) => {
    setEditingDisease(disease);
    setFormData({
      name: disease.name,
      name_local: disease.name_local || '',
      crop_id: disease.crop_id || '',
      severity: disease.severity || 'medium',
      description: disease.description || '',
      symptoms: disease.symptoms?.join('\n') || '',
      causes: disease.causes?.join('\n') || '',
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
      const diseaseData = {
        name: formData.name.trim(),
        name_local: formData.name_local.trim() || null,
        crop_id: formData.crop_id || null,
        severity: formData.severity,
        description: formData.description.trim() || null,
        symptoms: formData.symptoms.trim() ? formData.symptoms.split('\n').filter(s => s.trim()) : null,
        causes: formData.causes.trim() ? formData.causes.split('\n').filter(c => c.trim()) : null,
      };

      if (editingDisease) {
        const { error } = await supabase
          .from('diseases')
          .update(diseaseData)
          .eq('id', editingDisease.id);
        
        if (error) throw error;
        toast.success('Maladie mise à jour');
      } else {
        const { error } = await supabase
          .from('diseases')
          .insert(diseaseData);
        
        if (error) throw error;
        toast.success('Maladie ajoutée');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving disease:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette maladie ?')) {
      return;
    }

    try {
      const { error } = await supabase.from('diseases').delete().eq('id', id);
      if (error) throw error;
      toast.success('Maladie supprimée');
      fetchData();
    } catch (error) {
      console.error('Error deleting disease:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getCropName = (cropId: string | null) => {
    if (!cropId) return 'Non assignée';
    return crops.find(c => c.id === cropId)?.name || 'Inconnue';
  };

  const filteredDiseases = diseases.filter(disease => {
    const matchesSearch = disease.name.toLowerCase().includes(search.toLowerCase()) ||
      disease.name_local?.toLowerCase().includes(search.toLowerCase());
    const matchesCrop = filterCrop === 'all' || disease.crop_id === filterCrop;
    return matchesSearch && matchesCrop;
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
          <h1 className="text-2xl font-bold text-foreground">Maladies & Ravageurs</h1>
          <p className="text-muted-foreground">{diseases.length} maladies répertoriées</p>
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
                {editingDisease ? 'Modifier la maladie' : 'Nouvelle maladie'}
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
                    placeholder="Ex: Anthracnose"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_local">Nom local</Label>
                  <Input
                    id="name_local"
                    value={formData.name_local}
                    onChange={(e) => setFormData(prev => ({ ...prev, name_local: e.target.value }))}
                  />
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
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucune</SelectItem>
                      {crops.map(crop => (
                        <SelectItem key={crop.id} value={crop.id}>{crop.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sévérité</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map(sev => (
                        <SelectItem key={sev.value} value={sev.value}>{sev.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de la maladie..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Symptômes (un par ligne)</Label>
                <Textarea
                  value={formData.symptoms}
                  onChange={(e) => setFormData(prev => ({ ...prev, symptoms: e.target.value }))}
                  placeholder="Taches brunes sur les feuilles&#10;Flétrissement&#10;..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Causes (une par ligne)</Label>
                <Textarea
                  value={formData.causes}
                  onChange={(e) => setFormData(prev => ({ ...prev, causes: e.target.value }))}
                  placeholder="Champignon pathogène&#10;Humidité excessive&#10;..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingDisease ? 'Mettre à jour' : 'Ajouter'}
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
        <Select value={filterCrop} onValueChange={setFilterCrop}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par culture" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les cultures</SelectItem>
            {crops.map(crop => (
              <SelectItem key={crop.id} value={crop.id}>{crop.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Diseases List */}
      <div className="space-y-3">
        {filteredDiseases.map(disease => {
          const severity = SEVERITIES.find(s => s.value === disease.severity);
          return (
            <Card key={disease.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                      <Bug className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{disease.name}</h3>
                        {disease.name_local && (
                          <span className="text-xs text-muted-foreground">({disease.name_local})</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${severity?.color || ''}`}>
                          {severity?.label || disease.severity}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Culture: {getCropName(disease.crop_id)}
                      </p>
                      {disease.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{disease.description}</p>
                      )}
                      {disease.symptoms && disease.symptoms.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {disease.symptoms.slice(0, 3).map((symptom, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {symptom}
                            </span>
                          ))}
                          {disease.symptoms.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{disease.symptoms.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(disease)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(disease.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDiseases.length === 0 && (
        <div className="text-center py-12">
          <Bug className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {search || filterCrop !== 'all' ? 'Aucune maladie trouvée' : 'Aucune maladie dans la base de données'}
          </p>
        </div>
      )}
    </div>
  );
}
