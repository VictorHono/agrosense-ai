import { useState, useEffect } from 'react';
import { 
  Plus, RefreshCw, Trash2, Edit2, Eye, EyeOff, Play, 
  AlertTriangle, Zap, Loader2, Brain, Key, Shield,
  MessageCircle, Clock, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIApiKey {
  id: string;
  provider_name: string;
  provider_type: string;
  api_key_encrypted: string;
  display_name: string;
  endpoint_url: string | null;
  model_name: string | null;
  is_active: boolean;
  is_vision_capable: boolean;
  priority_order: number;
  last_status_code: number | null;
  last_status_message: string | null;
  last_checked_at: string | null;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  session_id: string;
}

interface AIStats {
  totalResponses: number;
  totalUserMessages: number;
  avgResponseLength: number;
  topTopics: { topic: string; count: number }[];
  recentInteractions: ChatMessage[];
}

const PROVIDER_TYPES = [
  { value: 'lovable', label: 'Lovable AI', visionCapable: true },
  { value: 'gemini', label: 'Google Gemini', visionCapable: true },
  { value: 'huggingface', label: 'Hugging Face', visionCapable: false },
  { value: 'openai', label: 'OpenAI', visionCapable: true },
  { value: 'anthropic', label: 'Anthropic Claude', visionCapable: true },
  { value: 'custom', label: 'Personnalisé', visionCapable: false },
];

const DEFAULT_ENDPOINTS: Record<string, string> = {
  lovable: 'https://ai.gateway.lovable.dev/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
  huggingface: 'https://router.huggingface.co/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
};

// Modèles disponibles par provider - l'utilisateur peut aussi saisir un modèle personnalisé
// Modèles disponibles par provider - tous les modèles Gemini 2.0 sont gratuits avec rate limits
const AVAILABLE_MODELS: Record<string, { value: string; label: string; vision: boolean; free?: boolean }[]> = {
  lovable: [
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommandé)', vision: true },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', vision: true },
    { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', vision: true },
    { value: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro Preview', vision: true },
    { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', vision: true },
    { value: 'openai/gpt-5', label: 'GPT-5', vision: true },
    { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', vision: true },
    { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano', vision: true },
  ],
  gemini: [
    { value: 'gemini-2.0-flash-lite', label: '✅ Gemini 2.0 Flash Lite (Gratuit, rapide)', vision: true, free: true },
    { value: 'gemini-2.0-flash', label: '✅ Gemini 2.0 Flash (Gratuit)', vision: true, free: true },
    { value: 'gemini-1.5-flash', label: '✅ Gemini 1.5 Flash (Gratuit)', vision: true, free: true },
    { value: 'gemini-1.5-flash-8b', label: '✅ Gemini 1.5 Flash 8B (Gratuit)', vision: true, free: true },
    { value: 'gemini-1.5-pro', label: '✅ Gemini 1.5 Pro (Gratuit)', vision: true, free: true },
    { value: 'gemini-pro-vision', label: 'Gemini Pro Vision (Ancien)', vision: true, free: true },
  ],
  huggingface: [
    { value: 'meta-llama/Llama-3.1-8B-Instruct', label: 'Llama 3.1 8B', vision: false },
    { value: 'meta-llama/Llama-3.2-11B-Vision-Instruct', label: 'Llama 3.2 11B Vision', vision: true },
    { value: 'mistralai/Mistral-7B-Instruct-v0.3', label: 'Mistral 7B', vision: false },
    { value: 'Qwen/Qwen2-VL-7B-Instruct', label: 'Qwen2 VL 7B (Vision)', vision: true },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o', vision: true },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', vision: true },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', vision: true },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', vision: false },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', vision: true },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', vision: true },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', vision: true },
  ],
  custom: [],
};

// Modèles par défaut
const DEFAULT_MODELS: Record<string, string> = {
  lovable: 'google/gemini-2.5-flash',
  gemini: 'gemini-2.0-flash-lite', // Modèle gratuit et rapide
  huggingface: 'meta-llama/Llama-3.1-8B-Instruct',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-20241022',
};

export default function AdminAIPage() {
  const [apiKeys, setApiKeys] = useState<AIApiKey[]>([]);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedKey, setSelectedKey] = useState<AIApiKey | null>(null);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  // Form state
  const [formData, setFormData] = useState({
    provider_name: '',
    provider_type: 'gemini',
    api_key: '',
    display_name: '',
    endpoint_url: '',
    model_name: '',
    is_active: true,
    is_vision_capable: true,
    priority_order: 100,
    useCustomModel: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchApiKeys(), fetchAIStats()]);
    setLoading(false);
  };

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_api_keys')
        .select('*')
        .order('priority_order', { ascending: true });

      if (error) {
        console.error('Error fetching API keys:', error);
        // Table might not exist yet, don't show error
        return;
      }
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const fetchAIStats = async () => {
    try {
      const { data: chats, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (chats) {
        const userMessages = chats.filter(c => c.role === 'user');
        const assistantMessages = chats.filter(c => c.role === 'assistant');

        const topicKeywords: Record<string, string[]> = {
          'Maladies': ['maladie', 'infection', 'parasite', 'champignon', 'virus', 'symptôme'],
          'Traitements': ['traitement', 'soigner', 'guérir', 'pesticide', 'fongicide', 'remède'],
          'Cultures': ['planter', 'semer', 'culture', 'récolte', 'rendement', 'plantation'],
          'Météo': ['météo', 'pluie', 'soleil', 'température', 'saison', 'climat'],
          'Prix': ['prix', 'marché', 'vendre', 'coût', 'acheter', 'FCFA'],
          'Sol': ['sol', 'terre', 'engrais', 'fertilisant', 'compost', 'irrigation']
        };

        const topicCounts: Record<string, number> = {};
        
        userMessages.forEach(msg => {
          const content = msg.content.toLowerCase();
          Object.entries(topicKeywords).forEach(([topic, keywords]) => {
            if (keywords.some(kw => content.includes(kw))) {
              topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            }
          });
        });

        const topTopics = Object.entries(topicCounts)
          .map(([topic, count]) => ({ topic, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const avgLength = assistantMessages.length > 0
          ? Math.round(assistantMessages.reduce((sum, m) => sum + m.content.length, 0) / assistantMessages.length)
          : 0;

        setStats({
          totalResponses: assistantMessages.length,
          totalUserMessages: userMessages.length,
          avgResponseLength: avgLength,
          topTopics,
          recentInteractions: chats.slice(0, 20)
        });
      }
    } catch (error) {
      console.error('Error fetching AI stats:', error);
    }
  };

  const handleProviderTypeChange = (type: string) => {
    const provider = PROVIDER_TYPES.find(p => p.value === type);
    const defaultModel = DEFAULT_MODELS[type] || '';
    let endpoint = DEFAULT_ENDPOINTS[type] || '';
    
    // Pour Gemini, remplacer {model} par le modèle par défaut
    if (type === 'gemini' && defaultModel) {
      endpoint = endpoint.replace('{model}', defaultModel);
    }
    
    setFormData({
      ...formData,
      provider_type: type,
      endpoint_url: endpoint,
      model_name: defaultModel,
      is_vision_capable: provider?.visionCapable || false,
      useCustomModel: false,
    });
  };

  const handleModelChange = (model: string) => {
    const models = AVAILABLE_MODELS[formData.provider_type] || [];
    const selectedModel = models.find(m => m.value === model);
    
    let endpoint = formData.endpoint_url;
    // Pour Gemini, mettre à jour l'endpoint avec le nouveau modèle
    if (formData.provider_type === 'gemini') {
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    }
    
    setFormData({
      ...formData,
      model_name: model,
      endpoint_url: endpoint,
      is_vision_capable: selectedModel?.vision ?? formData.is_vision_capable,
    });
  };

  const handleAddKey = async () => {
    try {
      const encrypted = btoa(formData.api_key);
      
      const { error } = await supabase
        .from('ai_api_keys')
        .insert({
          provider_name: formData.provider_name || formData.provider_type,
          provider_type: formData.provider_type,
          api_key_encrypted: encrypted,
          display_name: formData.display_name,
          endpoint_url: formData.endpoint_url || null,
          model_name: formData.model_name || null,
          is_active: formData.is_active,
          is_vision_capable: formData.is_vision_capable,
          priority_order: formData.priority_order,
        });

      if (error) throw error;

      toast.success('Clé API ajoutée avec succès');
      setShowAddDialog(false);
      resetForm();
      fetchApiKeys();
    } catch (error) {
      console.error('Error adding API key:', error);
      toast.error('Erreur lors de l\'ajout de la clé');
    }
  };

  const handleUpdateKey = async () => {
    if (!selectedKey) return;

    try {
      const updateData: Record<string, unknown> = {
        provider_name: formData.provider_name,
        provider_type: formData.provider_type,
        display_name: formData.display_name,
        endpoint_url: formData.endpoint_url || null,
        model_name: formData.model_name || null,
        is_active: formData.is_active,
        is_vision_capable: formData.is_vision_capable,
        priority_order: formData.priority_order,
      };

      if (formData.api_key) {
        updateData.api_key_encrypted = btoa(formData.api_key);
      }

      const { error } = await supabase
        .from('ai_api_keys')
        .update(updateData)
        .eq('id', selectedKey.id);

      if (error) throw error;

      toast.success('Clé API mise à jour');
      setShowEditDialog(false);
      resetForm();
      fetchApiKeys();
    } catch (error) {
      console.error('Error updating API key:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteKey = async () => {
    if (!selectedKey) return;

    try {
      const { error } = await supabase
        .from('ai_api_keys')
        .delete()
        .eq('id', selectedKey.id);

      if (error) throw error;

      toast.success('Clé API supprimée');
      setShowDeleteDialog(false);
      setSelectedKey(null);
      fetchApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (key: AIApiKey) => {
    try {
      const { error } = await supabase
        .from('ai_api_keys')
        .update({ is_active: !key.is_active })
        .eq('id', key.id);

      if (error) throw error;
      
      setApiKeys(apiKeys.map(k => 
        k.id === key.id ? { ...k, is_active: !k.is_active } : k
      ));
      
      toast.success(key.is_active ? 'Clé désactivée' : 'Clé activée');
    } catch (error) {
      console.error('Error toggling key:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleTestKey = async (key: AIApiKey, retryCount = 0) => {
    setTestingKey(key.id);
    
    try {
      const apiKey = atob(key.api_key_encrypted);
      let statusCode = 0;
      let statusMessage = '';

      // Utiliser le modèle configuré pour chaque clé
      const modelName = key.model_name || DEFAULT_MODELS[key.provider_type] || 'gemini-2.0-flash-lite';

      if (key.provider_type === 'gemini') {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Hello' }] }],
            }),
          }
        );
        statusCode = response.status;
        
        if (response.ok) {
          statusMessage = `✓ Opérationnel (${modelName})`;
        } else {
          const errorText = await response.text();
          // Extraire un message d'erreur court
          if (statusCode === 429) {
            statusMessage = 'Rate limit - Attendez quelques secondes';
          } else if (statusCode === 400) {
            statusMessage = 'Requête invalide - Vérifiez le modèle';
          } else if (statusCode === 401 || statusCode === 403) {
            statusMessage = 'Clé API invalide';
          } else {
            statusMessage = errorText.substring(0, 200);
          }
        }
      } else if (key.provider_type === 'lovable') {
        const response = await fetch(key.endpoint_url || DEFAULT_ENDPOINTS.lovable, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10,
          }),
        });
        statusCode = response.status;
        statusMessage = response.ok ? `✓ Opérationnel (${modelName})` : await response.text();
      } else if (key.provider_type === 'huggingface') {
        const response = await fetch(key.endpoint_url || DEFAULT_ENDPOINTS.huggingface, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10,
          }),
        });
        statusCode = response.status;
        statusMessage = response.ok ? `✓ Opérationnel (${modelName})` : await response.text();
      } else if (key.provider_type === 'openai') {
        const response = await fetch(key.endpoint_url || DEFAULT_ENDPOINTS.openai, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10,
          }),
        });
        statusCode = response.status;
        statusMessage = response.ok ? `✓ Opérationnel (${modelName})` : await response.text();
      } else if (key.provider_type === 'anthropic') {
        const response = await fetch(key.endpoint_url || DEFAULT_ENDPOINTS.anthropic, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10,
          }),
        });
        statusCode = response.status;
        statusMessage = response.ok ? `✓ Opérationnel (${modelName})` : await response.text();
      } else {
        statusCode = 0;
        statusMessage = 'Test non implémenté pour ce type de provider';
      }

      // Si 429 et pas encore de retry, attendre et réessayer
      if (statusCode === 429 && retryCount < 2) {
        toast.info(`${key.display_name}: Rate limit, nouvelle tentative dans 5s...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return handleTestKey(key, retryCount + 1);
      }

      await supabase
        .from('ai_api_keys')
        .update({
          last_status_code: statusCode,
          last_status_message: statusMessage.substring(0, 500),
          last_checked_at: new Date().toISOString(),
          total_requests: key.total_requests + 1,
          successful_requests: statusCode === 200 ? key.successful_requests + 1 : key.successful_requests,
          failed_requests: statusCode !== 200 ? key.failed_requests + 1 : key.failed_requests,
        })
        .eq('id', key.id);

      fetchApiKeys();

      if (statusCode === 200) {
        toast.success(`${key.display_name}: Test réussi ✓`);
      } else if (statusCode === 429) {
        toast.warning(`${key.display_name}: Rate limit temporaire (429) - La clé est valide mais surchargée`);
      } else {
        toast.error(`${key.display_name}: Erreur ${statusCode}`);
      }
    } catch (error) {
      console.error('Test error:', error);
      toast.error(`Erreur lors du test: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setTestingKey(null);
    }
  };

  const handleTestAllKeys = async () => {
    for (const key of apiKeys.filter(k => k.is_active)) {
      await handleTestKey(key);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const resetForm = () => {
    setFormData({
      provider_name: '',
      provider_type: 'gemini',
      api_key: '',
      display_name: '',
      endpoint_url: '',
      model_name: '',
      is_active: true,
      is_vision_capable: true,
      priority_order: 100,
      useCustomModel: false,
    });
    setSelectedKey(null);
  };

  const openEditDialog = (key: AIApiKey) => {
    setSelectedKey(key);
    const models = AVAILABLE_MODELS[key.provider_type] || [];
    const isCustomModel = key.model_name ? !models.some(m => m.value === key.model_name) : false;
    
    setFormData({
      provider_name: key.provider_name,
      provider_type: key.provider_type,
      api_key: '',
      display_name: key.display_name,
      endpoint_url: key.endpoint_url || '',
      model_name: key.model_name || '',
      is_active: key.is_active,
      is_vision_capable: key.is_vision_capable,
      priority_order: key.priority_order,
      useCustomModel: isCustomModel,
    });
    setShowEditDialog(true);
  };

  const getStatusBadge = (key: AIApiKey) => {
    if (!key.last_status_code) {
      return <Badge variant="outline" className="text-muted-foreground">Non testé</Badge>;
    }
    
    if (key.last_status_code === 200) {
      return <Badge className="bg-success/10 text-success border-success/20">200 OK</Badge>;
    }
    
    if (key.last_status_code === 401 || key.last_status_code === 403) {
      return <Badge variant="destructive">401 Invalide</Badge>;
    }
    
    if (key.last_status_code === 402) {
      return <Badge className="bg-warning/10 text-warning border-warning/20">402 Crédits</Badge>;
    }
    
    if (key.last_status_code === 429) {
      return <Badge className="bg-warning/10 text-warning border-warning/20">429 Quota</Badge>;
    }
    
    return <Badge variant="destructive">{key.last_status_code}</Badge>;
  };

  const maskApiKey = (encrypted: string) => {
    try {
      const key = atob(encrypted);
      return `${key.substring(0, 8)}${'•'.repeat(20)}${key.substring(key.length - 4)}`;
    } catch {
      return '••••••••••••••••';
    }
  };

  const activeCount = apiKeys.filter(k => k.is_active).length;
  const visionCount = apiKeys.filter(k => k.is_active && k.is_vision_capable).length;
  const healthyCount = apiKeys.filter(k => k.last_status_code === 200).length;

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
          <h1 className="text-2xl font-bold text-foreground">Gestion IA</h1>
          <p className="text-muted-foreground">Configuration des clés API et supervision IA</p>
        </div>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Clés API
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Supervision
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleTestAllKeys} disabled={apiKeys.length === 0}>
              <Play className="w-4 h-4 mr-2" />
              Tester tout
            </Button>
            <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{apiKeys.length}</p>
                    <p className="text-xs text-muted-foreground">Total clés</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-success" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                    <p className="text-xs text-muted-foreground">Actives</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{visionCount}</p>
                    <p className="text-xs text-muted-foreground">Vision IA</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-warning" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{healthyCount}</p>
                    <p className="text-xs text-muted-foreground">Opérationnels</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fallback Info */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Système de basculement automatique</p>
                  <p className="text-muted-foreground mt-1">
                    Les clés sont utilisées par ordre de priorité. Si une clé échoue (401, 402, 429, 5xx), 
                    le système bascule automatiquement vers la suivante. 
                    <strong className="text-foreground"> Pour l'analyse d'images, seules les clés "Vision IA" sont utilisées.</strong>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Keys Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clés API configurées</CardTitle>
              <CardDescription>
                Triées par ordre de priorité (plus petit = plus prioritaire)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Provider / Modèle</TableHead>
                      <TableHead>Clé API</TableHead>
                      <TableHead>Vision</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actif</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id} className={!key.is_active ? 'opacity-50' : ''}>
                        <TableCell className="font-mono text-xs">{key.priority_order}</TableCell>
                        <TableCell className="font-medium">{key.display_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="capitalize w-fit">
                              {key.provider_type}
                            </Badge>
                            {key.model_name && (
                              <code className="text-xs text-muted-foreground font-mono truncate max-w-[150px]" title={key.model_name}>
                                {key.model_name}
                              </code>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-[150px] truncate">
                              {showApiKeys[key.id] ? atob(key.api_key_encrypted) : maskApiKey(key.api_key_encrypted)}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setShowApiKeys(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                            >
                              {showApiKeys[key.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {key.is_vision_capable ? (
                            <Badge className="bg-accent/10 text-accent border-accent/20">Oui</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Non</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(key)}</TableCell>
                        <TableCell>
                          <Switch
                            checked={key.is_active}
                            onCheckedChange={() => handleToggleActive(key)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleTestKey(key)}
                              disabled={testingKey === key.id}
                            >
                              {testingKey === key.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditDialog(key)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => { setSelectedKey(key); setShowDeleteDialog(true); }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {apiKeys.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Aucune clé API configurée dans la base de données. 
                          Les clés actuelles proviennent des variables d'environnement.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Réponses IA</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stats?.totalResponses || 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                    <Brain className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Questions reçues</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stats?.totalUserMessages || 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-info/10 text-info">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Taux de réponse</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {stats?.totalUserMessages ? Math.round((stats.totalResponses / stats.totalUserMessages) * 100) : 0}%
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-success/10 text-success">
                    <Zap className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Long. moy. réponse</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stats?.avgResponseLength || 0}</p>
                    <p className="text-xs text-muted-foreground">caractères</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-warning/10 text-warning">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Sujets les plus demandés
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!stats?.topTopics?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Pas assez de données
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stats.topTopics.map((topic, i) => (
                      <div key={topic.topic} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-foreground">{topic.topic}</span>
                            <span className="text-muted-foreground">{topic.count}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min((topic.count / (stats.topTopics[0]?.count || 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-info" />
                  Interactions récentes
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                {!stats?.recentInteractions?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune interaction
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stats.recentInteractions.slice(0, 10).map((chat) => (
                      <div key={chat.id} className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                          chat.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                        }`}>
                          {chat.role === 'user' ? '👤' : '🤖'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {chat.role === 'user' ? 'Utilisateur' : 'IA'} • {new Date(chat.created_at).toLocaleString('fr-FR')}
                          </p>
                          <p className="text-sm text-foreground truncate">{chat.content.slice(0, 60)}...</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une clé API</DialogTitle>
            <DialogDescription>
              Ajoutez une nouvelle clé API pour le système de basculement IA
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Type de provider</Label>
              <Select value={formData.provider_type} onValueChange={handleProviderTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label} {type.visionCapable && '🖼️'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nom d'affichage *</Label>
              <Input
                placeholder="ex: Gemini API 1"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Clé API *</Label>
              <Input
                type="password"
                placeholder="Entrez la clé API"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              />
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Modèle IA</Label>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Personnalisé</Label>
                  <Switch
                    checked={formData.useCustomModel}
                    onCheckedChange={(checked) => setFormData({ ...formData, useCustomModel: checked, model_name: checked ? formData.model_name : (DEFAULT_MODELS[formData.provider_type] || '') })}
                  />
                </div>
              </div>
              
              {formData.useCustomModel || (AVAILABLE_MODELS[formData.provider_type]?.length === 0) ? (
                <Input
                  placeholder="ex: gemini-1.5-flash, gpt-4o-mini..."
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                />
              ) : (
                <Select value={formData.model_name} onValueChange={handleModelChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS[formData.provider_type]?.map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label} {model.vision && '🖼️'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Info pour Gemini */}
              {formData.provider_type === 'gemini' && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    API Gemini gratuite
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tous les modèles Gemini sont gratuits avec des limites de requêtes par minute.
                    Si vous obtenez une erreur 429, attendez quelques secondes et réessayez.
                  </p>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {formData.useCustomModel 
                  ? "Entrez le nom exact du modèle (ex: gemini-2.0-flash-lite)" 
                  : "Choisissez un modèle ou activez le mode personnalisé"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Ordre de priorité</Label>
              <Input
                type="number"
                min="1"
                max="999"
                value={formData.priority_order}
                onChange={(e) => setFormData({ ...formData, priority_order: parseInt(e.target.value) || 100 })}
              />
              <p className="text-xs text-muted-foreground">Plus petit = plus prioritaire</p>
            </div>

            <div className="flex items-center justify-between">
              <Label>Supporte la vision (images)</Label>
              <Switch
                checked={formData.is_vision_capable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_vision_capable: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Activer immédiatement</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Annuler</Button>
            <Button 
              onClick={handleAddKey}
              disabled={!formData.display_name || !formData.api_key}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la clé API</DialogTitle>
            <DialogDescription>
              Modifiez les paramètres de cette clé API
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Type de provider</Label>
              <Select value={formData.provider_type} onValueChange={handleProviderTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label} {type.visionCapable && '🖼️'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nom d'affichage *</Label>
              <Input
                placeholder="ex: Gemini API 1"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Nouvelle clé API (laisser vide pour garder l'actuelle)</Label>
              <Input
                type="password"
                placeholder="Entrez la nouvelle clé API"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              />
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Modèle IA</Label>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Personnalisé</Label>
                  <Switch
                    checked={formData.useCustomModel}
                    onCheckedChange={(checked) => setFormData({ ...formData, useCustomModel: checked, model_name: checked ? formData.model_name : (DEFAULT_MODELS[formData.provider_type] || '') })}
                  />
                </div>
              </div>
              
              {formData.useCustomModel || (AVAILABLE_MODELS[formData.provider_type]?.length === 0) ? (
                <Input
                  placeholder="ex: gemini-1.5-flash, gpt-4o-mini..."
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                />
              ) : (
                <Select value={formData.model_name} onValueChange={handleModelChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS[formData.provider_type]?.map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label} {model.vision && '🖼️'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Info pour Gemini */}
              {formData.provider_type === 'gemini' && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    API Gemini gratuite
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tous les modèles Gemini sont gratuits avec des limites de requêtes par minute.
                    Si vous obtenez une erreur 429, attendez quelques secondes et réessayez.
                  </p>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {formData.useCustomModel 
                  ? "Entrez le nom exact du modèle" 
                  : "Choisissez un modèle ou activez le mode personnalisé"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Ordre de priorité</Label>
              <Input
                type="number"
                min="1"
                max="999"
                value={formData.priority_order}
                onChange={(e) => setFormData({ ...formData, priority_order: parseInt(e.target.value) || 100 })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Supporte la vision (images)</Label>
              <Switch
                checked={formData.is_vision_capable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_vision_capable: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Actif</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Annuler</Button>
            <Button onClick={handleUpdateKey} disabled={!formData.display_name}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette clé API ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{selectedKey?.display_name}" ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKey} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}