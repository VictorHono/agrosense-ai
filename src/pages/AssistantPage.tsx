import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/types';

export default function AssistantPage() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: language === 'fr' 
        ? 'Bonjour ! Je suis votre assistant agricole. Comment puis-je vous aider aujourd\'hui ? Vous pouvez me poser des questions sur vos cultures, les maladies, les traitements, ou demander des conseils.' 
        : 'Hello! I am your farming assistant. How can I help you today? You can ask me about your crops, diseases, treatments, or ask for advice.',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500));

    const responses: Record<string, string> = {
      default: language === 'fr' 
        ? 'Je comprends votre question. Laissez-moi vous aider avec cela. Pour les cultures au Cameroun, il est important de tenir compte de la saison et de votre région spécifique. Pourriez-vous me donner plus de détails sur votre situation ?'
        : 'I understand your question. Let me help you with that. For crops in Cameroon, it\'s important to consider the season and your specific region. Could you give me more details about your situation?',
    };

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responses.default,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const toggleListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(language === 'fr' 
        ? 'La reconnaissance vocale n\'est pas supportée par votre navigateur.' 
        : 'Speech recognition is not supported by your browser.');
      return;
    }

    setIsListening(prev => !prev);
    
    // Here you would implement actual speech recognition
    if (!isListening) {
      // Start listening simulation
      setTimeout(() => {
        setInputText(language === 'fr' 
          ? 'Quand dois-je planter le maïs ?' 
          : 'When should I plant corn?');
        setIsListening(false);
      }, 2000);
    }
  }, [isListening, language]);

  const speakMessage = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'fr' ? 'fr-FR' : 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <PageContainer 
      title={t('assistant.title')} 
      className="flex flex-col p-0"
      fullHeight
    >
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 fade-in",
              message.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm",
              message.role === 'user' 
                ? "bg-primary text-primary-foreground" 
                : "bg-accent text-accent-foreground"
            )}>
              {message.role === 'user' ? '👤' : '🌱'}
            </div>

            {/* Message Bubble */}
            <div className={cn(
              "max-w-[80%] p-3 rounded-2xl",
              message.role === 'user'
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-card border border-border rounded-tl-sm"
            )}>
              <p className="text-sm leading-relaxed">{message.content}</p>
              {message.role === 'assistant' && audioEnabled && (
                <button
                  onClick={() => speakMessage(message.content)}
                  className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Volume2 className="w-3 h-3" />
                  Écouter
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 fade-in">
            <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm">
              🌱
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card p-4 safe-bottom">
        {/* Quick suggestions */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {[
            language === 'fr' ? 'Quand planter ?' : 'When to plant?',
            language === 'fr' ? 'Maladies du cacao' : 'Cocoa diseases',
            language === 'fr' ? 'Prix du maïs' : 'Corn prices',
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInputText(suggestion)}
              className="px-3 py-1.5 bg-muted rounded-full text-xs font-medium text-muted-foreground hover:bg-muted/80 whitespace-nowrap transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAudioEnabled(prev => !prev)}
            className={cn(!audioEnabled && "text-muted-foreground")}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={t('assistant.placeholder')}
              className="w-full h-11 px-4 pr-12 rounded-xl bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {inputText && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9"
                onClick={handleSendMessage}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>

          {/* Mic Button */}
          <Button
            variant={isListening ? "destructive" : "mic"}
            size="icon-lg"
            onClick={toggleListening}
            className={cn(
              "shrink-0 transition-all",
              isListening && "pulse-mic"
            )}
          >
            {isListening ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>
        </div>

        {isListening && (
          <p className="text-center text-sm text-primary mt-3 animate-pulse">
            {t('assistant.listening')}
          </p>
        )}
      </div>
    </PageContainer>
  );
}
