import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, Bell, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Alert {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: string | null;
  region: string | null;
  crop_id: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface Crop {
  id: string;
  name: string;
}

const TYPES = [
  { value: 'weather', label: 'Météo' },
  { value: 'disease', label: 'Maladie' },
  { value: 'pest', label: 'Ravageur' },
  { value: 'market', label: 'Marché' },
  { value: 'info', label: 'Information' },
];

const SEVERITIES = [
  { value: 'low', label: 'Faible', color: 'bg-success/10 text-success border-success/20' },
  { value: 'medium', label: 'Modéré', color: 'bg-warning/10 text-warning border-warning/20' },
  { value: 'high', label: 'Élevé', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  { value: 'critical', label: 'Critique', color: 'bg-destructive text-destructive-foreground border-destructive' },
];

const REGIONS = [
  { value: '', label: 'Toutes les régions' },
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

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    severity: 'medium',
    region: '',
    crop_id: '',
    is_active: true,
    expires_at: '',
  });

  const fetchData = async () => {
    try {
      const [alertsRes, cropsRes] = await Promise.all([
        supabase.from('agricultural_alerts').select('*').order('created_at', { ascending: false }),
        supabase.from('crops').select('id, name').order('name'),
      ]);

      if (alertsRes.error) throw alertsRes.error;
      if (cropsRes.error) throw cropsRes.error;

      setAlerts(alertsRes.data || []);
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
      message: '',
      type: 'info',
      severity: 'medium',
      region: '',
      crop_id: '',
      is_active: true,
      expires_at: '',
    });
    setEditingAlert(null);
  };

  const openEditDialog = (alert: Alert) => {
    setEditingAlert(alert);
    setFormData({
      title: alert.title,
      message: alert.message,
      type: alert.type,
      severity: alert.severity || 'medium',
      region: alert.region || '',
      crop_id: alert.crop_id || '',
      is_active: alert.is_active,
      expires_at: alert.expires_at ? new Date(alert.expires_at).toISOString().slice(0, 16) : '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Le titre et le message sont obligatoires');
      return;
    }

    setSaving(true);
    try {
      const alertData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        severity: formData.severity,
        region: formData.region || null,
        crop_id: formData.crop_id || null,
        is_active: formData.is_active,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      };

      if (editingAlert) {
        const { error } = await supabase
          .from('agricultural_alerts')
          .update(alertData)
          .eq('id', editingAlert.id);
        
        if (error) throw error;
        toast.success('Alerte mise à jour');
      } else {
        const { error } = await supabase
          .from('agricultural_alerts')
          .insert(alertData);
        
        if (error) throw error;
        toast.success('Alerte créée');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving alert:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (alert: Alert) => {
    try {
      const { error } = await supabase
        .from('agricultural_alerts')
        .update({ is_active: !alert.is_active })
        .eq('id', alert.id);
      
      if (error) throw error;
      toast.success(alert.is_active ? 'Alerte désactivée' : 'Alerte activée');
      fetchData();
    } catch (error) {
      console.error('Error toggling alert:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette alerte ?')) {
      return;
    }

    try {
      const { error } = await supabase.from('agricultural_alerts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Alerte supprimée');
      fetchData();
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(search.toLowerCase()) ||
      alert.message.toLowerCase().includes(search.toLowerCase());
    const matchesActive = filterActive === 'all' || 
      (filterActive === 'active' && alert.is_active) ||
      (filterActive === 'inactive' && !alert.is_active);
    return matchesSearch && matchesActive;
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
          <h1 className="text-2xl font-bold text-foreground">Alertes agricoles</h1>
          <p className="text-muted-foreground">
            {alerts.filter(a => a.is_active).length} actives sur {alerts.length} alertes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="default">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle alerte
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAlert ? 'Modifier l\'alerte' : 'Nouvelle alerte'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Alerte chenille légionnaire"
                />
              </div>

              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Détails de l'alerte..."
                  rows={4}
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
                  <Label>Culture concernée</Label>
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
              </div>

              <div className="space-y-2">
                <Label>Date d'expiration (optionnel)</Label>
                <Input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-border"
                />
                <Label htmlFor="is_active" className="cursor-pointer">Alerte active</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingAlert ? 'Mettre à jour' : 'Créer'}
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
        <Select value={filterActive} onValueChange={setFilterActive}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="active">Actives</SelectItem>
            <SelectItem value="inactive">Inactives</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map(alert => {
          const severity = SEVERITIES.find(s => s.value === alert.severity);
          const type = TYPES.find(t => t.value === alert.type);
          return (
            <Card key={alert.id} className={`group ${!alert.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${severity?.color || 'bg-muted'}`}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground">{alert.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${severity?.color || ''}`}>
                          {severity?.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {type?.label}
                        </span>
                        {!alert.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {alert.region && <span>📍 {REGIONS.find(r => r.value === alert.region)?.label}</span>}
                        <span>📅 {new Date(alert.created_at).toLocaleDateString('fr-FR')}</span>
                        {alert.expires_at && (
                          <span>⏰ Expire: {new Date(alert.expires_at).toLocaleDateString('fr-FR')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => toggleActive(alert)}
                    >
                      {alert.is_active ? (
                        <ToggleRight className="w-5 h-5 text-success" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(alert)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(alert.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {search || filterActive !== 'all' ? 'Aucune alerte trouvée' : 'Aucune alerte créée'}
          </p>
        </div>
      )}
    </div>
  );
}
