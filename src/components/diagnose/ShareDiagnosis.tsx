import { Share2, Copy, MessageCircle, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AnalysisResult } from '@/hooks/useDiagnosis';

interface ShareDiagnosisProps {
  result: AnalysisResult;
  imageUrl: string;
  language: string;
}

export function ShareDiagnosis({ result, imageUrl, language }: ShareDiagnosisProps) {
  const [copied, setCopied] = useState(false);

  const generateShareText = () => {
    const lines = [];
    
    if (result.is_healthy) {
      lines.push(`✅ ${language === 'fr' ? 'Plante saine' : 'Healthy plant'}: ${result.detected_crop}`);
      lines.push(`📊 ${language === 'fr' ? 'Confiance' : 'Confidence'}: ${result.confidence}%`);
      lines.push('');
      lines.push(result.description);
    } else {
      lines.push(`⚠️ ${language === 'fr' ? 'Maladie détectée' : 'Disease detected'}: ${result.disease_name}`);
      lines.push(`🌿 ${language === 'fr' ? 'Culture' : 'Crop'}: ${result.detected_crop}`);
      lines.push(`📊 ${language === 'fr' ? 'Gravité' : 'Severity'}: ${result.severity}`);
      lines.push('');
      lines.push(result.description);
      
      if (result.biological_treatments?.length) {
        lines.push('');
        lines.push(`💚 ${language === 'fr' ? 'Traitements biologiques' : 'Biological treatments'}:`);
        result.biological_treatments.slice(0, 2).forEach(t => lines.push(`  • ${t}`));
      }
    }
    
    lines.push('');
    lines.push(`📱 ${language === 'fr' ? 'Via AgriAssist Cameroun' : 'Via AgriAssist Cameroon'}`);
    
    return lines.join('\n');
  };

  const shareText = generateShareText();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success(language === 'fr' ? 'Copié !' : 'Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(language === 'fr' ? 'Erreur de copie' : 'Copy failed');
    }
  };

  const shareViaWhatsApp = () => {
    const encodedText = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      copyToClipboard();
      return;
    }

    try {
      await navigator.share({
        title: result.is_healthy 
          ? (language === 'fr' ? 'Plante saine' : 'Healthy plant')
          : (language === 'fr' ? 'Diagnostic maladie' : 'Disease diagnosis'),
        text: shareText,
      });
    } catch (err) {
      // User cancelled or error
      if ((err as Error).name !== 'AbortError') {
        copyToClipboard();
      }
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={nativeShare}
        className="flex-1"
      >
        <Share2 className="w-4 h-4 mr-2" />
        {language === 'fr' ? 'Partager' : 'Share'}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={shareViaWhatsApp}
        className="bg-[#25D366]/10 border-[#25D366]/30 hover:bg-[#25D366]/20"
      >
        <MessageCircle className="w-4 h-4 text-[#25D366]" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={copyToClipboard}
      >
        {copied ? (
          <Check className="w-4 h-4 text-success" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
