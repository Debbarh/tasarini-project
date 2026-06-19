import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, Send, Loader2, Sparkles, Hand } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { travelAssistantService } from '@/services/travelAssistantService';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TravelAIAssistantProps {
  children: React.ReactNode;
  initialContext?: string;
  suggestions?: string[];
}

export const TravelAIAssistant: React.FC<TravelAIAssistantProps> = ({
  children,
  initialContext,
  suggestions
}) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!currentMessage.trim() || loading) return;

    const userMessage: AIMessage = {
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setLoading(true);

    try {
      const data = await travelAssistantService.ask(userMessage.content, user?.id, initialContext, i18n.language);

      const aiMessage: AIMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      if (data.hasUserContext) {
        toast.success(t('aiAssistant.personalized', 'Réponse basée sur les lieux affichés.'));
      }

    } catch (error: any) {
      console.error('Erreur IA:', error);
      toast.error(t('aiAssistant.errorComm', "Erreur lors de la communication avec l'assistant IA"));

      const errorMessage: AIMessage = {
        role: 'assistant',
        content: t('aiAssistant.errorReply', 'Désolé, je rencontre des difficultés techniques. Veuillez réessayer.'),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Suggestions contextuelles (fournies par le parent selon la zone affichée) sinon génériques.
  const suggestedQuestions = (suggestions && suggestions.length > 0) ? suggestions : [
    "Quels sont les incontournables dans cette zone ?",
    "Compose-moi un itinéraire d'une journée avec ces lieux",
    "Quels restaurants locaux me recommandes-tu ici ?",
    "Propose-moi une demi-journée culturelle dans ce rayon",
    "Quelles activités conviennent le mieux aux familles ici ?"
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            {t('aiAssistant.title', 'Assistant de voyage IA')}
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </DialogTitle>
          <DialogDescription>
            {t('aiAssistant.subtitle', 'Posez vos questions, je vous donne des conseils personnalisés sur cette zone.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[500px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/20 rounded-lg">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2 flex items-center justify-center gap-1">{t('aiAssistant.greeting', 'Bonjour !')} <Hand className="w-4 h-4" /></h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('aiAssistant.intro', 'Je suis votre assistant de voyage. Comment puis-je vous aider ?')}
                </p>

                {/* Questions suggérées */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t('aiAssistant.suggestedLabel', 'Questions suggérées :')}</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.slice(0, 3).map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-1 px-2"
                        onClick={() => setCurrentMessage(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <Card className={`max-w-[80%] ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-background'
                  }`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        {message.role === 'assistant' && (
                          <Bot className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))
            )}
            
            {loading && (
              <div className="flex justify-start">
                <Card className="bg-background">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        {t('aiAssistant.thinking', 'Je réfléchis…')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 mt-4">
            <Textarea
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('aiAssistant.placeholder', 'Posez votre question sur le voyage…')}
              className="flex-1"
              rows={2}
              disabled={loading}
            />
            <Button
              onClick={sendMessage}
              disabled={!currentMessage.trim() || loading}
              size="sm"
              className="px-3"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {user && (
            <p className="text-xs text-muted-foreground mt-2 text-center flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" /> {t('aiAssistant.personalizedHint', 'Conseils basés sur la zone affichée et vos préférences')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
