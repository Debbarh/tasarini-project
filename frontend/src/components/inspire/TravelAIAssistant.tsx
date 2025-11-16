import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, Send, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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
}

export const TravelAIAssistant: React.FC<TravelAIAssistantProps> = ({
  children,
  initialContext
}) => {
  const { user } = useAuth();
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
      const data = await travelAssistantService.ask(userMessage.content, user?.id, initialContext);

      const aiMessage: AIMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      if (data.hasUserContext) {
        toast.success('Réponse personnalisée basée sur vos préférences !');
      }

    } catch (error: any) {
      console.error('Erreur IA:', error);
      toast.error('Erreur lors de la communication avec l\'assistant IA');
      
      const errorMessage: AIMessage = {
        role: 'assistant',
        content: 'Désolé, je rencontre des difficultés techniques. Veuillez réessayer.',
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

  const suggestedQuestions = [
    "Quels sont les meilleurs spots cachés à Paris ?",
    "Créé-moi un itinéraire d'une journée pour découvrir Montmartre",
    "Quels restaurants locaux me recommandes-tu ?",
    "Comment optimiser mon budget pour visiter cette ville ?",
    "Quelles activités conviennent le mieux aux familles ?"
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
            Assistant IA de Voyage
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </DialogTitle>
          <DialogDescription>
            Posez-moi des questions sur vos voyages, je vous donnerai des conseils personnalisés !
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[500px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/20 rounded-lg">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Bonjour ! 👋</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Je suis votre assistant IA de voyage. Comment puis-je vous aider aujourd'hui ?
                </p>
                
                {/* Questions suggérées */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Questions suggérées :</p>
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
                        Je réfléchis...
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
              placeholder="Posez votre question sur le voyage..."
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
            <p className="text-xs text-muted-foreground mt-2 text-center">
              ✨ Conseils personnalisés basés sur vos préférences
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
