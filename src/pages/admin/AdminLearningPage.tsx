import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Brain, 
  Search, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Mountain, 
  Calendar,
  TrendingUp,
  Leaf,
  Bug,
  Trash2,
  Eye,
  Filter,
  RefreshCw,
  Pencil,
  Save,
  Plus,
  X
} from 'lucide-react';

interface LearningEntry {
  id: string;
  crop_name: string;
  crop_local_name: string | null;
  disease_name: string | null;
  disease_local_name: string | null;
  is_healthy: boolean;
  confidence: number;
  severity: string | null;
  symptoms: string[];
  causes: string[];
  treatments: Array<{ type: string; name: string; description?: string }>;
  prevention: string[];
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  region: string | null;
  climate_zone: string | null;
  nearest_city: string | null;
  language: string;
  source: string;
  verified: boolean;
  verified_by: string | null;
  verification_notes: string | null;
  use_count: number;
  last_matched_at: string | null;
  created_at: string;
  updated_at: string;
}

interface EditFormState {
  crop_name: string;
  crop_local_name: string;
  disease_name: string;
  disease_local_name: string;
  is_healthy: boolean;
  severity: string;
  symptoms: string[];
  causes: string[];
  treatments: Array<{ type: string; name: string; description?: string }>;
  prevention: string[];
  region: string;
  climate_zone: string;
  verification_notes: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  healthy: 'bg-green-500/10 text-green-600 border-green-500/30',
  low: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  medium: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  high: 'bg-red-500/10 text-red-600 border-red-500/30',
  critical: 'bg-red-700/10 text-red-700 border-red-700/30',
};

