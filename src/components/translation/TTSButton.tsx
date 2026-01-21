import { useState, useCallback } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TTSButtonProps {
  text: string;
  languageCode: string;
  translationId?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  className?: string;
}

export function TTSButton({
  text,
  languageCode,
  translationId,
  size = 'icon',
  variant = 'ghost',
  className
}: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }
  }, [audio]);

  const playWithBrowserTTS = useCallback((textToSpeak: string, lang: string) => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = lang;
      utterance.rate = 0.85; // Slower for clarity
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => {
        setIsPlaying(false);
        toast.error('Erreur de synthèse vocale');
      };
      
      window.speechSynthesis.speak(utterance);
      return true;
    }
    return false;
  }, []);

  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      stopAudio();
      window.speechSynthesis?.cancel();
      return;
    }

    if (!text) {
      toast.error('Aucun texte à lire');
      return;
    }

    setIsLoading(true);

    try {
      // First, try to get pre-generated audio from storage
      if (translationId) {
        const { data: audioData } = await supabase
          .from('translation_audio')
          .select('audio_url')
          .eq('translation_id', translationId)
          .single();
        
        if (audioData?.audio_url) {
          const newAudio = new Audio(audioData.audio_url);
          newAudio.onplay = () => setIsPlaying(true);
          newAudio.onended = () => setIsPlaying(false);
          newAudio.onerror = () => {
            setIsPlaying(false);
            // Fallback to browser TTS
            playWithBrowserTTS(text, languageCode === 'en' ? 'en-US' : 'fr-FR');
          };
          
          setAudio(newAudio);
          await newAudio.play();
          setIsLoading(false);
          return;
        }
      }

      // Try server-side TTS generation
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text,
            languageCode,
            translationId
          }),
        }
      );

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('audio')) {
          // Server returned audio directly
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const newAudio = new Audio(audioUrl);
          
          newAudio.onplay = () => setIsPlaying(true);
          newAudio.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl);
          };
          
          setAudio(newAudio);
          await newAudio.play();
        } else {
          // Server returned instructions for client-side TTS
          const data = await response.json();
          
          if (data.useClientTTS) {
            const textToSpeak = data.phoneticText || text;
            const voiceLang = data.voiceLang || (languageCode === 'en' ? 'en-US' : 'fr-FR');
            
            if (!playWithBrowserTTS(textToSpeak, voiceLang)) {
              toast.error('Synthèse vocale non disponible sur ce navigateur');
            }
          } else if (data.audioUrl) {
            const newAudio = new Audio(data.audioUrl);
            newAudio.onplay = () => setIsPlaying(true);
            newAudio.onended = () => setIsPlaying(false);
            
            setAudio(newAudio);
            await newAudio.play();
          }
        }
      } else {
        // Fallback to browser TTS
        const voiceLang = languageCode === 'en' ? 'en-US' : 'fr-FR';
        if (!playWithBrowserTTS(text, voiceLang)) {
          toast.error('Synthèse vocale non disponible');
        }
      }
    } catch (error) {
      console.error('TTS error:', error);
      // Fallback to browser TTS
      const voiceLang = languageCode === 'en' ? 'en-US' : 'fr-FR';
      if (!playWithBrowserTTS(text, voiceLang)) {
        toast.error('Erreur de synthèse vocale');
      }
    } finally {
      setIsLoading(false);
    }
  }, [text, languageCode, translationId, isPlaying, stopAudio, playWithBrowserTTS]);

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handlePlay}
      disabled={isLoading || !text}
      className={className}
      title={isPlaying ? 'Arrêter' : 'Écouter'}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
}

export default TTSButton;
