import { useState } from 'react';
import { Check, X, Volume2, AlertTriangle, Sparkles, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TTSButton } from './TTSButton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TranslationData {
  id: string;
  translation_key: string;
  translation_value: string;
  language_code: string;
  category: string;
  is_ai_generated?: boolean;
  is_validated?: boolean;
  pronunciation?: string;
  dialect_variant?: string;
  usage_example?: string;
  notes?: string;
}

interface TranslationEditorProps {
  translation: TranslationData;
  onUpdate: (updated: TranslationData) => void;
  onDelete?: (id: string) => void;
  showMetadata?: boolean;
  languageName?: string;
}

export function TranslationEditor({
  translation,
  onUpdate,
  onDelete,
  showMetadata = true,
  languageName
}: TranslationEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(translation.translation_value);
  const [showDetails, setShowDetails] = useState(false);
  const [metadata, setMetadata] = useState({
    pronunciation: translation.pronunciation || '',
    dialect_variant: translation.dialect_variant || '',
    usage_example: translation.usage_example || '',
    notes: translation.notes || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: any = {
        translation_value: editedValue,
        is_validated: true,
        validated_at: new Date().toISOString()
      };

      // Include metadata if provided
      if (metadata.pronunciation) updateData.pronunciation = metadata.pronunciation;
      if (metadata.dialect_variant) updateData.dialect_variant = metadata.dialect_variant;
      if (metadata.usage_example) updateData.usage_example = metadata.usage_example;
      if (metadata.notes) updateData.notes = metadata.notes;

      const { error } = await supabase
        .from('app_translations')
        .update(updateData)
        .eq('id', translation.id);

      if (error) throw error;

      onUpdate({
        ...translation,
        translation_value: editedValue,
        is_validated: true,
        ...metadata
      });

      setIsEditing(false);
      toast.success('Traduction sauvegardée');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_translations')
        .update({
          is_validated: true,
          validated_at: new Date().toISOString()
        })
        .eq('id', translation.id);

      if (error) throw error;

      onUpdate({ ...translation, is_validated: true });
      toast.success('Traduction validée');
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Erreur de validation');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedValue(translation.translation_value);
    setIsEditing(false);
  };

  const isAIGenerated = translation.is_ai_generated;
  const needsValidation = isAIGenerated && !translation.is_validated;

  return (
    <div className={`border rounded-lg p-3 space-y-2 ${needsValidation ? 'border-warning bg-warning/5' : 'border-border'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono truncate max-w-[200px]">
              {translation.translation_key}
            </code>
            <Badge variant="outline" className="text-[10px]">
              {translation.category}
            </Badge>
            {isAIGenerated && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant={needsValidation ? 'destructive' : 'secondary'} className="text-[10px]">
                      <Sparkles className="h-2.5 w-2.5 mr-1" />
                      IA
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {needsValidation 
                      ? 'Traduction générée par IA - À valider' 
                      : 'Traduction générée par IA - Validée'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <TTSButton
            text={translation.translation_value}
            languageCode={translation.language_code}
            translationId={translation.id}
            size="sm"
            variant="ghost"
          />
          {showMetadata && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Info className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Translation Value */}
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            className="min-h-[80px]"
            placeholder="Traduction..."
          />
          
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs">
                {showDetails ? 'Masquer' : 'Afficher'} les métadonnées
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Prononciation</Label>
                  <Input
                    value={metadata.pronunciation}
                    onChange={(e) => setMetadata(m => ({ ...m, pronunciation: e.target.value }))}
                    placeholder="Ex: Ntsé-mié-pi"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Variante dialectale</Label>
                  <Input
                    value={metadata.dialect_variant}
                    onChange={(e) => setMetadata(m => ({ ...m, dialect_variant: e.target.value }))}
                    placeholder="Ex: Bandjoun, Baham..."
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Exemple d'utilisation</Label>
                <Input
                  value={metadata.usage_example}
                  onChange={(e) => setMetadata(m => ({ ...m, usage_example: e.target.value }))}
                  placeholder="Phrase d'exemple en contexte..."
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={metadata.notes}
                  onChange={(e) => setMetadata(m => ({ ...m, notes: e.target.value }))}
                  placeholder="Notes linguistiques, contexte culturel..."
                  className="text-sm min-h-[60px]"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Check className="h-4 w-4 mr-1" />
              Enregistrer
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p 
            className="text-sm cursor-pointer hover:bg-muted/50 rounded p-1 -m-1"
            onClick={() => setIsEditing(true)}
          >
            {translation.translation_value}
          </p>

          {/* Show metadata preview if available */}
          {showDetails && (translation.pronunciation || translation.usage_example) && (
            <div className="text-xs text-muted-foreground space-y-1 pl-2 border-l-2 border-muted">
              {translation.pronunciation && (
                <p><span className="font-medium">Prononciation:</span> {translation.pronunciation}</p>
              )}
              {translation.dialect_variant && (
                <p><span className="font-medium">Dialecte:</span> {translation.dialect_variant}</p>
              )}
              {translation.usage_example && (
                <p><span className="font-medium">Exemple:</span> {translation.usage_example}</p>
              )}
            </div>
          )}

          {/* Validation button for AI-generated translations */}
          {needsValidation && (
            <div className="flex items-center gap-2 pt-1">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-xs text-warning">À valider</span>
              <Button size="sm" variant="outline" onClick={handleValidate} disabled={saving}>
                <Check className="h-3 w-3 mr-1" />
                Valider
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                Modifier
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TranslationEditor;