export default function AdminLearningPage() {
  const [entries, setEntries] = useState<LearningEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all');
  const [filterHealth, setFilterHealth] = useState<'all' | 'healthy' | 'diseased'>('all');
  const [selectedEntry, setSelectedEntry] = useState<LearningEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [newSymptom, setNewSymptom] = useState('');
  const [newCause, setNewCause] = useState('');
  const [newPrevention, setNewPrevention] = useState('');
  const [newTreatment, setNewTreatment] = useState({ type: 'biological', name: '', description: '' });
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    unverified: 0,
    healthy: 0,
    diseased: 0,
    totalUseCount: 0,
  });

  useEffect(() => {
    fetchEntries();
  }, [filterVerified, filterHealth]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('diagnosis_learning')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterVerified === 'verified') {
        query = query.eq('verified', true);
      } else if (filterVerified === 'unverified') {
        query = query.eq('verified', false);
      }

      if (filterHealth === 'healthy') {
        query = query.eq('is_healthy', true);
      } else if (filterHealth === 'diseased') {
        query = query.eq('is_healthy', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      const parsedData = (data || []).map(entry => ({
        ...entry,
        symptoms: Array.isArray(entry.symptoms) ? entry.symptoms.map(String) : [],
        causes: Array.isArray(entry.causes) ? entry.causes.map(String) : [],
        treatments: Array.isArray(entry.treatments) ? entry.treatments as Array<{ type: string; name: string; description?: string }> : [],
        prevention: Array.isArray(entry.prevention) ? entry.prevention.map(String) : [],
      })) as LearningEntry[];

      setEntries(parsedData);

      const total = parsedData.length;
      const verified = parsedData.filter(e => e.verified).length;
      const healthy = parsedData.filter(e => e.is_healthy).length;
      const totalUseCount = parsedData.reduce((sum, e) => sum + (e.use_count || 0), 0);

      setStats({
        total,
        verified,
        unverified: total - verified,
        healthy,
        diseased: total - healthy,
        totalUseCount,
      });
    } catch (err) {
      console.error('Error fetching learning entries:', err);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (entry: LearningEntry) => {
    setEditForm({
      crop_name: entry.crop_name || '',
      crop_local_name: entry.crop_local_name || '',
      disease_name: entry.disease_name || '',
      disease_local_name: entry.disease_local_name || '',
      is_healthy: entry.is_healthy,
      severity: entry.severity || 'medium',
      symptoms: [...entry.symptoms],
      causes: [...entry.causes],
      treatments: entry.treatments.map(t => ({ ...t })),
      prevention: [...entry.prevention],
      region: entry.region || '',
      climate_zone: entry.climate_zone || '',
      verification_notes: entry.verification_notes || '',
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm(null);
    setNewSymptom('');
    setNewCause('');
    setNewPrevention('');
    setNewTreatment({ type: 'biological', name: '', description: '' });
  };

  const handleSaveEdit = async () => {
    if (!selectedEntry || !editForm) return;

    try {
      const { error } = await supabase
        .from('diagnosis_learning')
        .update({
          crop_name: editForm.crop_name,
          crop_local_name: editForm.crop_local_name || null,
          disease_name: editForm.is_healthy ? null : editForm.disease_name,
          disease_local_name: editForm.is_healthy ? null : editForm.disease_local_name || null,
          is_healthy: editForm.is_healthy,
          severity: editForm.is_healthy ? 'healthy' : editForm.severity,
          symptoms: editForm.symptoms,
          causes: editForm.causes,
          treatments: editForm.treatments,
          prevention: editForm.prevention,
          region: editForm.region || null,
          climate_zone: editForm.climate_zone || null,
          verification_notes: editForm.verification_notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedEntry.id);

      if (error) throw error;

      toast.success('Entrée mise à jour avec succès');
      cancelEditing();
      setSelectedEntry(null);
      fetchEntries();
    } catch (err) {
      console.error('Error updating entry:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const addSymptom = () => {
    if (!editForm || !newSymptom.trim()) return;
    setEditForm({ ...editForm, symptoms: [...editForm.symptoms, newSymptom.trim()] });
    setNewSymptom('');
  };

  const removeSymptom = (index: number) => {
    if (!editForm) return;
    setEditForm({ ...editForm, symptoms: editForm.symptoms.filter((_, i) => i !== index) });
  };

  const addCause = () => {
    if (!editForm || !newCause.trim()) return;
    setEditForm({ ...editForm, causes: [...editForm.causes, newCause.trim()] });
    setNewCause('');
  };

  const removeCause = (index: number) => {
    if (!editForm) return;
    setEditForm({ ...editForm, causes: editForm.causes.filter((_, i) => i !== index) });
  };

  const addPrevention = () => {
    if (!editForm || !newPrevention.trim()) return;
    setEditForm({ ...editForm, prevention: [...editForm.prevention, newPrevention.trim()] });
    setNewPrevention('');
  };

  const removePrevention = (index: number) => {
    if (!editForm) return;
    setEditForm({ ...editForm, prevention: editForm.prevention.filter((_, i) => i !== index) });
  };

  const addTreatment = () => {
    if (!editForm || !newTreatment.name.trim()) return;
    setEditForm({ 
      ...editForm, 
      treatments: [...editForm.treatments, { ...newTreatment, name: newTreatment.name.trim() }] 
    });
    setNewTreatment({ type: 'biological', name: '', description: '' });
  };

  const removeTreatment = (index: number) => {
    if (!editForm) return;
    setEditForm({ ...editForm, treatments: editForm.treatments.filter((_, i) => i !== index) });
  };

  const handleVerify = async (entryId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('diagnosis_learning')
        .update({
          verified,
          verification_notes: verificationNotes || null,
          verified_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', entryId);

      if (error) throw error;

      toast.success(verified ? 'Diagnostic vérifié' : 'Vérification retirée');
      setSelectedEntry(null);
      setVerificationNotes('');
      fetchEntries();
    } catch (err) {
      console.error('Error verifying entry:', err);
      toast.error('Erreur lors de la vérification');
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) return;

    try {
      const { error } = await supabase
        .from('diagnosis_learning')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      toast.success('Entrée supprimée');
      fetchEntries();
    } catch (err) {
      console.error('Error deleting entry:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      entry.crop_name?.toLowerCase().includes(search) ||
      entry.disease_name?.toLowerCase().includes(search) ||
      entry.region?.toLowerCase().includes(search) ||
      entry.nearest_city?.toLowerCase().includes(search)
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Système d'Apprentissage IA
          </h1>
          <p className="text-muted-foreground">
            Gérez, éditez et validez les diagnostics pour entraîner l'IA
          </p>
        </div>
        <Button onClick={fetchEntries} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Diagnostics</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
            <div className="text-xs text-muted-foreground">Vérifiés</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.unverified}</div>
            <div className="text-xs text-muted-foreground">Non Vérifiés</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.healthy}</div>
            <div className="text-xs text-muted-foreground">Plantes Saines</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/5 to-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.diseased}</div>
            <div className="text-xs text-muted-foreground">Maladies</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalUseCount}</div>
            <div className="text-xs text-muted-foreground">Utilisations</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par culture, maladie, région..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterVerified} onValueChange={(v: 'all' | 'verified' | 'unverified') => setFilterVerified(v)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Vérification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="verified">Vérifiés</SelectItem>
                <SelectItem value="unverified">Non vérifiés</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterHealth} onValueChange={(v: 'all' | 'healthy' | 'diseased') => setFilterHealth(v)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Leaf className="w-4 h-4 mr-2" />
                <SelectValue placeholder="État" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="healthy">Saines</SelectItem>
                <SelectItem value="diseased">Malades</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Entries List */}
      <div className="space-y-3">
        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold">Aucune entrée trouvée</h3>
              <p className="text-sm text-muted-foreground">
                Les diagnostics apparaîtront ici au fur et à mesure que les utilisateurs utilisent l'outil
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map((entry) => (
            <Card 
              key={entry.id} 
              className={`transition-all hover:shadow-md ${entry.verified ? 'border-l-4 border-l-green-500' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.is_healthy ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          <Leaf className="w-3 h-3 mr-1" />
                          Saine
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                          <Bug className="w-3 h-3 mr-1" />
                          Malade
                        </Badge>
                      )}
                      {entry.verified && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Vérifié
                        </Badge>
                      )}
                      {entry.severity && (
                        <Badge variant="outline" className={SEVERITY_COLORS[entry.severity] || ''}>
                          {entry.severity}
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {entry.use_count}x utilisé
                      </Badge>
                    </div>

                    <div className="flex items-start gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {entry.crop_name}
                          {entry.crop_local_name && (
                            <span className="text-muted-foreground font-normal text-sm ml-2">
                              ({entry.crop_local_name})
                            </span>
                          )}
                        </h3>
                        {entry.disease_name && (
                          <p className="text-sm text-red-600">
                            {entry.disease_name}
                            {entry.disease_local_name && ` (${entry.disease_local_name})`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      {entry.region && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {entry.region}
                          {entry.nearest_city && ` - ${entry.nearest_city}`}
                        </span>
                      )}
                      {entry.altitude && (
                        <span className="flex items-center gap-1">
                          <Mountain className="w-3 h-3" />
                          {Math.round(entry.altitude)}m
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(entry.created_at)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-muted rounded">
                        Confiance: {entry.confidence}%
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEntry(entry);
                        setIsEditing(false);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Détails
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEntry(entry);
                        startEditing(entry);
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Éditer
                    </Button>
                    {!entry.verified && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedEntry(entry);
                          setVerificationNotes('');
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Vérifier
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail/Edit Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => { setSelectedEntry(null); cancelEditing(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Pencil className="w-5 h-5 text-primary" />
                      Éditer le diagnostic
                    </>
                  ) : (
                    <>
                      {selectedEntry.is_healthy ? (
                        <Leaf className="w-5 h-5 text-green-600" />
                      ) : (
                        <Bug className="w-5 h-5 text-red-600" />
                      )}
                      {selectedEntry.crop_name}
                      {selectedEntry.verified && (
                        <Badge className="ml-2 bg-green-500">Vérifié</Badge>
                      )}
                    </>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {isEditing 
                    ? "Modifiez les informations puis cliquez sur Enregistrer"
                    : `Diagnostic du ${formatDate(selectedEntry.created_at)}`
                  }
                </DialogDescription>
              </DialogHeader>

              {isEditing && editForm ? (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom de la culture *</Label>
                      <Input
                        value={editForm.crop_name}
                        onChange={(e) => setEditForm({ ...editForm, crop_name: e.target.value })}
                        placeholder="Ex: Manioc"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom local</Label>
                      <Input
                        value={editForm.crop_local_name}
                        onChange={(e) => setEditForm({ ...editForm, crop_local_name: e.target.value })}
                        placeholder="Ex: Cassava"
                      />
                    </div>
                  </div>

                  {/* Health Status */}
                  <div className="space-y-2">
                    <Label>État de santé</Label>
                    <Select 
                      value={editForm.is_healthy ? 'healthy' : 'diseased'} 
                      onValueChange={(v) => setEditForm({ ...editForm, is_healthy: v === 'healthy' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="healthy">🌿 Plante saine</SelectItem>
                        <SelectItem value="diseased">🦠 Plante malade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Disease Info (if not healthy) */}
                  {!editForm.is_healthy && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nom de la maladie</Label>
                          <Input
                            value={editForm.disease_name}
                            onChange={(e) => setEditForm({ ...editForm, disease_name: e.target.value })}
                            placeholder="Ex: Mosaïque du manioc"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nom local de la maladie</Label>
                          <Input
                            value={editForm.disease_local_name}
                            onChange={(e) => setEditForm({ ...editForm, disease_local_name: e.target.value })}
                            placeholder="Nom vernaculaire"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Gravité</Label>
                        <Select 
                          value={editForm.severity} 
                          onValueChange={(v) => setEditForm({ ...editForm, severity: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">🟢 Faible</SelectItem>
                            <SelectItem value="medium">🟡 Modéré</SelectItem>
                            <SelectItem value="high">🟠 Élevé</SelectItem>
                            <SelectItem value="critical">🔴 Critique</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Région</Label>
                      <Input
                        value={editForm.region}
                        onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                        placeholder="Ex: Centre"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Zone climatique</Label>
                      <Input
                        value={editForm.climate_zone}
                        onChange={(e) => setEditForm({ ...editForm, climate_zone: e.target.value })}
                        placeholder="Ex: Tropical humide"
                      />
                    </div>
                  </div>

                  {/* Symptoms */}
                  {!editForm.is_healthy && (
                    <div className="space-y-2">
                      <Label>Symptômes</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={newSymptom}
                          onChange={(e) => setNewSymptom(e.target.value)}
                          placeholder="Ajouter un symptôme..."
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSymptom())}
                        />
                        <Button type="button" size="sm" onClick={addSymptom}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {editForm.symptoms.map((s, i) => (
                          <Badge key={i} variant="secondary" className="gap-1">
                            {s}
                            <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeSymptom(i)} />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Causes */}
                  {!editForm.is_healthy && (
                    <div className="space-y-2">
                      <Label>Causes</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={newCause}
                          onChange={(e) => setNewCause(e.target.value)}
                          placeholder="Ajouter une cause..."
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCause())}
                        />
                        <Button type="button" size="sm" onClick={addCause}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {editForm.causes.map((c, i) => (
                          <Badge key={i} variant="secondary" className="gap-1">
                            {c}
                            <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removeCause(i)} />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Treatments */}
                  {!editForm.is_healthy && (
                    <div className="space-y-2">
                      <Label>Traitements</Label>
                      <div className="flex gap-2 mb-2 flex-wrap">
                        <Select 
                          value={newTreatment.type} 
                          onValueChange={(v) => setNewTreatment({ ...newTreatment, type: v })}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="biological">🌿 Biologique</SelectItem>
                            <SelectItem value="chemical">🧪 Chimique</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          className="flex-1"
                          value={newTreatment.name}
                          onChange={(e) => setNewTreatment({ ...newTreatment, name: e.target.value })}
                          placeholder="Nom du traitement..."
                        />
                        <Button type="button" size="sm" onClick={addTreatment}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {editForm.treatments.map((t, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                            <Badge variant="outline">
                              {t.type === 'biological' ? '🌿 Bio' : '🧪 Chimique'}
                            </Badge>
                            <span className="flex-1 text-sm">{t.name}</span>
                            <X className="w-4 h-4 cursor-pointer text-destructive" onClick={() => removeTreatment(i)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prevention */}
                  <div className="space-y-2">
                    <Label>Prévention / Conseils</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newPrevention}
                        onChange={(e) => setNewPrevention(e.target.value)}
                        placeholder="Ajouter un conseil..."
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPrevention())}
                      />
                      <Button type="button" size="sm" onClick={addPrevention}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editForm.prevention.map((p, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {p}
                          <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => removePrevention(i)} />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Verification Notes */}
                  <div className="space-y-2">
                    <Label>Notes de vérification</Label>
                    <Textarea
                      value={editForm.verification_notes}
                      onChange={(e) => setEditForm({ ...editForm, verification_notes: e.target.value })}
                      placeholder="Ajoutez des notes ou corrections..."
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Disease Info */}
                  {selectedEntry.disease_name && (
                    <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                      <h4 className="font-semibold text-red-600 mb-2">Maladie Détectée</h4>
                      <p className="font-medium">{selectedEntry.disease_name}</p>
                      {selectedEntry.disease_local_name && (
                        <p className="text-sm text-muted-foreground">Nom local: {selectedEntry.disease_local_name}</p>
                      )}
                      <p className="text-sm mt-2">
                        Gravité: <Badge className={SEVERITY_COLORS[selectedEntry.severity || ''] || ''}>{selectedEntry.severity}</Badge>
                      </p>
                    </div>
                  )}

                  {/* Location */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Localisation
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedEntry.region && <p>Région: {selectedEntry.region}</p>}
                      {selectedEntry.nearest_city && <p>Ville: {selectedEntry.nearest_city}</p>}
                      {selectedEntry.altitude && <p>Altitude: {Math.round(selectedEntry.altitude)}m</p>}
                      {selectedEntry.climate_zone && <p>Zone: {selectedEntry.climate_zone}</p>}
                      {selectedEntry.latitude && selectedEntry.longitude && (
                        <p className="col-span-2 text-xs text-muted-foreground">
                          GPS: {selectedEntry.latitude.toFixed(4)}, {selectedEntry.longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Symptoms */}
                  {selectedEntry.symptoms?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Symptômes</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {selectedEntry.symptoms.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Treatments */}
                  {selectedEntry.treatments?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Traitements</h4>
                      <div className="space-y-2">
                        {selectedEntry.treatments.map((t, i) => (
                          <div key={i} className="text-sm p-2 rounded bg-muted/50">
                            <Badge variant="outline" className="mb-1">
                              {t.type === 'biological' ? '🌿 Bio' : '🧪 Chimique'}
                            </Badge>
                            <p>{t.name}</p>
                            {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prevention */}
                  {selectedEntry.prevention?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Prévention</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {selectedEntry.prevention.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h4 className="font-semibold mb-2">Statistiques</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{selectedEntry.confidence}%</div>
                        <div className="text-xs text-muted-foreground">Confiance IA</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">{selectedEntry.use_count}</div>
                        <div className="text-xs text-muted-foreground">Utilisations</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">
                          {selectedEntry.last_matched_at 
                            ? new Date(selectedEntry.last_matched_at).toLocaleDateString('fr-FR')
                            : '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">Dernière utilisation</div>
                      </div>
                    </div>
                  </div>

                  {/* Verification */}
                  {!selectedEntry.verified && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Notes de vérification (optionnel)</h4>
                      <Textarea
                        placeholder="Ajoutez des notes ou corrections..."
                        value={verificationNotes}
                        onChange={(e) => setVerificationNotes(e.target.value)}
                      />
                    </div>
                  )}

                  {selectedEntry.verification_notes && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <h4 className="font-semibold text-green-600 mb-1">Notes du vérificateur</h4>
                      <p className="text-sm">{selectedEntry.verification_notes}</p>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={cancelEditing}>
                      Annuler
                    </Button>
                    <Button onClick={handleSaveEdit}>
                      <Save className="w-4 h-4 mr-1" />
                      Enregistrer
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => { setSelectedEntry(null); cancelEditing(); }}>
                      Fermer
                    </Button>
                    <Button variant="outline" onClick={() => startEditing(selectedEntry)}>
                      <Pencil className="w-4 h-4 mr-1" />
                      Éditer
                    </Button>
                    {selectedEntry.verified ? (
                      <Button
                        variant="destructive"
                        onClick={() => handleVerify(selectedEntry.id, false)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Retirer la vérification
                      </Button>
                    ) : (
                      <Button onClick={() => handleVerify(selectedEntry.id, true)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Valider ce diagnostic
                      </Button>
                    )}
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
