import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, FlaskConical, Search, Leaf, Pill } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Treatment {
  id: string;
  name: string;
  type: string;
  disease_id: string | null;
  description: string | null;
  dosage: string | null;
  application_method: string | null;
  availability: string | null;
  price_range: string | null;
  created_at: string;
}

interface Disease {
  id: string;
  name: string;
  crop_id: string | null;
}

const TYPES = [
  { value: 'biological', label: 'Biologique', icon: Leaf, color: 'text-success' },
  { value: 'chemical', label: 'Chimique', icon: Pill, color: 'text-warning' },
  { value: 'cultural', label: 'Culturale', icon: FlaskConical, color: 'text-info' },
];

export default function AdminTreatmentsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'biological',
    disease_id: '',
    description: '',
    dosage: '',
    application_method: '',
    availability: '',
    price_range: '',
  });

  const fetchData = async () => {
    try {
      const [treatmentsRes, diseasesRes] = await Promise.all([
        supabase.from('treatments').select('*').order('name'),
        supabase.from('diseases').select('id, name, crop_id').order('name'),
      ]);

      if (treatmentsRes.error) throw treatmentsRes.error;
      if (diseasesRes.error) throw diseasesRes.error;

      setTreatments(treatmentsRes.data || []);
      setDiseases(diseasesRes.data || []);
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
      type: 'biological',
      disease_id: '',
      description: '',
      dosage: '',
      application_method: '',
      availability: '',
      price_range: '',
    });
    setEditingTreatment(null);
  };

  const openEditDialog = (treatment: Treatment) => {
    setEditingTreatment(treatment);
    setFormData({
      name: treatment.name,
      type: treatment.type,
      disease_id: treatment.disease_id || '',
      description: treatment.description || '',
      dosage: treatment.dosage || '',
      application_method: treatment.application_method || '',
      availability: treatment.availability || '',
      price_range: treatment.price_range || '',
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
      const treatmentData = {
        name: formData.name.trim(),
        type: formData.type,
        disease_id: formData.disease_id || null,
        description: formData.description.trim() || null,
        dosage: formData.dosage.trim() || null,
        application_method: formData.application_method.trim() || null,
        availability: formData.availability.trim() || null,
        price_range: formData.price_range.trim() || null,
      };

      if (editingTreatment) {
        const { error } = await supabase
          .from('treatments')
          .update(treatmentData)
          .eq('id', editingTreatment.id);
        
        if (error) throw error;
        toast.success('Traitement mis à jour');
      } else {
        const { error } = await supabase
          .from('treatments')
          .insert(treatmentData);
        
        if (error) throw error;
        toast.success('Traitement ajouté');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving treatment:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce traitement ?')) {
      return;
    }

    try {
      const { error } = await supabase.from('treatments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Traitement supprimé');
      fetchData();
    } catch (error) {
      console.error('Error deleting treatment:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getDiseaseName = (diseaseId: string | null) => {
    if (!diseaseId) return 'Non assigné';
    return diseases.find(d => d.id === diseaseId)?.name || 'Inconnue';
  };

  const filteredTreatments = treatments.filter(treatment => {
    const matchesSearch = treatment.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || treatment.type === filterType;
    return matchesSearch && matchesType;
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
          <h1 className="text-2xl font-bold text-foreground">Traitements</h1>
          <p className="text-muted-foreground">{treatments.length} traitements disponibles</p>
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
                {editingTreatment ? 'Modifier le traitement' : 'Nouveau traitement'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Bouillie bordelaise"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Maladie associée</Label>
                  <Select
                    value={formData.disease_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, disease_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucune</SelectItem>
                      {diseases.map(disease => (
                        <SelectItem key={disease.id} value={disease.id}>{disease.name}</SelectItem>
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
                  placeholder="Description du traitement..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dosage</Label>
                  <Input
                    value={formData.dosage}
                    onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
                    placeholder="Ex: 10g/L d'eau"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fourchette de prix</Label>
                  <Input
                    value={formData.price_range}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_range: e.target.value }))}
                    placeholder="Ex: 2000-5000 FCFA"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Méthode d'application</Label>
                <Textarea
                  value={formData.application_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, application_method: e.target.value }))}
                  placeholder="Comment appliquer ce traitement..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Disponibilité</Label>
                <Input
                  value={formData.availability}
                  onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.value }))}
                  placeholder="Ex: Agropharmacie locale, marchés"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingTreatment ? 'Mettre à jour' : 'Ajouter'}
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
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Treatments List */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredTreatments.map(treatment => {
          const typeInfo = TYPES.find(t => t.value === treatment.type);
          const TypeIcon = typeInfo?.icon || FlaskConical;
          return (
            <Card key={treatment.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
                      <TypeIcon className={`w-5 h-5 ${typeInfo?.color || ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{treatment.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-muted ${typeInfo?.color || ''}`}>
                          {typeInfo?.label || treatment.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Pour: {getDiseaseName(treatment.disease_id)}
                      </p>
                      {treatment.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{treatment.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {treatment.dosage && (
                          <span className="px-2 py-0.5 rounded bg-info/10 text-info">
                            💊 {treatment.dosage}
                          </span>
                        )}
                        {treatment.price_range && (
                          <span className="px-2 py-0.5 rounded bg-success/10 text-success">
                            💰 {treatment.price_range}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(treatment)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(treatment.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTreatments.length === 0 && (
        <div className="text-center py-12">
          <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {search || filterType !== 'all' ? 'Aucun traitement trouvé' : 'Aucun traitement dans la base de données'}
          </p>
        </div>
      )}
    </div>
  );
}
